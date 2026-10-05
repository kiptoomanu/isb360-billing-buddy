import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, UserCheck, AlertTriangle, Loader2 } from "lucide-react";
import { reviewSignup, type SignupReview } from "@/lib/signup-review.functions";

type Pending = { id: string; email: string | null; full_name: string | null; created_at: string };
const db = supabase as any;

function Approvals() {
  const [rows, setRows] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Record<string, SignupReview>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const review = useServerFn(reviewSignup);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const { data: admin } = u.user ? await db.rpc("has_role", { _user_id: u.user.id, _role: "admin" }) : { data: false };
    setIsAdmin(!!admin);
    if (!admin) { setLoading(false); return; }
    const [{ data: profiles, error }, { data: roles }] = await Promise.all([
      db.from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: false }),
      db.from("user_roles").select("user_id"),
    ]);
    if (error) toast.error(error.message);
    const withRole = new Set((roles ?? []).map((r: any) => r.user_id));
    setRows((profiles ?? []).filter((p: Pending) => !withRole.has(p.id)));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const runReview = async (id: string) => {
    setBusy(id);
    try {
      const r = await review({ data: { userId: id } });
      if (r.error) { toast.error(r.error); return; }
      setReviews((s) => ({ ...s, [id]: r }));
    } catch (e: any) {
      toast.error(e?.message ?? "Review failed");
    } finally { setBusy(null); }
  };

  const approve = async (id: string, role: "staff" | "viewer") => {
    setBusy(id);
    const { error } = await db.from("user_roles").insert({ user_id: id, role });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Approved as ${role}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sign-up Approvals</h1>
        <p className="text-sm text-muted-foreground">New people who signed up and are waiting for access. Use AI review to get a quick summary and spot missing details before approving.</p>
      </div>
      {isAdmin === false ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Only admins can review and approve sign-ups.</Card>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No sign-ups waiting for approval.</Card>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => {
            const r = reviews[p.id];
            return (
              <Card key={p.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{p.full_name || "No name given"}</h3>
                    <p className="text-sm text-muted-foreground">{p.email || "No email"} · signed up {new Date(p.created_at).toLocaleString()}</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => runReview(p.id)} disabled={busy === p.id}>
                    {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI review
                  </Button>
                </div>
                {r && (
                  <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">AI summary</span>
                      <Badge variant={r.risk === "high" ? "destructive" : r.risk === "medium" ? "secondary" : "default"}>{r.risk} risk</Badge>
                    </div>
                    <p>{r.summary}</p>
                    {r.missing.length > 0 && (
                      <ul className="space-y-1">
                        {r.missing.map((m) => (
                          <li key={m} className="flex items-start gap-1 text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{m}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="gap-1" onClick={() => approve(p.id, "staff")} disabled={busy === p.id}><UserCheck className="h-4 w-4" />Approve as staff</Button>
                  <Button size="sm" variant="ghost" onClick={() => approve(p.id, "viewer")} disabled={busy === p.id}>Approve as viewer</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_app/approvals")({
  component: Approvals,
  head: () => ({
    meta: [
      { title: "Sign-up Approvals | ISP360 Billing System" },
      { name: "description", content: "Review new sign-ups with AI summaries and approve access to ISP360 Billing." },
      { property: "og:title", content: "Sign-up Approvals | ISP360 Billing System" },
      { property: "og:description", content: "AI-assisted review of new billing system sign-ups." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
