import { useMemo, useState } from "react";
import { CirclePlus, Pencil, PowerOff } from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
  FormErrorAlert,
  Select,
  TableChartIcon,
  useConfirm,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { MasterDataTabs } from "../../../components/layout/master-data-tabs";
import { Pagination } from "../../../components/layout/pagination";
import { RefreshButton } from "../../../components/layout/refresh-button";
import {
  EmptyState,
  ErrorState,
  ListPageToolbar,
  PageShell,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { MasterDataDialog } from "../components/MasterDataDialog";
import {
  useCodedMasterData,
  useDisableCodedMasterData,
  useDisableReferralAgency,
  useReferralAgencies,
} from "../hooks/useMasterData";
import {
  MASTER_DATA_CATALOGS,
  type CodedMasterDataItem,
  type MasterDataCatalog,
  type ReferralAgencyItem,
} from "../types/master-data.types";

type MasterDataItem = CodedMasterDataItem | ReferralAgencyItem;

export function MasterDataPage() {
  const [catalog, setCatalog] = useState<MasterDataCatalog>("absence-reasons");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<MasterDataItem | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const definition = MASTER_DATA_CATALOGS.find((item) => item.id === catalog)!;
  const isAgency = catalog === "referral-agencies";
  const needsCategoryCatalog =
    catalog === "absence-reasons" || catalog === "referral-agencies";
  const queryInput = {
    page,
    limit,
    searchTerm: debouncedSearch || undefined,
    includeInactive,
  };
  const codedQuery = useCodedMasterData(
    (isAgency ? "absence-reasons" : catalog) as Exclude<
      MasterDataCatalog,
      "referral-agencies"
    >,
    queryInput,
    !isAgency,
  );
  const agencyQuery = useReferralAgencies(queryInput, isAgency);
  const categoryCatalog = useCodedMasterData(
    catalog === "referral-agencies"
      ? "referral-agency-kinds"
      : "absence-reason-categories",
    { page: 1, limit: 50, includeInactive: true },
    needsCategoryCatalog,
  );
  const activeQuery = isAgency ? agencyQuery : codedQuery;
  const rows = (activeQuery.data?.items ?? []) as MasterDataItem[];
  const disableCoded = useDisableCodedMasterData();
  const disableAgency = useDisableReferralAgency();
  const { confirm, dialog } = useConfirm();
  const categoryOptions = useMemo(() => {
    const selectedParentCode =
      selected && "agencyKindCode" in selected
        ? selected.agencyKindCode
        : selected && "categoryCode" in selected
          ? selected.categoryCode
          : null;
    return (
      categoryCatalog.data?.items.filter(
        (item) => item.isActive || item.code === selectedParentCode,
      ) ?? []
    );
  }, [categoryCatalog.data, selected]);
  const dependencyFailed = needsCategoryCatalog && categoryCatalog.isError;
  const dependencyLoading = needsCategoryCatalog && categoryCatalog.isLoading;

  function selectCatalog(next: MasterDataCatalog): void {
    setCatalog(next);
    setPage(1);
    setSearch("");
    setSelected(null);
  }

  function openCreate(): void {
    setSelected(null);
    setDialogOpen(true);
  }

  function openEdit(item: MasterDataItem): void {
    setSelected(item);
    setDialogOpen(true);
  }

  async function disable(item: MasterDataItem): Promise<void> {
    const label = "agencyName" in item ? item.agencyName : item.labelTh;
    const accepted = await confirm({
      title: `ปิดใช้งาน “${label}”?`,
      description:
        item.usageCount > 0
          ? `มีข้อมูลอ้างอิง ${item.usageCount.toLocaleString("th-TH")} รายการ ข้อมูลเดิมจะยังคงอยู่`
          : "รายการจะไม่ถูกลบและสามารถเปิดใช้งานใหม่จากหน้าแก้ไขได้",
      confirmText: "ปิดใช้งาน",
      variant: "destructive",
    });
    if (!accepted) return;
    if ("agencyName" in item) disableAgency.mutate(item.id);
    else
      disableCoded.mutate({
        catalog: catalog as Exclude<MasterDataCatalog, "referral-agencies">,
        code: item.code,
      });
  }

  const mutationError = disableCoded.error ?? disableAgency.error;

  return (
    <PageShell>
      <ListPageToolbar
        actions={
          <>
            <MasterDataTabs />
            <Button
              className="min-w-32 justify-center"
              disabled={dependencyFailed || dependencyLoading}
              icon={CirclePlus}
              onClick={openCreate}
            >
              เพิ่มรายการ
            </Button>
          </>
        }
        description="จัดการรายการอ้างอิงระดับประเทศ รายการที่ใช้งานแล้วจะปิดแทนการลบ"
        icon={TableChartIcon}
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPage(1);
          },
          placeholder: `ค้นหา${definition.label}...`,
          after: (
            <div className="min-w-0 sm:w-80">
              <label className="sr-only" htmlFor="master-data-catalog">
                ชุดข้อมูล
              </label>
              <Select
                id="master-data-catalog"
                onChange={(event) =>
                  selectCatalog(event.target.value as MasterDataCatalog)
                }
                value={catalog}
              >
                {MASTER_DATA_CATALOGS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>
          ),
        }}
        tableActions={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Checkbox
              checked={includeInactive}
              label="แสดงรายการปิดใช้งาน"
              onChange={(event) => {
                setIncludeInactive(event.target.checked);
                setPage(1);
              }}
            />
            <RefreshButton
              onRefresh={() => activeQuery.refetch()}
              updatedAt={activeQuery.dataUpdatedAt}
            />
          </div>
        }
        title="ข้อมูลพื้นฐาน"
      />

      <FormErrorAlert
        className="mb-4"
        error={mutationError}
        fallback="ปิดใช้งานรายการไม่สำเร็จ"
      />

      {activeQuery.isError || dependencyFailed ? (
        <ErrorState
          onRetry={() => {
            void activeQuery.refetch();
            if (needsCategoryCatalog) void categoryCatalog.refetch();
          }}
          title={`ไม่สามารถโหลด${definition.label}ได้`}
        />
      ) : activeQuery.isLoading || dependencyLoading ? (
        <SkeletonStack lines={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          description={
            search
              ? "ลองเปลี่ยนคำค้นหา หรือเคลียร์ช่องค้นหา"
              : `เพิ่ม${definition.label}รายการแรกเพื่อเริ่มใช้งาน`
          }
          icon={TableChartIcon}
          title={search ? "ไม่พบรายการที่ค้นหา" : `ยังไม่มี${definition.label}`}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <DataTable
            headings={
              isAgency
                ? [
                    "ชื่อหน่วยงาน",
                    "ประเภท",
                    "ช่องทางติดต่อ",
                    "สถานะ",
                    "ใช้งานอยู่",
                    "เครื่องมือ",
                  ]
                : [
                    "รหัส",
                    "ชื่อรายการ",
                    "ข้อมูลอ้างอิง",
                    "สถานะ",
                    "ใช้งานอยู่",
                    "เครื่องมือ",
                  ]
            }
            minWidthClassName="min-w-[920px]"
          >
            {rows.map((item) => {
              const agency = "agencyName" in item ? item : null;
              const coded = "code" in item ? item : null;
              const key = agency ? `agency-${agency.id}` : coded!.code;
              return (
                <DataTableRow key={key}>
                  <DataTableCell className="font-medium text-slate-800">
                    {agency?.agencyName ?? coded?.code}
                  </DataTableCell>
                  <DataTableCell>
                    {agency?.agencyKindLabelTh ?? coded?.labelTh}
                  </DataTableCell>
                  <DataTableCell className="text-slate-600">
                    {agency
                      ? [agency.contactPhone, agency.contactEmail]
                          .filter(Boolean)
                          .join(" · ") || "-"
                      : [
                          coded?.categoryLabelTh,
                          coded?.sourceOnecCode
                            ? `ONEC ${coded.sourceOnecCode}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "-"}
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant={item.isActive ? "success" : "secondary"}>
                      {item.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    {item.usageCount.toLocaleString("th-TH")} รายการ
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex gap-2">
                      <Button
                        icon={Pencil}
                        onClick={() => openEdit(item)}
                        size="sm"
                        variant="outline"
                      >
                        แก้ไข
                      </Button>
                      <Button
                        disabled={!item.isActive}
                        icon={PowerOff}
                        onClick={() => {
                          void disable(item);
                        }}
                        size="sm"
                        variant="destructive"
                      >
                        ปิด
                      </Button>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTable>
          <TableCardList>
            {rows.map((item) => {
              const agency = "agencyName" in item ? item : null;
              const coded = "code" in item ? item : null;
              return (
                <TableCard
                  className="space-y-3"
                  key={agency ? `agency-${agency.id}` : coded!.code}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-800">
                        {agency?.agencyName ?? coded?.labelTh}
                      </p>
                      <p className="text-sm text-slate-500">
                        {agency?.agencyKindLabelTh ?? `รหัส ${coded?.code}`}
                      </p>
                    </div>
                    <Button
                      icon={Pencil}
                      onClick={() => openEdit(item)}
                      size="sm"
                      variant="outline"
                    >
                      แก้ไข
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
                    <Badge variant={item.isActive ? "success" : "secondary"}>
                      {item.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                    </Badge>
                    <span>
                      ใช้งานอยู่ {item.usageCount.toLocaleString("th-TH")}{" "}
                      รายการ
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!item.isActive}
                    icon={PowerOff}
                    onClick={() => {
                      void disable(item);
                    }}
                    size="sm"
                    variant="destructive"
                  >
                    ปิดใช้งาน
                  </Button>
                </TableCard>
              );
            })}
          </TableCardList>
          <Pagination
            onPageChange={setPage}
            onRowsPerPageChange={(value) => {
              setLimit(value);
              setPage(1);
            }}
            page={page}
            rowsPerPage={limit}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            totalCount={activeQuery.data?.meta.totalCount ?? 0}
            unitLabel="รายการ"
          />
        </div>
      )}

      <MasterDataDialog
        catalog={catalog}
        catalogLabel={definition.label}
        categoryOptions={categoryOptions}
        item={selected}
        key={`${catalog}-${selected && "id" in selected ? selected.id : selected && "code" in selected ? selected.code : "new"}-${dialogOpen}-${categoryOptions[0]?.code ?? "none"}`}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        showCategory={"category" in definition && definition.category === true}
        showRequiresDetail={
          "requiresDetail" in definition && definition.requiresDetail === true
        }
        showSourceOnec={
          "sourceOnec" in definition && definition.sourceOnec === true
        }
      />
      {dialog}
    </PageShell>
  );
}
