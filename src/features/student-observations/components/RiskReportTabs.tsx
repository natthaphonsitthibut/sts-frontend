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
  if (!can("manage-student-observations")) return null;
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
