export type ScriptRouter = {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  use_https: boolean;
  services?: string[] | null;
};

export type ScriptOptions = {
  /** Remove any previous Manu user/group/firewall entries before re-creating them. */
  reprovision?: boolean;
  /** Restrict API access to this address / CIDR (empty = any). */
  allowedAddress?: string;
  /** Add PPPoE server scaffolding (profile + pool). */
  pppoe?: boolean;
  /** Add Hotspot scaffolding (profile + user profile). */
  hotspot?: boolean;
  /** Pool used by the PPPoE/Hotspot scaffolding. */
  pool?: string;
};

const GROUP = "manu-api";

export function buildRouterOsScript(r: ScriptRouter, opts: ScriptOptions = {}) {
  const svc = r.use_https ? "www-ssl" : "www";
  const services = opts.pppoe === undefined && opts.hotspot === undefined
    ? { pppoe: (r.services ?? ["pppoe"]).includes("pppoe"), hotspot: (r.services ?? []).includes("hotspot") }
    : { pppoe: !!opts.pppoe, hotspot: !!opts.hotspot };
  const pool = opts.pool || "10.10.0.2-10.10.0.254";
  const addr = opts.allowedAddress?.trim();

  const lines: string[] = [];
  lines.push(`# Manu Billing System — MikroTik ${opts.reprovision ? "RE-PROVISIONING" : "provisioning"} script`);
  lines.push(`# Router: ${r.name}  (${r.host}:${r.port})`);
  lines.push(`# RouterOS v7.1+ — paste into WinBox → New Terminal, or SSH.`);
  lines.push("");

  if (opts.reprovision) {
    lines.push(`# 0) Clean up any previous Manu Billing objects`);
    lines.push(`/user remove [find name="${r.username}"]`);
    lines.push(`/user group remove [find name="${GROUP}"]`);
    lines.push(`/ip firewall filter remove [find comment="Manu Billing API"]`);
    lines.push("");
  }

  lines.push(`# 1) API group with the minimum permissions Manu needs`);
  lines.push(`/user group`);
  lines.push(`:if ([:len [find name="${GROUP}"]] = 0) do={ add name=${GROUP} policy=api,rest-api,read,write,test,winbox comment="Manu Billing API" } else={ set [find name="${GROUP}"] policy=api,rest-api,read,write,test,winbox }`);
  lines.push("");

  lines.push(`# 2) Create / update the API user`);
  lines.push(`/user`);
  lines.push(`:if ([:len [find name="${r.username}"]] > 0) do={ set [find name="${r.username}"] password="${r.password}" group=${GROUP} } else={ add name="${r.username}" password="${r.password}" group=${GROUP} comment="Manu Billing API" }`);
  lines.push("");

  lines.push(`# 3) Enable the REST API service on port ${r.port}`);
  lines.push(`/ip service`);
  lines.push(`set ${svc} disabled=no port=${r.port}${addr ? ` address=${addr}` : ""}`);
  if (!addr) lines.push(`# Tip: lock it down with  /ip service set ${svc} address=<manu-server-ip>/32`);
  lines.push("");

  lines.push(`# 4) Allow the API port through the firewall`);
  lines.push(`/ip firewall filter`);
  lines.push(`add chain=input action=accept protocol=tcp dst-port=${r.port}${addr ? ` src-address=${addr}` : ""} comment="Manu Billing API" place-before=0`);
  lines.push("");

  if (services.pppoe) {
    lines.push(`# 5) PPPoE service scaffolding`);
    lines.push(`/ip pool`);
    lines.push(`:if ([:len [find name="manu-pppoe-pool"]] = 0) do={ add name=manu-pppoe-pool ranges=${pool} }`);
    lines.push(`/ppp profile`);
    lines.push(`:if ([:len [find name="manu-pppoe"]] = 0) do={ add name=manu-pppoe local-address=${pool.split("-")[0]} remote-address=manu-pppoe-pool comment="Manu Billing" }`);
    lines.push(`/interface pppoe-server server`);
    lines.push(`:if ([:len [find service-name="manu"]] = 0) do={ add service-name=manu interface=bridge default-profile=manu-pppoe disabled=no }`);
    lines.push("");
  }

  if (services.hotspot) {
    lines.push(`# 6) Hotspot service scaffolding`);
    lines.push(`/ip pool`);
    lines.push(`:if ([:len [find name="manu-hotspot-pool"]] = 0) do={ add name=manu-hotspot-pool ranges=${pool} }`);
    lines.push(`/ip hotspot user profile`);
    lines.push(`:if ([:len [find name="manu-hotspot"]] = 0) do={ add name=manu-hotspot shared-users=1 comment="Manu Billing" }`);
    lines.push(`# Then bind a hotspot server to the client-facing interface:`);
    lines.push(`# /ip hotspot add name=manu interface=bridge address-pool=manu-hotspot-pool profile=default`);
    lines.push("");
  }

  lines.push(`:put "Manu Billing is provisioned: user '${r.username}' on ${svc}:${r.port}."`);
  return lines.join("\n");
}

export function buildDeprovisionScript(r: ScriptRouter) {
  return [
    `# Manu Billing — remove integration from "${r.name}"`,
    `/user remove [find name="${r.username}"]`,
    `/user group remove [find name="${GROUP}"]`,
    `/ip firewall filter remove [find comment="Manu Billing API"]`,
    `:put "Manu Billing access removed."`,
  ].join("\n");
}
