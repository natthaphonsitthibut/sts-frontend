import { useMemo, useState } from "react";
import { BookOpenText, CirclePlus, Database, Pencil } from "lucide-react";
import { Badge, Button, FormErrorAlert, Select } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
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
import { MasterDataLookupDialog } from "../components/MasterDataLookupDialog";
import { useMasterDataLookups } from "../hooks/useMasterDataLookups";
import {
  MASTER_DATA_LOOKUP_CONFIGS,
  getMasterDataLookupConfig,
  type MasterDataLookup,
  type MasterDataLookupTable,
} from "../types/master-data-lookup.types";
import {
  findStatusCatalogItem,
  useStatusCatalog,
} from "../../status-catalog/hooks/useStatusCatalog";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";

function statusBadge(row: MasterDataLookup, catalog: readonly StatusCatalogItem[]) {
  const code = row.is_active === false ? "INACTIVE" : "ACTIVE";
  const item = findStatusCatalogItem(catalog, code);
  return (
    <Badge variant={item?.badgeVariant ?? "secondary"}>
      {item?.label ?? code}
    </Badge>
  );
}

export function MasterDataLookupsPage() {
  const activityCatalog = useStatusCatalog("RECORD_ACTIVITY");
  const [table, setTable] = useState<MasterDataLookupTable>("school_affiliations");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<MasterDataLookup | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const config = getMasterDataLookupConfig(table);
  const categoryConfig = getMasterDataLookupConfig("absence_reason_categories");
  const query = useMasterDataLookups({
    table,
    page,
    limit,
    searchTerm: debouncedSearch || undefined,
  });
  const categoryQuery = useMasterDataLookups({
    table: "absence_reason_categories",
    page: 1,
    limit: 50,
  });
  const rows = query.data?.items ?? [];
  const totalCount = query.data?.meta.totalCount ?? 0;
  const categoryNameById = useMemo(() => {
    return new Map(
      (categoryQuery.data?.items ?? []).map((category) => [String(category.id), category.name]),
    );
  }, [categoryQuery.data?.items]);

  function handleTableChange(nextTable: string): void {
    setTable(nextTable as MasterDataLookupTable);
    setPage(1);
    setSearch("");
    setSelected(null);
  }

  function openCreate(): void {
    setSelected(null);
    setDialogOpen(true);
  }

  function openEdit(row: MasterDataLookup): void {
    setSelected(row);
    setDialogOpen(true);
  }

  return (
    <PageShell>
      <PageToolbar
        actions={<Button icon={CirclePlus} onClick={openCreate}>เพิ่มรายการ</Button>}
        description={config.description}
        icon={Database}
        title="ข้อมูลพื้นฐานเพิ่มเติม"
      >
        <ToolbarControls>
          <Select
            aria-label="เลือกประเภทข้อมูลพื้นฐาน"
            onChange={(event) => handleTableChange(event.target.value)}
            value={table}
          >
            {MASTER_DATA_LOOKUP_CONFIGS.map((item) => (
              <option key={item.table} value={item.table}>{item.title}</option>
            ))}
          </Select>
          <SearchInput
            onChange={(value) => { setSearch(value); setPage(1); }}
            placeholder="ค้นหารหัส ชื่อ หรือหมายเหตุ..."
            value={search}
          />
        </ToolbarControls>
      </PageToolbar>

      <FormErrorAlert className="mb-4" error={query.error} fallback={`โหลด${config.title}ไม่สำเร็จ`} />

      {query.isError ? (
        <ErrorState title={`ไม่สามารถโหลด${config.title}ได้`} onRetry={() => { void query.refetch(); }} />
      ) : query.isLoading ? (
        <SkeletonStack lines={5} />
      ) : rows.length === 0 ? (
        <EmptyState icon={BookOpenText} title={search ? "ไม่พบรายการที่ค้นหา" : `ยังไม่มี${config.title}`} />
      ) : (
        <div className="flex flex-col gap-3">
          <DataTable
            headings={["รหัส", "ชื่อ", "รายละเอียด", "สถานะ", "จัดการ"]}
            minWidthClassName="min-w-[900px]"
          >
            {rows.map((row) => (
              <DataTableRow key={row.id}>
                <DataTableCell className="font-mono font-bold">{row.code}</DataTableCell>
                <DataTableCell className="font-bold text-slate-800">{row.name}</DataTableCell>
                <DataTableCell>
                  <div className="space-y-1 text-sm text-slate-600">
                    {config.hasLegalCategory && row.legal_category ? (
                      <p>หมวดตามกฎหมาย: {row.legal_category}</p>
                    ) : null}
                    {config.hasCategory && row.category_id ? (
                      <p>{categoryConfig.unitLabel}: {categoryNameById.get(String(row.category_id)) ?? row.category_id}</p>
                    ) : null}
                    {row.note ? <p>{row.note}</p> : <p className="text-slate-400">ไม่มีหมายเหตุ</p>}
                  </div>
                </DataTableCell>
                <DataTableCell>{statusBadge(row, activityCatalog.items)}</DataTableCell>
                <DataTableCell>
                  <Button
                    aria-label={`แก้ไข ${row.name}`}
                    icon={Pencil}
                    onClick={() => openEdit(row)}
                    size="sm"
                    variant="outline"
                  >
                    แก้ไข
                  </Button>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTable>
          <TableCardList>
            {rows.map((row) => (
              <TableCard className="space-y-3" key={row.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-800">{row.name}</p>
                    <p className="text-sm text-slate-500">รหัส {row.code}</p>
                  </div>
                  {statusBadge(row, activityCatalog.items)}
                </div>
                {config.hasLegalCategory && row.legal_category ? (
                  <p className="text-sm text-slate-600">หมวดตามกฎหมาย: {row.legal_category}</p>
                ) : null}
                {config.hasCategory && row.category_id ? (
                  <p className="text-sm text-slate-600">
                    {categoryConfig.unitLabel}: {categoryNameById.get(String(row.category_id)) ?? row.category_id}
                  </p>
                ) : null}
                {row.note ? <p className="text-sm text-slate-600">{row.note}</p> : null}
                <Button className="w-full" icon={Pencil} onClick={() => openEdit(row)} size="sm" variant="outline">
                  แก้ไข
                </Button>
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
            unitLabel={config.unitLabel}
          />
        </div>
      )}

      <MasterDataLookupDialog
        categories={categoryQuery.data?.items ?? []}
        config={config}
        lookup={selected}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
      />
    </PageShell>
  );
}
