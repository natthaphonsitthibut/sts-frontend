import { useState } from "react";
import { CirclePlus, GraduationCap, Pencil, PowerOff } from "lucide-react";
import { Badge, Button, FormErrorAlert, useConfirm } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import { Pagination } from "../../../components/layout/pagination";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SearchInput,
  SkeletonStack,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { StudentStatusDialog } from "../components/StudentStatusDialog";
import {
  useDisableStudentStatus,
  useStudentStatuses,
} from "../hooks/useStudentStatuses";
import type { StudentStatus } from "../types/student-status.types";

const CATEGORY_LABELS: Record<StudentStatus["category"], string> = {
  ACTIVE: "กำลังศึกษา",
  GRADUATED: "สำเร็จการศึกษา",
  WITHDRAWN: "ลาออก/พ้นสภาพ",
  TRANSFERRED: "ย้ายสถานศึกษา",
  DECEASED: "เสียชีวิต",
  UNMAPPED: "ยังไม่ได้จับคู่",
};

function StatusFlags({ status }: { status: StudentStatus }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {status.isActiveForLogin ? <Badge variant="success">นโยบาย: เข้าสู่ระบบได้</Badge> : null}
      {status.isTerminal ? <Badge variant="secondary">สิ้นสุด</Badge> : null}
      {status.requiresFollowup ? <Badge variant="warning">ควรพิจารณาติดตาม</Badge> : null}
      {!status.isEnabled ? <Badge variant="destructive">ปิดใช้งาน</Badge> : null}
    </div>
  );
}

export function StudentStatusesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<DataTableSortState>({ key: "sortOrder", direction: "asc" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<StudentStatus | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const disableStatus = useDisableStudentStatus();
  const { confirm, dialog } = useConfirm();
  const query = useStudentStatuses({
    page,
    limit,
    searchTerm: debouncedSearch || undefined,
    sortBy: sort.key as "code" | "labelTh" | "category" | "sortOrder",
    sortDirection: sort.direction,
  });
  const rows = query.data?.items ?? [];
  const totalCount = query.data?.meta.totalCount ?? 0;

  function openCreate(): void {
    setSelected(null);
    setDialogOpen(true);
  }

  function openEdit(status: StudentStatus): void {
    setSelected(status);
    setDialogOpen(true);
  }

  async function handleDisable(status: StudentStatus): Promise<void> {
    const accepted = await confirm({
      title: "ปิดใช้งานสถานะนี้?",
      description: status.usageCount > 0
        ? `สถานะนี้ถูกอ้างอิง ${status.usageCount.toLocaleString("th-TH")} รายการ ข้อมูลเดิมจะยังอยู่และจะไม่มีการลบ Case`
        : "สถานะจะไม่ถูกลบและสามารถเปิดใช้งานใหม่จากหน้าแก้ไขได้",
      confirmText: "ปิดใช้งาน",
      variant: "destructive",
    });
    if (accepted) disableStatus.mutate(status.code);
  }

  return (
    <PageShell>
      <PageToolbar
        actions={<Button icon={CirclePlus} onClick={openCreate}>เพิ่มสถานะ</Button>}
        description="จัดการความหมายและนโยบายอ้างอิง โดยยังไม่เปลี่ยน login หรือสร้าง Case ช่วยเหลืออัตโนมัติ"
        icon={GraduationCap}
        title="ข้อมูลพื้นฐานสถานะนักเรียน"
      >
        <ToolbarControls>
          <SearchInput
            onChange={(value) => { setSearch(value); setPage(1); }}
            placeholder="ค้นหารหัส ชื่อ หมวด หรือระบบต้นทาง..."
            value={search}
          />
        </ToolbarControls>
      </PageToolbar>

      <FormErrorAlert
        className="mb-4"
        error={disableStatus.error}
        fallback="ปิดใช้งานสถานะนักเรียนไม่สำเร็จ"
      />

      {query.isError ? (
        <ErrorState title="ไม่สามารถโหลดสถานะนักเรียนได้" onRetry={() => { void query.refetch(); }} />
      ) : query.isLoading ? (
        <SkeletonStack lines={5} />
      ) : rows.length === 0 ? (
        <EmptyState icon={GraduationCap} title={search ? "ไม่พบสถานะที่ค้นหา" : "ยังไม่มีสถานะนักเรียน"} />
      ) : (
        <div className="flex flex-col gap-3">
          <DataTable
            headings={[
              { label: "รหัส", sortKey: "code" },
              { label: "ชื่อสถานะ", sortKey: "labelTh" },
              { label: "หมวด", sortKey: "category" },
              "นโยบาย",
              "ใช้งานอยู่",
              "จัดการ",
            ]}
            minWidthClassName="min-w-[980px]"
            onSortChange={(next) => {
              setSort(next ?? { key: "sortOrder", direction: "asc" });
              setPage(1);
            }}
            sort={sort}
          >
            {rows.map((status) => (
              <DataTableRow key={status.code}>
                <DataTableCell className="font-mono font-bold">{status.code}</DataTableCell>
                <DataTableCell className="font-bold text-slate-800">{status.labelTh}</DataTableCell>
                <DataTableCell>{CATEGORY_LABELS[status.category]}</DataTableCell>
                <DataTableCell><StatusFlags status={status} /></DataTableCell>
                <DataTableCell>{status.usageCount.toLocaleString("th-TH")} รายการ</DataTableCell>
                <DataTableCell>
                  <div className="flex gap-2">
                    <Button aria-label={`แก้ไข ${status.labelTh}`} icon={Pencil} onClick={() => openEdit(status)} size="sm" variant="outline">แก้ไข</Button>
                    {status.isEnabled ? (
                      <Button aria-label={`ปิดใช้งาน ${status.labelTh}`} icon={PowerOff} onClick={() => { void handleDisable(status); }} size="sm" variant="destructive">ปิด</Button>
                    ) : null}
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTable>
          <TableCardList>
            {rows.map((status) => (
              <TableCard className="space-y-3" key={status.code}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-bold text-slate-800">{status.labelTh}</p><p className="text-sm text-slate-500">รหัส {status.code} · {CATEGORY_LABELS[status.category]}</p></div>
                  <Button aria-label={`แก้ไข ${status.labelTh}`} icon={Pencil} onClick={() => openEdit(status)} size="sm" variant="outline">แก้ไข</Button>
                </div>
                <StatusFlags status={status} />
                <p className="text-sm text-slate-500">ใช้งานอยู่ {status.usageCount.toLocaleString("th-TH")} รายการ</p>
                {status.isEnabled ? <Button className="w-full" icon={PowerOff} onClick={() => { void handleDisable(status); }} size="sm" variant="destructive">ปิดใช้งาน</Button> : null}
              </TableCard>
            ))}
          </TableCardList>
          <Pagination
            onPageChange={setPage}
            onRowsPerPageChange={(value) => { setLimit(value); setPage(1); }}
            page={page}
            rowsPerPage={limit}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            totalCount={totalCount}
            unitLabel="สถานะ"
          />
        </div>
      )}

      <StudentStatusDialog onOpenChange={setDialogOpen} open={dialogOpen} status={selected} />
      {dialog}
    </PageShell>
  );
}
