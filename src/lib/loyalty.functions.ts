import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const lookupSchema = z.object({
  account: z.string().trim().min(3).max(80),
  fullName: z.string().trim().min(2).max(120),
});

export type LoyaltyReward = {
  id: string;
  name: string;
  description?: string;
  points: number;
  type?: string;
  value?: string;
  active?: boolean;
};

export type LoyaltyPortalData = {
  name: string;
  points: number;
  earned: number;
  redeemed: number;
  history: { id: string; points: number; reason: string | null; created_at: string }[];
  rewards: LoyaltyReward[];
  minRedeem: number;
  enabled: boolean;
};

export const lookupLoyalty = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => lookupSchema.parse(data))
  .handler(async ({ data }): Promise<LoyaltyPortalData> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const account = data.account.trim();

    const { data: rows, error } = await db
      .from("clients")
      .select("id, full_name, loyalty_points, username, phone")
      .or(`username.eq.${account},phone.eq.${account}`)
      .limit(5);
    if (error) throw new Error(error.message);

    const client = (rows ?? []).find(
      (r: any) =>
        String(r.full_name ?? "").trim().toLowerCase() ===
        data.fullName.trim().toLowerCase(),
    );
    if (!client) throw new Error("No account found with those details.");

    const { data: txns } = await db
      .from("loyalty_transactions")
      .select("id, points, reason, created_at")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: settings } = await db
      .from("app_settings")
      .select("data")
      .eq("section", "loyalty")
      .maybeSingle();

    const cfg = (settings?.data ?? {}) as any;
    const history = (txns ?? []) as LoyaltyPortalData["history"];

    return {
      name: client.full_name,
      points: client.loyalty_points ?? 0,
      earned: history.filter((t) => t.points > 0).reduce((s, t) => s + t.points, 0),
      redeemed: history.filter((t) => t.points < 0).reduce((s, t) => s - t.points, 0),
      history,
      rewards: ((cfg.rewards ?? []) as LoyaltyReward[]).filter((r) => r.active !== false),
      minRedeem: Number(cfg.minRedeem ?? cfg.minRedeemPoints ?? 0) || 0,
      enabled: cfg.enabled !== false,
    };
  });
