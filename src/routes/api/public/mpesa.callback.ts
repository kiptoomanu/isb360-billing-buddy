import { createFileRoute } from "@tanstack/react-router";
import { settleRenewal } from "@/lib/renewals.server";

type CallbackItem = { Name: string; Value?: string | number };

export const Route = createFileRoute("/api/public/mpesa/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: any;
        try {
          payload = await request.json();
        } catch {
          return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Ignored" }), {
            headers: { "content-type": "application/json" },
          });
        }

        const cb = payload?.Body?.stkCallback;
        const checkoutId: string | undefined = cb?.CheckoutRequestID;
        const resultCode = Number(cb?.ResultCode ?? 1);
        const resultDesc: string = cb?.ResultDesc ?? "M-Pesa payment failed";

        if (checkoutId) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const db = supabaseAdmin as any;
          const { data: req } = await db
            .from("renewal_requests")
            .select("id, status")
            .eq("checkout_id", checkoutId)
            .maybeSingle();

          if (req && req.status === "pending") {
            if (resultCode === 0) {
              const items: CallbackItem[] = cb?.CallbackMetadata?.Item ?? [];
              const get = (name: string) => items.find((i) => i.Name === name)?.Value;
              try {
                await settleRenewal(db, req.id, {
                  gateway: "mpesa",
                  gatewayRef: String(get("MpesaReceiptNumber") ?? checkoutId),
                  payerPhone: get("PhoneNumber") ? String(get("PhoneNumber")) : null,
                });
                await db
                  .from("renewal_requests")
                  .update({ reference: String(get("MpesaReceiptNumber") ?? "") || null })
                  .eq("id", req.id);
              } catch (e: any) {
                console.error("[mpesa] settle failed", e?.message);
              }
            } else {
              await db
                .from("renewal_requests")
                .update({ status: "rejected", failure_reason: resultDesc })
                .eq("id", req.id);
            }
          }
        }

        return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
