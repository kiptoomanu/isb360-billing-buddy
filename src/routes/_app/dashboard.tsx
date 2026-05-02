import { createFileRoute, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-6">
        <p className="text-destructive">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-2 text-sm underline">Retry</button>
      </div>
    );
  },
});

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Flame, Clock, Calendar, ArrowLeftRight, Wifi, Network, Radio, RefreshCw, MapPin } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Counts = { today: number; week: number; month: number };

function Dashboard() {
  const [total, setTotal] = useState<Counts>({ today: 0, week: 0, month: 0 });
  const [pppoe, setPppoe] = useState<Counts>({ today: 0, week: 0, month: 0 });
  const [stat, setStat] = useState<Counts>({ today: 0, week: 0, month: 0 });
  const [hot, setHot] = useState<Counts>({ today: 0, week: 0, month: 0 });
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const week = new Date(); week.setDate(week.getDate() - 7);
    const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);

    async function counts(type?: "pppoe" | "static" | "hotspot"): Promise<Counts> {
      const make = (since: Date) => {
        let q = supabase.from("clients").select("id", { count: "exact", head: true }).gte("created_at", since.toISOString());
        if (type) q = q.eq("type", type);
        return q;
      };
      const [t, w, m] = await Promise.all([make(today), make(week), make(month)]);
      return { today: t.count ?? 0, week: w.count ?? 0, month: m.count ?? 0 };
    }
    const [a, b, c, d] = await Promise.all([counts(), counts("pppoe"), counts("static"), counts("hotspot")]);
    setTotal(a); setPppoe(b); setStat(c); setHot(d);
  };

  useEffect(() => {
    load();
    if (!autoRefresh) return;
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const days = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, amount: Math.random() < 0.15 ? Math.round(Math.random() * 140) : 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back to Manu Billing System</p>
      </div>

      <div className="flex justify-end">
        <Button className="gap-2"><MapPin className="h-4 w-4" /> Show Clients Map View</Button>
      </div>

      <CategoryGrid />

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Station Sales Analytics</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Daily sales breakdown for selected station</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={days} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="amount" fill="var(--success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-xl bg-primary px-4 py-3 text-primary-foreground">
              <div className="text-xs opacity-90">Today's Sales</div>
              <div className="text-xl font-bold">Ksh. 0.00</div>
            </div>
            <div className="rounded-xl bg-success px-4 py-3 text-success-foreground">
              <div className="text-xs opacity-90">This Month's Sales</div>
              <div className="text-xl font-bold">Ksh. 0.00</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Client Statistics</CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Auto-refresh</span>
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-info/10 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-info text-info-foreground">
                <Flame className="h-3.5 w-3.5" />
              </span>
              <span className="font-semibold">Total New Clients</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat icon={Clock} bg="bg-info" label="Today" value={total.today} />
              <Stat icon={Calendar} bg="bg-primary" label="This Week" value={total.week} />
              <Stat icon={ArrowLeftRight} bg="bg-[oklch(0.6_0.22_295)]" label="This Month" value={total.month} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <TypeBlock title="PPPoE Clients" icon={Wifi} tint="bg-success/15" iconBg="bg-success" data={pppoe} />
            <TypeBlock title="Static Clients" icon={Network} tint="bg-warning/15" iconBg="bg-warning" data={stat} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TypeBlock title="Hotspot Clients" icon={Radio} tint="bg-accent" iconBg="bg-[oklch(0.6_0.22_295)]" data={hot} />
            <div className="hidden sm:block" />
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={load} className="gap-1 text-info">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, bg, label, value }: { icon: any; bg: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-card p-3">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${bg}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="text-right">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="text-lg font-bold">{value}</div>
      </div>
    </div>
  );
}

function TypeBlock({ title, icon: Icon, tint, iconBg, data }: { title: string; icon: any; tint: string; iconBg: string; data: Counts }) {
  return (
    <div className={`rounded-xl p-4 ${tint}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${iconBg}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="font-semibold">{title}</span>
      </div>
      <div className="space-y-1.5">
        {[["Today", data.today], ["This Week", data.week], ["This Month", data.month]].map(([l, v]) => (
          <div key={l as string} className="flex items-center justify-between rounded-md bg-card px-3 py-2 text-sm">
            <span className="text-muted-foreground">{l}</span>
            <span className="font-semibold">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryGrid() {
  const cats = [
    { label: "All Static", tag: "Static", style: { background: "var(--gradient-static)" } },
    { label: "All PPPoE", tag: "PPPoE", style: { background: "linear-gradient(135deg, oklch(0.95 0.06 80 / .5), oklch(0.97 0.03 80 / .3))" } },
    { label: "All Expired", tag: "Attention", style: { background: "var(--gradient-attention)" } },
    { label: "All Paid", tag: "Live", style: { background: "var(--gradient-live)" } },
    { label: "All Paid", tag: "Static", style: { background: "var(--gradient-static)" } },
    { label: "All Paid", tag: "PPPoE", style: { background: "var(--gradient-hotspot)" } },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cats.map((c, i) => (
        <div key={i} className="relative h-24 rounded-2xl border border-border/40 p-4 shadow-[var(--shadow-card)]" style={c.style}>
          <span className="absolute right-3 top-3 rounded-full bg-card px-3 py-1 text-xs font-semibold">{c.tag}</span>
          <div className="absolute bottom-3 right-4 flex items-center gap-1.5 text-sm font-medium text-primary">
            {c.label} <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          </div>
        </div>
      ))}
    </div>
  );
}
