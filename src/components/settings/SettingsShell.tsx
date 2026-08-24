import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Palette, Globe, Network, Wifi, CreditCard, MessageSquare, Mail, Phone,
} from "lucide-react";

const tabs = [
  { title: "Branding", url: "/settings/branding", icon: Palette },
  { title: "Domain", url: "/settings/domain", icon: Globe },
  { title: "PPPoE", url: "/settings/pppoe", icon: Network },
  { title: "Hotspot", url: "/settings/hotspot", icon: Wifi },
  { title: "Payments", url: "/settings/payments", icon: CreditCard },
  { title: "Communications", url: "/settings/communications", icon: MessageSquare },
  { title: "Email", url: "/settings/email", icon: Mail },
  { title: "WhatsApp", url: "/settings/whatsapp", icon: Phone },
] as const;

export function SettingsTabs() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div className="flex w-max gap-1 rounded-full border bg-card p-1">
        {tabs.map((t) => {
          const active = path === t.url;
          return (
            <Link
              key={t.url}
              to={t.url}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsHeader({
  eyebrow = "SETTINGS",
  title,
  accent,
  description,
}: { eyebrow?: string; title: string; accent?: string; description: string }) {
  return (
    <div className="space-y-2 border-b pb-5">
      <div className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">{eyebrow}</div>
      <h1 className="text-3xl font-bold">
        {title} {accent && <span className="text-primary">{accent}</span>}
      </h1>
      <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function SettingsCard({
  title, description, children, footer,
}: { title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
      {footer && <div className="mt-5 flex justify-end">{footer}</div>}
    </Card>
  );
}

export function SaveBar({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <div className="sticky bottom-0 flex justify-end border-t bg-background/80 py-3 backdrop-blur">
      <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
    </div>
  );
}
