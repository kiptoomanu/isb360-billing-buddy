import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SignupReview = { summary: string; missing: string[]; risk: "low" | "medium" | "high" };

async function streamText(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      input: prompt,
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    if (res.status === 402) throw new Error("AI credits are used up. Add credits to your workspace to keep using reviews.");
    if (res.status === 429) throw new Error("Too many AI requests right now. Please try again in a minute.");
    throw new Error(`AI review failed [${res.status}]: ${body.slice(0, 300)}`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const ev = JSON.parse(data);
        if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
        if (ev.type === "response.refusal.delta") throw new Error("The AI declined to review this request.");
        if (ev.type === "error" || ev.type === "response.failed") throw new Error(ev.error?.message ?? ev.message ?? "AI review failed.");
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
  return text;
}

export const reviewSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<SignupReview> => {
    const db = context.supabase as any;
    const { data: isAdmin } = await db.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Only admins can review sign-ups.");
    const { data: p } = await db.from("profiles").select("email, full_name, avatar_url, created_at").eq("id", data.userId).maybeSingle();
    if (!p) throw new Error("Sign-up not found.");
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured.");

    const prompt = `You review staff sign-up requests for an ISP billing system (ISP360, Kenya). Required details: full name (first and last), a valid-looking email address. Nice to have: profile photo.
Sign-up details (JSON): ${JSON.stringify(p)}
Reply ONLY with JSON: {"summary": "one or two plain sentences for the admin", "missing": ["short list of missing or suspicious details"], "risk": "low"|"medium"|"high"}`;
    const raw = await streamText(apiKey, prompt);
    const m = raw.match(/\{[\s\S]*\}/);
    try {
      const j = JSON.parse(m ? m[0] : raw);
      return {
        summary: String(j.summary ?? "").slice(0, 500) || "No summary.",
        missing: Array.isArray(j.missing) ? j.missing.map(String).slice(0, 10) : [],
        risk: ["low", "medium", "high"].includes(j.risk) ? j.risk : "medium",
      };
    } catch {
      return { summary: raw.slice(0, 500) || "No summary.", missing: [], risk: "medium" };
    }
  });
