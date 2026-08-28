import { useState } from "react";
import { useSettings } from "@/lib/useSettings";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Zap, Clock, Mail, DollarSign, Gauge, Gift, Plus, Trash2, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export type Reward = {
  id: string;
  name: string;
  description: string;
  points: number;
  kind: "voucher" | "discount" | "data" | "custom";
  value: string;
  active: boolean;
};

type LoyaltyConfig = {
  enabled: boolean;
  autoIssue: boolean;
  notifyOnSelfRedeem: boolean;
  spendPerPoint: number;
  minRedeemPoints: number;
  pointsExpiryDays: number;
  channel: "sms" | "whatsapp" | "both";
  showPanelOnPortal: boolean;
  rewards: Reward[];
};

const defaults: LoyaltyConfig = {
  enabled: true,
  autoIssue: true,
  notifyOnSelfRedeem: true,
  spendPerPoint: 10,
  minRedeemPoints: 50,
  pointsExpiryDays: 0,
  channel: "both",
  showPanelOnPortal: true,
  rewards: [],
};

function SettingRow({
  icon: Icon, title, badge, badgeTone = "on", description, children, note,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: string;
  badgeTone?: "on" | "off" | "info";
  description: string;
  children?: React.ReactNode;
  note?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{title}</h3>
            {badge && (
              <Badge variant={badgeTone === "off" ? "secondary" : badgeTone === "info" ? "outline" : "default"}>
                {badge}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
          {children}
          {note && <p className="text-xs italic text-muted-foreground">{note}</p>}
        </div>
      </div>
    </Card>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

export function LoyaltySettings() {
  const { values, set, save, loading, saving } = useSettings<LoyaltyConfig>("loyalty", defaults);
  const rewards = values.rewards ?? [];

  const saveRewards = (next: Reward[]) => save({ rewards: next } as Partial<LoyaltyConfig>);

  if (loading) return <p className="py-10 text-center text-sm text-muted-foreground">Loading settings…</p>;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 bg-primary p-6 text-primary-foreground">
        <h2 className="text-2xl font-bold">Loyalty Points — Settings &amp; Rewards</h2>
        <p className="mt-1 text-sm opacity-90">
          Control how customers earn points, how rewards are issued and which channels notify them.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <AddRewardDialog
            onAdd={(r) => saveRewards([...rewards, r])}
            trigger={
              <Button size="sm" variant="secondary" className="gap-2">
                <Plus className="h-4 w-4" /> Add Reward
              </Button>
            }
          />
          <Button size="sm" variant="secondary" className="gap-2" onClick={() => toast.info(`${rewards.length} rewards, ${rewards.filter((r) => r.active).length} active`)}>
            <BarChart3 className="h-4 w-4" /> Activity Report
          </Button>
        </div>
      </Card>

      <Section label="MASTER SWITCH">
        <SettingRow
          icon={Zap}
          title="Loyalty Points"
          badge={values.enabled ? "ON" : "OFF"}
          badgeTone={values.enabled ? "on" : "off"}
          description="Master switch. When OFF the system stops accruing points and the hotspot panel is hidden, regardless of every other setting on this page."
        >
          <label className="flex items-center gap-3 text-sm font-medium">
            <Switch checked={values.enabled} onCheckedChange={(v) => set("enabled", v)} />
            Turn on Loyalty Points
          </label>
        </SettingRow>
      </Section>

      <Section label="REDEMPTION MODE">
        <SettingRow
          icon={Clock}
          title="Auto-issue vouchers via SMS or WhatsApp"
          badge={values.autoIssue ? "AUTO MODE" : "MANUAL MODE"}
          badgeTone={values.autoIssue ? "on" : "off"}
          description="A voucher is sent the moment a customer crosses a threshold. They can also redeem manually on the login page if they prefer."
          note="Default is ON. Either way the hotspot panel keeps showing the customer their balance and earlier vouchers."
        >
          <label className="flex items-center gap-3 text-sm font-medium">
            <Switch checked={values.autoIssue} onCheckedChange={(v) => set("autoIssue", v)} />
            Auto-issue vouchers via SMS or WhatsApp
          </label>
        </SettingRow>

        <SettingRow
          icon={Mail}
          title="Send SMS / WhatsApp on self-redeem"
          badge={values.notifyOnSelfRedeem ? "SENDING" : "SILENT"}
          badgeTone={values.notifyOnSelfRedeem ? "on" : "off"}
          description="When a customer self-redeems on the hotspot login page, they also get the voucher code via SMS / WhatsApp so they have it on their phone."
          note="Only affects self-redemption from the hotspot panel. Auto-issued vouchers always go via SMS / WhatsApp."
        >
          <label className="flex items-center gap-3 text-sm font-medium">
            <Switch checked={values.notifyOnSelfRedeem} onCheckedChange={(v) => set("notifyOnSelfRedeem", v)} />
            Also notify the customer when they self-redeem
          </label>
          <div className="max-w-xs space-y-1.5">
            <Label>Delivery channel</Label>
            <Select value={values.channel} onValueChange={(v) => set("channel", v as LoyaltyConfig["channel"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS only</SelectItem>
                <SelectItem value="whatsapp">WhatsApp only</SelectItem>
                <SelectItem value="both">SMS + WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SettingRow>
      </Section>

      <Section label="EARNING & TRACKING">
        <SettingRow
          icon={DollarSign}
          title="Spend per point"
          description="How much a customer must spend to earn 1 point."
          note={`Example: a customer who transacts Ksh. ${(values.spendPerPoint || 1) * 50} earns 50 points.`}
        >
          <div className="flex max-w-xs items-center gap-2">
            <span className="rounded-md border px-3 py-2 text-sm text-muted-foreground">Ksh.</span>
            <Input
              type="number" min="1" step="0.5"
              value={values.spendPerPoint}
              onChange={(e) => set("spendPerPoint", Number(e.target.value))}
            />
            <span className="rounded-md border px-3 py-2 text-sm text-muted-foreground">/ pt</span>
          </div>
        </SettingRow>

        <SettingRow
          icon={Gauge}
          title="Redemption threshold & expiry"
          description="Minimum points before a customer can redeem, and how long unused points stay valid."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Minimum points to redeem</Label>
              <Input type="number" min="1" value={values.minRedeemPoints} onChange={(e) => set("minRedeemPoints", Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Points expire after (days, 0 = never)</Label>
              <Input type="number" min="0" value={values.pointsExpiryDays} onChange={(e) => set("pointsExpiryDays", Number(e.target.value))} />
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium">
            <Switch checked={values.showPanelOnPortal} onCheckedChange={(v) => set("showPanelOnPortal", v)} />
            Show the loyalty panel on the hotspot login page
          </label>
        </SettingRow>
      </Section>

      <Section label="REWARDS CATALOGUE">
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold">Rewards</h3>
              <Badge variant="outline">{rewards.length}</Badge>
            </div>
            <AddRewardDialog
              onAdd={(r) => saveRewards([...rewards, r])}
              trigger={<Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Reward</Button>}
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reward</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rewards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No rewards yet. Add one so customers have something to redeem.
                    </TableCell>
                  </TableRow>
                ) : rewards.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                    </TableCell>
                    <TableCell className="text-xs uppercase">{r.kind}</TableCell>
                    <TableCell className="text-sm">{r.value || "—"}</TableCell>
                    <TableCell className="font-semibold">{r.points}</TableCell>
                    <TableCell>
                      <Switch
                        checked={r.active}
                        onCheckedChange={(v) =>
                          saveRewards(rewards.map((x) => (x.id === r.id ? { ...x, active: v } : x)))
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon" variant="ghost"
                        onClick={() => saveRewards(rewards.filter((x) => x.id !== r.id))}
                        aria-label={`Delete ${r.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </Section>

      <div className="sticky bottom-0 flex justify-end border-t bg-background/80 py-3 backdrop-blur">
        <Button onClick={() => save()} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
      </div>
    </div>
  );
}

function AddRewardDialog({ onAdd, trigger }: { onAdd: (r: Reward) => void; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("100");
  const [kind, setKind] = useState<Reward["kind"]>("voucher");
  const [value, setValue] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Give the reward a name");
    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      points: Math.max(1, Number(points) || 0),
      kind,
      value: value.trim(),
      active: true,
    });
    setName(""); setDescription(""); setPoints("100"); setValue("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add reward</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label>Reward name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Free 1 hour hotspot" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as Reward["kind"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="voucher">Hotspot voucher</SelectItem>
                  <SelectItem value="discount">Bill discount</SelectItem>
                  <SelectItem value="data">Bonus data / time</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Points cost</Label>
              <Input type="number" min="1" value={points} onChange={(e) => setPoints(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Value</Label>
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 1 hour / Ksh. 100 off" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Shown to the customer on the hotspot panel" />
          </div>
          <DialogFooter><Button type="submit">Add reward</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
