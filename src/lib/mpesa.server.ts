/** Safaricom Daraja (M-Pesa) helpers. Server-only.
 * Credentials come from Settings → Payments ("M-Pesa Paybill / Till (API keys)"),
 * falling back to MPESA_* environment secrets. */

type MpesaConfig = {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  type: "paybill" | "till";
  till: string;
  accountRef: string;
  live: boolean;
};

async function loadConfig(): Promise<MpesaConfig> {
  let c: Record<string, string> = {};
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("app_settings").select("data").eq("section", "payments").maybeSingle();
    c = (data?.data?.configs?.mpesa_api ?? {}) as Record<string, string>;
  } catch { /* fall back to env */ }
  const pick = (k: string, e: string) => (c[k]?.trim() || process.env[e] || "").trim();
  const cfg: MpesaConfig = {
    consumerKey: pick("consumer_key", "MPESA_CONSUMER_KEY"),
    consumerSecret: pick("consumer_secret", "MPESA_CONSUMER_SECRET"),
    shortcode: pick("shortcode", "MPESA_SHORTCODE"),
    passkey: pick("passkey", "MPESA_PASSKEY"),
    type: pick("type", "MPESA_TYPE").toLowerCase().startsWith("till") ? "till" : "paybill",
    till: pick("till_number", "MPESA_TILL"),
    accountRef: pick("account_reference", "MPESA_ACCOUNT_REF"),
    live: ["production", "live"].includes(pick("environment", "MPESA_ENV").toLowerCase()),
  };
  const missing = [
    ["Consumer key", cfg.consumerKey], ["Consumer secret", cfg.consumerSecret],
    ["Shortcode", cfg.shortcode], ["Passkey", cfg.passkey],
  ].filter(([, v]) => !v).map(([n]) => n);
  if (missing.length) {
    throw new Error(`M-Pesa is not set up yet. Add ${missing.join(", ")} in Settings → Payments.`);
  }
  return cfg;
}

export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

function timestamp() {
  const d = new Date(Date.now() + 3 * 3600 * 1000); // Nairobi time
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

export async function stkPush(opts: {
  phone: string;
  amount: number;
  accountRef: string;
  description: string;
  callbackUrl: string;
}) {
  const cfg = await loadConfig();
  const base = cfg.live ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

  const tokRes = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${btoa(`${cfg.consumerKey}:${cfg.consumerSecret}`)}` },
  });
  const tokText = await tokRes.text();
  if (!tokRes.ok) throw new Error(`M-Pesa rejected the API keys [${tokRes.status}]. Check Settings → Payments.`);
  const token = (JSON.parse(tokText) as { access_token?: string }).access_token;
  if (!token) throw new Error("M-Pesa did not return an access token.");

  const ts = timestamp();
  const isTill = cfg.type === "till";
  const res = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: cfg.shortcode,
      Password: btoa(`${cfg.shortcode}${cfg.passkey}${ts}`),
      Timestamp: ts,
      TransactionType: isTill ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline",
      Amount: Math.max(1, Math.round(opts.amount)),
      PartyA: opts.phone,
      PartyB: isTill ? cfg.till || cfg.shortcode : cfg.shortcode,
      PhoneNumber: opts.phone,
      CallBackURL: opts.callbackUrl,
      AccountReference: (cfg.accountRef || opts.accountRef).slice(0, 12),
      TransactionDesc: opts.description.slice(0, 13),
    }),
  });
  const text = await res.text();
  let json: any = {};
  try { json = JSON.parse(text); } catch { /* ignore */ }
  if (!res.ok || json.ResponseCode !== "0") {
    throw new Error(json.errorMessage || json.ResponseDescription || `M-Pesa request failed [${res.status}].`);
  }
  return { checkoutId: json.CheckoutRequestID as string };
}
