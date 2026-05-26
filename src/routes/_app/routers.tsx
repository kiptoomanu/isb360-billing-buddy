import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Plus, Pencil, Trash2, Plug, Loader2 } from "lucide-react";
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

function RoutersPage() {
  const [rows, setRows] = useState<Router[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Router | null>(null);
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
          <RouterDialog editing={editing} onClose={() => { setOpen(false); setEditing(null); load(); }} />
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
        </ul>
      </Card>
    </div>
  );
}

function RouterDialog({ editing, onClose }: { editing: Router | null; onClose: () => void }) {
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    host: editing?.host ?? "",
    port: editing?.port?.toString() ?? "443",
    username: editing?.username ?? "",
    password: editing?.password ?? "",
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
      ? await supabase.from("routers").update(payload).eq("id", editing.id)
      : await supabase.from("routers").insert(payload);
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Updated" : "Created"); onClose();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Router</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 pt-2">
        <div className="space-y-1.5 col-span-2"><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main Tower" /></div>
        <div className="space-y-1.5"><Label>Host / IP</Label><Input required value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="192.0.2.10" /></div>
        <div className="space-y-1.5"><Label>Port</Label><Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Username</Label><Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Password</Label><Input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <div className="col-span-2 flex items-center justify-between rounded-md border p-3">
          <div><Label>Use HTTPS</Label><p className="text-xs text-muted-foreground">Recommended — requires www-ssl service.</p></div>
          <Switch checked={form.use_https} onCheckedChange={(v) => setForm({ ...form, use_https: v })} />
        </div>
        <div className="space-y-1.5 col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <DialogFooter className="col-span-2 mt-2">
          <Button type="submit" disabled={busy}>{editing ? "Save changes" : "Create router"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
