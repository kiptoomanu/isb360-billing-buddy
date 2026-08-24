import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;

export function useSettings<T extends Record<string, any>>(section: string, defaults: T) {
  const [values, setValues] = useState<T>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await db
        .from("app_settings")
        .select("data")
        .eq("section", section)
        .maybeSingle();
      if (!alive) return;
      if (error) toast.error(error.message);
      setValues({ ...defaults, ...((data?.data ?? {}) as Partial<T>) });
      setLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
  }, []);

  const save = useCallback(async (override?: Partial<T>) => {
    const payload = { ...values, ...(override ?? {}) };
    setSaving(true);
    const { error } = await db
      .from("app_settings")
      .upsert({ section, data: payload }, { onConflict: "section" });
    setSaving(false);
    if (error) return toast.error(error.message);
    setValues(payload as T);
    toast.success("Settings saved");
  }, [section, values]);

  return { values, set, save, loading, saving };
}
