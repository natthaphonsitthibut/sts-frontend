import { useLocation, useNavigate } from "react-router-dom";
import { Tabs } from "../../../components/base";
import { usePermissions } from "../../auth/hooks/usePermissions";

export function RiskReportTabs() {
  const { can } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const value = location.pathname.includes("/teacher-comments")
    ? "teacher-comments"
    : "attendance-risk";
  // The teacher-comments report is a tab of รายงานสถานะนักเรียน, so anyone who
  // reaches that page (`dashboard`) sees this tab too, on top of whoever
  // already reads teacher comments elsewhere (`students`) (owner, 2026-09-29).
  if (!can("students") && !can("dashboard")) return null;
  return (
    <Tabs
      aria-label="ประเภทรายงานความเสี่ยง"
      value={value}
      onChange={(next) => {
        const path =
          next === "teacher-comments"
            ? "/student-risk-report/teacher-comments"
            : "/student-risk-report";
        void navigate(path);
      }}
      options={[
        { value: "attendance-risk", label: "ความเสี่ยงจากการมาเรียน" },
        { value: "teacher-comments", label: "ความคิดเห็นจากคุณครู" },
      ]}
    />
  );
}
