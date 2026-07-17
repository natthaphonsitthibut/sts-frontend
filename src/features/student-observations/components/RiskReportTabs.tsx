import { useLocation, useNavigate } from "react-router-dom";
import { Tabs } from "../../../components/base";
import { usePermissions } from "../../auth/hooks/usePermissions";

export function RiskReportTabs() {
  const { can } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const value = location.pathname.endsWith("/teacher-reports") ? "teacher-reports" : "attendance-risk";
  if (!can("manage-student-observations")) return null;
  return (
    <Tabs
      aria-label="ประเภทรายงานความเสี่ยง"
      className="mb-5"
      value={value}
      onChange={(next) => void navigate(next === "teacher-reports" ? "/student-risk-report/teacher-reports" : "/student-risk-report")}
      options={[
        { value: "attendance-risk", label: "ความเสี่ยงจากการมาเรียน" },
        { value: "teacher-reports", label: "รายงานจากครู" },
      ]}
    />
  );
}
