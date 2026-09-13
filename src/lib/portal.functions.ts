import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const lookupSchema = z.object({
  account: z.string().trim().min(3).max(80),
  fullName: z.string().trim().min(2).max(120),
});

const renewSchema = lookupSchema.extend({
  method: z.enum(["mpesa", "cash", "bank", "card"]),
  reference: z.string().trim().max(80).optional(),
});

export type PortalPlan = {
  name: string;
  type: string;
  price: number;
  download_kbps: number;
  upload_kbps: number;
  validity_days: number;
  device_limit: number;
} | null;

export type PortalRenewal = {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  status: string;
  created_at: string;
};

export type PortalData = {
  name: string;
  account: string | null;
  type: string;
  status: string;
  monthlyFee: number;
  balance: number;
  expiryDate: string | null;
  daysRemaining: number | null;
  validityDays: number;
  daysUsed: number | null;
  plan: PortalPlan;
  points: number;
  history: { id: string; points: number; reason: string | null; created_at: string }[];
  renewals: PortalRenewal[];
};

type ClientRow = {
  id: string;
  full_name: string;
  username: string | null;
  phone: string | null;
  type: string;
  status: string;
  monthly_fee: number | null;
  expiry_date: string | null;
  loyalty_points: number | null;
  plan_id: string | null;
};

async function findClient(account: string, fullName: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const value = account.trim().replace(/[,)("']/g, "");
  const { data: rows, error } = await db
    .from("clients")
    .select(
      "id, full_name, username, phone, type, status, monthly_fee, expiry_date, loyalty_points, plan_id",
    )
    .or(`username.eq.${value},phone.eq.${value}`)
    .limit(5);
  if (error) throw new Error(error.message);
  const client = ((rows ?? []) as ClientRow[]).find(
    (r) =>
      String(r.full_name ?? "").trim().toLowerCase() === fullName.trim().toLowerCase(),
  );
  if (!client) throw new Error("No account found with those details.");
  return { db, client };
}

function daysBetween(target: string | null) {
  if (!target) return null;
  const ms = new Date(`${target}T00:00:00Z`).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

async function buildPortal(db: any, client: ClientRow): Promise<PortalData> {
  const [planRes, txnRes, renewRes] = await Promise.all([
    client.plan_id
      ? db
          .from("plans")
          .select("name, type, price, download_kbps, upload_kbps, validity_days, device_limit")
          .eq("id", client.plan_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    db
      .from("loyalty_transactions")
      .select("id, points, reason, created_at")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("renewal_requests")
      .select("id, amount, method, reference, status, created_at")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const plan = (planRes?.data ?? null) as PortalPlan;
  const daysRemaining = daysBetween(client.expiry_date);
  const validityDays = plan?.validity_days ?? 30;
  const daysUsed =
    daysRemaining === null ? null : Math.max(0, Math.min(validityDays, validityDays - daysRemaining));
  const fee = Number(plan?.price ?? client.monthly_fee ?? 0);
  const due = daysRemaining === null || daysRemaining <= 0 || client.status !== "active";

  return {
    name: client.full_name,
    account: client.username ?? client.phone,
    type: client.type,
    status: client.status,
    monthlyFee: fee,
    balance: due ? fee : 0,
    expiryDate: client.expiry_date,
    daysRemaining,
    validityDays,
    daysUsed,
    plan,
    points: client.loyalty_points ?? 0,
    history: (txnRes?.data ?? []) as PortalData["history"],
    renewals: (renewRes?.data ?? []) as PortalRenewal[],
  };
}

export const lookupAccount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => lookupSchema.parse(data))
  .handler(async ({ data }): Promise<PortalData> => {
    const { db, client } = await findClient(data.account, data.fullName);
    return buildPortal(db, client);
  });

export const requestRenewal = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => renewSchema.parse(data))
  .handler(async ({ data }): Promise<PortalData> => {
    const { db, client } = await findClient(data.account, data.fullName);

    const { data: pending } = await db
      .from("renewal_requests")
      .select("id")
      .eq("client_id", client.id)
      .eq("status", "pending")
      .limit(1);
    if ((pending ?? []).length > 0) {
      throw new Error("You already have a renewal request waiting to be confirmed.");
    }

    let amount = Number(client.monthly_fee ?? 0);
    if (client.plan_id) {
      const { data: plan } = await db
        .from("plans")
        .select("price")
        .eq("id", client.plan_id)
        .maybeSingle();
      if (plan?.price != null) amount = Number(plan.price);
    }

    const { error } = await db.from("renewal_requests").insert({
      client_id: client.id,
      plan_id: client.plan_id,
      amount,
      method: data.method,
      reference: data.reference?.trim() || null,
    });
    if (error) throw new Error(error.message);

    return buildPortal(db, client);
  });
