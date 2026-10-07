import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Router as RouterIcon, Users, Wallet, Wifi } from "lucide-react";

const db = supabase as any;
type Row = {
  id: string; full_name: string; username: string | null; phone: string | null; type: string; status: string;
  expiry_date: string | null; router_id: string | null;
  plans: { name: string; download_kbps: number; price: number } | null;
};
type RouterRow = { id: string; name: string; provision_status: string; last_seen_at: string | null };
type Pay = { client_id: string; amount: number; confirmed_at: string; method: string; gateway: string | null };

const money = (n: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);
const when = (s: string | null) => (s ? new Date(s).toLocaleString() : "—");

function RouterDashboard() {
  const [routers, setRouters] = useState<RouterRow[]>([]);
  const [clients, setClients] = useState<Row[]>([]);
  const [pays, setPays] = useState<Record<string, Pay>>({});
  const [routerId, setRouterId] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [r, c, p] = await Promise.all([
        db.from("routers").select("id, name, provision_status, last_seen_at").order("name"),
        db.from("clients").select("id, full_name, username, phone, type, status, expiry_date, router_id, plans(name, download_kbps, price)").eq("status", "active").order("full_name"),
        db.from("renewal_requests").select("client_id, amount, confirmed_at, method, gateway").eq("status", "confirmed").not("confirmed_at", "is", null).order("confirmed_at", { ascending: false }).limit(1000),
      ]);
      setRouters(r.data ?? []);
      setClients(c.data ?? []);
      const latest: Record<string, Pay> = {};
      for (const x of (p.data ?? []) as Pay[]) if (!latest[x.client_id]) latest[x.client_id] = x;
      setPays(latest);
      setLoading(false);
    })();
  }, []);

  const list = useMemo(() => clients.filter((c) =>
    (routerId === "all" || c.router_id === routerId) &&
    (!q || `${c.full_name} ${c.username ?? ""} ${c.phone ?? ""}`.toLowerCase().includes(q.toLowerCase()))), [clients, routerId, q]);
  const routerName = (id: string | null) => routers.find((r) => r.id === id)?.name ?? "Unassigned";
  const online = routers.filter((r) => r.provision_status === "online").length;
  const revenue = list.reduce((s, c) => s + Number(pays[c.id]?.amount ?? 0), 0);

  const stat = (icon: React.ReactNode, label: string, value: string) => (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Router Dashboard</h1>
        <p className="text-sm text-muted-foreground">Active customers on each MikroTik, their package and when their last payment was confirmed.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stat(<RouterIcon className="h-5 w-5" />, "Routers online", `${online} / ${routers.length}`)}
        {stat(<Users className="h-5 w-5" />, "Active customers", String(list.length))}
        {stat(<Wifi className="h-5 w-5" />, "Hotspot / PPPoE", `${list.filter((c) => c.type === "hotspot").length} / ${list.filter((c) => c.type === "pppoe").length}`)}
        {stat(<Wallet className="h-5 w-5" />, "Last payments total", money(revenue))}
      </div>
      <div className="flex flex-wrap gap-2">
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={routerId} onChange={(e) => setRouterId(e.target.value)}>
          <option value="all">All routers</option>
          {routers.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.provision_status})</option>)}
        </select>
        <Input className="max-w-xs" placeholder="Search name, code or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Customer</th><th className="p-3">Router</th><th className="p-3">Package</th><th className="p-3">Expires</th><th className="p-3">Payment confirmed</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!loading && list.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No active customers.</td></tr>}
            {list.map((c) => {
              const p = pays[c.id];
              return (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3"><div className="font-medium">{c.full_name}</div><div className="text-xs text-muted-foreground">{c.username ?? "—"} · {c.phone ?? "—"}</div></td>
                  <td className="p-3">{routerName(c.router_id)}</td>
                  <td className="p-3">{c.plans ? <>{c.plans.name} <Badge variant="secondary" className="ml-1">{c.type}</Badge></> : <span className="text-muted-foreground">No package</span>}</td>
                  <td className="p-3">{c.expiry_date ?? "—"}</td>
                  <td className="p-3">{p ? <><div>{when(p.confirmed_at)}</div><div className="text-xs text-muted-foreground">{money(Number(p.amount))} · {p.gateway ?? p.method}</div></> : <span className="text-muted-foreground">No payment yet</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_app/router-dashboard")({
  component: RouterDashboard,
  head: () => ({
    meta: [
      { title: "Router Dashboard | ISP360 Billing System" },
      { name: "description", content: "Active customers per MikroTik router with packages and payment confirmation times." },
      { property: "og:title", content: "Router Dashboard | ISP360 Billing System" },
      { property: "og:description", content: "See who is online on each router and when they paid." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
