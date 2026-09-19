import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  lookupAccount,
  requestRenewal,
  checkRenewalStatus,
  type PortalData,
} from "@/lib/portal.functions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Award,
  CalendarClock,
  Gauge,
  RefreshCw,
  Trophy,
  Wallet,
  Wifi,
} from "lucide-react";

const TITLE = "Customer Portal — ISP360 Billing System";
const DESC =
  "Sign in to the ISP360 customer portal to view your internet plan, account balance, subscription usage and loyalty points, and to renew your subscription.";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortalPage,
});

const money = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

const speed = (kbps: number) =>
  kbps >= 1000 ? `${(kbps / 1000).toFixed(kbps % 1000 ? 1 : 0)} Mbps` : `${kbps} Kbps`;

const tierOf = (p: number) =>
  p >= 500 ? "Platinum" : p >= 250 ? "Gold" : p >= 100 ? "Silver" : "Bronze";

function PortalPage() {
  const lookup = useServerFn(lookupAccount);
  const renew = useServerFn(requestRenewal);
  const checkStatus = useServerFn(checkRenewalStatus);
  const [account, setAccount] = useState("");
  const [fullName, setFullName] = useState("");
  const [method, setMethod] = useState<"mpesa" | "cash" | "bank" | "card">("mpesa");
  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [data, setData] = useState<PortalData | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      setData(await lookup({ data: { account, fullName } }));
    } catch (err: any) {
      setData(null);
      setError(err?.message ?? "We could not find that account.");
    } finally {
      setLoading(false);
    }
  };

  const watchPayment = (renewalId: string) => {
    setWaiting(true);
    const started = Date.now();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await checkStatus({ data: { account, fullName, renewalId } });
        setData(res.portal);
        if (res.status === "confirmed") {
          clearInterval(pollRef.current!);
          setWaiting(false);
          setNotice("Payment received — your subscription has been extended.");
        } else if (res.status === "rejected" || res.status === "refunded") {
          clearInterval(pollRef.current!);
          setWaiting(false);
          setError(res.reason ?? "The payment was not completed.");
        } else if (Date.now() - started > 180_000) {
          clearInterval(pollRef.current!);
          setWaiting(false);
          setNotice("We are still waiting for your payment confirmation.");
        }
      } catch {
        /* keep polling */
      }
    }, 4000);
  };

  const onRenew = async () => {
    setRenewing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await renew({
        data: {
          account,
          fullName,
          method,
          reference: reference || undefined,
          phone: phone || undefined,
        },
      });
      setData(res.portal);
      setReference("");
      setNotice(res.message);
      if (res.mode === "card" && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      if (res.mode === "mpesa") watchPayment(res.renewalId);
    } catch (err: any) {
      setError(err?.message ?? "We could not send your renewal request.");
    } finally {
      setRenewing(false);
    }
  };


  const used = data?.daysUsed ?? 0;
  const pct = data && data.validityDays > 0 ? Math.round((used / data.validityDays) * 100) : 0;

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wifi className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Customer portal</h1>
          <p className="text-sm text-muted-foreground">
            Check your plan, balance and points — and renew in a tap.
          </p>
        </header>

        <Card className="p-5">
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="account">Account username or phone</Label>
              <Input
                id="account"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="e.g. 0712345678"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="As registered"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Checking…" : "View my account"}
              </Button>
            </div>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          {notice && <p className="mt-3 text-sm text-primary">{notice}</p>}
        </Card>

        {data && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{data.name}</p>
                  <p className="text-xl font-semibold">
                    {data.plan?.name ?? "No plan assigned"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.account ?? "—"} · {data.type.toUpperCase()}
                  </p>
                </div>
                <Badge variant={data.status === "active" ? "default" : "destructive"}>
                  {data.status}
                </Badge>
              </div>

              {data.plan && (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Gauge className="h-3.5 w-3.5" /> Speed
                    </p>
                    <p className="text-sm font-semibold">
                      {speed(data.plan.download_kbps)} / {speed(data.plan.upload_kbps)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Devices</p>
                    <p className="text-sm font-semibold">{data.plan.device_limit}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="text-sm font-semibold">{money(data.monthlyFee)}</p>
                  </div>
                </div>
              )}
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="p-5">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5" /> Balance due
                </p>
                <p className="mt-1 text-3xl font-bold">{money(data.balance)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.balance > 0
                    ? "Pay to keep your connection running."
                    : "You are fully paid up — thank you."}
                </p>
              </Card>
              <Card className="p-5">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Trophy className="h-3.5 w-3.5" /> Loyalty points
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-3xl font-bold">{data.points}</p>
                  <Badge variant="secondary" className="gap-1">
                    <Award className="h-3.5 w-3.5" /> {tierOf(data.points)}
                  </Badge>
                </div>
                <Link to="/rewards" className="mt-1 inline-block text-xs text-primary underline">
                  See rewards you can claim
                </Link>
              </Card>
            </div>

            <Card className="p-5">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <CalendarClock className="h-4 w-4" /> Subscription usage
              </p>
              {data.expiryDate ? (
                <>
                  <Progress value={Math.min(100, pct)} className="mt-4" />
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>
                      Day {used} of {data.validityDays}
                    </span>
                    <span>
                      {data.daysRemaining !== null && data.daysRemaining > 0
                        ? `${data.daysRemaining} day${data.daysRemaining === 1 ? "" : "s"} left`
                        : "Expired"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Renews on {new Date(data.expiryDate).toLocaleDateString()}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No expiry date is set on your account yet.
                </p>
              )}
            </Card>

            <Card className="p-5">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <RefreshCw className="h-4 w-4" /> Renew my subscription
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Payment method</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="bank">Bank transfer</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reference">Payment reference (optional)</Label>
                  <Input
                    id="reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. M-Pesa code"
                  />
                </div>
              </div>
              <Button className="mt-4 w-full" onClick={onRenew} disabled={renewing}>
                {renewing ? "Sending…" : `Renew for ${money(data.monthlyFee)}`}
              </Button>

              {data.renewals.length > 0 && (
                <ul className="mt-4 divide-y">
                  {data.renewals.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div>
                        <p className="text-sm">
                          {money(Number(r.amount))} · {r.method}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                          {r.reference ? ` · ${r.reference}` : ""}
                        </p>
                      </div>
                      <Badge variant={r.status === "paid" ? "default" : "outline"}>{r.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold">Recent points activity</h2>
              {data.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="divide-y">
                  {data.history.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div>
                        <p className="text-sm">
                          {t.reason || (t.points > 0 ? "Points earned" : "Points redeemed")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-sm font-semibold">
                        {t.points > 0 ? "+" : ""}
                        {t.points}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
