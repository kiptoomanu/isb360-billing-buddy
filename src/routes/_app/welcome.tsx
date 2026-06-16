import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, LayoutDashboard, Loader2, Users, Router as RouterIcon } from "lucide-react";

export const Route = createFileRoute("/_app/welcome")({
  component: WelcomePage,
});

function WelcomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      setIsAdmin(!!data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Welcome to Manu Billing System</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is ready, {user?.user_metadata?.full_name || user?.email}.
          </p>
          <div className="mt-3 flex justify-center">
            {isAdmin ? (
              <Badge className="bg-success text-success-foreground">Administrator</Badge>
            ) : (
              <Badge variant="secondary">Standard user — ask an admin for access</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin ? (
            <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-sm">
              You're the first user, so you've been granted full <strong>admin</strong> rights.
              You can manage clients, stations, MikroTik routers, and assign roles to future users.
            </div>
          ) : (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
              An administrator already exists. You won't see customer data until an admin assigns
              you a role in the user_roles table.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <Users className="mb-2 h-5 w-5 text-primary" />
              <div className="font-semibold">Add clients</div>
              <p className="text-xs text-muted-foreground">PPPoE, Static, and Hotspot users.</p>
            </div>
            <div className="rounded-lg border p-4">
              <RouterIcon className="mb-2 h-5 w-5 text-primary" />
              <div className="font-semibold">Connect MikroTik</div>
              <p className="text-xs text-muted-foreground">Save router credentials and sync.</p>
            </div>
          </div>

          <Button className="w-full gap-2" onClick={() => navigate({ to: "/dashboard" })}>
            <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
