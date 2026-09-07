import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SettingsHeader, SettingsCard, SaveBar } from "@/components/settings/SettingsShell";
import { useSettings } from "@/lib/useSettings";

const defaults = {
  profile_prefix: "manu-",
  ip_pool: "pppoe-pool",
  local_address: "10.10.0.1",
  dns_servers: "8.8.8.8,1.1.1.1",
  grace_days: "3",
  auto_suspend: true,
  auto_reactivate: true,
  expiry_reminder_days: "3",
  service: "pppoe",
  mtu: "1480",
};

function PppoeSettings() {
  const { values, set, save, saving } = useSettings("pppoe", defaults);

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Fixed"
        accent="broadband."
        description="Defaults applied when PPPoE subscribers are provisioned on your MikroTik routers."
      />

      <SettingsCard title="Provisioning defaults" description="Used when a new PPPoE secret is pushed to a router.">
        <div className="grid gap-2">
          <Label>Profile name prefix</Label>
          <Input value={values.profile_prefix} onChange={(e) => set("profile_prefix", e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>IP pool</Label>
            <Input value={values.ip_pool} onChange={(e) => set("ip_pool", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Local address</Label>
            <Input value={values.local_address} onChange={(e) => set("local_address", e.target.value)} className="font-mono" />
          </div>
          <div className="grid gap-2">
            <Label>DNS servers</Label>
            <Input value={values.dns_servers} onChange={(e) => set("dns_servers", e.target.value)} className="font-mono" />
          </div>
          <div className="grid gap-2">
            <Label>MTU</Label>
            <Input type="number" value={values.mtu} onChange={(e) => set("mtu", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Service</Label>
          <Select value={values.service} onValueChange={(v) => set("service", v)}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pppoe">pppoe</SelectItem>
              <SelectItem value="any">any</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingsCard>

      <SettingsCard title="Billing lifecycle" description="What happens around a subscriber's expiry date.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Grace period (days)</Label>
            <Input type="number" value={values.grace_days} onChange={(e) => set("grace_days", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Reminder before expiry (days)</Label>
            <Input type="number" value={values.expiry_reminder_days} onChange={(e) => set("expiry_reminder_days", e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Auto-suspend on expiry</div>
            <div className="text-xs text-muted-foreground">Disable the secret when the grace period ends</div>
          </div>
          <Switch checked={values.auto_suspend} onCheckedChange={(v) => set("auto_suspend", v)} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Auto-reactivate on payment</div>
            <div className="text-xs text-muted-foreground">Re-enable the account as soon as payment lands</div>
          </div>
          <Switch checked={values.auto_reactivate} onCheckedChange={(v) => set("auto_reactivate", v)} />
        </div>
      </SettingsCard>

      <SaveBar saving={saving} onSave={() => save()} />
    </div>
  );
}

export const Route = createFileRoute("/_app/settings/pppoe")({
  component: PppoeSettings,
  head: () => ({
    meta: [
      { title: "PPPoE Settings | ISP360 Billing System" },
      { name: "description", content: "PPPoE provisioning defaults: profiles, IP pools, DNS, MTU, grace periods and auto-suspend rules." },
      { property: "og:title", content: "PPPoE Settings | ISP360 Billing System" },
      { property: "og:description", content: "Configure fixed broadband provisioning and billing lifecycle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
