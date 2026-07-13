import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { BookOpenText, CirclePlus, Database, Pencil } from "lucide-react";
import { Badge, Button, FormErrorAlert } from "../../../components/base";
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
  FilterSelect,
  ListPageToolbar,
  PageShell,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { SettingsTabs } from "../../../components/layout/settings-tabs";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { masterDataLookupService } from "../api/master-data-lookup.service";
import { MasterDataLookupDialog } from "../components/MasterDataLookupDialog";
import {
  MASTER_DATA_LOOKUPS_QUERY_KEY,
  useMasterDataLookups,
} from "../hooks/useMasterDataLookups";
import {
  MASTER_DATA_LOOKUP_CONFIGS,
  getMasterDataLookupConfig,
  type MasterDataLookup,
  type MasterDataLookupConfig,
  type MasterDataLookupTable,
} from "../types/master-data-lookup.types";
import {
  findStatusCatalogItem,
  useStatusCatalog,
} from "../../status-catalog/hooks/useStatusCatalog";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";

const ALL_LOOKUP_TABLES = "ALL";
const ALL_LOOKUP_LIMIT = 50;

type LookupTableFilter = typeof ALL_LOOKUP_TABLES | MasterDataLookupTable;
type DisplayLookup = MasterDataLookup & {
  sourceConfig: MasterDataLookupConfig;
  sourceTable: MasterDataLookupTable;
};

const ALL_LOOKUP_CONFIG: MasterDataLookupConfig = {
  table: "school_affiliations",
  title: "ข้อมูลพื้นฐานทั้งหมด",
  description: "ดูรายการข้อมูลพื้นฐานเพิ่มเติมทุกประเภทในตารางเดียว",
  unitLabel: "รายการ",
};

function statusBadge(row: MasterDataLookup, catalog: readonly StatusCatalogItem[]) {
  const code = row.is_active === false ? "INACTIVE" : "ACTIVE";
  const item = findStatusCatalogItem(catalog, code);
  return (
    <Badge className="whitespace-nowrap" variant={item?.badgeVariant ?? "secondary"}>
      {item?.label ?? code}
    </Badge>
  );
}

export function MasterDataLookupsPage() {
  const activityCatalog = useStatusCatalog("RECORD_ACTIVITY");
  const [table, setTable] = useState<LookupTableFilter>(ALL_LOOKUP_TABLES);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<MasterDataLookup | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const isAllTables = table === ALL_LOOKUP_TABLES;
  const activeTable: MasterDataLookupTable = isAllTables ? "school_affiliations" : table;
  const config = isAllTables ? ALL_LOOKUP_CONFIG : getMasterDataLookupConfig(table);
  const categoryConfig = getMasterDataLookupConfig("absence_reason_categories");
  const query = useMasterDataLookups({
    table: activeTable,
    page,
    limit,
    searchTerm: debouncedSearch || undefined,
  }, { enabled: !isAllTables });
  const allQueries = useQueries({
    queries: MASTER_DATA_LOOKUP_CONFIGS.map((item) => {
      const allQuery = {
        table: item.table,
        page: 1,
        limit: ALL_LOOKUP_LIMIT,
        searchTerm: debouncedSearch || undefined,
      };
      return {
        queryKey: [MASTER_DATA_LOOKUPS_QUERY_KEY, allQuery],
        queryFn: () => masterDataLookupService.list(allQuery),
        enabled: isAllTables,
      };
    }),
  });
  const categoryQuery = useMasterDataLookups({
    table: "absence_reason_categories",
    page: 1,
    limit: 50,
  });
  const allRows = useMemo<DisplayLookup[]>(() => {
    return allQueries.flatMap((itemQuery, index) => {
      const sourceConfig = MASTER_DATA_LOOKUP_CONFIGS[index];
      return (itemQuery.data?.items ?? []).map((row) => ({
        ...row,
        sourceConfig,
        sourceTable: sourceConfig.table,
      }));
    });
  }, [allQueries]);
  const tableRows = useMemo<DisplayLookup[]>(() => {
    return (query.data?.items ?? []).map((row) => ({
      ...row,
      sourceConfig: config,
      sourceTable: activeTable,
    }));
  }, [activeTable, config, query.data?.items]);
  const rows = isAllTables
    ? allRows.slice((page - 1) * limit, page * limit)
    : tableRows;
  const totalCount = isAllTables ? allRows.length : (query.data?.meta.totalCount ?? 0);
  const isLoading = isAllTables
    ? allQueries.some((itemQuery) => itemQuery.isLoading)
    : query.isLoading;
  const isError = isAllTables
    ? allQueries.some((itemQuery) => itemQuery.isError)
    : query.isError;
  const error = isAllTables
    ? allQueries.find((itemQuery) => itemQuery.error)?.error
    : query.error;
  const categoryNameById = useMemo(() => {
    return new Map(
      (categoryQuery.data?.items ?? []).map((category) => [String(category.id), category.name]),
    );
  }, [categoryQuery.data?.items]);

  function handleTableChange(nextTable: string): void {
    setTable(nextTable as LookupTableFilter);
    setPage(1);
    setSearch("");
    setSelected(null);
  }

  function openCreate(): void {
    if (isAllTables) {
      // "ทั้งหมด" has no single target table — default to the first real
      // category (mirrors openEdit's own switch-to-source-table behavior).
      setTable(MASTER_DATA_LOOKUP_CONFIGS[0].table);
    }
    setSelected(null);
    setDialogOpen(true);
  }

  function openEdit(row: DisplayLookup): void {
    if (isAllTables) {
      setTable(row.sourceTable);
    }
    setSelected(row);
    setDialogOpen(true);
  }

  function refetchLookups(): void {
    if (isAllTables) {
      allQueries.forEach((itemQuery) => {
        void itemQuery.refetch();
      });
      return;
    }
    void query.refetch();
  }

  return (
    <PageShell>
      <ListPageToolbar
        actions={<SettingsTabs />}
        tableActions={
          <Button icon={CirclePlus} onClick={openCreate}>
            เพิ่มรายการ
          </Button>
        }
        description={config.description}
        icon={Database}
        title="ข้อมูลพื้นฐานเพิ่มเติม"
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPage(1);
          },
          placeholder: "ค้นหารหัส ชื่อ หรือหมายเหตุ...",
        }}
        filters={
          <FilterSelect
            ariaLabel="เลือกประเภทข้อมูลพื้นฐาน"
            onChange={handleTableChange}
            value={table}
          >
            <option value={ALL_LOOKUP_TABLES}>ทั้งหมด</option>
            {MASTER_DATA_LOOKUP_CONFIGS.map((item) => (
              <option key={item.table} value={item.table}>{item.title}</option>
            ))}
          </FilterSelect>
        }
      />

      <FormErrorAlert className="mb-4" error={error} fallback={`โหลด${config.title}ไม่สำเร็จ`} />

      {isError ? (
        <ErrorState title={`ไม่สามารถโหลด${config.title}ได้`} onRetry={refetchLookups} />
      ) : isLoading ? (
        <SkeletonStack lines={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          description={search ? "ลองเปลี่ยนคำค้นหา หรือเคลียร์ช่องค้นหาเพื่อดูรายการทั้งหมด" : `เพิ่มรายการแรกเพื่อเริ่มต้น${config.title}`}
          icon={BookOpenText}
          title={search ? "ไม่พบรายการที่ค้นหา" : `ยังไม่มี${config.title}`}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <DataTable
            headings={["ประเภท", "รหัส", "ชื่อ", "รายละเอียด", "สถานะ", "จัดการ"]}
            minWidthClassName="min-w-[900px]"
          >
            {rows.map((row) => (
              <DataTableRow key={`${row.sourceTable}-${row.id}`}>
                <DataTableCell>
                  <Badge className="whitespace-nowrap" variant="secondary">
                    {row.sourceConfig.title}
                  </Badge>
                </DataTableCell>
                <DataTableCell className="font-mono font-bold">{row.code}</DataTableCell>
                <DataTableCell className="font-bold text-slate-800">{row.name}</DataTableCell>
                <DataTableCell>
                  <div className="space-y-1 text-sm text-slate-600">
                    {row.sourceConfig?.hasLegalCategory && row.legal_category ? (
                      <p>หมวดตามกฎหมาย: {row.legal_category}</p>
                    ) : null}
                    {row.sourceConfig?.hasCategory && row.category_id ? (
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
              <TableCard className="space-y-3" key={`${row.sourceTable}-${row.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-800">{row.name}</p>
                    <p className="text-sm text-slate-500">รหัส {row.code}</p>
                    <Badge className="mt-2 whitespace-nowrap" variant="secondary">
                      {row.sourceConfig.title}
                    </Badge>
                  </div>
                  {statusBadge(row, activityCatalog.items)}
                </div>
                {row.sourceConfig?.hasLegalCategory && row.legal_category ? (
                  <p className="text-sm text-slate-600">หมวดตามกฎหมาย: {row.legal_category}</p>
                ) : null}
                {row.sourceConfig?.hasCategory && row.category_id ? (
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
