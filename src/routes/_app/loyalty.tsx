import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
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
import { Award, Gift, Search, Trophy } from "lucide-react";
import { toast } from "sonner";

type ClientRow = {
  id: string;
  full_name: string;
  type: string;
  status: string;
  loyalty_points: number;
};

type Txn = {
  id: string;
  client_id: string;
  points: number;
  reason: string | null;
  created_at: string;
};

const db = supabase as any;

const tier = (p: number) =>
  p >= 500 ? { label: "Platinum", variant: "default" as const }
  : p >= 250 ? { label: "Gold", variant: "default" as const }
  : p >= 100 ? { label: "Silver", variant: "secondary" as const }
  : { label: "Bronze", variant: "outline" as const };

function LoyaltyPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const load = async () => {
    const [c, t] = await Promise.all([
      db.from("clients").select("id,full_name,type,status,loyalty_points").order("loyalty_points", { ascending: false }),
      db.from("loyalty_transactions").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (c.error) return toast.error(c.error.message);
    setClients((c.data ?? []) as ClientRow[]);
    setTxns((t.data ?? []) as Txn[]);
  };

  useEffect(() => { load(); }, []);

  const filtered = clients.filter((c) => c.full_name.toLowerCase().includes(q.toLowerCase()));
  const totalPoints = clients.reduce((s, c) => s + (c.loyalty_points ?? 0), 0);
  const nameOf = (id: string) => clients.find((c) => c.id === id)?.full_name ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Loyalty Points</h1>
          <p className="text-sm text-muted-foreground">
            {totalPoints.toLocaleString()} points issued across {clients.length} clients
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Award className="h-4 w-4" /> Award / Redeem</Button>
          </DialogTrigger>
          <PointsDialog clients={clients} onClose={() => { setOpen(false); load(); }} />
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
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No clients found.</TableCell></TableRow>
              ) : filtered.map((c) => {
                const t = tier(c.loyalty_points ?? 0);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell className="uppercase text-xs">{c.type}</TableCell>
                    <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                    <TableCell className="font-semibold">{c.loyalty_points ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={t.variant} className="gap-1"><Trophy className="h-3 w-3" />{t.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Gift className="h-4 w-4" /> Recent activity</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txns.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No loyalty activity yet.</TableCell></TableRow>
              ) : txns.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs">{new Date(t.created_at).toLocaleString()}</TableCell>
                  <TableCell>{nameOf(t.client_id)}</TableCell>
                  <TableCell className={t.points >= 0 ? "text-primary font-medium" : "text-destructive font-medium"}>
                    {t.points >= 0 ? `+${t.points}` : t.points}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function PointsDialog({ clients, onClose }: { clients: ClientRow[]; onClose: () => void }) {
  const [clientId, setClientId] = useState("");
  const [mode, setMode] = useState<"award" | "redeem">("award");
  const [amount, setAmount] = useState("10");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return toast.error("Pick a client");
    const n = Math.abs(Number(amount) || 0);
    if (!n) return toast.error("Enter a point amount");
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await db.from("loyalty_transactions").insert({
      client_id: clientId,
      points: mode === "award" ? n : -n,
      reason: reason || (mode === "award" ? "Points awarded" : "Points redeemed"),
      created_by: auth.user?.id ?? null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(mode === "award" ? `Awarded ${n} points` : `Redeemed ${n} points`);
    onClose();
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Award or redeem points</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3 pt-2">
        <div className="space-y-1.5">
          <Label>Client</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.full_name} ({c.loyalty_points ?? 0} pts)</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Action</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as "award" | "redeem")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="award">Award</SelectItem>
                <SelectItem value="redeem">Redeem</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Points</Label>
            <Input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. On-time monthly payment" />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={busy}>Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export const Route = createFileRoute("/_app/loyalty")({
  component: LoyaltyPage,
  head: () => ({
    meta: [
      { title: "Loyalty Points | Manu Billing System" },
      { name: "description", content: "Award and redeem loyalty points for internet clients across PPPoE, Static IP and Hotspot services." },
      { property: "og:title", content: "Loyalty Points | Manu Billing System" },
      { property: "og:description", content: "Track client loyalty tiers, award points and redeem rewards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
