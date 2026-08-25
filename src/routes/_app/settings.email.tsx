import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SettingsHeader, SettingsCard, SaveBar } from "@/components/settings/SettingsShell";
import { useSettings } from "@/lib/useSettings";

const defaults = {
  from_name: "MANUNET",
  from_email: "",
  reply_to: "",
  smtp_host: "",
  smtp_port: "587",
  smtp_user: "",
  smtp_password: "",
  use_tls: true,
  send_invoices: true,
  send_receipts: true,
  footer: "MANUNET · Fast, reliable internet.",
};

function EmailSettings() {
  const { values, set, save, saving } = useSettings("email", defaults);

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Outbound"
        accent="email."
        description="Invoices, receipts and account emails sent to your subscribers."
      />

      <SettingsCard title="Sender" description="How your emails appear in a subscriber's inbox.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>From name</Label>
            <Input value={values.from_name} onChange={(e) => set("from_name", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>From address</Label>
            <Input value={values.from_email} onChange={(e) => set("from_email", e.target.value)} placeholder="billing@manunet.co.ke" />
          </div>
          <div className="grid gap-2">
            <Label>Reply-to</Label>
            <Input value={values.reply_to} onChange={(e) => set("reply_to", e.target.value)} placeholder="support@manunet.co.ke" />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="SMTP server" description="Credentials used to relay your email.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Host</Label>
            <Input value={values.smtp_host} onChange={(e) => set("smtp_host", e.target.value)} placeholder="smtp.provider.com" />
          </div>
          <div className="grid gap-2">
            <Label>Port</Label>
            <Input type="number" value={values.smtp_port} onChange={(e) => set("smtp_port", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Username</Label>
            <Input value={values.smtp_user} onChange={(e) => set("smtp_user", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Password</Label>
            <Input type="password" value={values.smtp_password} onChange={(e) => set("smtp_password", e.target.value)} placeholder="••••••••" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Use TLS</div>
            <div className="text-xs text-muted-foreground">Recommended for ports 587 and 465</div>
          </div>
          <Switch checked={values.use_tls} onCheckedChange={(v) => set("use_tls", v)} />
        </div>
      </SettingsCard>

      <SettingsCard title="What to send" description="Automatic emails to subscribers.">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Invoices</div>
            <div className="text-xs text-muted-foreground">Emailed when a billing cycle opens</div>
          </div>
          <Switch checked={values.send_invoices} onCheckedChange={(v) => set("send_invoices", v)} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Receipts</div>
            <div className="text-xs text-muted-foreground">Emailed after every confirmed payment</div>
          </div>
          <Switch checked={values.send_receipts} onCheckedChange={(v) => set("send_receipts", v)} />
        </div>
        <div className="grid gap-2">
          <Label>Email footer</Label>
          <Textarea rows={2} value={values.footer} onChange={(e) => set("footer", e.target.value)} />
        </div>
      </SettingsCard>

      <SaveBar saving={saving} onSave={() => save()} />
    </div>
  );
}

export const Route = createFileRoute("/_app/settings/email")({
  component: EmailSettings,
  head: () => ({
    meta: [
      { title: "Email Settings | Manu Billing System" },
      { name: "description", content: "Configure sender identity, SMTP relay and automatic invoice and receipt emails for subscribers." },
      { property: "og:title", content: "Email Settings | Manu Billing System" },
      { property: "og:description", content: "SMTP relay and automated subscriber email configuration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
