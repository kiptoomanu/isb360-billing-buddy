import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Layers, Pencil, Plus, Search, Trash2, Gauge } from "lucide-react";
import { toast } from "sonner";

type Plan = {
  id: string;
  name: string;
  type: "pppoe" | "static" | "hotspot";
  download_kbps: number;
  upload_kbps: number;
  price: number;
  validity_days: number;
  device_limit: number;
  description: string | null;
  active: boolean;
};

const db = supabase as any;

const speed = (kbps: number) =>
  kbps >= 1000 ? `${(kbps / 1000).toFixed(kbps % 1000 === 0 ? 0 : 1)} Mbps` : `${kbps} kbps`;

const empty = {
  name: "",
  type: "pppoe" as Plan["type"],
  download_kbps: "5000",
  upload_kbps: "5000",
  price: "1500",
  validity_days: "30",
  device_limit: "1",
  description: "",
  active: true,
};

function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);

  const load = async () => {
    const { data, error } = await db
      .from("plans")
      .select("*")
      .order("type", { ascending: true })
      .order("price", { ascending: true });
    if (error) return toast.error(error.message);
    setPlans((data ?? []) as Plan[]);
  };

  useEffect(() => { load(); }, []);

  const remove = async (p: Plan) => {
    const { error } = await db.from("plans").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Plan deleted");
    load();
  };

  const filtered = plans.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const activeCount = plans.filter((p) => p.active).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Plans &amp; Packages</h1>
          <p className="text-sm text-muted-foreground">
            {plans.length} plans · {activeCount} active
          </p>
        </div>
        <Button className="gap-2" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" /> New plan
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(["pppoe", "static", "hotspot"] as const).map((t) => (
          <Card key={t} className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Layers className="h-4 w-4" /> {t}
            </div>
            <div className="mt-1 text-2xl font-bold">{plans.filter((p) => p.type === t).length}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="relative mb-3 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search plans..." className="pl-9" />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Devices</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No plans yet. Create your first package.
                  </TableCell>
                </TableRow>
              ) : filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                  </TableCell>
                  <TableCell className="text-xs uppercase">{p.type}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <span className="inline-flex items-center gap-1">
                      <Gauge className="h-3 w-3 text-muted-foreground" />
                      {speed(p.download_kbps)} / {speed(p.upload_kbps)}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold">KSh {Number(p.price).toLocaleString()}</TableCell>
                  <TableCell>{p.validity_days} days</TableCell>
                  <TableCell>{p.device_limit}</TableCell>
                  <TableCell>
                    <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(p)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <PlanDialog
          key={editing?.id ?? "new"}
          plan={editing}
          onClose={() => { setOpen(false); load(); }}
        />
      </Dialog>
    </div>
  );
}

function PlanDialog({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const [f, setF] = useState(
    plan
      ? {
          name: plan.name,
          type: plan.type,
          download_kbps: String(plan.download_kbps),
          upload_kbps: String(plan.upload_kbps),
          price: String(plan.price),
          validity_days: String(plan.validity_days),
          device_limit: String(plan.device_limit),
          description: plan.description ?? "",
          active: plan.active,
        }
      : empty,
  );
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof empty, v: any) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return toast.error("Plan name is required");
    setBusy(true);
    const payload = {
      name: f.name.trim(),
      type: f.type,
      download_kbps: Number(f.download_kbps) || 0,
      upload_kbps: Number(f.upload_kbps) || 0,
      price: Number(f.price) || 0,
      validity_days: Number(f.validity_days) || 30,
      device_limit: Number(f.device_limit) || 1,
      description: f.description.trim() || null,
      active: f.active,
    };
    const { error } = plan
      ? await db.from("plans").update(payload).eq("id", plan.id)
      : await db.from("plans").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(plan ? "Plan updated" : "Plan created");
    onClose();
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{plan ? "Edit plan" : "New plan"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-2">
          <Label>Plan name</Label>
          <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Home 10Mbps" />
        </div>
        <div className="grid gap-2">
          <Label>Service type</Label>
          <Select value={f.type} onValueChange={(v) => set("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pppoe">PPPoE</SelectItem>
              <SelectItem value="static">Static IP</SelectItem>
              <SelectItem value="hotspot">Hotspot</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Download (kbps)</Label>
            <Input type="number" value={f.download_kbps} onChange={(e) => set("download_kbps", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Upload (kbps)</Label>
            <Input type="number" value={f.upload_kbps} onChange={(e) => set("upload_kbps", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Price (KSh)</Label>
            <Input type="number" value={f.price} onChange={(e) => set("price", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Validity (days)</Label>
            <Input type="number" value={f.validity_days} onChange={(e) => set("validity_days", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Device limit</Label>
            <Input type="number" value={f.device_limit} onChange={(e) => set("device_limit", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Description</Label>
          <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={2} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Active</div>
            <div className="text-xs text-muted-foreground">Inactive plans can't be assigned to new clients</div>
          </div>
          <Switch checked={f.active} onCheckedChange={(v) => set("active", v)} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={busy}>{busy ? "Saving..." : plan ? "Save changes" : "Create plan"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export const Route = createFileRoute("/_app/plans")({
  component: PlansPage,
  head: () => ({
    meta: [
      { title: "Plans & Packages | ISP360 Billing System" },
      { name: "description", content: "Create and manage internet plans: speeds, pricing, validity and device limits for PPPoE, Static IP and Hotspot clients." },
      { property: "og:title", content: "Plans & Packages | ISP360 Billing System" },
      { property: "og:description", content: "Manage ISP service packages with speed, pricing and validity settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
