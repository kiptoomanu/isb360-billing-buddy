/** Builds the self-installing RouterOS script served from /api/public/provision/<token>. */
export type AutoScriptInput = {
  name: string;
  username: string;
  password: string;
  port: number;
  use_https: boolean;
  services: string[];
  pool?: string;
  origin: string;
  token: string;
  /** Automatically build the client-side bridge during linking. */
  autoBridge?: boolean;
  bridgeName?: string;
  /** Ports added to the bridge (uplink is always excluded). */
  bridgePorts?: string[];
  /** Internet-facing port that must stay OUT of the bridge. */
  uplinkPort?: string;
};

const GROUP = "manu-api";

export const DEFAULT_BRIDGE = "bridge-isp360";
export const DEFAULT_BRIDGE_PORTS = [
  "ether3", "ether4", "ether5", "ether6", "ether7",
  "ether8", "ether9", "ether10", "sfp1", "wlan1",
];

/**
 * RouterOS lines that create the ISP360 client bridge and add every selected
 * port to it. The uplink port is always skipped so internet access is not lost.
 */
export function buildBridgeLines(bridgeName: string, ports: string[], uplink: string) {
  const safe = ports.filter((p) => p && p !== uplink);
  const L: string[] = [];
  L.push(`# ISP360 client bridge — "${bridgeName}" (uplink ${uplink} stays out of the bridge)`);
  L.push(`/interface bridge`);
  L.push(`:if ([:len [find name="${bridgeName}"]] = 0) do={ add name=${bridgeName} comment="ISP360 Billing client bridge" }`);
  L.push(`/interface bridge port`);
  for (const p of safe) {
    L.push(`:if ([:len [/interface find name="${p}"]] > 0) do={ :if ([:len [find interface="${p}"]] = 0) do={ add bridge=${bridgeName} interface=${p} comment="ISP360 Billing" } else={ set [find interface="${p}"] bridge=${bridgeName} } }`);
  }
  L.push(`:if ([:len [find interface="${uplink}"]] > 0) do={ remove [find interface="${uplink}"] }`);
  return L;
}

export function buildAutoProvisionScript(i: AutoScriptInput) {
  const svc = i.use_https ? "www-ssl" : "www";
  const pool = i.pool || "10.10.0.2-10.10.0.254";
  const pppoe = i.services.includes("pppoe");
  const hotspot = i.services.includes("hotspot");
  const checkin = `${i.origin}/api/public/provision/${i.token}/checkin`;

  const L: string[] = [];
  L.push(`# ISP360 Billing — automatic provisioning for "${i.name}"`);
  L.push(`:log info "ISP360: provisioning started"`);
  L.push(`/user group`);
  L.push(`:if ([:len [find name="${GROUP}"]] = 0) do={ add name=${GROUP} policy=api,rest-api,read,write,test,winbox comment="ISP360 Billing API" } else={ set [find name="${GROUP}"] policy=api,rest-api,read,write,test,winbox }`);
  L.push(`/user`);
  L.push(`:if ([:len [find name="${i.username}"]] > 0) do={ set [find name="${i.username}"] password="${i.password}" group=${GROUP} } else={ add name="${i.username}" password="${i.password}" group=${GROUP} comment="ISP360 Billing API" }`);
  L.push(`/ip service set ${svc} disabled=no port=${i.port}`);
  L.push(`/ip firewall filter`);
  L.push(`:if ([:len [find comment="ISP360 Billing API"]] = 0) do={ add chain=input action=accept protocol=tcp dst-port=${i.port} comment="ISP360 Billing API" place-before=0 }`);

  const bridge = i.autoBridge !== false;
  const bridgeName = i.bridgeName || DEFAULT_BRIDGE;
  if (bridge) L.push(...buildBridgeLines(bridgeName, i.bridgePorts ?? DEFAULT_BRIDGE_PORTS, i.uplinkPort ?? "ether1"));

  if (pppoe) {
    L.push(`/ip pool`);
    L.push(`:if ([:len [find name="manu-pppoe-pool"]] = 0) do={ add name=manu-pppoe-pool ranges=${pool} }`);
    L.push(`/ppp profile`);
    L.push(`:if ([:len [find name="manu-pppoe"]] = 0) do={ add name=manu-pppoe local-address=${pool.split("-")[0]} remote-address=manu-pppoe-pool comment="ISP360 Billing" }`);
    if (bridge) {
      L.push(`/interface pppoe-server server`);
      L.push(`:if ([:len [find interface="${bridgeName}"]] = 0) do={ add service-name=isp360 interface=${bridgeName} default-profile=manu-pppoe disabled=no } else={ set [find interface="${bridgeName}"] default-profile=manu-pppoe disabled=no }`);
    }
  }
  if (hotspot) {
    L.push(`/ip pool`);
    L.push(`:if ([:len [find name="manu-hotspot-pool"]] = 0) do={ add name=manu-hotspot-pool ranges=${pool} }`);
    L.push(`/ip hotspot user profile`);
    L.push(`:if ([:len [find name="manu-hotspot"]] = 0) do={ add name=manu-hotspot shared-users=1 comment="ISP360 Billing" }`);
    if (bridge) {
      L.push(`/ip hotspot`);
      L.push(`:if ([:len [find interface="${bridgeName}"]] = 0) do={ add name=isp360-hotspot interface=${bridgeName} address-pool=manu-hotspot-pool profile=default disabled=no }`);
    }
  }

  // Heartbeat / check-in script + scheduler (form-encoded body: no nested quotes to escape)
  const checkinBody = [
    `:local board [/system resource get board-name];`,
    `:local ver [/system resource get version];`,
    `:local id [/system identity get name];`,
    `/tool fetch url="${checkin}" http-method=post http-header-field="Content-Type: application/x-www-form-urlencoded" http-data=("model=" . $board . "&version=" . $ver . "&identity=" . $id) mode=https keep-result=no;`,
  ].join(" ");

  L.push(`/system script`);
  L.push(`:if ([:len [find name="isp360-checkin"]] > 0) do={ remove [find name="isp360-checkin"] }`);
  L.push(`add name=isp360-checkin policy=read,write,test,policy source="${checkinBody.replace(/"/g, '\\"')}"`);
  L.push(`/system scheduler`);
  L.push(`:if ([:len [find name="isp360-heartbeat"]] > 0) do={ remove [find name="isp360-heartbeat"] }`);
  L.push(`add name=isp360-heartbeat interval=5m on-event="/system script run isp360-checkin" comment="ISP360 Billing heartbeat"`);
  L.push(`/system script run isp360-checkin`);
  L.push(`:log info "ISP360: provisioning done"`);
  L.push(`:put "ISP360 Billing provisioned. The dashboard will go Online in a few seconds."`);
  return L.join("\n");
}

export function buildOneLiner(origin: string, token: string) {
  return `/tool fetch mode=https url="${origin}/api/public/provision/${token}" dst-path=isp360.rsc;:delay 2s;/import isp360.rsc;`;
}
