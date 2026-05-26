import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { syncClientToRouter, setClientEnabled, removeClientFromRouter } from "@/lib/mikrotik.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, RefreshCw, Power, PowerOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type ClientType = "pppoe" | "static" | "hotspot";

type Client = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  username: string | null;
  type: ClientType;
  status: "active" | "expired" | "suspended";
  monthly_fee: number;
  ip_address: string | null;
  expiry_date: string | null;
  router_id: string | null;
};

type RouterRow = { id: string; name: string };

const labels: Record<ClientType, string> = { pppoe: "PPPoE", static: "Static IP", hotspot: "Hotspot" };

export function ClientsPage({ type }: { type: ClientType }) {
  const [rows, setRows] = useState<Client[]>([]);
  const [routers, setRouters] = useState<RouterRow[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const syncFn = useServerFn(syncClientToRouter);
  const toggleFn = useServerFn(setClientEnabled);
  const removeFn = useServerFn(removeClientFromRouter);

  const load = async () => {
    const [{ data, error }, routersRes] = await Promise.all([
      supabase.from("clients").select("*").eq("type", type).order("created_at", { ascending: false }),
      supabase.from("routers").select("id,name").order("name"),
    ]);
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Client[]);
    setRouters((routersRes.data ?? []) as RouterRow[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [type]);

  const filtered = rows.filter(
    (r) =>
      r.full_name.toLowerCase().includes(q.toLowerCase()) ||
      r.phone?.toLowerCase().includes(q.toLowerCase()) ||
      r.username?.toLowerCase().includes(q.toLowerCase())
  );

  const remove = async (id: string) => {
    if (!confirm("Delete this client? This also removes them from the router if linked.")) return;
    setBusyId(id);
    try { await removeFn({ data: { clientId: id } }); } catch {}
    const { error } = await supabase.from("clients").delete().eq("id", id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const sync = async (id: string) => {
    setBusyId(id);
    try {
      const res: any = await syncFn({ data: { clientId: id } });
      toast.success(`Synced (${res.action})`);
    } catch (e: any) { toast.error(e?.message ?? "Sync failed"); }
    finally { setBusyId(null); load(); }
  };

  const toggle = async (c: Client) => {
    setBusyId(c.id);
    const enabled = c.status !== "active";
    try {
      await toggleFn({ data: { clientId: c.id, enabled } });
      toast.success(enabled ? "Activated" : "Suspended");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusyId(null); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{labels[type]} Clients</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total · sync provisions PPPoE secrets / Hotspot users to MikroTik</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Client</Button>
          </DialogTrigger>
          <ClientDialog type={type} editing={editing} routers={routers} onClose={() => { setOpen(false); setEditing(null); load(); }} />
        </Dialog>
      </div>

      <Card className="p-4">
        <div className="relative mb-3 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients..." className="pl-9" />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Router</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No clients yet. Add your first one.</TableCell></TableRow>
              ) : filtered.map((c) => {
                const routerName = routers.find((r) => r.id === c.router_id)?.name ?? "—";
                const isBusy = busyId === c.id;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>{c.username ?? "—"}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell>{c.ip_address ?? "—"}</TableCell>
                    <TableCell className="text-xs">{routerName}</TableCell>
                    <TableCell>{Number(c.monthly_fee).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "default" : c.status === "expired" ? "destructive" : "secondary"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {(type === "pppoe" || type === "hotspot") && c.router_id && (
                        <>
                          <Button variant="ghost" size="icon" disabled={isBusy} onClick={() => sync(c.id)} title="Sync to router">
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" disabled={isBusy} onClick={() => toggle(c)} title={c.status === "active" ? "Suspend" : "Activate"}>
                            {c.status === "active" ? <PowerOff className="h-4 w-4 text-destructive" /> : <Power className="h-4 w-4 text-primary" />}
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(c.id)} disabled={isBusy}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function ClientDialog({ type, editing, routers, onClose }: { type: ClientType; editing: Client | null; routers: RouterRow[]; onClose: () => void }) {
  const [form, setForm] = useState({
    full_name: editing?.full_name ?? "",
    phone: editing?.phone ?? "",
    email: editing?.email ?? "",
    username: editing?.username ?? "",
    monthly_fee: editing?.monthly_fee?.toString() ?? "0",
    ip_address: editing?.ip_address ?? "",
    expiry_date: editing?.expiry_date ?? "",
    status: editing?.status ?? "active",
    router_id: editing?.router_id ?? "",
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      full_name: form.full_name,
      phone: form.phone || null,
      email: form.email || null,
      username: form.username || null,
      monthly_fee: Number(form.monthly_fee) || 0,
      ip_address: form.ip_address || null,
      expiry_date: form.expiry_date || null,
      status: form.status as Client["status"],
      router_id: form.router_id || null,
      type,
    };
    const res = editing
      ? await supabase.from("clients").update(payload).eq("id", editing.id)
      : await supabase.from("clients").insert(payload);
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Updated" : "Created");
    onClose();
  };

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit" : "Add"} {labels[type]} Client</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 pt-2">
        <Field label="Full name" value={form.full_name} onChange={set("full_name")} required className="col-span-2" />
        <Field label="Username" value={form.username} onChange={set("username")} />
        <Field label="Phone" value={form.phone} onChange={set("phone")} />
        <Field label="Email" type="email" value={form.email} onChange={set("email")} className="col-span-2" />
        <Field label="IP Address" value={form.ip_address} onChange={set("ip_address")} />
        <Field label="Monthly Fee (Ksh)" type="number" value={form.monthly_fee} onChange={set("monthly_fee")} />
        <Field label="Expiry Date" type="date" value={form.expiry_date} onChange={set("expiry_date")} />
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={set("status")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>MikroTik Router</Label>
          <Select value={form.router_id || "none"} onValueChange={(v) => set("router_id")(v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {routers.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="col-span-2 mt-2">
          <Button type="submit" disabled={busy}>{editing ? "Save changes" : "Create client"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({ label, value, onChange, type = "text", required, className = "" }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}
