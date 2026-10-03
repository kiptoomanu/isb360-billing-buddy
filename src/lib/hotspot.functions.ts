import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

export type HotspotPlan = {
  id: string;
  name: string;
  price: number;
  download_kbps: number;
  upload_kbps: number;
  validity_days: number;
  device_limit: number;
  description: string | null;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const listHotspotPlans = createServerFn({ method: "GET" }).handler(
  async (): Promise<HotspotPlan[]> => {
    const db = await admin();
    const { data, error } = await db
      .from("plans")
      .select("id, name, price, download_kbps, upload_kbps, validity_days, device_limit, description")
      .eq("type", "hotspot")
      .eq("active", true)
      .order("price", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as HotspotPlan[];
  },
);

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return "HS" + Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function origin() {
  const u = new URL(getRequest().url);
  return `${u.protocol}//${u.host}`;
}

export type HotspotPurchase = {
  renewalId: string;
  mode: "mpesa" | "card";
  checkoutUrl?: string;
  message: string;
};

export const purchaseHotspot = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        planId: z.string().uuid(),
        phone: z.string().trim().min(9).max(20),
        method: z.enum(["mpesa", "card"]),
        routerId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<HotspotPurchase> => {
    const db = await admin();
    const { normalizePhone, stkPush } = await import("./mpesa.server");
    const phone = normalizePhone(data.phone);
    if (phone.length < 12) throw new Error("Please enter a valid phone number.");

    const { data: plan } = await db
      .from("plans")
      .select("id, name, price, type, active")
      .eq("id", data.planId)
      .maybeSingle();
    if (!plan || plan.type !== "hotspot" || !plan.active) throw new Error("That package is not available.");

    let routerId = data.routerId ?? null;
    if (routerId) {
      const { data: r } = await db.from("routers").select("id").eq("id", routerId).maybeSingle();
      if (!r) routerId = null;
    }
    if (!routerId) {
      const { data: r } = await db.from("routers").select("id").order("created_at").limit(1);
      routerId = r?.[0]?.id ?? null;
    }

    const code = makeCode();
    const { data: client, error: cErr } = await db
      .from("clients")
      .insert({
        full_name: `Hotspot ${phone}`,
        phone,
        username: code,
        type: "hotspot",
        status: "expired",
        monthly_fee: plan.price,
        plan_id: plan.id,
        router_id: routerId,
      })
      .select("id")
      .single();
    if (cErr || !client) throw new Error(cErr?.message ?? "Could not create your account.");

    const { data: req, error: rErr } = await db
      .from("renewal_requests")
      .insert({ client_id: client.id, plan_id: plan.id, amount: plan.price, method: data.method, note: "hotspot purchase" })
      .select("id")
      .single();
    if (rErr || !req) throw new Error(rErr?.message ?? "Could not start the payment.");
    const renewalId = req.id as string;

    const fail = async (msg: string): Promise<never> => {
      await db.from("renewal_requests").update({ status: "rejected", failure_reason: msg }).eq("id", renewalId);
      throw new Error(msg);
    };

    if (data.method === "mpesa") {
      try {
        const { checkoutId } = await stkPush({
          phone,
          amount: Number(plan.price),
          accountRef: code,
          description: "Hotspot",
          callbackUrl: `${origin()}/api/public/mpesa/callback`,
        });
        await db
          .from("renewal_requests")
          .update({ gateway: "mpesa", checkout_id: checkoutId, payer_phone: phone })
          .eq("id", renewalId);
      } catch (e: any) {
        await fail(e?.message ?? "M-Pesa could not start the payment.");
      }
      return { renewalId, mode: "mpesa", message: "Check your phone and enter your M-Pesa PIN." };
    }

    const { createCheckoutSession } = await import("./stripe.server");
    try {
      const o = origin();
      const s = await createCheckoutSession({
        amount: Number(plan.price),
        description: `Hotspot: ${plan.name}`,
        renewalId,
        successUrl: `${o}/hotspot?rid=${renewalId}&p=${phone}`,
        cancelUrl: `${o}/hotspot?cancelled=1`,
      });
      await db.from("renewal_requests").update({ gateway: "stripe", checkout_id: s.id, payer_phone: phone }).eq("id", renewalId);
      return { renewalId, mode: "card", checkoutUrl: s.url, message: "Opening secure card checkout…" };
    } catch (e: any) {
      return fail(e?.message ?? "Card checkout could not be started.");
    }
  });

export const hotspotStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ renewalId: z.string().uuid(), phone: z.string().trim().min(9).max(20) }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { normalizePhone } = await import("./mpesa.server");
    const { data: row } = await db
      .from("renewal_requests")
      .select("status, failure_reason, client_id, payer_phone")
      .eq("id", data.renewalId)
      .maybeSingle();
    if (!row || row.payer_phone !== normalizePhone(data.phone)) throw new Error("Payment not found.");
    if (row.status !== "confirmed") {
      return { status: row.status as string, reason: (row.failure_reason as string | null) ?? null, code: null, expiry: null };
    }
    const { data: c } = await db.from("clients").select("username, expiry_date").eq("id", row.client_id).single();
    return { status: "confirmed", reason: null, code: c?.username as string, expiry: c?.expiry_date as string };
  });

export const verifyHotspotLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ username: z.string().trim().min(3).max(60) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const value = data.username.replace(/[,)("']/g, "");
    const { data: rows } = await db
      .from("clients")
      .select("username, status, expiry_date, type")
      .or(`username.eq.${value},username.eq.${value.toUpperCase()}`)
      .limit(1);
    const c = rows?.[0];
    if (!c) throw new Error("We couldn't find that code or account.");
    const expired = c.expiry_date && new Date(`${c.expiry_date}T23:59:59Z`).getTime() < Date.now();
    if (c.status !== "active" || expired) throw new Error("This code or account has expired. Buy a package below to reconnect.");
    return { username: c.username as string, expiry: c.expiry_date as string | null };
  });

export type PortalDesign = {
  blocks: string[];
  title: string;
  subtitle: string;
  brandColor: string;
  supportPhone: string;
  footer: string;
  notice: string | null;
  template: "aurora" | "badge" | "classic" | "tiles";
  welcomeTitle: string;
  welcomeText: string;
  showPrices: boolean;
};

export const getPortalDesign = createServerFn({ method: "GET" }).handler(async (): Promise<PortalDesign> => {
  const db = await admin();
  const { data } = await db.from("app_settings").select("data").eq("section", "pagebuilder").maybeSingle();
  const d = (data?.data ?? {}) as Record<string, any>;
  const { data: hs } = await db.from("app_settings").select("data").eq("section", "hotspot").maybeSingle();
  const h = (hs?.data ?? {}) as Record<string, any>;
  const tpl = ["aurora", "badge", "classic", "tiles"].includes(h.portal_template) ? h.portal_template : "aurora";
  const s = (v: unknown, f: string) => (typeof v === "string" && v.trim() ? v.slice(0, 200) : f);
  const color = s(d.brand_color, "#FA8200");
  return {
    blocks: Array.isArray(d.enabled_blocks) ? d.enabled_blocks.filter((b: unknown) => typeof b === "string") : ["header", "welcome", "pricing", "login", "mpesa", "support"],
    title: s(d.page_title, "CHECK OUR PRICING"),
    subtitle: s(d.page_subtitle, "Choose a plan that fits your needs."),
    brandColor: /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : "#FA8200",
    supportPhone: s(d.support_phone, ""),
    footer: s(d.footer_note, "Powered by ISP360 Billing System"),
    template: tpl,
    welcomeTitle: s(h.welcome_title, "Welcome to Our Network"),
    welcomeText: s(h.welcome_text, "Already have an account or voucher code? Connect now to access high-speed internet."),
    showPrices: h.show_prices !== false,
    notice: typeof d.notice_text === "string" && d.notice_text.trim() ? d.notice_text.slice(0, 300) : null,
  };
});
