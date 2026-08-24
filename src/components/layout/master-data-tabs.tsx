import { Tabs } from "../base";
import { useRouteTab } from "../../hooks/useRouteTab";

const MASTER_DATA_TAB_ROUTES = {
  catalogs: "/master-data",
  "student-statuses": "/master-data/student-statuses",
} as const;

export function MasterDataTabs() {
  const [activeTab, setActiveTab] = useRouteTab(
    MASTER_DATA_TAB_ROUTES,
    "catalogs",
  );

  return (
    <Tabs
      aria-label="หมวดข้อมูลพื้นฐาน"
      onChange={setActiveTab}
      options={[
        { value: "catalogs", label: "รายการอ้างอิง" },
        { value: "student-statuses", label: "สถานะนักเรียน" },
      ]}
      value={activeTab}
    />
  );
}
