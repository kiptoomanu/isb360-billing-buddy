import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Router = {
  id: string;
  host: string;
  port: number;
  username: string;
  password: string;
  use_https: boolean;
};

async function loadRouter(supabase: any, id: string): Promise<Router> {
  const { data, error } = await supabase
    .from("routers")
    .select("id,host,port,username,password,use_https")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error(error?.message || "Router not found");
  return data as Router;
}

function base(r: Router) {
  const scheme = r.use_https ? "https" : "http";
  return `${scheme}://${r.host}:${r.port}/rest`;
}

function authHeader(r: Router) {
  const token = btoa(`${r.username}:${r.password}`);
  return { Authorization: `Basic ${token}` };
}

async function rosFetch(r: Router, path: string, init: RequestInit = {}) {
  const res = await fetch(`${base(r)}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(r),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = typeof body === "object" && body?.detail ? body.detail : (typeof body === "string" ? body : `HTTP ${res.status}`);
    throw new Error(`MikroTik: ${msg}`);
  }
  return body;
}

/** Find a PPPoE secret or Hotspot user by name, returns RouterOS .id or null. */
async function findByName(r: Router, collection: "ppp/secret" | "ip/hotspot/user", name: string) {
  const list = await rosFetch(r, `/${collection}?name=${encodeURIComponent(name)}`);
  if (Array.isArray(list) && list.length > 0) return list[0][".id"] as string;
  return null;
}

export const testRouter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ routerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const router = await loadRouter(context.supabase, data.routerId);
    try {
      const sys = await rosFetch(router, "/system/resource");
      const info = Array.isArray(sys) ? sys[0] : sys;
      await context.supabase.from("routers").update({
        provision_status: "online",
        last_seen_at: new Date().toISOString(),
        model: info?.["board-name"] ?? null,
      }).eq("id", data.routerId);
      return { ok: true, identity: info };
    } catch (e: any) {
      await context.supabase.from("routers")
        .update({ provision_status: "offline" }).eq("id", data.routerId);
      throw e;
    }
  });


/** Pushes a client (with its plan speed) to its MikroTik router. Reusable from other server functions. */
export async function pushClientToRouter(supabase: any, clientId: string) {
    const { data: client, error } = await supabase
      .from("clients").select("*").eq("id", clientId).single();
    if (error || !client) throw new Error(error?.message || "Client not found");
    if (!client.router_id) throw new Error("Client has no router assigned");
    if (!client.username) throw new Error("Client has no username");

    const router = await loadRouter(supabase, client.router_id);
    const disabled = client.status !== "active" ? "true" : "false";

    // Plan speed → RouterOS rate-limit "upload/download" in kbps
    let rateLimit: string | undefined;
    if (client.plan_id) {
      const { data: plan } = await supabase
        .from("plans").select("download_kbps,upload_kbps").eq("id", client.plan_id).maybeSingle();
      if (plan && (plan.download_kbps || plan.upload_kbps)) {
        rateLimit = `${plan.upload_kbps || plan.download_kbps}k/${plan.download_kbps || plan.upload_kbps}k`;
      }
    }

    if (client.type === "pppoe") {
      const id = await findByName(router, "ppp/secret", client.username);
      const payload: any = {
        name: client.username,
        password: client.username, // placeholder; real impl should store separately
        service: "pppoe",
        disabled,
      };
      if (rateLimit) payload["rate-limit"] = rateLimit;
      if (id) {
        await rosFetch(router, `/ppp/secret/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await rosFetch(router, "/ppp/secret", { method: "PUT", body: JSON.stringify(payload) });
      }
      return { ok: true, action: id ? "updated" : "created", type: "pppoe" };
    }

    if (client.type === "hotspot") {
      const id = await findByName(router, "ip/hotspot/user", client.username);
      const payload: any = {
        name: client.username,
        password: client.username,
        disabled,
      };
      if (id) {
        await rosFetch(router, `/ip/hotspot/user/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await rosFetch(router, "/ip/hotspot/user", { method: "PUT", body: JSON.stringify(payload) });
      }
      return { ok: true, action: id ? "updated" : "created", type: "hotspot" };
    }

    // static: nothing automatic on RouterOS by default
    return { ok: true, action: "skipped", type: "static" };
  });

export const setClientEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clientId: z.string().uuid(), enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: client, error } = await supabase
      .from("clients").select("*").eq("id", data.clientId).single();
    if (error || !client) throw new Error(error?.message || "Client not found");

    const newStatus = data.enabled ? "active" : "suspended";
    await supabase.from("clients").update({ status: newStatus }).eq("id", client.id);

    if (client.router_id && client.username && (client.type === "pppoe" || client.type === "hotspot")) {
      const router = await loadRouter(supabase, client.router_id);
      const collection = client.type === "pppoe" ? "ppp/secret" : "ip/hotspot/user";
      const id = await findByName(router, collection as any, client.username);
      if (id) {
        await rosFetch(router, `/${collection}/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ disabled: data.enabled ? "false" : "true" }),
        });
      }
    }
    return { ok: true, status: newStatus };
  });

export const removeClientFromRouter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clientId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: client, error } = await supabase
      .from("clients").select("*").eq("id", data.clientId).single();
    if (error || !client) throw new Error(error?.message || "Client not found");
    if (!client.router_id || !client.username) return { ok: true, action: "noop" };

    const router = await loadRouter(supabase, client.router_id);
    const collection = client.type === "pppoe" ? "ppp/secret" : client.type === "hotspot" ? "ip/hotspot/user" : null;
    if (!collection) return { ok: true, action: "noop" };

    const id = await findByName(router, collection as any, client.username);
    if (id) await rosFetch(router, `/${collection}/${id}`, { method: "DELETE" });
    return { ok: true, action: "removed" };
  });
