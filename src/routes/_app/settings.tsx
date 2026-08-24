import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SettingsTabs } from "@/components/settings/SettingsShell";

function SettingsLayout() {
  return (
    <div className="space-y-6">
      <SettingsTabs />
      <Outlet />
    </div>
  );
}

export const Route = createFileRoute("/_app/settings")({
  component: SettingsLayout,
});
