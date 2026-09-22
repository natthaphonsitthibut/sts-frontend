import { useEffect, useState } from "react";
import { Building2, CirclePlus, Pencil, Power, PowerOff } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Alert,
  AlertDescription,
  FormErrorAlert,
  Input,
  Label,
  Select,
  useConfirm,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  ListPageToolbar,
  PageShell,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { Pagination } from "../../../components/layout/pagination";
import {
  readPositiveIntegerSearchParam,
  serializeSortSearchParam,
  useSyncedSearchParams,
} from "../../../hooks/useSyncedSearchParams";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { ScopeFilterField } from "../../attendance/components/ScopeFilterField";
import {
  useAdminSchools,
  useAdministrativeDistricts,
  useAdministrativeProvinces,
  useAdministrativeSubDistricts,
  useCreateSchool,
  useDeactivateSchool,
  useUpdateSchool,
} from "../../school-structure/hooks/useSchoolStructure";
import type {
  SchoolAdminRecord,
  SaveSchoolInput,
  StructureStatus,
} from "../../school-structure/types/school-structure.types";

interface SchoolDraft extends SaveSchoolInput {
  id: number | null;
  schoolStatus: "ACTIVE" | "INACTIVE";
}

const EMPTY_DRAFT: SchoolDraft = {
  id: null,
  name: "",
  province: "",
  district: "",
  subDistrict: "",
  schoolStatus: "ACTIVE",
};

const SCHOOL_STATUS_LABELS: Record<StructureStatus, string> = {
  ACTIVE: "เปิดใช้งาน",
  INACTIVE: "ปิดใช้งาน",
};

const DEFAULT_SORT: DataTableSortState = {
  key: "name",
  direction: "asc",
};

function draftFromSchool(school: SchoolAdminRecord): SchoolDraft {
  return {
    id: school.id,
    name: school.name,
    province: school.province ?? "",
    district: school.district ?? "",
    subDistrict: school.subDistrict ?? "",
    schoolStatus: school.schoolStatus,
  };
}

export function ManageSchoolsPage() {
  const [searchParams] = useSearchParams();
  const provincesQuery = useAdministrativeProvinces();
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("search") ?? "",
  );
  const [statusFilter, setStatusFilter] = useState<StructureStatus | "">(() => {
    const value = searchParams.get("status");
    return value === "ACTIVE" || value === "INACTIVE" ? value : "";
  });
  const [provinceFilter, setProvinceFilter] = useState(
    () => searchParams.get("province") ?? "",
  );
  const [districtFilter, setDistrictFilter] = useState(
    () => searchParams.get("district") ?? "",
  );
  const [subDistrictFilter, setSubDistrictFilter] = useState(
    () => searchParams.get("subDistrict") ?? "",
  );
  const [page, setPage] = useState(() =>
    readPositiveIntegerSearchParam(searchParams, "page", 1),
  );
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const value = readPositiveIntegerSearchParam(
      searchParams,
      "limit",
      DEFAULT_PAGE_SIZE,
    );
    return PAGE_SIZE_OPTIONS.includes(
      value as (typeof PAGE_SIZE_OPTIONS)[number],
    )
      ? value
      : DEFAULT_PAGE_SIZE;
  });
  const [sort, setSort] = useState<DataTableSortState>(() => {
    const key = searchParams.get("sort")?.split(":")[0];
    const direction = searchParams.get("sort")?.split(":")[1];
    return key && (direction === "asc" || direction === "desc")
      ? { key, direction }
      : DEFAULT_SORT;
  });
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 300);
  const schoolsQuery = useAdminSchools({
    page,
    limit: rowsPerPage,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    province: provinceFilter || undefined,
    district: districtFilter || undefined,
    subDistrict: subDistrictFilter || undefined,
    sortBy: sort.key as
      | "name"
      | "province"
      | "district"
      | "subDistrict"
      | "status",
    sortDirection: sort.direction,
  });
  const [draft, setDraft] = useState<SchoolDraft>(EMPTY_DRAFT);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const districtsQuery = useAdministrativeDistricts(draft.province ?? "");
  const subDistrictsQuery = useAdministrativeSubDistricts(
    draft.province ?? "",
    draft.district ?? "",
  );
  const filterDistrictsQuery = useAdministrativeDistricts(provinceFilter);
  const filterSubDistrictsQuery = useAdministrativeSubDistricts(
    provinceFilter,
    districtFilter,
  );
  const createSchool = useCreateSchool();
  const updateSchool = useUpdateSchool();
  const deactivateSchool = useDeactivateSchool();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const mutationError =
    createSchool.error ?? updateSchool.error ?? deactivateSchool.error;
  const schools = schoolsQuery.data?.data ?? [];
  const totalPages = Math.max(1, schoolsQuery.data?.meta.totalPages ?? 1);
  const currentPage = Math.min(page, totalPages);
  useEffect(() => {
    if (page <= totalPages) return;
    const frame = window.requestAnimationFrame(() => setPage(totalPages));
    return () => window.cancelAnimationFrame(frame);
  }, [page, totalPages]);

  useSyncedSearchParams({
    search: searchQuery.trim() || undefined,
    status: statusFilter || undefined,
    province: provinceFilter || undefined,
    district: districtFilter || undefined,
    subDistrict: subDistrictFilter || undefined,
    page: currentPage > 1 ? currentPage : undefined,
    limit: rowsPerPage !== DEFAULT_PAGE_SIZE ? rowsPerPage : undefined,
    sort: serializeSortSearchParam(sort, DEFAULT_SORT),
  });

  function clearFilters(): void {
    setSearchQuery("");
    setStatusFilter("");
    setProvinceFilter("");
    setDistrictFilter("");
    setSubDistrictFilter("");
    setPage(1);
  }

  function handleSortChange(nextSort: DataTableSortState | undefined): void {
    setSort(nextSort ?? DEFAULT_SORT);
    setPage(1);
  }

  function openCreate(): void {
    setDraft(EMPTY_DRAFT);
    setValidationError(null);
    setDialogOpen(true);
  }

  function openEdit(school: SchoolAdminRecord): void {
    setDraft(draftFromSchool(school));
    setValidationError(null);
    setDialogOpen(true);
  }

  function closeDialog(): void {
    if (createSchool.isPending || updateSchool.isPending) return;
    setDialogOpen(false);
  }

  function save(): void {
    const name = draft.name.trim();
    if (!name) {
      setValidationError("กรุณาระบุชื่อโรงเรียน");
      return;
    }
    if (draft.district && !draft.province) {
      setValidationError("กรุณาเลือกจังหวัดก่อนเลือกอำเภอ/เขต");
      return;
    }
    if (draft.subDistrict && !draft.district) {
      setValidationError("กรุณาเลือกอำเภอ/เขตก่อนเลือกตำบล/แขวง");
      return;
    }
    setValidationError(null);
    const input: SaveSchoolInput = {
      name,
      province: draft.province || undefined,
      district: draft.district || undefined,
      subDistrict: draft.subDistrict || undefined,
      schoolStatus: draft.schoolStatus,
    };
    if (draft.id) {
      updateSchool.mutate(
        { id: draft.id, input },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createSchool.mutate(input, { onSuccess: () => setDialogOpen(false) });
    }
  }

  async function toggleStatus(school: SchoolAdminRecord): Promise<void> {
    if (school.schoolStatus === "ACTIVE") {
      const accepted = await confirm({
        title: `ปิดใช้งาน “${school.name}”?`,
        description:
          "ข้อมูลเดิมจะยังอยู่ และสามารถเปิดใช้งานใหม่ได้จากหน้าแก้ไข",
        confirmText: "ปิดใช้งาน",
        variant: "destructive",
      });
      if (!accepted) return;
      deactivateSchool.mutate(school.id);
      return;
    }
    updateSchool.mutate({
      id: school.id,
      input: { name: school.name, schoolStatus: "ACTIVE" },
    });
  }

  return (
    <PageShell>
      <ListPageToolbar
        tableActions={
          <Button icon={CirclePlus} onClick={openCreate}>
            เพิ่มโรงเรียน
          </Button>
        }
        description="จัดการข้อมูลโรงเรียนและพื้นที่ทางการปกครองจากรายการกลาง"
        scope={
          <ScopeFilterField
            label="พื้นที่"
            onClear={() => {
              setProvinceFilter("");
              setDistrictFilter("");
              setSubDistrictFilter("");
              setPage(1);
            }}
            scope={{
              province: provinceFilter,
              district: districtFilter,
              subDistrict: subDistrictFilter,
            }}
          >
            <Select
              aria-label="จังหวัด"
              disabled={provincesQuery.isLoading}
              onChange={(event) => {
                setProvinceFilter(event.target.value);
                setDistrictFilter("");
                setSubDistrictFilter("");
                setPage(1);
              }}
              value={provinceFilter}
            >
              <option value="">ทุกจังหวัด</option>
              {(provincesQuery.data ?? []).map((item) => (
                <option key={item.code} value={item.name}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="อำเภอหรือเขต"
              disabled={!provinceFilter || filterDistrictsQuery.isLoading}
              onChange={(event) => {
                setDistrictFilter(event.target.value);
                setSubDistrictFilter("");
                setPage(1);
              }}
              value={districtFilter}
            >
              <option value="">ทุกอำเภอ/เขต</option>
              {(filterDistrictsQuery.data ?? []).map((item) => (
                <option key={item.code} value={item.name}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="ตำบลหรือแขวง"
              disabled={!districtFilter || filterSubDistrictsQuery.isLoading}
              onChange={(event) => {
                setSubDistrictFilter(event.target.value);
                setPage(1);
              }}
              value={subDistrictFilter}
            >
              <option value="">ทุกตำบล/แขวง</option>
              {(filterSubDistrictsQuery.data ?? []).map((item) => (
                <option key={item.code} value={item.name}>
                  {item.name}
                </option>
              ))}
            </Select>
          </ScopeFilterField>
        }
        icon={Building2}
        onClearFilters={clearFilters}
        search={{
          after: (
            <FilterSelect
              ariaLabel="กรองสถานะโรงเรียน"
              className="sm:w-[160px]"
              onChange={(value) => {
                setStatusFilter(value as StructureStatus | "");
                setPage(1);
              }}
              value={statusFilter}
            >
              <option value="">สถานะทั้งหมด</option>
              <option value="ACTIVE">{SCHOOL_STATUS_LABELS.ACTIVE}</option>
              <option value="INACTIVE">{SCHOOL_STATUS_LABELS.INACTIVE}</option>
            </FilterSelect>
          ),
          onChange: (value) => {
            setSearchQuery(value);
            setPage(1);
          },
          placeholder: "ค้นหาชื่อโรงเรียนหรือพื้นที่...",
          value: searchQuery,
        }}
        title="จัดการข้อมูลโรงเรียน"
      />

      {schoolsQuery.isError ? (
        <ErrorState
          onRetry={() => void schoolsQuery.refetch()}
          title="ไม่สามารถโหลดข้อมูลโรงเรียนได้"
        />
      ) : schoolsQuery.isLoading ? (
        <SkeletonStack lines={6} />
      ) : schools.length ? (
        <div className="flex flex-col gap-3">
          <DataTable
            headings={[
              { label: "โรงเรียน", sortKey: "name" },
              { label: "จังหวัด", sortKey: "province" },
              { label: "อำเภอ/เขต", sortKey: "district" },
              { label: "ตำบล/แขวง", sortKey: "subDistrict" },
              { label: "สถานะ", sortKey: "status" },
              { isAction: true, label: "เครื่องมือ" },
            ]}
            minWidthClassName="min-w-[1080px]"
            onSortChange={handleSortChange}
            sort={sort}
          >
            {schools.map((school) => (
              <DataTableRow key={school.id}>
                <DataTableCell className="font-medium text-slate-800">
                  {school.name}
                </DataTableCell>
                <DataTableCell className="text-slate-600">
                  {school.province || "-"}
                </DataTableCell>
                <DataTableCell className="text-slate-600">
                  {school.district || "-"}
                </DataTableCell>
                <DataTableCell className="text-slate-600">
                  {school.subDistrict || "-"}
                </DataTableCell>
                <DataTableCell>
                  <Badge
                    variant={
                      school.schoolStatus === "ACTIVE" ? "success" : "secondary"
                    }
                  >
                    {SCHOOL_STATUS_LABELS[school.schoolStatus]}
                  </Badge>
                </DataTableCell>
                <DataTableCell className="text-center">
                  <div className="flex justify-center gap-2">
                    <Button
                      icon={Pencil}
                      onClick={() => openEdit(school)}
                      size="sm"
                      variant="outline"
                    >
                      แก้ไข
                    </Button>
                    <Button
                      icon={school.schoolStatus === "ACTIVE" ? PowerOff : Power}
                      onClick={() => void toggleStatus(school)}
                      size="sm"
                      variant={
                        school.schoolStatus === "ACTIVE"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {school.schoolStatus === "ACTIVE" ? "ปิด" : "เปิด"}
                    </Button>
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTable>
          <TableCardList>
            {schools.map((school) => (
              <TableCard className="space-y-3" key={school.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-800">{school.name}</p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
                      <div>
                        <dt className="font-semibold text-slate-500">
                          จังหวัด
                        </dt>
                        <dd>{school.province || "-"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">
                          อำเภอ/เขต
                        </dt>
                        <dd>{school.district || "-"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">
                          ตำบล/แขวง
                        </dt>
                        <dd>{school.subDistrict || "-"}</dd>
                      </div>
                    </dl>
                  </div>
                  <Badge
                    variant={
                      school.schoolStatus === "ACTIVE" ? "success" : "secondary"
                    }
                  >
                    {SCHOOL_STATUS_LABELS[school.schoolStatus]}
                  </Badge>
                </div>
                <div className="flex justify-center gap-2">
                  <Button
                    icon={Pencil}
                    onClick={() => openEdit(school)}
                    size="sm"
                    variant="outline"
                  >
                    แก้ไข
                  </Button>
                  <Button
                    icon={school.schoolStatus === "ACTIVE" ? PowerOff : Power}
                    onClick={() => void toggleStatus(school)}
                    size="sm"
                    variant={
                      school.schoolStatus === "ACTIVE"
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {school.schoolStatus === "ACTIVE"
                      ? "ปิดใช้งาน"
                      : "เปิดใช้งาน"}
                  </Button>
                </div>
              </TableCard>
            ))}
          </TableCardList>
          <Pagination
            onPageChange={setPage}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value);
              setPage(1);
            }}
            page={currentPage}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            totalCount={schoolsQuery.data?.meta.totalCount ?? 0}
            unitLabel="โรงเรียน"
          />
        </div>
      ) : schoolsQuery.data?.meta.totalCount ? (
        <EmptyState
          action={
            <Button onClick={clearFilters} variant="outline">
              ล้างตัวกรอง
            </Button>
          }
          description="ลองเปลี่ยนคำค้นหาหรือตัวกรองเพื่อดูรายการโรงเรียน"
          icon={Building2}
          title="ไม่พบโรงเรียนที่ค้นหา"
        />
      ) : (
        <EmptyState
          description="เพิ่มโรงเรียนรายการแรกเพื่อเริ่มใช้งาน"
          icon={Building2}
          title="ยังไม่มีข้อมูลโรงเรียน"
        />
      )}

      <Dialog onOpenChange={(open) => !open && closeDialog()} open={dialogOpen}>
        <DialogContent className="max-w-2xl" onClose={closeDialog}>
          <DialogHeader>
            <DialogTitle icon={Building2}>
              {draft.id ? "แก้ไขข้อมูลโรงเรียน" : "เพิ่มโรงเรียน"}
            </DialogTitle>
            <DialogDescription>
              เลือกพื้นที่จากรายการทางการเพื่อให้ข้อมูลสอดคล้องกันทั้งระบบ
            </DialogDescription>
          </DialogHeader>
          <FormErrorAlert
            error={mutationError}
            fallback="บันทึกข้อมูลโรงเรียนไม่สำเร็จ"
          />
          {validationError ? (
            <Alert variant="destructive">
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="school-name">ชื่อโรงเรียน</Label>
              <Input
                id="school-name"
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
                value={draft.name}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="school-province">จังหวัด</Label>
                <Select
                  id="school-province"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      province: event.target.value,
                      district: "",
                      subDistrict: "",
                    })
                  }
                  value={draft.province}
                >
                  <option value="">ไม่ระบุ</option>
                  {(provincesQuery.data ?? []).map((item) => (
                    <option key={item.code} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-district">อำเภอ/เขต</Label>
                <Select
                  disabled={!draft.province || districtsQuery.isLoading}
                  id="school-district"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      district: event.target.value,
                      subDistrict: "",
                    })
                  }
                  value={draft.district}
                >
                  <option value="">ไม่ระบุ</option>
                  {(districtsQuery.data ?? []).map((item) => (
                    <option key={item.code} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-sub-district">ตำบล/แขวง</Label>
                <Select
                  disabled={!draft.district || subDistrictsQuery.isLoading}
                  id="school-sub-district"
                  onChange={(event) =>
                    setDraft({ ...draft, subDistrict: event.target.value })
                  }
                  value={draft.subDistrict}
                >
                  <option value="">ไม่ระบุ</option>
                  {(subDistrictsQuery.data ?? []).map((item) => (
                    <option key={item.code} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {draft.id ? (
              <div className="space-y-2">
                <Label htmlFor="school-status">สถานะ</Label>
                <Select
                  id="school-status"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      schoolStatus: event.target
                        .value as SchoolDraft["schoolStatus"],
                    })
                  }
                  value={draft.schoolStatus}
                >
                  <option value="ACTIVE">เปิดใช้งาน</option>
                  <option value="INACTIVE">ปิดใช้งาน</option>
                </Select>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={closeDialog} variant="outline">
              ยกเลิก
            </Button>
            <Button
              isLoading={createSchool.isPending || updateSchool.isPending}
              onClick={save}
            >
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </PageShell>
  );
}
