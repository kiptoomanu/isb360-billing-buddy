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

const samplePlans = [["1 HOUR", 10], ["4 hours", 15], ["7 hours", 20], ["10 hours", 25]] as const;

function PhonePreview({ id, title, text }: { id: string; title: string; text: string }) {
  if (id === "badge") {
    return (
      <div className="mt-6 space-y-1.5 rounded-lg border p-2 text-center">
        <p className="text-[8px] text-muted-foreground">Enter your voucher code to activate WiFi</p>
        <div className="rounded border px-1 py-1 text-left font-mono text-[8px] text-muted-foreground">XXXX-XXXX</div>
        <div className="rounded bg-primary py-1 text-[8px] font-semibold text-primary-foreground">Redeem voucher</div>
        <p className="text-[7px] underline">No voucher? Pay with Mobile Money</p>
      </div>
    );
  }
  if (id === "tiles") {
    return (
      <div className="space-y-1.5">
        <p className="text-center text-[8px] text-muted-foreground">Pick a tag, enter your number, and pay</p>
        <div className="grid grid-cols-2 gap-1">
          {samplePlans.map(([n, p]) => (
            <div key={n} className="rounded bg-primary/15 p-1.5 text-center">
              <div className="text-[7px] font-semibold">{n}</div>
              <div className="text-[9px] font-bold text-primary">Ksh {p}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {id === "classic" ? (
        <div className="mx-auto w-fit rounded bg-primary px-2 py-0.5 text-[8px] text-primary-foreground">Support line</div>
      ) : (
        <div className="text-center">
          <div className="text-[9px] font-semibold">{title}</div>
          <p className="line-clamp-2 text-[7px] text-muted-foreground">{text}</p>
          <div className="mt-1 rounded bg-primary py-1 text-[8px] font-semibold text-primary-foreground">Connect to Network</div>
        </div>
      )}
      {samplePlans.map(([n, p]) => (
        <div key={n} className="flex items-center justify-between rounded border px-1.5 py-1">
          <div><div className="text-[7px] font-semibold">{n}</div><div className="text-[7px] text-primary">Ksh {p}</div></div>
          <span className="rounded bg-primary px-1.5 text-[7px] text-primary-foreground">Buy</span>
        </div>
      ))}
    </div>
  );
}

function HotspotSettings() {
  const { values, set, save, saving } = useSettings("hotspot", defaults);

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Captive"
        accent="hotspot."
        description="Captive-portal subscribers and prepaid vouchers — portal look, account lifecycle, and the payment steps shown to buyers."
      />

      <SettingsCard title="Portal template" description="Pick a look. This is exactly what customers see on the Wi-Fi login page.">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {templates.map((t) => {
            const active = values.portal_template === t.id;
            return (
              <button type="button" key={t.id} onClick={() => set("portal_template", t.id)} className="text-left">
                <div className={cn("relative mx-auto aspect-[9/17] w-full max-w-[200px] overflow-hidden rounded-[28px] border-[6px] bg-background p-2 transition", active ? "border-primary" : "border-foreground/80")}>
                  <div className="mx-auto mb-2 h-3 w-16 rounded-full bg-foreground/80" />
                  <PhonePreview id={t.id} title={values.welcome_title} text={values.welcome_text} />
                  {active && <Check className="absolute right-2 top-2 h-4 w-4 rounded-full bg-primary p-0.5 text-primary-foreground" />}
                </div>
                <div className="mt-2 text-center font-medium">{t.name}</div>
                <p className="text-center text-xs text-muted-foreground">{t.blurb}</p>
              </button>
            );
          })}
        </div>
        <a href="/hotspot" target="_blank" rel="noreferrer" className="text-sm font-medium text-primary">Open the live customer portal ↗</a>
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
