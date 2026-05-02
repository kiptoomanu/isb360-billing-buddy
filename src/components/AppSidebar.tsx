import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wifi,
  Network,
  Radio,
  Tv,
  Server,
  GitBranch,
  CreditCard,
  Receipt,
  Users,
  TicketCheck,
  Package,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/Logo";

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

const overview: Item[] = [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }];

const network: Item[] = [
  { title: "PPPoE Clients", url: "/clients/pppoe", icon: Wifi },
  { title: "Static IP", url: "/clients/static", icon: Network },
  { title: "Hotspot", url: "/clients/hotspot", icon: Radio },
  { title: "TV Services", url: "/clients/tv", icon: Tv },
  { title: "Network Infrastructure", url: "/network/infra", icon: Server },
  { title: "Fiber Planning", url: "/network/fiber", icon: GitBranch },
];

const finance: Item[] = [
  { title: "Payments", url: "/finance/payments", icon: CreditCard },
  { title: "Expenses", url: "/finance/expenses", icon: Receipt },
  { title: "CRM", url: "/finance/crm", icon: Users },
  { title: "Support Tickets", url: "/finance/tickets", icon: TicketCheck },
];

const ops: Item[] = [{ title: "Inventory", url: "/ops/inventory", icon: Package }];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });

  const renderGroup = (label: string, items: Item[]) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground/70">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((it) => {
            const active = path === it.url;
            return (
              <SidebarMenuItem key={it.url}>
                <SidebarMenuButton asChild isActive={active} tooltip={it.title}>
                  <Link to={it.url} className="flex items-center gap-3">
                    <it.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="text-sm">{it.title}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-center px-2 py-3">
          {collapsed ? (
            <span className="text-lg font-extrabold text-primary">M</span>
          ) : (
            <Logo />
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("OVERVIEW", overview)}
        {renderGroup("NETWORK MANAGEMENT", network)}
        {renderGroup("FINANCE & CRM", finance)}
        {renderGroup("OPERATIONS", ops)}
      </SidebarContent>
    </Sidebar>
  );
}
