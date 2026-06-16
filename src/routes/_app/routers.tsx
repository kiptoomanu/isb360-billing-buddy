import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { testRouter } from "@/lib/mikrotik.functions";
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
import { Plus, Pencil, Trash2, Plug, Loader2, KeyRound, Copy, RefreshCw, Terminal } from "lucide-react";
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
};

function genPassword(len = 24) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%&*-_+=";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

function copy(text: string, label = "Copied") {
  navigator.clipboard.writeText(text).then(() => toast.success(label));
}

function RoutersPage() {
  const [rows, setRows] = useState<Router[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Router | null>(null);
  const [scriptFor, setScriptFor] = useState<Router | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const testFn = useServerFn(testRouter);

  const load = async () => {
    const { data, error } = await supabase
      .from("routers").select("*").order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Router[]);
  };
  useEffect(() => { load(); }, []);

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
    } finally { setTestingId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">MikroTik Routers</h1>
          <p className="text-sm text-muted-foreground">{rows.length} router(s) configured</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Router</Button>
          </DialogTrigger>
          <RouterDialog editing={editing} onClose={(saved) => { setOpen(false); setEditing(null); load(); if (saved) setScriptFor(saved); }} />
        </Dialog>
      </div>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>User</TableHead>
                <TableHead>HTTPS</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No routers yet. Add your first MikroTik.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.host}</TableCell>
                  <TableCell>{r.port}</TableCell>
                  <TableCell>{r.username}</TableCell>
                  <TableCell><Badge variant={r.use_https ? "default" : "secondary"}>{r.use_https ? "HTTPS" : "HTTP"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setScriptFor(r)} title="Generate RouterOS setup script">
                      <Terminal className="h-4 w-4" />
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
        <p className="font-semibold text-foreground mb-1">RouterOS REST API requirements</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Enable <code>www-ssl</code> service on the router (or <code>www</code> for HTTP) and open the port.</li>
          <li>Router must be reachable from the internet (public IP or port-forwarded).</li>
          <li>Create a RouterOS user with <code>api,read,write</code> permissions.</li>
          <li>Tested against RouterOS v7.1+.</li>
          <li>Tip: use the <Terminal className="inline h-3 w-3" /> icon to generate a ready-to-paste RouterOS setup script.</li>
        </ul>
      </Card>

      <Dialog open={!!scriptFor} onOpenChange={(v) => !v && setScriptFor(null)}>
        {scriptFor && <ScriptDialog router={scriptFor} onClose={() => setScriptFor(null)} />}
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
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      name: form.name, host: form.host, port: Number(form.port) || 443,
      username: form.username, password: form.password,
      use_https: form.use_https, notes: form.notes || null,
    };
    const res = editing
      ? await supabase.from("routers").update(payload).eq("id", editing.id).select().single()
      : await supabase.from("routers").insert(payload).select().single();
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Updated" : "Created — generating setup script");
    onClose(res.data as Router);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit" : "Add"} Router</DialogTitle>
        <p className="text-xs text-muted-foreground">After saving, you'll get a ready-to-paste RouterOS script that creates the API user on your MikroTik.</p>
      </DialogHeader>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 pt-2">
        <div className="space-y-1.5 col-span-2"><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main Tower" /></div>
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
        <div className="space-y-1.5 col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <DialogFooter className="col-span-2 mt-2">
          <Button type="submit" disabled={busy} className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            <KeyRound className="h-4 w-4" />
            {editing ? "Save changes" : "Create & generate script"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ScriptDialog({ router, onClose }: { router: Router; onClose: () => void }) {
  const script = useMemo(() => buildRouterOsScript(router), [router]);
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Terminal className="h-5 w-5" /> RouterOS setup script</DialogTitle>
        <p className="text-xs text-muted-foreground">
          Paste this in your MikroTik terminal (WinBox → New Terminal, or SSH). It creates the API user, sets the password,
          enables the REST API service on port {router.port}, and opens the firewall for that port.
        </p>
      </DialogHeader>
      <div className="space-y-3">
        <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-[11px] font-mono leading-relaxed">{script}</pre>
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
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          After running on the router, come back and click the <Plug className="inline h-3 w-3" /> Test button to confirm the link.
        </p>
      </div>
    </DialogContent>
  );
}

function buildRouterOsScript(r: Router) {
  const svc = r.use_https ? "www-ssl" : "www";
  return `# Manu Billing System — MikroTik link setup for "${r.name}"
# Run on RouterOS v7.1+ (paste in terminal).

# 1) Create a dedicated API group with the minimum needed permissions
/user group
add name=manu-api policy=api,rest-api,read,write,test,winbox comment="Manu Billing API"

# 2) Create / update the API user
/user
:if ([:len [find name="${r.username}"]] > 0) do={ set [find name="${r.username}"] password="${r.password}" group=manu-api } else={ add name="${r.username}" password="${r.password}" group=manu-api comment="Manu Billing API" }

# 3) Enable the REST API service on port ${r.port}
/ip service
set ${svc} disabled=no port=${r.port}

# 4) (Optional) Restrict API access to Manu Billing server only — replace 0.0.0.0/0 with the server's public IP/24
# /ip service set ${svc} address=0.0.0.0/0

# 5) Open firewall for the API port (skip if already allowed)
/ip firewall filter
add chain=input action=accept protocol=tcp dst-port=${r.port} comment="Manu Billing API" place-before=0

:put "Manu Billing API user '${r.username}' is ready on ${svc}:${r.port}."
`;
}
