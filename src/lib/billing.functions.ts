import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pushClientToRouter } from "./mikrotik.functions";

export type BillingRenewal = {
  id: string;
  client_id: string;
  amount: number;
  method: string;
  reference: string | null;
  note: string | null;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  days_added: number | null;
  refunded_at: string | null;
  refund_amount: number | null;
  refund_reason: string | null;
  client: {
    full_name: string;
    username: string | null;
    phone: string | null;
    type: string;
    status: string;
    expiry_date: string | null;
  } | null;
  plan: { name: string; validity_days: number; price: number } | null;
};

const idSchema = z.object({ id: z.string().uuid() });

function addDays(from: Date, days: number) {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const listRenewals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ status: z.enum(["pending", "confirmed", "refunded", "rejected", "all"]).default("pending") }).parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<BillingRenewal[]> => {
    const db = context.supabase as any;
    let q = db
      .from("renewal_requests")
      .select(
        "id, client_id, amount, method, reference, note, status, created_at, confirmed_at, days_added, refunded_at, refund_amount, refund_reason, clients(full_name, username, phone, type, status, expiry_date), plans(name, validity_days, price)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return ((rows ?? []) as any[]).map((r) => ({
      ...r,
      client: r.clients ?? null,
      plan: r.plans ?? null,
    })) as BillingRenewal[];
  });

export const confirmRenewal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { settleRenewal } = await import("./renewals.server");
    const res = await settleRenewal(context.supabase as any, data.id, {
      confirmedBy: context.userId,
      gateway: "manual",
    });
    return res;
  });


export const rejectRenewal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.extend({ reason: z.string().trim().max(200).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { error } = await db.from("renewal_requests")
      .update({ status: "rejected", note: data.reason?.trim() || null })
      .eq("id", data.id).eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const refundRenewal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    idSchema.extend({
      amount: z.number().nonnegative().optional(),
      reason: z.string().trim().max(200).optional(),
      revoke: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: req, error } = await db
      .from("renewal_requests")
      .select("id, client_id, amount, status, days_added")
      .eq("id", data.id)
      .single();
    if (error || !req) throw new Error(error?.message || "Renewal request not found");
    if (req.status !== "confirmed") throw new Error("Only a confirmed payment can be refunded.");

    await db.from("renewal_requests").update({
      status: "refunded",
      refunded_at: new Date().toISOString(),
      refund_amount: data.amount ?? Number(req.amount ?? 0),
      refund_reason: data.reason?.trim() || null,
    }).eq("id", req.id);

    if (data.revoke && req.days_added) {
      const { data: client } = await db
        .from("clients").select("expiry_date").eq("id", req.client_id).maybeSingle();
      if (client?.expiry_date) {
        const rolled = addDays(new Date(`${client.expiry_date}T00:00:00Z`), -Number(req.days_added));
        const expired = new Date(`${rolled}T00:00:00Z`).getTime() < Date.now();
        await db.from("clients")
          .update({ expiry_date: rolled, status: expired ? "expired" : "active" })
          .eq("id", req.client_id);
        try { await pushClientToRouter(db, req.client_id); } catch { /* router offline */ }
      }
    }
    return { ok: true };
  });
