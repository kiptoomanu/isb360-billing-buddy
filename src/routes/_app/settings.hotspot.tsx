import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SettingsHeader, SettingsCard, SaveBar } from "@/components/settings/SettingsShell";
import { useSettings } from "@/lib/useSettings";
import { Check } from "lucide-react";

const templates = [
  { id: "aurora", name: "Aurora", blurb: "Welcome banner, plan list, big connect button" },
  { id: "badge", name: "Badge", blurb: "Voucher-first: enter a code, redeem, go online" },
  { id: "classic", name: "Classic", blurb: "Support number on top, packages below" },
  { id: "tiles", name: "Tiles", blurb: "Colour-coded price tiles, tap and pay" },
] as const;

const defaults = {
  portal_template: "aurora",
  welcome_title: "Welcome to Our Network",
  welcome_text: "Already have an account or voucher code? Connect now to access high-speed internet.",
  trial_enabled: true,
  trial_minutes: "15",
  voucher_length: "8",
  voucher_prefix: "MN",
  mac_binding: true,
  auto_login: true,
  session_timeout_min: "0",
  idle_timeout_min: "10",
  show_prices: true,
};

function HotspotSettings() {
  const { values, set, save, saving } = useSettings("hotspot", defaults);

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Captive"
        accent="hotspot."
        description="Captive-portal subscribers and prepaid vouchers — portal look, account lifecycle, and the payment steps shown to buyers."
      />

      <SettingsCard title="Portal template" description="Pick a look for your hotspot login page.">
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => {
            const active = values.portal_template === t.id;
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => set("portal_template", t.id)}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  active ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t.name}</span>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t.blurb}</p>
              </button>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard title="Portal copy" description="Wording subscribers see before they connect.">
        <div className="grid gap-2">
          <Label>Welcome title</Label>
          <Input value={values.welcome_title} onChange={(e) => set("welcome_title", e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Welcome message</Label>
          <Textarea rows={3} value={values.welcome_text} onChange={(e) => set("welcome_text", e.target.value)} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Show plan prices</div>
            <div className="text-xs text-muted-foreground">List available packages with prices on the portal</div>
          </div>
          <Switch checked={values.show_prices} onCheckedChange={(v) => set("show_prices", v)} />
        </div>
      </SettingsCard>

      <SettingsCard title="Free trial" description="Let new users sample the network before buying.">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Enable trial</div>
            <div className="text-xs text-muted-foreground">One trial per device</div>
          </div>
          <Switch checked={values.trial_enabled} onCheckedChange={(v) => set("trial_enabled", v)} />
        </div>
        <div className="grid gap-2 max-w-xs">
          <Label>Trial length (minutes)</Label>
          <Input type="number" value={values.trial_minutes} onChange={(e) => set("trial_minutes", e.target.value)} disabled={!values.trial_enabled} />
        </div>
      </SettingsCard>

      <SettingsCard title="Vouchers & sessions" description="How prepaid codes are generated and how sessions behave.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Voucher prefix</Label>
            <Input value={values.voucher_prefix} onChange={(e) => set("voucher_prefix", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Voucher code length</Label>
            <Input type="number" value={values.voucher_length} onChange={(e) => set("voucher_length", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Session timeout (min, 0 = plan length)</Label>
            <Input type="number" value={values.session_timeout_min} onChange={(e) => set("session_timeout_min", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Idle timeout (minutes)</Label>
            <Input type="number" value={values.idle_timeout_min} onChange={(e) => set("idle_timeout_min", e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Bind voucher to device MAC</div>
            <div className="text-xs text-muted-foreground">Stops code sharing between phones</div>
          </div>
          <Switch checked={values.mac_binding} onCheckedChange={(v) => set("mac_binding", v)} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Auto-login returning devices</div>
            <div className="text-xs text-muted-foreground">Reconnect known MACs with an active plan <Badge variant="secondary" className="ml-1">recommended</Badge></div>
          </div>
          <Switch checked={values.auto_login} onCheckedChange={(v) => set("auto_login", v)} />
        </div>
      </SettingsCard>

      <SaveBar saving={saving} onSave={() => save()} />
    </div>
  );
}

export const Route = createFileRoute("/_app/settings/hotspot")({
  component: HotspotSettings,
  head: () => ({
    meta: [
      { title: "Hotspot Settings | ISP360 Billing System" },
      { name: "description", content: "Configure the captive portal look, welcome copy, free trials, voucher codes and hotspot session limits." },
      { property: "og:title", content: "Hotspot Settings | ISP360 Billing System" },
      { property: "og:description", content: "Captive portal, vouchers and session lifecycle configuration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
