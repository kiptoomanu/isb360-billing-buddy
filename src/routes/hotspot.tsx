import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyHotspotLogin, listHotspotPlans, purchaseHotspot, hotspotStatus, type HotspotPlan } from "@/lib/hotspot.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, CreditCard, Loader2, Smartphone, Wifi } from "lucide-react";

const TITLE = "Buy Internet — ISP360 Hotspot";
const DESC = "Choose a hotspot internet package, pay with M-Pesa or card, and get online instantly.";

export const Route = createFileRoute("/hotspot")({
  validateSearch: z.object({
    router: z.string().optional(),
    login: z.string().optional(),
    dst: z.string().optional(),
    rid: z.string().optional(),
    p: z.string().optional(),
    cancelled: z.any().optional(),
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HotspotPage,
});

const money = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);
const speed = (k: number) => (k >= 1000 ? `${+(k / 1000).toFixed(1)} Mbps` : `${k} Kbps`);
const validity = (d: number) => (d === 1 ? "1 day" : `${d} days`);

function HotspotPage() {
  const search = Route.useSearch();
  const fetchPlans = useServerFn(listHotspotPlans);
  const buy = useServerFn(purchaseHotspot);
  const status = useServerFn(hotspotStatus);
  const [plans, setPlans] = useState<{ isLoading: boolean; data?: HotspotPlan[] }>({ isLoading: true });
  useEffect(() => {
    fetchPlans().then((d) => setPlans({ isLoading: false, data: d })).catch(() => setPlans({ isLoading: false, data: [] }));
  }, [fetchPlans]);

  const [plan, setPlan] = useState<HotspotPlan | null>(null);
  const [phone, setPhone] = useState(search.p ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(search.cancelled ? "Payment cancelled." : null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState<{ id: string; phone: string } | null>(
    search.rid && search.p ? { id: search.rid, phone: search.p } : null,
  );
  const [code, setCode] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const verify = useServerFn(verifyHotspotLogin);
  const [tab, setTab] = useState<"buy" | "voucher" | "account">("buy");
  const [voucher, setVoucher] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [creds, setCreds] = useState<{ u: string; p: string } | null>(null);
  const loginRef = useRef<HTMLFormElement>(null);

  async function signIn(u: string, p: string) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await verify({ data: { username: u } });
      if (!search.login) {
        setMsg("Code accepted. Enter it on the Wi-Fi login page to connect.");
        return;
      }
      setCreds({ u: r.username, p: p || r.username });
      setMsg("Connecting…");
      setTimeout(() => loginRef.current?.submit(), 300);
    } catch (e: any) {
      setErr(e?.message ?? "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!pending) return;
    let tries = 0;
    const t = setInterval(async () => {
      tries++;
      try {
        const r = await status({ data: { renewalId: pending.id, phone: pending.phone } });
        if (r.status === "confirmed" && r.code) {
          clearInterval(t);
          setPending(null);
          setCode(r.code);
          setMsg("Payment received — you're online!");
        } else if (r.status === "rejected") {
          clearInterval(t);
          setPending(null);
          setErr(r.reason ?? "Payment failed.");
          setMsg(null);
        }
      } catch {}
      if (tries > 60) {
        clearInterval(t);
        setPending(null);
        setErr("We didn't receive the payment in time. Try again.");
      }
    }, 4000);
    return () => clearInterval(t);
  }, [pending, status]);

  useEffect(() => {
    if (code && search.login) setTimeout(() => formRef.current?.submit(), 1500);
  }, [code, search.login]);

  async function pay(method: "mpesa" | "card") {
    if (!plan) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await buy({ data: { planId: plan.id, phone, method, routerId: search.router } });
      setMsg(r.message);
      if (r.mode === "card" && r.checkoutUrl) window.location.href = r.checkoutUrl;
      else setPending({ id: r.renewalId, phone });
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-md space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Wifi className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Get online</h1>
          <p className="text-sm text-muted-foreground">Pick a package, pay, and you're connected automatically.</p>
        </div>

        {code ? (
          <Card className="space-y-3 p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <p className="font-semibold">You're connected</p>
            <p className="text-sm text-muted-foreground">Your access code (keep it to reconnect):</p>
            <p className="font-mono text-2xl tracking-widest">{code}</p>
            {search.login ? (
              <form ref={formRef} method="post" action={search.login}>
                <input type="hidden" name="username" value={code} />
                <input type="hidden" name="password" value={code} />
                {search.dst && <input type="hidden" name="dst" value={search.dst} />}
                <Button type="submit" className="w-full">Connect now</Button>
              </form>
            ) : (
              <p className="text-xs text-muted-foreground">Enter this code as username and password on the Wi-Fi login page.</p>
            )}
          </Card>
        ) : pending ? (
          <Card className="space-y-3 p-6 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">{msg ?? "Waiting for payment confirmation…"}</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-1 rounded-lg border p-1">
              {(["buy", "voucher", "account"] as const).map((t) => (
                <button key={t} type="button" onClick={() => { setTab(t); setErr(null); setMsg(null); }}
                  className={cn("rounded-md py-2 text-sm font-medium", tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                  {t === "buy" ? "Buy package" : t === "voucher" ? "Voucher" : "My account"}
                </button>
              ))}
            </div>
            {tab === "voucher" && (
              <Card className="space-y-3 p-4">
                <Label>Voucher / access code</Label>
                <Input value={voucher} onChange={(e) => setVoucher(e.target.value.toUpperCase())} placeholder="HSXXXXXXXX" className="font-mono tracking-widest" />
                <Button className="w-full" disabled={busy || voucher.length < 3} onClick={() => signIn(voucher.trim(), voucher.trim())}>Connect</Button>
              </Card>
            )}
            {tab === "account" && (
              <Card className="space-y-3 p-4">
                <div className="grid gap-2"><Label>Username</Label><Input value={user} onChange={(e) => setUser(e.target.value)} /></div>
                <div className="grid gap-2"><Label>Password</Label><Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} /></div>
                <Button className="w-full" disabled={busy || user.length < 3} onClick={() => signIn(user.trim(), pass)}>Log in</Button>
              </Card>
            )}
            {creds && search.login && (
              <form ref={loginRef} method="post" action={search.login} className="hidden">
                <input type="hidden" name="username" value={creds.u} />
                <input type="hidden" name="password" value={creds.p} />
                {search.dst && <input type="hidden" name="dst" value={search.dst} />}
              </form>
            )}
            {tab === "buy" && (<>
            <div className="grid gap-3">
              {plans.isLoading && <p className="text-center text-sm text-muted-foreground">Loading packages…</p>}
              {plans.data?.length === 0 && <p className="text-center text-sm text-muted-foreground">No packages available right now.</p>}
              {plans.data?.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-4 text-left transition-colors",
                    plan?.id === p.id ? "border-primary bg-primary/10" : "hover:bg-muted/50",
                  )}
                >
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {speed(p.download_kbps)} · {validity(p.validity_days)} · {p.device_limit} device{p.device_limit > 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-primary">{money(Number(p.price))}</div>
                </button>
              ))}
            </div>

            {plan && (
              <Card className="space-y-3 p-4">
                <div className="grid gap-2">
                  <Label>Phone number</Label>
                  <Input inputMode="tel" placeholder="07XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <Button className="w-full" disabled={busy || phone.length < 9} onClick={() => pay("mpesa")}>
                  <Smartphone className="mr-2 h-4 w-4" /> Pay {money(Number(plan.price))} with M-Pesa
                </Button>
                <Button variant="outline" className="w-full" disabled={busy || phone.length < 9} onClick={() => pay("card")}>
                  <CreditCard className="mr-2 h-4 w-4" /> Pay with card
                </Button>
              </Card>
            )}
            </>)}
          </>
        )}

        {err && <p className="text-center text-sm text-destructive">{err}</p>}
        {msg && !pending && !code && <p className="text-center text-sm text-muted-foreground">{msg}</p>}
      </div>
    </div>
  );
}
