import { useState } from "react";
import { CirclePlus, Pencil, PowerOff } from "lucide-react";
import { Badge, Button, FormErrorAlert, SchoolIcon, useConfirm } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import { Pagination } from "../../../components/layout/pagination";
import { RefreshButton } from "../../../components/layout/refresh-button";
import {
  EmptyState,
  ErrorState,
  ListPageToolbar,
  PageShell,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { SettingsTabs } from "../../../components/layout/settings-tabs";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { StudentStatusDialog } from "../components/StudentStatusDialog";
import {
  useDisableStudentStatus,
  useStudentStatuses,
} from "../hooks/useStudentStatuses";
import type { StudentStatus } from "../types/student-status.types";
import {
  findStatusCatalogItem,
  useStatusCatalog,
} from "../../status-catalog/hooks/useStatusCatalog";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";

function StatusFlags({
  catalog,
  status,
}: {
  catalog: readonly StatusCatalogItem[];
  status: StudentStatus;
}) {
  const flags = [
    status.isActiveForLogin ? "LOGIN_ALLOWED" : null,
    status.isTerminal ? "TERMINAL" : null,
    status.requiresFollowup ? "FOLLOWUP_REQUIRED" : null,
    !status.isEnabled ? "DISABLED" : null,
  ].filter((value): value is string => Boolean(value));
  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map((code) => {
        const item = findStatusCatalogItem(catalog, code);
        return (
          <Badge key={code} variant={item?.badgeVariant ?? "secondary"}>
            {item?.label ?? code}
          </Badge>
        );
      })}
    </div>
  );
}

export function StudentStatusesPage() {
  const categoryCatalog = useStatusCatalog("STUDENT_STATUS_CATEGORY");
  const flagCatalog = useStatusCatalog("STUDENT_STATUS_FLAG");
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
      <ListPageToolbar
        actions={<><SettingsTabs /><Button icon={CirclePlus} onClick={openCreate}>เพิ่มสถานะ</Button></>}
        tableActions={<RefreshButton onRefresh={() => query.refetch()} updatedAt={query.dataUpdatedAt} />}
        onClearFilters={() => {
          setSearch("");
          setPage(1);
        }}
        description="จัดการความหมายและนโยบายอ้างอิง โดยยังไม่เปลี่ยน login หรือสร้าง Case ช่วยเหลืออัตโนมัติ"
        icon={SchoolIcon}
        title="ข้อมูลพื้นฐานสถานะนักเรียน"
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPage(1);
          },
          placeholder: "ค้นหารหัส ชื่อ หมวด หรือระบบต้นทาง...",
        }}
      />

      <FormErrorAlert
        className="mb-4"
        error={disableStatus.error}
        fallback="ปิดใช้งานสถานะนักเรียนไม่สำเร็จ"
      />

      {query.isError || categoryCatalog.isError || flagCatalog.isError ? (
        <ErrorState title="ไม่สามารถโหลดสถานะนักเรียนได้" onRetry={() => {
          void query.refetch();
          categoryCatalog.refetch();
          flagCatalog.refetch();
        }} />
      ) : query.isLoading || categoryCatalog.isLoading || flagCatalog.isLoading ? (
        <SkeletonStack lines={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          description={search ? "ลองเปลี่ยนคำค้นหา หรือเคลียร์ช่องค้นหาเพื่อดูรายการทั้งหมด" : "เพิ่มสถานะแรกเพื่อเริ่มจัดหมวดหมู่นักเรียน"}
          icon={SchoolIcon}
          title={search ? "ไม่พบสถานะที่ค้นหา" : "ยังไม่มีสถานะนักเรียน"}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <DataTable
            headings={[
              { label: "รหัส", sortKey: "code" },
              { label: "ชื่อสถานะ", sortKey: "labelTh" },
              { label: "หมวด", sortKey: "category" },
              "นโยบาย",
              "ใช้งานอยู่",
              "",
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
                <DataTableCell>
                  {findStatusCatalogItem(categoryCatalog.items, status.category)?.label ?? status.category}
                </DataTableCell>
                <DataTableCell><StatusFlags catalog={flagCatalog.items} status={status} /></DataTableCell>
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
                  <div><p className="font-bold text-slate-800">{status.labelTh}</p><p className="text-sm text-slate-500">รหัส {status.code} · {findStatusCatalogItem(categoryCatalog.items, status.category)?.label ?? status.category}</p></div>
                  <Button aria-label={`แก้ไข ${status.labelTh}`} icon={Pencil} onClick={() => openEdit(status)} size="sm" variant="outline">แก้ไข</Button>
                </div>
                <StatusFlags catalog={flagCatalog.items} status={status} />
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
