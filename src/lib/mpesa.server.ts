/** Safaricom Daraja (M-Pesa) helpers. Server-only. */

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`M-Pesa is not fully configured yet (missing ${name}).`);
  return v;
}

function baseUrl() {
  const mode = process.env["MPESA_ENV"] ?? "sandbox";
  return mode === "production" || mode === "live"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

async function accessToken() {
  const key = env("MPESA_CONSUMER_KEY");
  const secret = env("MPESA_CONSUMER_SECRET");
  const auth = btoa(`${key}:${secret}`);
  const res = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`M-Pesa auth failed [${res.status}]: ${body}`);
  const json = JSON.parse(body) as { access_token?: string };
  if (!json.access_token) throw new Error("M-Pesa did not return an access token.");
  return json.access_token;
}

function timestamp() {
  const d = new Date();
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
  const shortcode = env("MPESA_SHORTCODE");
  const passkey = env("MPESA_PASSKEY");
  const ts = timestamp();
  const password = btoa(`${shortcode}${passkey}${ts}`);
  const token = await accessToken();

  const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.max(1, Math.round(opts.amount)),
      PartyA: opts.phone,
      PartyB: shortcode,
      PhoneNumber: opts.phone,
      CallBackURL: opts.callbackUrl,
      AccountReference: opts.accountRef.slice(0, 12),
      TransactionDesc: opts.description.slice(0, 13),
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`M-Pesa request failed [${res.status}]: ${text}`);
  const json = JSON.parse(text) as {
    CheckoutRequestID?: string;
    ResponseCode?: string;
    ResponseDescription?: string;
    errorMessage?: string;
  };
  if (json.ResponseCode !== "0") {
    throw new Error(json.errorMessage || json.ResponseDescription || "M-Pesa declined the request.");
  }
  return { checkoutId: json.CheckoutRequestID! };
}
