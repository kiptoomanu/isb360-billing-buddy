import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { settleRenewal } from "@/lib/renewals.server";

function verify(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("=") as [string, string]),
  );
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });

        const body = await request.text();
        if (!verify(body, request.headers.get("stripe-signature"), secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const event = JSON.parse(body);
        const obj = event?.data?.object ?? {};
        const renewalId: string | undefined = obj?.metadata?.renewal_id ?? obj?.client_reference_id;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        if (event?.type === "checkout.session.completed" && renewalId && obj.payment_status === "paid") {
          try {
            await settleRenewal(db, renewalId, {
              gateway: "stripe",
              gatewayRef: String(obj.payment_intent ?? obj.id ?? ""),
            });
            await db
              .from("renewal_requests")
              .update({ reference: String(obj.payment_intent ?? obj.id ?? "") || null })
              .eq("id", renewalId);
          } catch (e: any) {
            console.error("[stripe] settle failed", e?.message);
          }
        } else if (
          (event?.type === "checkout.session.expired" || event?.type === "checkout.session.async_payment_failed") &&
          renewalId
        ) {
          await db
            .from("renewal_requests")
            .update({ status: "rejected", failure_reason: "Card payment was not completed." })
            .eq("id", renewalId)
            .eq("status", "pending");
        }

        return new Response("ok");
      },
    },
  },
});
