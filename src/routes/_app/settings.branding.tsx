import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SettingsHeader, SettingsCard, SaveBar } from "@/components/settings/SettingsShell";
import { useSettings } from "@/lib/useSettings";
import { Info } from "lucide-react";

const defaults = {
  network_name: "MANUNET",
  logo_url: "",
  brand_color: "#FA8200",
  font: "Work Sans",
  support_phone: "",
  support_email: "",
  terms: "",
};

function BrandingSettings() {
  const { values, set, save, saving } = useSettings("branding", defaults);

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Your"
        accent="brand."
        description="How your subscribers recognise your network — name, logo, brand colour, support contact, and terms."
      />

      <SettingsCard title="Identity" description="Used on the captive portal, vouchers, invoices, and outbound messages.">
        <div className="flex items-start gap-4">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-xs text-muted-foreground"
            style={{ borderColor: values.brand_color }}
          >
            {values.logo_url
              ? <img src={values.logo_url} alt="Network logo preview" className="h-full w-full object-contain" />
              : "Logo"}
          </div>
          <div className="flex-1 grid gap-2">
            <Label>Logo URL (optional)</Label>
            <Input value={values.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://..." />
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3 w-3" /> Clear the field to remove the logo.
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Network name</Label>
          <p className="text-xs text-muted-foreground">Shown wherever subscribers see your brand.</p>
          <Input value={values.network_name} onChange={(e) => set("network_name", e.target.value)} />
        </div>

        <div className="grid gap-2">
          <Label>Brand colour</Label>
          <p className="text-xs text-muted-foreground">Primary accent across the portal and emails.</p>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={values.brand_color}
              onChange={(e) => set("brand_color", e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-md border bg-background"
              aria-label="Brand colour"
            />
            <Input value={values.brand_color} onChange={(e) => set("brand_color", e.target.value)} className="max-w-[160px] font-mono" />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Font</Label>
          <p className="text-xs text-muted-foreground">Applied across the operator panel and portal.</p>
          <Select value={values.font} onValueChange={(v) => set("font", v)}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Work Sans", "Inter", "Manrope", "DM Sans", "Space Grotesk"].map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Support contact"
        description="Surfaced on the captive portal and in SMS receipts so customers know how to reach you."
      >
        <div className="grid gap-2">
          <Label>Support phone</Label>
          <p className="text-xs text-muted-foreground">e.g. +254712345678</p>
          <Input value={values.support_phone} onChange={(e) => set("support_phone", e.target.value)} placeholder="+254..." />
        </div>
        <div className="grid gap-2">
          <Label>Support email</Label>
          <div className="flex items-center gap-2">
            <Input value={values.support_email} onChange={(e) => set("support_email", e.target.value)} placeholder="support@example.com" />
            {values.support_email.includes("@") && <Badge variant="secondary">Valid</Badge>}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Terms & conditions" description="Shown to subscribers before they connect.">
        <Textarea rows={5} value={values.terms} onChange={(e) => set("terms", e.target.value)} placeholder="Fair usage policy, refund policy..." />
      </SettingsCard>

      <SaveBar saving={saving} onSave={() => save()} />
    </div>
  );
}

export const Route = createFileRoute("/_app/settings/branding")({
  component: BrandingSettings,
  head: () => ({
    meta: [
      { title: "Branding Settings | ISP360 Billing System" },
      { name: "description", content: "Set your network name, logo, brand colour, font, support contact and terms shown to subscribers." },
      { property: "og:title", content: "Branding Settings | ISP360 Billing System" },
      { property: "og:description", content: "Control how subscribers recognise your ISP brand." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
