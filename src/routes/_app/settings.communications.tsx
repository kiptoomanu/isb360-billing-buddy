import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SettingsHeader, SettingsCard, SaveBar } from "@/components/settings/SettingsShell";
import { useSettings } from "@/lib/useSettings";

const defaults = {
  provider: "africastalking",
  sender_id: "MANUNET",
  api_key: "",
  username: "",
  sms_enabled: true,
  notify_expiry: true,
  notify_payment: true,
  notify_new_client: false,
  tpl_expiry: "Hi {name}, your {plan} plan expires on {date}. Pay {amount} to stay online.",
  tpl_payment: "Payment of {amount} received. Thank you, {name}! Your plan runs to {date}.",
  tpl_welcome: "Welcome to {network}, {name}. Your username is {username}.",
};

function CommunicationsSettings() {
  const { values, set, save, saving } = useSettings("communications", defaults);

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="SMS &"
        accent="notifications."
        description="The SMS gateway used for receipts, expiry reminders and account notices."
      />

      <SettingsCard title="SMS gateway" description="Credentials for your bulk SMS provider.">
        <div className="grid gap-2">
          <Label>Provider</Label>
          <Select value={values.provider} onValueChange={(v) => set("provider", v)}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="africastalking">Africa's Talking</SelectItem>
              <SelectItem value="talksasa">TalkSasa</SelectItem>
              <SelectItem value="mobilesasa">Mobile Sasa</SelectItem>
              <SelectItem value="twilio">Twilio</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Sender ID</Label>
            <Input value={values.sender_id} onChange={(e) => set("sender_id", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Username / account</Label>
            <Input value={values.username} onChange={(e) => set("username", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>API key</Label>
          <Input type="password" value={values.api_key} onChange={(e) => set("api_key", e.target.value)} placeholder="••••••••" />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">SMS enabled</div>
            <div className="text-xs text-muted-foreground">Turn off to pause all outbound messages</div>
          </div>
          <Switch checked={values.sms_enabled} onCheckedChange={(v) => set("sms_enabled", v)} />
        </div>
      </SettingsCard>

      <SettingsCard title="Triggers" description="When a message should be sent automatically.">
        {[
          ["notify_expiry", "Expiry reminder", "Before a subscriber's plan runs out"],
          ["notify_payment", "Payment receipt", "As soon as a payment is confirmed"],
          ["notify_new_client", "Welcome message", "When a new client account is created"],
        ].map(([key, title, desc]) => (
          <div key={key} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">{title}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
            <Switch
              checked={Boolean(values[key as keyof typeof defaults])}
              onCheckedChange={(v) => set(key as keyof typeof defaults, v as never)}
            />
          </div>
        ))}
      </SettingsCard>

      <SettingsCard title="Templates" description="Placeholders: {name} {plan} {amount} {date} {username} {network}">
        <div className="grid gap-2">
          <Label>Expiry reminder</Label>
          <Textarea rows={2} value={values.tpl_expiry} onChange={(e) => set("tpl_expiry", e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Payment receipt</Label>
          <Textarea rows={2} value={values.tpl_payment} onChange={(e) => set("tpl_payment", e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Welcome</Label>
          <Textarea rows={2} value={values.tpl_welcome} onChange={(e) => set("tpl_welcome", e.target.value)} />
        </div>
      </SettingsCard>

      <SaveBar saving={saving} onSave={() => save()} />
    </div>
  );
}

export const Route = createFileRoute("/_app/settings/communications")({
  component: CommunicationsSettings,
  head: () => ({
    meta: [
      { title: "SMS & Notifications | ISP360 Billing System" },
      { name: "description", content: "Connect your bulk SMS gateway and control expiry reminders, payment receipts and welcome messages." },
      { property: "og:title", content: "SMS & Notifications | ISP360 Billing System" },
      { property: "og:description", content: "SMS provider credentials, triggers and message templates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
