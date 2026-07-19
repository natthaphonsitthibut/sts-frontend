import { useLocation, useNavigate } from "react-router-dom";
import { Tabs } from "../../../components/base";
import { usePermissions } from "../../auth/hooks/usePermissions";

export function RiskReportTabs() {
  const { can } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const value = location.pathname.includes("/home-visit-requests")
    ? "home-visit-requests"
    : location.pathname.includes("/teacher-reports")
      ? "teacher-reports"
      : "attendance-risk";
  if (!can("manage-student-observations")) return null;
  return (
    <Tabs
      aria-label="ประเภทรายงานความเสี่ยง"
      value={value}
      onChange={(next) => {
        const path = next === "teacher-reports"
          ? "/student-risk-report/teacher-reports"
          : next === "home-visit-requests"
            ? "/student-risk-report/home-visit-requests"
            : "/student-risk-report";
        void navigate(path);
      }}
      options={[
        { value: "attendance-risk", label: "ความเสี่ยงจากการมาเรียน" },
        { value: "teacher-reports", label: "ข้อสังเกตจากครู" },
        { value: "home-visit-requests", label: "คำขอเยี่ยมบ้าน" },
      ]}
    />
  );
}
