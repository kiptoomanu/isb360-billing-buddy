import { pushClientToRouter } from "./mikrotik.functions";

export function addDays(from: Date, days: number) {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type SettleExtra = {
  confirmedBy?: string | null;
  gateway?: string | null;
  gatewayRef?: string | null;
  payerPhone?: string | null;
};

/**
 * Applies a successful payment to a renewal request: extends the subscription,
 * reactivates the client, records the confirmation and re-pushes the plan speed
 * to the router. Safe to call twice — already-settled requests are ignored.
 */
export async function settleRenewal(db: any, requestId: string, extra: SettleExtra = {}) {
  const { data: req, error } = await db
    .from("renewal_requests")
    .select("id, client_id, plan_id, amount, status")
    .eq("id", requestId)
    .single();
  if (error || !req) throw new Error(error?.message || "Renewal request not found");
  if (req.status === "confirmed") return { ok: true, alreadySettled: true as const };
  if (req.status !== "pending") throw new Error("This request has already been processed.");

  const { data: client } = await db
    .from("clients")
    .select("id, plan_id, expiry_date, monthly_fee")
    .eq("id", req.client_id)
    .single();

  const planId = req.plan_id ?? client?.plan_id ?? null;
  let validity = 30;
  if (planId) {
    const { data: plan } = await db
      .from("plans").select("validity_days").eq("id", planId).maybeSingle();
    if (plan?.validity_days) validity = Number(plan.validity_days);
  }

  const today = new Date();
  const current = client?.expiry_date ? new Date(`${client.expiry_date}T00:00:00Z`) : null;
  const base = current && current.getTime() > today.getTime() ? current : today;
  const newExpiry = addDays(base, validity);

  const { error: cErr } = await db
    .from("clients")
    .update({ status: "active", expiry_date: newExpiry, plan_id: planId })
    .eq("id", req.client_id);
  if (cErr) throw new Error(cErr.message);

  await db
    .from("renewal_requests")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      confirmed_by: extra.confirmedBy ?? null,
      days_added: validity,
      paid_at: new Date().toISOString(),
      gateway: extra.gateway ?? null,
      gateway_ref: extra.gatewayRef ?? null,
      payer_phone: extra.payerPhone ?? null,
    })
    .eq("id", req.id);

  let sync: string | null = null;
  try {
    await pushClientToRouter(db, req.client_id);
    sync = "Router updated with the plan speed.";
  } catch (e: any) {
    sync = `Router not updated: ${e?.message ?? "unreachable"}`;
  }

  return { ok: true, alreadySettled: false as const, expiry: newExpiry, days: validity, sync };
}
