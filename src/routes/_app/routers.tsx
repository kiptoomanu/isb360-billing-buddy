import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { testRouter } from "@/lib/mikrotik.functions";
import { buildRouterOsScript, buildDeprovisionScript, type ScriptOptions } from "@/lib/routeros-script";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Plug, Loader2, KeyRound, Copy, RefreshCw, Terminal, ShieldOff, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/routers")({ component: RoutersPage });

type Router = {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  use_https: boolean;
  notes: string | null;
  provision_status: string;
  provisioned_at: string | null;
  last_seen_at: string | null;
  model: string | null;
  services: string[] | null;
  provision_token?: string | null;
  reported_ip?: string | null;
  os_version?: string | null;
  checked_in_at?: string | null;
};

type RouterEvent = { id: string; stage: string; message: string; created_at: string };

function genPassword(len = 24) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%&*-_+=";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

function copy(text: string, label = "Copied") {
  navigator.clipboard.writeText(text).then(() => toast.success(label));
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    online: { label: "Online", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
    offline: { label: "Offline", cls: "bg-destructive/15 text-destructive border-destructive/30" },
    provisioning: { label: "Provisioning", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
    pending: { label: "Pending", cls: "bg-muted text-muted-foreground border-border" },
  };
  const s = map[status] ?? map["pending"]!;
  return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
}

function RoutersPage() {
  const [rows, setRows] = useState<Router[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Router | null>(null);
  const [scriptFor, setScriptFor] = useState<{ router: Router; reprovision: boolean } | null>(null);
  const [deprovisionFor, setDeprovisionFor] = useState<Router | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const testFn = useServerFn(testRouter);

  const load = async () => {
    const { data, error } = await supabase
      .from("routers").select("*").order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setRows((data ?? []) as unknown as Router[]);
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: rows.length,
    online: rows.filter((r) => r.provision_status === "online").length,
    offline: rows.filter((r) => r.provision_status === "offline").length,
    pending: rows.filter((r) => r.provision_status !== "online" && r.provision_status !== "offline").length,
  }), [rows]);

  const remove = async (id: string) => {
    if (!confirm("Delete this router?")) return;
    const { error } = await supabase.from("routers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const test = async (id: string) => {
    setTestingId(id);
    try {
      const res: any = await testFn({ data: { routerId: id } });
      toast.success(`Connected — ${res?.identity?.["board-name"] ?? "MikroTik"} ${res?.identity?.version ?? ""}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Connection failed");
    } finally { setTestingId(null); load(); }
  };

  /** Rotate the API password and hand back a fresh re-provisioning script. */
  const reprovision = async (r: Router) => {
    const password = genPassword();
    const { data, error } = await supabase.from("routers")
      .update({ password, provision_status: "provisioning" } as never)
      .eq("id", r.id).select().single();
    if (error) return toast.error(error.message);
    toast.success("New credentials generated — paste the script on the router");
    setScriptFor({ router: data as unknown as Router, reprovision: true });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">MikroTik Routers</h1>
          <p className="text-sm text-muted-foreground">Link a router, paste the script, go live with PPPoE or Hotspot.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Link MikroTik</Button>
          </DialogTrigger>
          <RouterDialog editing={editing} onClose={(saved) => { setOpen(false); setEditing(null); load(); if (saved) setScriptFor({ router: saved, reprovision: false }); }} />
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "ROUTERS", value: stats.total, hint: "registered NAS devices" },
          { label: "ONLINE", value: stats.online, hint: "reachable via REST API" },
          { label: "OFFLINE", value: stats.offline, hint: "not responding" },
          { label: "AWAITING SETUP", value: stats.pending, hint: "script not yet applied" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.hint}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Router</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Services</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No routers yet. Link your first MikroTik.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">RouterOS {r.model ?? "—"}</div>
                  </TableCell>
                  <TableCell><StatusBadge status={r.provision_status} /></TableCell>
                  <TableCell className="font-mono text-xs">{r.host}:{r.port}</TableCell>
                  <TableCell>{r.username}</TableCell>
                  <TableCell className="text-xs uppercase text-muted-foreground">{(r.services ?? []).join(", ") || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button variant="ghost" size="icon" onClick={() => setScriptFor({ router: r, reprovision: false })} title="Generate setup script">
                      <Terminal className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => reprovision(r)} title="Re-provision (rotate credentials + new script)">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeprovisionFor(r)} title="Remove integration script">
                      <ShieldOff className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => test(r.id)} disabled={testingId === r.id} title="Test connection">
                      {testingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-4 text-xs text-muted-foreground">
        <p className="mb-1 font-semibold text-foreground">RouterOS REST API requirements</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Enable <code>www-ssl</code> (or <code>www</code> for HTTP) and open the port.</li>
          <li>Router must be reachable from the internet (public IP or port-forward).</li>
          <li>Tested against RouterOS v7.1+.</li>
          <li><Terminal className="inline h-3 w-3" /> generates the setup script, <RotateCcw className="inline h-3 w-3" /> rotates the API password and re-provisions, <ShieldOff className="inline h-3 w-3" /> removes Manu access from the router.</li>
        </ul>
      </Card>

      <Dialog open={!!scriptFor} onOpenChange={(v) => !v && setScriptFor(null)}>
        {scriptFor && <ScriptDialog router={scriptFor.router} reprovision={scriptFor.reprovision} onClose={() => { setScriptFor(null); load(); }} />}
      </Dialog>

      <Dialog open={!!deprovisionFor} onOpenChange={(v) => !v && setDeprovisionFor(null)}>
        {deprovisionFor && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><ShieldOff className="h-5 w-5" /> Remove Manu from {deprovisionFor.name}</DialogTitle>
              <p className="text-xs text-muted-foreground">Paste this on the router to delete the API user, group, and firewall rule.</p>
            </DialogHeader>
            <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 font-mono text-[11px] leading-relaxed">{buildDeprovisionScript(deprovisionFor)}</pre>
            <DialogFooter>
              <Button onClick={() => copy(buildDeprovisionScript(deprovisionFor), "Script copied")} className="gap-2"><Copy className="h-4 w-4" /> Copy script</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function RouterDialog({ editing, onClose }: { editing: Router | null; onClose: (saved: Router | null) => void }) {
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    host: editing?.host ?? "",
    port: editing?.port?.toString() ?? "443",
    username: editing?.username ?? "manu-api",
    password: editing?.password ?? genPassword(),
    use_https: editing?.use_https ?? true,
    notes: editing?.notes ?? "",
    pppoe: (editing?.services ?? ["pppoe"]).includes("pppoe"),
    hotspot: (editing?.services ?? []).includes("hotspot"),
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const services = [form.pppoe && "pppoe", form.hotspot && "hotspot"].filter(Boolean) as string[];
    const payload = {
      name: form.name, host: form.host, port: Number(form.port) || 443,
      username: form.username, password: form.password,
      use_https: form.use_https, notes: form.notes || null,
      services, provision_status: "provisioning",
    };
    const res = editing
      ? await supabase.from("routers").update(payload as never).eq("id", editing.id).select().single()
      : await supabase.from("routers").insert(payload as never).select().single();
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Updated — regenerating script" : "Created — generating setup script");
    onClose(res.data as unknown as Router);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit" : "Link a"} MikroTik</DialogTitle>
        <p className="text-xs text-muted-foreground">After saving you get a ready-to-paste RouterOS provisioning script.</p>
      </DialogHeader>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 pt-2">
        <div className="col-span-2 space-y-1.5"><Label>Router identity</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="MikroTik4" /></div>
        <div className="space-y-1.5"><Label>Host / IP</Label><Input required value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="192.0.2.10" /></div>
        <div className="space-y-1.5"><Label>Port</Label><Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>API Username</Label><Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
        <div className="space-y-1.5">
          <Label>API Password</Label>
          <div className="flex gap-1">
            <Input type="text" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" title="Regenerate" onClick={() => setForm({ ...form, password: genPassword() })}><RefreshCw className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="icon" title="Copy" onClick={() => copy(form.password, "Password copied")}><Copy className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="col-span-2 flex items-center justify-between rounded-md border p-3">
          <div><Label>Use HTTPS</Label><p className="text-xs text-muted-foreground">Recommended — requires www-ssl service.</p></div>
          <Switch checked={form.use_https} onCheckedChange={(v) => setForm({ ...form, use_https: v })} />
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label>PPPoE service</Label>
            <Switch checked={form.pppoe} onCheckedChange={(v) => setForm({ ...form, pppoe: v })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label>Hotspot service</Label>
            <Switch checked={form.hotspot} onCheckedChange={(v) => setForm({ ...form, hotspot: v })} />
          </div>
        </div>
        <div className="col-span-2 space-y-1.5"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <DialogFooter className="col-span-2 mt-2">
          <Button type="submit" disabled={busy} className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            <KeyRound className="h-4 w-4" />
            {editing ? "Save & regenerate script" : "Create & generate script"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ScriptDialog({ router, reprovision, onClose }: { router: Router; reprovision: boolean; onClose: () => void }) {
  const [opts, setOpts] = useState<ScriptOptions>({
    reprovision,
    allowedAddress: "",
    pppoe: (router.services ?? ["pppoe"]).includes("pppoe"),
    hotspot: (router.services ?? []).includes("hotspot"),
    pool: "10.10.0.2-10.10.0.254",
  });
  const script = useMemo(() => buildRouterOsScript(router, opts), [router, opts]);

  const markProvisioned = async () => {
    await supabase.from("routers").update({
      provision_status: "provisioning", provisioned_at: new Date().toISOString(),
    } as never).eq("id", router.id);
    toast.success("Marked as provisioned — run Test to confirm the link");
    onClose();
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" /> {reprovision ? "Re-provisioning" : "Provisioning"} script — {router.name}
        </DialogTitle>
        <p className="text-xs text-muted-foreground">
          {reprovision
            ? "Credentials were rotated. This script removes the old Manu user and re-creates everything with the new password."
            : `Creates the API user, enables the REST API on port ${router.port}, opens the firewall, and scaffolds the selected services.`}
        </p>
      </DialogHeader>

      <AutoSetup router={router} />

      <div className="grid grid-cols-2 gap-3 rounded-md border p-3">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Restrict API to address / CIDR (optional)</Label>
          <Input value={opts.allowedAddress} onChange={(e) => setOpts({ ...opts, allowedAddress: e.target.value })} placeholder="102.68.10.5/32" className="font-mono text-xs" />
        </div>
        <div className="flex items-center justify-between"><Label className="text-xs">Include PPPoE setup</Label><Switch checked={!!opts.pppoe} onCheckedChange={(v) => setOpts({ ...opts, pppoe: v })} /></div>
        <div className="flex items-center justify-between"><Label className="text-xs">Include Hotspot setup</Label><Switch checked={!!opts.hotspot} onCheckedChange={(v) => setOpts({ ...opts, hotspot: v })} /></div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Client IP pool</Label>
          <Input value={opts.pool} onChange={(e) => setOpts({ ...opts, pool: e.target.value })} className="font-mono text-xs" />
        </div>
        <div className="col-span-2 flex items-center justify-between">
          <Label className="text-xs">Clean previous Manu objects first (re-provision)</Label>
          <Switch checked={!!opts.reprovision} onCheckedChange={(v) => setOpts({ ...opts, reprovision: v })} />
        </div>
      </div>

      <div className="space-y-3">
        <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 font-mono text-[11px] leading-relaxed">{script}</pre>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => copy(script, "Script copied — paste in RouterOS terminal")} className="gap-2">
            <Copy className="h-4 w-4" /> Copy script
          </Button>
          <Button variant="outline" onClick={() => {
            const blob = new Blob([script], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `${router.name.replace(/\W+/g, "-")}-mikrotik-setup.rsc`;
            a.click(); URL.revokeObjectURL(url);
          }}>Download .rsc</Button>
          <Button variant="secondary" onClick={markProvisioned}>I've run it</Button>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          After running it on the router, click <Plug className="inline h-3 w-3" /> Test to confirm the link goes Online.
        </p>
      </div>
    </DialogContent>
  );
}
