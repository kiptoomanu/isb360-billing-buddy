/** Minimal Stripe Checkout helpers using the REST API. Server-only. */

function secretKey() {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Card payments are not configured yet.");
  return key;
}

async function stripeCall(path: string, form: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form).toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Card payment failed [${res.status}]: ${text}`);
  return JSON.parse(text);
}

export async function createCheckoutSession(opts: {
  amount: number;
  currency?: string;
  description: string;
  renewalId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const session = await stripeCall("/checkout/sessions", {
    mode: "payment",
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    client_reference_id: opts.renewalId,
    "metadata[renewal_id]": opts.renewalId,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": opts.currency ?? "kes",
    "line_items[0][price_data][unit_amount]": String(Math.round(opts.amount * 100)),
    "line_items[0][price_data][product_data][name]": opts.description.slice(0, 120),
  });
  return { id: session.id as string, url: session.url as string };
}
