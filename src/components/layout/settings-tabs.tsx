import { Tabs } from "../base";
import { useRouteTab } from "../../hooks/useRouteTab";

const SETTINGS_TAB_ROUTES = {
  system: "/settings",
} as const;

/** Route-backed tab strip shared by every page under the settings section. */
export function SettingsTabs() {
  const [activeTab, setActiveTab] = useRouteTab(SETTINGS_TAB_ROUTES, "system");

  return (
    <Tabs
      aria-label="หมวดการตั้งค่า"
      onChange={setActiveTab}
      options={[{ value: "system", label: "ตั้งค่าระบบ" }]}
      value={activeTab}
    />
  );
}
