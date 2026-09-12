import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/provision/$token/checkin")({
  server: {
    handlers: {
      POST: async ({ params, request }) => handleCheckin(params.token, request),
      GET: async ({ params, request }) => handleCheckin(params.token, request),
    },
  },
});

async function handleCheckin(token: string, request: Request) {
  if (!token || token.length < 16) return new Response("Not found", { status: 404 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: router } = await supabaseAdmin
    .from("routers").select("id,host").eq("provision_token", token).maybeSingle();
  if (!router) return new Response("Not found", { status: 404 });

  let payload: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text) payload = JSON.parse(text);
  } catch {
    /* RouterOS may send a malformed body — ignore */
  }
  const url = new URL(request.url);
  const model = String(payload["model"] ?? url.searchParams.get("model") ?? "") || null;
  const version = String(payload["version"] ?? url.searchParams.get("version") ?? "") || null;
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null;

  const now = new Date().toISOString();
  await supabaseAdmin.from("routers").update({
    provision_status: "online",
    checked_in_at: now,
    last_seen_at: now,
    reported_ip: ip,
    os_version: version,
    model,
    auto_configured: true,
    ...(ip && !router.host ? { host: ip } : {}),
  }).eq("id", router.id);

  await supabaseAdmin.from("router_events").insert({
    router_id: router.id,
    stage: "checkin",
    message: `Router checked in${ip ? ` from ${ip}` : ""}${version ? ` — RouterOS ${version}` : ""}`,
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
