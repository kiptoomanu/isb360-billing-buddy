import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SettingsHeader, SettingsCard } from "@/components/settings/SettingsShell";
import { useSettings } from "@/lib/useSettings";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutGrid, Settings2, ShoppingCart, Wand2, History, Eye, Save, RotateCcw,
  GripVertical, ArrowUp, ArrowDown, Info, Gift, Tag, LogIn, Smartphone,
  Type, Image as ImageIcon, MessageSquare, Tv, Phone, Info as InfoIcon,
} from "lucide-react";

type BlockDef = {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  blurb: string;
};

const BLOCKS: BlockDef[] = [
  { id: "header", name: "Header", icon: ImageIcon, blurb: "Logo, network name, support number" },
  { id: "welcome", name: "Welcome Text", icon: Type, blurb: "Headline and short intro copy" },
  { id: "free_trial", name: "Free Trial", icon: Gift, blurb: "Give new devices a taste of the network" },
  { id: "pricing", name: "Pricing Cards", icon: Tag, blurb: "Your hotspot packages as tappable cards" },
  { id: "login", name: "Login Form", icon: LogIn, blurb: "Voucher code / phone number sign-in" },
  { id: "mpesa", name: "Mpesa Section", icon: Smartphone, blurb: "Paybill, till and STK push instructions" },
  { id: "tv", name: "Connect TV", icon: Tv, blurb: "Pair a smart TV or streaming box" },
  { id: "support", name: "Support & Contact", icon: Phone, blurb: "Call, WhatsApp and help links" },
  { id: "notice", name: "Notice Banner", icon: MessageSquare, blurb: "Announcements and downtime notices" },
];

const DEFAULT_ORDER = ["header", "welcome", "free_trial", "pricing", "login", "mpesa", "support"];

const defaults = {
  deploy_target: "default",
  enabled_blocks: DEFAULT_ORDER as string[],
  page_title: "CHECK OUR PRICING",
  page_subtitle: "Choose a plan that fits your needs.",
  brand_color: "#FA8200",
  card_color: "#FDE68A",
  accent_text: "#7C2D12",
  support_phone: "0764690106",
  paid_link_text: "Already Paid? Click Here.",
  show_filters: true,
  dark_header: true,
  radius: "16",
  footer_note: "Powered by Manu Billing System",
  history: [] as { at: string; note: string }[],
};

const MARKETPLACE = [
  { id: "aurora", name: "Aurora", blurb: "Gradient hero, glassy pricing cards", tag: "Free" },
  { id: "kilimo", name: "Kilimo", blurb: "Bright yellow tiles, big prices", tag: "Popular" },
  { id: "midnight", name: "Midnight", blurb: "Dark portal with neon accents", tag: "Free" },
  { id: "voucher", name: "Voucher First", blurb: "Code entry above the fold", tag: "New" },
];

function PageBuilder() {
  const { values, set, save, saving } = useSettings("pagebuilder", defaults);
  const [plans, setPlans] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("plans")
        .select("id,name,price,validity_days,type,active")
        .eq("type", "hotspot")
        .eq("active", true)
        .order("price");
      setPlans(data ?? []);
    })();
  }, []);

  const enabled: string[] = Array.isArray(values.enabled_blocks) ? values.enabled_blocks : DEFAULT_ORDER;
  const available = useMemo(() => BLOCKS.filter((b) => !enabled.includes(b.id)), [enabled]);

  const toggle = (id: string) =>
    set("enabled_blocks", enabled.includes(id) ? enabled.filter((b) => b !== id) : [...enabled, id]);

  const move = (id: string, dir: -1 | 1) => {
    const i = enabled.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= enabled.length) return;
    const next = [...enabled];
    [next[i], next[j]] = [next[j], next[i]];
    set("enabled_blocks", next);
  };

  const publish = async () => {
    const entry = { at: new Date().toISOString(), note: `Deployed to ${values.deploy_target}` };
    await save({ history: [entry, ...(values.history ?? [])].slice(0, 20) } as any);
  };

  const resetLayout = () => {
    set("enabled_blocks", DEFAULT_ORDER);
    toast.success("Layout reset to the default template");
  };

  return (
    <div className="space-y-6">
      <SettingsHeader
        eyebrow="SETTINGS / HOTSPOT"
        title="Page"
        accent="builder."
        description="Compose the captive portal your customers see: drag blocks into place, style them, and deploy to a router."
      />

      {/* Deploy bar */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 bg-primary/10 p-4 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-2">
            <Label className="text-xs font-semibold tracking-wider text-muted-foreground">DEPLOY TO</Label>
            <Select value={values.deploy_target} onValueChange={(v) => set("deploy_target", v)}>
              <SelectTrigger><SelectValue placeholder="Select a portal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default hotspot portal</SelectItem>
                <SelectItem value="all-routers">All linked routers</SelectItem>
                <SelectItem value="staging">Staging preview only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={resetLayout}>
              <RotateCcw className="mr-2 h-4 w-4" /> Switch to Default
            </Button>
            <Button variant="secondary" onClick={() => toast.info("Preview updated on the right")}>
              <Eye className="mr-2 h-4 w-4" /> Preview
            </Button>
            <Button onClick={publish} disabled={saving}>
              <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save & Upload"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Info className="h-4 w-4 text-primary" /> Important notice
        </div>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li><b className="text-foreground">Plan changes:</b> if you add, edit or delete packages you will need to re-customise this page.</li>
          <li><b className="text-foreground">Performance:</b> only logo and advert images are used so the portal loads fast on weak signal.</li>
          <li><b className="text-foreground">Desktop first:</b> the builder is easiest to use on a laptop, the portal itself is mobile-first.</li>
          <li><b className="text-foreground">Default template:</b> your original portal is always available in Hotspot settings.</li>
        </ul>
      </div>

      <Tabs defaultValue="builder">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="builder"><LayoutGrid className="mr-2 h-4 w-4" />Builder</TabsTrigger>
          <TabsTrigger value="global"><Settings2 className="mr-2 h-4 w-4" />Global Settings</TabsTrigger>
          <TabsTrigger value="market"><ShoppingCart className="mr-2 h-4 w-4" />Marketplace</TabsTrigger>
          <TabsTrigger value="smart"><Wand2 className="mr-2 h-4 w-4" />Smart Tools</TabsTrigger>
          <TabsTrigger value="history"><History className="mr-2 h-4 w-4" />History</TabsTrigger>
        </TabsList>

        {/* BUILDER */}
        <TabsContent value="builder" className="mt-4">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-5">
              <SettingsCard title="Page layout" description="Blocks render top to bottom in this order.">
                <div className="space-y-2">
                  {enabled.map((id, idx) => {
                    const b = BLOCKS.find((x) => x.id === id);
                    if (!b) return null;
                    return (
                      <div key={id} className="flex items-center gap-3 rounded-md border bg-card p-3">
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <b.icon className="h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{b.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{b.blurb}</div>
                        </div>
                        <Button size="icon" variant="ghost" disabled={idx === 0} onClick={() => move(id, -1)} aria-label={`Move ${b.name} up`}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" disabled={idx === enabled.length - 1} onClick={() => move(id, 1)} aria-label={`Move ${b.name} down`}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Switch checked onCheckedChange={() => toggle(id)} aria-label={`Remove ${b.name}`} />
                      </div>
                    );
                  })}
                  {enabled.length === 0 && (
                    <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No blocks yet — add some from the list below.
                    </p>
                  )}
                </div>
              </SettingsCard>

              <SettingsCard title="Available blocks" description="Tap to add a block to the bottom of the page.">
                <div className="grid gap-2 sm:grid-cols-2">
                  {available.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => toggle(b.id)}
                      className="flex items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <b.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{b.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{b.blurb}</div>
                      </div>
                    </button>
                  ))}
                  {available.length === 0 && (
                    <p className="text-sm text-muted-foreground">Every block is already on the page.</p>
                  )}
                </div>
              </SettingsCard>
            </div>

            {/* PREVIEW */}
            <div className="lg:sticky lg:top-4 lg:self-start">
              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">Live preview</span>
                  <Badge variant="secondary">Mobile</Badge>
                </div>
                <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[28px] border-8 border-foreground/80 bg-background">
                  <div className="max-h-[560px] overflow-y-auto">
                    {enabled.map((id) => (
                      <PreviewBlock
                        key={id}
                        id={id}
                        values={values}
                        plans={plans}
                        filter={filter}
                        setFilter={setFilter}
                      />
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* GLOBAL */}
        <TabsContent value="global" className="mt-4 space-y-5">
          <SettingsCard title="Page copy" description="Headline text shown above the packages.">
            <div className="grid gap-2">
              <Label>Page title</Label>
              <Input value={values.page_title} onChange={(e) => set("page_title", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Subtitle</Label>
              <Input value={values.page_subtitle} onChange={(e) => set("page_subtitle", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Footer note</Label>
              <Textarea rows={2} value={values.footer_note} onChange={(e) => set("footer_note", e.target.value)} />
            </div>
          </SettingsCard>

          <SettingsCard title="Styling" description="Colours and shape of the portal cards.">
            <div className="grid gap-4 sm:grid-cols-3">
              {([
                ["brand_color", "Brand colour"],
                ["card_color", "Card colour"],
                ["accent_text", "Card text colour"],
              ] as const).map(([key, label]) => (
                <div key={key} className="grid gap-2">
                  <Label>{label}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="h-9 w-12 cursor-pointer rounded border bg-transparent"
                      value={values[key]}
                      onChange={(e) => set(key, e.target.value)}
                      aria-label={label}
                    />
                    <Input value={values[key]} onChange={(e) => set(key, e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-2 max-w-xs">
              <Label>Corner radius (px)</Label>
              <Input type="number" value={values.radius} onChange={(e) => set("radius", e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Dark header bar</div>
                <div className="text-xs text-muted-foreground">Contrasting strip behind the logo</div>
              </div>
              <Switch checked={values.dark_header} onCheckedChange={(v) => set("dark_header", v)} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Show duration filters</div>
                <div className="text-xs text-muted-foreground">All / Hourly / Daily / Weekly / Monthly tabs</div>
              </div>
              <Switch checked={values.show_filters} onCheckedChange={(v) => set("show_filters", v)} />
            </div>
          </SettingsCard>

          <SettingsCard title="Contact strip" description="Shown in the header and support block.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Support phone</Label>
                <Input value={values.support_phone} onChange={(e) => set("support_phone", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>"Already paid" link text</Label>
                <Input value={values.paid_link_text} onChange={(e) => set("paid_link_text", e.target.value)} />
              </div>
            </div>
          </SettingsCard>

          <div className="flex justify-end">
            <Button onClick={() => save()} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          </div>
        </TabsContent>

        {/* MARKETPLACE */}
        <TabsContent value="market" className="mt-4">
          <SettingsCard title="Template marketplace" description="Start from a ready-made portal and tweak it.">
            <div className="grid gap-3 sm:grid-cols-2">
              {MARKETPLACE.map((m) => (
                <div key={m.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{m.name}</span>
                    <Badge variant="secondary">{m.tag}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{m.blurb}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => {
                      set("enabled_blocks", DEFAULT_ORDER);
                      toast.success(`${m.name} template applied — remember to save`);
                    }}
                  >
                    Use template
                  </Button>
                </div>
              ))}
            </div>
          </SettingsCard>
        </TabsContent>

        {/* SMART TOOLS */}
        <TabsContent value="smart" className="mt-4">
          <SettingsCard title="Smart tools" description="Shortcuts that fill the portal from data you already have.">
            <div className="grid gap-3 sm:grid-cols-2">
              <ToolButton
                title="Sync pricing cards"
                blurb={`Pull ${plans.length} active hotspot package${plans.length === 1 ? "" : "s"} into the page`}
                onClick={() => {
                  if (!enabled.includes("pricing")) toggle("pricing");
                  toast.success("Pricing cards synced from your plans");
                }}
              />
              <ToolButton
                title="Add M-Pesa instructions"
                blurb="Insert a paybill / STK push block"
                onClick={() => {
                  if (!enabled.includes("mpesa")) toggle("mpesa");
                  toast.success("M-Pesa section added");
                }}
              />
              <ToolButton
                title="Enable free trial block"
                blurb="Offer new devices a short taster session"
                onClick={() => {
                  if (!enabled.includes("free_trial")) toggle("free_trial");
                  toast.success("Free trial block added");
                }}
              />
              <ToolButton
                title="Minimal layout"
                blurb="Header, pricing and login only — fastest to load"
                onClick={() => {
                  set("enabled_blocks", ["header", "pricing", "login"]);
                  toast.success("Minimal layout applied");
                }}
              />
            </div>
          </SettingsCard>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="mt-4">
          <SettingsCard title="Deploy history" description="The last 20 uploads of this portal.">
            {(values.history ?? []).length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nothing deployed yet. Hit “Save &amp; Upload” to record your first version.
              </p>
            ) : (
              <div className="divide-y rounded-md border">
                {(values.history ?? []).map((h: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 text-sm">
                    <span>{h.note}</span>
                    <span className="text-xs text-muted-foreground">{new Date(h.at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </SettingsCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ToolButton({ title, blurb, onClick }: { title: string; blurb: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-md border p-4 text-left transition-colors hover:bg-muted/50"
    >
      <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{blurb}</div>
      </div>
    </button>
  );
}

const FILTERS = ["all", "hourly", "daily", "weekly", "monthly"] as const;

function bucket(days: number) {
  if (days <= 0) return "hourly";
  if (days === 1) return "daily";
  if (days <= 7) return "weekly";
  return "monthly";
}

function PreviewBlock({
  id, values, plans, filter, setFilter,
}: { id: string; values: any; plans: any[]; filter: string; setFilter: (v: string) => void }) {
  const radius = `${values.radius || 16}px`;

  if (id === "header") {
    return (
      <div
        className={cn("flex items-center justify-between gap-2 px-3 py-3 text-[11px]", values.dark_header ? "bg-slate-900 text-white" : "bg-muted")}
      >
        <span className="truncate font-bold uppercase">{values.network_name || "Manu Net"}</span>
        <span className="truncate opacity-80">{values.paid_link_text}</span>
        <span className="shrink-0 font-semibold">{values.support_phone}</span>
      </div>
    );
  }
  if (id === "welcome") {
    return (
      <div className="px-4 py-5 text-center">
        <div className="text-lg font-extrabold">{values.page_title}</div>
        <p className="mt-1 text-xs text-muted-foreground">{values.page_subtitle}</p>
      </div>
    );
  }
  if (id === "notice") {
    return (
      <div className="mx-3 my-2 flex items-start gap-2 rounded-md bg-sky-500/15 p-3 text-[11px]">
        <InfoIcon className="mt-0.5 h-3 w-3 shrink-0" /> Scheduled maintenance tonight from 1am to 3am.
      </div>
    );
  }
  if (id === "free_trial") {
    return (
      <div className="mx-3 my-2 rounded-md p-3 text-center text-[11px] font-semibold" style={{ background: values.brand_color, color: "#fff", borderRadius: radius }}>
        Try 15 minutes free
      </div>
    );
  }
  if (id === "pricing") {
    const shown = plans.filter((p) => filter === "all" || bucket(p.validity_days) === filter);
    return (
      <div className="px-3 py-2">
        {values.show_filters && (
          <div className="mb-3 flex flex-wrap justify-center gap-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="rounded px-2 py-1 text-[10px] font-medium capitalize"
                style={filter === f ? { background: values.brand_color, color: "#fff" } : { background: "hsl(var(--muted))" }}
              >
                {f}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {shown.length === 0 && (
            <p className="col-span-2 py-4 text-center text-[11px] text-muted-foreground">
              No active hotspot packages yet — add them under Plans &amp; Packages.
            </p>
          )}
          {shown.map((p) => (
            <div key={p.id} className="overflow-hidden text-center" style={{ background: values.card_color, borderRadius: radius }}>
              <div className="p-2">
                <div className="mx-auto mb-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: values.accent_text, color: "#fff" }}>
                  {p.name}
                </div>
                <div className="text-lg font-extrabold" style={{ color: values.accent_text }}>
                  <span className="text-[10px]">KES </span>{Number(p.price)}
                </div>
                <div className="text-[10px] opacity-70" style={{ color: values.accent_text }}>
                  {p.validity_days} day{p.validity_days === 1 ? "" : "s"}
                </div>
              </div>
              <div className="py-1.5 text-[10px] font-semibold" style={{ background: values.brand_color, color: "#fff" }}>
                Click Here
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (id === "login") {
    return (
      <div className="mx-3 my-2 space-y-2 rounded-md border p-3" style={{ borderRadius: radius }}>
        <div className="text-[11px] font-semibold">Already have a voucher?</div>
        <div className="rounded border px-2 py-1.5 text-[10px] text-muted-foreground">Enter code</div>
        <div className="rounded py-1.5 text-center text-[10px] font-semibold" style={{ background: values.brand_color, color: "#fff" }}>
          Connect
        </div>
      </div>
    );
  }
  if (id === "mpesa") {
    return (
      <div className="mx-3 my-2 rounded-md bg-emerald-500/10 p-3 text-[10px]" style={{ borderRadius: radius }}>
        <div className="font-semibold text-emerald-700">Pay with M-Pesa</div>
        <div className="mt-1 text-muted-foreground">Paybill 000000 · Account: your phone number</div>
      </div>
    );
  }
  if (id === "tv") {
    return (
      <div className="mx-3 my-2 rounded py-2 text-center text-[10px] font-semibold" style={{ background: values.brand_color, color: "#fff", borderRadius: radius }}>
        Connect TV Here
      </div>
    );
  }
  if (id === "support") {
    return (
      <div className="px-3 py-3 text-center text-[10px] text-muted-foreground">
        Need help? Call {values.support_phone}
        <div className="mt-1">{values.footer_note}</div>
      </div>
    );
  }
  return null;
}

export const Route = createFileRoute("/_app/settings/pagebuilder")({
  component: PageBuilder,
  head: () => ({
    meta: [
      { title: "Hotspot Page Builder | Manu Billing System" },
      { name: "description", content: "Build your captive portal with drag-in blocks: header, welcome text, free trial, pricing cards, login form and M-Pesa instructions." },
      { property: "og:title", content: "Hotspot Page Builder | Manu Billing System" },
      { property: "og:description", content: "Compose, style and deploy your hotspot landing page." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
