import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone } from "lucide-react";

type Cfg = Record<string, string>;

export function MpesaPromptCard({ value, saving, onSave }: { value: Cfg; saving: boolean; onSave: (c: Cfg) => void }) {
  const [f, setF] = useState<Cfg>(value);
  useEffect(() => setF(value), [value]);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const ready = ["consumer_key", "consumer_secret", "shortcode", "passkey"].every((k) => f[k]?.trim());
  const type = f.type === "till" ? "till" : "paybill";
  const env = f.environment === "live" ? "live" : "sandbox";
  const sel = "h-10 w-full rounded-md border bg-background px-3 text-sm";

  const field = (k: string, label: string, ph?: string, secret = false) => (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input type={secret ? "password" : "text"} value={f[k] ?? ""} placeholder={ph} onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  return (
    <Card className="space-y-4 border-primary/40 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border bg-muted"><Smartphone className="h-5 w-5" /></div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">M-Pesa PIN prompt (captive portal)</h3>
            <Badge variant={ready ? "default" : "secondary"}>{ready ? "Ready" : "Not set up"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Fill these from your Safaricom Daraja account. Customers on the hotspot and portal will get the PIN prompt on their phone.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Receive money via</Label>
          <select className={sel} value={type} onChange={(e) => set("type", e.target.value)}>
            <option value="paybill">Paybill</option>
            <option value="till">Till (Buy Goods)</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label>Environment</Label>
          <select className={sel} value={env} onChange={(e) => set("environment", e.target.value)}>
            <option value="sandbox">Test (sandbox)</option>
            <option value="live">Live (real money)</option>
          </select>
        </div>
        {field("shortcode", type === "till" ? "Store number (shortcode)" : "Paybill number (shortcode)", "e.g. 174379")}
        {type === "till" && field("till_number", "Till number", "e.g. 5123456")}
        {type === "paybill" && field("account_reference", "Bank account number (optional)", "Leave blank to use client code")}
        {field("consumer_key", "Consumer key", "", true)}
        {field("consumer_secret", "Consumer secret", "", true)}
        {field("passkey", "Passkey", "", true)}
      </div>
      <div className="flex justify-end">
        <Button onClick={() => onSave({ ...f, type, environment: env })} disabled={saving}>{saving ? "Saving..." : "Save M-Pesa settings"}</Button>
      </div>
    </Card>
  );
}
