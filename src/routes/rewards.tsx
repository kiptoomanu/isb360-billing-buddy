import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { lookupLoyalty, type LoyaltyPortalData } from "@/lib/loyalty.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Gift, Trophy, ArrowDownRight, ArrowUpRight } from "lucide-react";

const TITLE = "My Rewards — Manu Billing System";
const DESC =
  "Check your Manu Billing loyalty points balance, see how you earned or spent them, and browse the rewards you can claim.";

export const Route = createFileRoute("/rewards")({
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
  component: RewardsPage,
});

const tierOf = (p: number) =>
  p >= 500 ? "Platinum" : p >= 250 ? "Gold" : p >= 100 ? "Silver" : "Bronze";

function RewardsPage() {
  const lookup = useServerFn(lookupLoyalty);
  const [account, setAccount] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LoyaltyPortalData | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await lookup({ data: { account, fullName } });
      setData(res);
    } catch (err: any) {
      setData(null);
      setError(err?.message ?? "We could not find that account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Trophy className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">My rewards</h1>
          <p className="text-sm text-muted-foreground">
            Enter your account details to see your points and rewards.
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
                {loading ? "Checking…" : "View my points"}
              </Button>
            </div>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </Card>

        {data && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{data.name}</p>
                  <p className="text-4xl font-bold">{data.points}</p>
                  <p className="text-sm text-muted-foreground">points available</p>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Award className="h-3.5 w-3.5" /> {tierOf(data.points)}
                </Badge>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowUpRight className="h-3.5 w-3.5" /> Earned
                  </p>
                  <p className="text-lg font-semibold">{data.earned}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowDownRight className="h-3.5 w-3.5" /> Redeemed
                  </p>
                  <p className="text-lg font-semibold">{data.redeemed}</p>
                </div>
              </div>
              {data.minRedeem > 0 && (
                <p className="mt-4 text-xs text-muted-foreground">
                  You need at least {data.minRedeem} points to redeem a reward.
                </p>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold">Available rewards</h2>
              {data.rewards.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No rewards are on offer right now — check back soon.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.rewards.map((r) => {
                    const canClaim = data.points >= r.points;
                    return (
                      <li
                        key={r.id}
                        className="flex items-start justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="space-y-0.5">
                          <p className="flex items-center gap-1.5 text-sm font-medium">
                            <Gift className="h-4 w-4 text-primary" /> {r.name}
                          </p>
                          {r.description && (
                            <p className="text-xs text-muted-foreground">{r.description}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold">{r.points} pts</p>
                          <Badge variant={canClaim ? "default" : "outline"} className="mt-1">
                            {canClaim ? "Ready to claim" : "Keep earning"}
                          </Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                To claim a reward, contact support with your account name.
              </p>
            </Card>

            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold">Points history</h2>
              {data.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="divide-y">
                  {data.history.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div>
                        <p className="text-sm">{t.reason || (t.points > 0 ? "Points earned" : "Points redeemed")}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={
                          t.points > 0
                            ? "text-sm font-semibold text-primary"
                            : "text-sm font-semibold text-muted-foreground"
                        }
                      >
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
