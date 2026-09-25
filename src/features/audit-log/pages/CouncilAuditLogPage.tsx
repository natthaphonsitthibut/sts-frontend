import {
  ListPageToolbar,
  PageShell,
} from "../../../components/layout/page-primitives";
import { useGlobalSchoolFilter } from "../../school-filter/hooks/useGlobalSchoolFilter";
import { AuditLogPanel } from "../components/AuditLogPanel";

/**
 * บันทึกการใช้งาน for the council's ผู้ดูแลระบบ — national or an area's own —
 * as one page: every kind of event, inside the account's own scope (owner,
 * 2026-09-25: "หน้า Log ... ตาม scope ตัวเอง ... หน้า 1 หน้า"). The server
 * enforces both the role and the scope; the header's จ./อ./ต. narrows further.
 */
export function CouncilAuditLogPage() {
  const globalFilter = useGlobalSchoolFilter();
  return (
    <PageShell>
      <ListPageToolbar
        description="ประวัติการใช้งานทุกประเภทในขอบเขตของบัญชีนี้"
        title="บันทึกการใช้งาน"
      />
      <AuditLogPanel
        detailTo={(entry) => `/audit-log/${entry.id}`}
        district={globalFilter.district || undefined}
        domain="all"
        province={globalFilter.province || undefined}
        showActionColumn
        showReferenceColumn
        subDistrict={globalFilter.subDistrict || undefined}
        title="รายการทั้งหมด"
      />
    </PageShell>
  );
}
