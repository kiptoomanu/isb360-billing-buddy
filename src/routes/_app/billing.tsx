import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Loader2, RefreshCw, Undo2, Wallet, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  listRenewals, confirmRenewal, refundRenewal, rejectRenewal,
  type BillingRenewal,
} from "@/lib/billing.functions";

const money = (n: number) => `KSh ${Number(n ?? 0).toLocaleString()}`;
const when = (s: string | null) => (s ? new Date(s).toLocaleString() : "—");

const statusBadge = (s: string) =>
  s === "confirmed" ? <Badge>Paid</Badge>
  : s === "refunded" ? <Badge variant="secondary">Refunded</Badge>
  : s === "rejected" ? <Badge variant="outline">Rejected</Badge>
  : <Badge variant="outline">Pending</Badge>;

function BillingPage() {
  const [tab, setTab] = useState<"pending" | "confirmed" | "refunded" | "all">("pending");
  const [rows, setRows] = useState<BillingRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<BillingRenewal | null>(null);

  const fetchRenewals = useServerFn(listRenewals);
  const confirmFn = useServerFn(confirmRenewal);
  const rejectFn = useServerFn(rejectRenewal);
  const refundFn = useServerFn(refundRenewal);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchRenewals({ data: { status: tab } }));
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load renewals");
    } finally {
      setLoading(false);
    }
  }, [fetchRenewals, tab]);

  useEffect(() => { load(); }, [load]);

  const confirm = async (r: BillingRenewal) => {
    setBusy(r.id);
    try {
      const res: any = await confirmFn({ data: { id: r.id } });
      toast.success(`Payment confirmed — active until ${res.expiry}`, { description: res.sync ?? undefined });
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Could not confirm"); }
    finally { setBusy(null); }
  };

  const reject = async (r: BillingRenewal) => {
    setBusy(r.id);
    try { await rejectFn({ data: { id: r.id } }); toast.success("Request rejected"); await load(); }
    catch (e: any) { toast.error(e?.message ?? "Could not reject"); }
    finally { setBusy(null); }
  };

  const pendingTotal = rows.filter((r) => r.status === "pending").reduce((s, r) => s + Number(r.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing portal</h1>
        <p className="text-sm text-muted-foreground">
          Renewal requests sent from the customer portal — confirm payments or issue refunds.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Requests shown</div>
          <div className="mt-1 text-2xl font-semibold">{rows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Awaiting confirmation</div>
          <div className="mt-1 text-2xl font-semibold">{rows.filter((r) => r.status === "pending").length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Value pending</div>
          <div className="mt-1 text-2xl font-semibold">{money(pendingTotal)}</div>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="confirmed">Paid</TabsTrigger>
            <TabsTrigger value="refunded">Refunded</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} />
        </Tabs>
        <Button variant="outline" size="sm" className="gap-2" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              </TableCell></TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                <Wallet className="mx-auto mb-2 h-5 w-5" /> Nothing here yet.
              </TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.client?.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.client?.username ?? r.client?.phone ?? "—"} · expires {r.client?.expiry_date ?? "—"}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{r.plan?.name ?? "—"}</TableCell>
                <TableCell className="font-medium">{money(Number(r.amount))}</TableCell>
                <TableCell className="text-xs uppercase">
                  {r.method}
                  {r.reference && <div className="font-mono text-[11px] text-muted-foreground">{r.reference}</div>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{when(r.created_at)}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-right">
                  {r.status === "pending" && (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" className="gap-1" disabled={busy === r.id} onClick={() => confirm(r)}>
                        {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Confirm payment
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1" disabled={busy === r.id} onClick={() => reject(r)}>
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                  {r.status === "confirmed" && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setRefunding(r)}>
                      <Undo2 className="h-3.5 w-3.5" /> Refund
                    </Button>
                  )}
                  {r.status === "refunded" && (
                    <span className="text-xs text-muted-foreground">
                      {money(Number(r.refund_amount ?? 0))} on {when(r.refunded_at)}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!refunding} onOpenChange={(o) => !o && setRefunding(null)}>
        {refunding && (
          <RefundDialog
            row={refunding}
            onDone={async () => { setRefunding(null); await load(); }}
            refundFn={refundFn}
          />
        )}
      </Dialog>
    </div>
  );
}

function RefundDialog({ row, onDone, refundFn }: {
  row: BillingRenewal;
  onDone: () => void | Promise<void>;
  refundFn: (args: { data: { id: string; amount?: number; reason?: string; revoke: boolean } }) => Promise<unknown>;
}) {
  const [amount, setAmount] = useState(String(row.amount ?? 0));
  const [reason, setReason] = useState("");
  const [revoke, setRevoke] = useState(true);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await refundFn({ data: { id: row.id, amount: Number(amount) || 0, reason, revoke } });
      toast.success("Refund recorded");
      await onDone();
    } catch (e: any) { toast.error(e?.message ?? "Could not refund"); }
    finally { setBusy(false); }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Refund {row.client?.full_name}</DialogTitle>
        <p className="text-xs text-muted-foreground">
          Records the refund and, if you choose, takes back the {row.days_added ?? 0} days that were added.
        </p>
      </DialogHeader>
      <div className="space-y-3 pt-2">
        <div className="space-y-1.5">
          <Label>Refund amount</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Reason (optional)</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Duplicate payment" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={revoke} onChange={(e) => setRevoke(e.target.checked)} />
          Also remove the added subscription days
        </label>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={busy} className="gap-2">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Issue refund
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export const Route = createFileRoute("/_app/billing")({
  component: BillingPage,
  head: () => ({
    meta: [
      { title: "Billing Portal | ISP360 Billing System" },
      { name: "description", content: "Review customer renewal requests, confirm payments and issue refunds in one place." },
      { property: "og:title", content: "Billing Portal | ISP360 Billing System" },
      { property: "og:description", content: "Confirm subscription payments and issue refunds for your internet customers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
