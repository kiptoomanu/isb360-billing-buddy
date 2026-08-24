import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SettingsHeader, SettingsCard, SaveBar } from "@/components/settings/SettingsShell";
import { useSettings } from "@/lib/useSettings";

const defaults = {
  custom_domain: "",
  portal_subdomain: "",
  force_https: true,
  dns_a_record: "",
  verified: false,
};

function DomainSettings() {
  const { values, set, save, saving } = useSettings("domain", defaults);

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Your"
        accent="domain."
        description="Where subscribers reach your captive portal and self-service pages."
      />

      <SettingsCard title="Portal address" description="Point a domain at your portal, or use the free subdomain.">
        <div className="grid gap-2">
          <Label>Custom domain</Label>
          <div className="flex items-center gap-2">
            <Input value={values.custom_domain} onChange={(e) => set("custom_domain", e.target.value)} placeholder="portal.manunet.co.ke" />
            <Badge variant={values.verified ? "default" : "secondary"}>{values.verified ? "Verified" : "Unverified"}</Badge>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Free subdomain</Label>
          <div className="flex items-center gap-2">
            <Input value={values.portal_subdomain} onChange={(e) => set("portal_subdomain", e.target.value)} placeholder="manunet" />
            <span className="text-sm text-muted-foreground">.manubilling.app</span>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="DNS" description="Create this record with your registrar, then mark the domain verified.">
        <div className="grid gap-2">
          <Label>A record target</Label>
          <Input value={values.dns_a_record} onChange={(e) => set("dns_a_record", e.target.value)} placeholder="203.0.113.10" className="font-mono" />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Force HTTPS</div>
            <div className="text-xs text-muted-foreground">Redirect all portal traffic to a secure connection</div>
          </div>
          <Switch checked={values.force_https} onCheckedChange={(v) => set("force_https", v)} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Domain verified</div>
            <div className="text-xs text-muted-foreground">Mark once DNS has propagated</div>
          </div>
          <Switch checked={values.verified} onCheckedChange={(v) => set("verified", v)} />
        </div>
      </SettingsCard>

      <SaveBar saving={saving} onSave={() => save()} />
    </div>
  );
}

export const Route = createFileRoute("/_app/settings/domain")({
  component: DomainSettings,
  head: () => ({
    meta: [
      { title: "Domain Settings | Manu Billing System" },
      { name: "description", content: "Connect a custom domain or subdomain to your captive portal and manage DNS and HTTPS." },
      { property: "og:title", content: "Domain Settings | Manu Billing System" },
      { property: "og:description", content: "Portal domain, DNS records and HTTPS configuration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
