import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SettingsHeader } from "@/components/settings/SettingsShell";
import { useSettings } from "@/lib/useSettings";
import { Building2, ChevronRight, CreditCard, Smartphone, Landmark, Globe } from "lucide-react";

type Gateway = {
  id: string;
  name: string;
  subtitle: string;
  tags: string[];
  settlement: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: { key: string; label: string; placeholder?: string }[];
};

const gateways: Gateway[] = [
  {
    id: "bank", name: "Bank Account", subtitle: "Bank transfer", tags: ["Bank transfer"], settlement: "To your bank", icon: Landmark,
    fields: [
      { key: "bank_name", label: "Bank name" },
      { key: "account_name", label: "Account name" },
      { key: "account_number", label: "Account number" },
    ],
  },
  {
    id: "mpesa_api", name: "M-Pesa Paybill / Till (API keys)", subtitle: "M-Pesa · Kenya", tags: ["STK", "Paybill", "Till"], settlement: "Instant", icon: Smartphone,
    fields: [
      { key: "shortcode", label: "Shortcode" },
      { key: "consumer_key", label: "Consumer key" },
      { key: "consumer_secret", label: "Consumer secret" },
      { key: "passkey", label: "Passkey" },
    ],
  },
  {
    id: "mpesa_manual", name: "Paybill — Without API keys", subtitle: "M-Pesa · Kenya", tags: ["Paybill"], settlement: "Manual confirmation", icon: Smartphone,
    fields: [
      { key: "paybill", label: "Paybill number" },
      { key: "account_format", label: "Account number format", placeholder: "Client username" },
    ],
  },
  {
    id: "kopokopo", name: "Kopo Kopo", subtitle: "Kopo Kopo · Kenya", tags: ["Mobile Money till"], settlement: "T+1 to bank", icon: CreditCard,
    fields: [
      { key: "till", label: "Till number" },
      { key: "client_id", label: "Client ID" },
      { key: "client_secret", label: "Client secret" },
    ],
  },
  {
    id: "dpo", name: "DPO Pay", subtitle: "DPO Pay · multi-country", tags: ["Cards", "Mobile money"], settlement: "To bank", icon: Globe,
    fields: [
      { key: "company_token", label: "Company token" },
      { key: "service_type", label: "Service type" },
    ],
  },
  {
    id: "cash", name: "Cash / Agent", subtitle: "Recorded manually by staff", tags: ["Cash"], settlement: "Immediate", icon: Building2,
    fields: [{ key: "notes", label: "Instructions for agents" }],
  },
];

const defaults: Record<string, any> = { active: "", configs: {} as Record<string, Record<string, string>> };

function PaymentsSettings() {
  const { values, save, saving } = useSettings("payments", defaults);
  const [editing, setEditing] = useState<Gateway | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const configs: Record<string, Record<string, string>> = values.configs ?? {};
  const connected = Object.keys(configs).filter((k) => Object.values(configs[k] ?? {}).some(Boolean));

  const openGateway = (g: Gateway) => {
    setForm(configs[g.id] ?? {});
    setEditing(g);
  };

  const saveGateway = async () => {
    if (!editing) return;
    await save({ configs: { ...configs, [editing.id]: form }, active: values.active || editing.id });
    setEditing(null);
  };

  const makeActive = (id: string) => save({ active: id });

  return (
    <div className="space-y-6">
      <SettingsHeader
        title=""
        accent="Payments"
        description="Pick one gateway so subscribers can pay you. Only one is active at a time — switching is one click and saved credentials are kept."
      />

      <p className="text-xs font-semibold tracking-wider text-muted-foreground">
        {gateways.length} GATEWAYS AVAILABLE · <span className="text-primary">{connected.length} CONNECTED</span>
      </p>

      <div className="space-y-3">
        {gateways.map((g) => {
          const isConnected = connected.includes(g.id);
          const isActive = values.active === g.id;
          return (
            <Card key={g.id} className={cn("p-4", isActive && "border-primary bg-primary/5")}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-muted">
                  <g.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{g.name}</h3>
                    {isActive && <Badge>Active</Badge>}
                    {isConnected && !isActive && <Badge variant="secondary">Connected</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{g.subtitle}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {g.tags.map((t) => (
                      <span key={t} className="rounded-md bg-muted px-2 py-1 text-xs">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-dashed pt-3">
                <span className="text-sm text-muted-foreground">{g.settlement}</span>
                <div className="flex items-center gap-2">
                  {isConnected && !isActive && (
                    <Button variant="ghost" size="sm" onClick={() => makeActive(g.id)} disabled={saving}>Make active</Button>
                  )}
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => openGateway(g)}>
                    Configure <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>{editing?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {editing?.fields.map((f) => (
              <div className="grid gap-2" key={f.key}>
                <Label>{f.label}</Label>
                <Input
                  value={form[f.key] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={saveGateway} disabled={saving}>{saving ? "Saving..." : "Save & activate"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/_app/settings/payments")({
  component: PaymentsSettings,
  head: () => ({
    meta: [
      { title: "Payment Settings | Manu Billing System" },
      { name: "description", content: "Connect M-Pesa, Kopo Kopo, DPO Pay, bank transfer or cash collection so subscribers can pay for their plans." },
      { property: "og:title", content: "Payment Settings | Manu Billing System" },
      { property: "og:description", content: "Choose and configure the payment gateway for your ISP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
