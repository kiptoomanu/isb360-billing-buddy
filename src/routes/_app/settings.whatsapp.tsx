import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SettingsHeader, SettingsCard, SaveBar } from "@/components/settings/SettingsShell";
import { useSettings } from "@/lib/useSettings";

const defaults = {
  enabled: false,
  business_number: "",
  phone_number_id: "",
  access_token: "",
  support_link_on_portal: true,
  notify_expiry: true,
  notify_payment: true,
  tpl_expiry: "Hi {name}, your {plan} plan expires on {date}. Reply PAY to renew.",
  tpl_support: "Hello {network} support, I need help with my connection.",
};

function WhatsAppSettings() {
  const { values, set, save, saving } = useSettings("whatsapp", defaults);

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="WhatsApp"
        accent="support."
        description="Reach subscribers on WhatsApp for reminders, receipts and one-tap support from the captive portal."
      />

      <SettingsCard title="Connection" description="WhatsApp Business Cloud API credentials.">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">WhatsApp enabled</div>
            <div className="text-xs text-muted-foreground">Turn on once your credentials are saved</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={values.enabled ? "default" : "secondary"}>{values.enabled ? "Live" : "Off"}</Badge>
            <Switch checked={values.enabled} onCheckedChange={(v) => set("enabled", v)} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Business number</Label>
            <Input value={values.business_number} onChange={(e) => set("business_number", e.target.value)} placeholder="+254..." />
          </div>
          <div className="grid gap-2">
            <Label>Phone number ID</Label>
            <Input value={values.phone_number_id} onChange={(e) => set("phone_number_id", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Access token</Label>
          <Input type="password" value={values.access_token} onChange={(e) => set("access_token", e.target.value)} placeholder="••••••••" />
        </div>
      </SettingsCard>

      <SettingsCard title="Where it appears" description="Customer touch points that use WhatsApp.">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Support link on captive portal</div>
            <div className="text-xs text-muted-foreground">Adds a chat button for subscribers who can't connect</div>
          </div>
          <Switch checked={values.support_link_on_portal} onCheckedChange={(v) => set("support_link_on_portal", v)} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Expiry reminders</div>
            <div className="text-xs text-muted-foreground">Send renewal nudges over WhatsApp</div>
          </div>
          <Switch checked={values.notify_expiry} onCheckedChange={(v) => set("notify_expiry", v)} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Payment receipts</div>
            <div className="text-xs text-muted-foreground">Confirm every payment in chat</div>
          </div>
          <Switch checked={values.notify_payment} onCheckedChange={(v) => set("notify_payment", v)} />
        </div>
      </SettingsCard>

      <SettingsCard title="Templates" description="Placeholders: {name} {plan} {date} {network}">
        <div className="grid gap-2">
          <Label>Expiry reminder</Label>
          <Textarea rows={2} value={values.tpl_expiry} onChange={(e) => set("tpl_expiry", e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Prefilled support message</Label>
          <Textarea rows={2} value={values.tpl_support} onChange={(e) => set("tpl_support", e.target.value)} />
        </div>
      </SettingsCard>

      <SaveBar saving={saving} onSave={() => save()} />
    </div>
  );
}

export const Route = createFileRoute("/_app/settings/whatsapp")({
  component: WhatsAppSettings,
  head: () => ({
    meta: [
      { title: "WhatsApp Settings | Manu Billing System" },
      { name: "description", content: "Connect WhatsApp Business to send renewal reminders, receipts and offer one-tap support from the portal." },
      { property: "og:title", content: "WhatsApp Settings | Manu Billing System" },
      { property: "og:description", content: "WhatsApp Business Cloud API configuration and templates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
