import { useEffect, useState } from "react";
import { Bell, Sun, Moon, LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";

export function TopBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    setDark(isDark);
  }, []);

  const toggle = (val: boolean) => {
    setDark(val);
    document.documentElement.classList.toggle("dark", val);
    localStorage.setItem("theme", val ? "dark" : "light");
  };

  const initials =
    user?.email?.slice(0, 2).toUpperCase() ?? "MB";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur">
      <SidebarTrigger />
      <div className="flex-1" />
      <Button variant="ghost" size="icon" className="rounded-full">
        <Bell className="h-4 w-4" />
      </Button>
      <div className="flex items-center rounded-full bg-muted p-0.5">
        <button
          aria-label="Light"
          onClick={() => toggle(false)}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition ${!dark ? "bg-background shadow-sm" : ""}`}
        >
          <Sun className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label="Dark"
          onClick={() => toggle(true)}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition ${dark ? "bg-background shadow-sm" : ""}`}
        >
          <Moon className="h-3.5 w-3.5" />
        </button>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative ml-1">
            <Avatar className="h-9 w-9 border-2 border-primary/20">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-background" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {user?.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
