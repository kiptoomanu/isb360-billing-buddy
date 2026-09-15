import { createFileRoute } from "@tanstack/react-router";
import { buildAutoProvisionScript } from "@/lib/provision-script";

export const Route = createFileRoute("/api/public/provision/$token")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const token = params.token;
        if (!token || token.length < 16) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: router } = await supabaseAdmin
          .from("routers")
          .select("id,name,username,password,port,use_https,services,auto_bridge,bridge_name,bridge_ports,uplink_port")
          .eq("provision_token", token)
          .maybeSingle();
        if (!router) return new Response("Not found", { status: 404 });

        const origin = new URL(request.url).origin;
        const script = buildAutoProvisionScript({
          name: router.name,
          username: router.username,
          password: router.password,
          port: router.port,
          use_https: router.use_https,
          services: (router.services as string[] | null) ?? ["pppoe"],
          autoBridge: (router as any).auto_bridge ?? true,
          bridgeName: (router as any).bridge_name ?? undefined,
          bridgePorts: ((router as any).bridge_ports as string[] | null) ?? undefined,
          uplinkPort: (router as any).uplink_port ?? undefined,
          origin,
          token,
        });

        await supabaseAdmin.from("routers")
          .update({ provision_status: "provisioning", provisioned_at: new Date().toISOString() })
          .eq("id", router.id);
        await supabaseAdmin.from("router_events").insert({
          router_id: router.id, stage: "fetch", message: "Router downloaded the provisioning script",
        });

        return new Response(script, {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
