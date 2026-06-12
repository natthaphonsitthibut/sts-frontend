import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Combobox,
  Label,
  Skeleton,
} from "../../../components/base";
import { cn } from "../../../lib/utils";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import type {
  GradeLevelOption,
  SchoolOption,
} from "../../tasks/api/attendance-lookup.service";
import type { RoleScopeMode } from "../../admin/types/admin.types";
import { MENU_ITEMS, type DataScope, type MenuItem } from "../lib/permissions";
import { getScopeFieldStates, getScopeValidationError } from "../lib/scope-validation";
import { useRefreshSpin } from "../../../hooks/useRefreshSpin";

interface PermissionScopeEditorProps {
  role: string;
  roleLabel: string;
  scopeMode: RoleScopeMode;
  /** Standard permissions for the selected role — used to colour the diff. */
  baselinePermissions: string[];
  permissions: string[];
  dataScope: DataScope;
  onPermissionsChange: (permissions: string[]) => void;
  onDataScopeChange: (dataScope: DataScope) => void;
  disabled?: boolean;
  /** Reveal scope validation errors — set true only after a submit attempt. */
  showErrors?: boolean;
}

interface PermissionOption {
  id: string;
  label: string;
}

const EMPTY_SCOPE: DataScope = {};
const EMPTY_SCHOOLS: SchoolOption[] = [];
const EMPTY_GRADE_LEVELS: GradeLevelOption[] = [];
const EMPTY_ROOMS: string[] = [];

function collectPermissionOptions(items: MenuItem[]): PermissionOption[] {
  return items.flatMap((item) => {
    if (item.children?.length) {
      return collectPermissionOptions(item.children);
    }
    return [{ id: item.id, label: item.label }];
  });
}

const PERMISSION_OPTIONS = collectPermissionOptions(MENU_ITEMS);

function singleString(values: Array<string | number> | undefined): string {
  const value = values?.[0];
  return value == null ? "" : String(value);
}

function numberValue(value: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function withSingleValue<T extends string | number>(
  scope: DataScope,
  key: keyof DataScope,
  value: T | undefined,
): DataScope {
  return {
    ...scope,
    [key]: value == null || value === "" ? undefined : [value],
  };
}

/** Colour each permission by how it differs from the role's standard set. */
function permissionLabelClass(checked: boolean, inBaseline: boolean): string {
  if (checked && inBaseline) {
    return "text-slate-700";
  }
  if (checked && !inBaseline) {
    return "text-emerald-600 font-semibold";
  }
  if (!checked && inBaseline) {
    return "text-red-600 line-through";
  }
  return "text-slate-400";
}

export function PermissionScopeEditor({
  role,
  roleLabel,
  scopeMode,
  baselinePermissions,
  permissions,
  dataScope = EMPTY_SCOPE,
  onPermissionsChange,
  onDataScopeChange,
  disabled = false,
  showErrors = false,
}: PermissionScopeEditorProps) {
  const hasRole = role.trim().length > 0;
  const fieldStates = getScopeFieldStates(scopeMode);
  const scopeError = getScopeValidationError(scopeMode, dataScope, roleLabel);
  const isGlobalScope = scopeMode === "global";
  const usesAreaScope = !isGlobalScope && scopeMode !== "flexible";
  const { isRefreshing, refresh } = useRefreshSpin();

  const schoolsQuery = useQuery({
    queryKey: ["permission-scope-schools"],
    queryFn: attendanceLookupService.getSchools,
    enabled: !isGlobalScope,
  });
  const gradeLevelsQuery = useQuery({
    queryKey: ["permission-scope-grade-levels"],
    queryFn: attendanceLookupService.getGradeLevels,
    enabled: fieldStates.grade_levels !== "forbidden",
  });

  const selectedSchoolId = singleString(dataScope.school_ids);
  const selectedGradeId = singleString(dataScope.grade_levels);
  const selectedRoom = singleString(dataScope.room_ids);
  const selectedProvince = singleString(dataScope.provinces);
  const selectedDistrict = singleString(dataScope.districts);
  const selectedSubDistrict = singleString(dataScope.sub_districts);

  const schools = schoolsQuery.data ?? EMPTY_SCHOOLS;
  const gradeLevels = gradeLevelsQuery.data ?? EMPTY_GRADE_LEVELS;
  const selectedGradeLabel =
    gradeLevels.find((grade) => String(grade.id) === selectedGradeId)?.label ?? "";

  const roomsQuery = useQuery({
    queryKey: ["permission-scope-rooms", selectedGradeLabel, selectedSchoolId],
    queryFn: () => attendanceLookupService.getRooms(selectedGradeLabel, selectedSchoolId),
    enabled: Boolean(selectedGradeLabel) && fieldStates.room_ids !== "forbidden",
  });
  const rooms = roomsQuery.data ?? EMPTY_ROOMS;

  const provinces = useMemo(
    () =>
      Array.from(
        new Set(schools.map((school) => school.province).filter((value): value is string => Boolean(value))),
      ).sort(),
    [schools],
  );
  const districts = useMemo(
    () =>
      Array.from(
        new Set(
          schools
            .filter((school) => !selectedProvince || school.province === selectedProvince)
            .map((school) => school.district)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [schools, selectedProvince],
  );
  const subDistricts = useMemo(
    () =>
      Array.from(
        new Set(
          schools
            .filter((school) => !selectedProvince || school.province === selectedProvince)
            .filter((school) => !selectedDistrict || school.district === selectedDistrict)
            .map((school) => school.sub_district)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [schools, selectedDistrict, selectedProvince],
  );
  const filteredSchools = useMemo(
    () =>
      schools
        .filter((school) => !selectedProvince || school.province === selectedProvince)
        .filter((school) => !selectedDistrict || school.district === selectedDistrict)
        .filter((school) => !selectedSubDistrict || school.sub_district === selectedSubDistrict),
    [schools, selectedDistrict, selectedProvince, selectedSubDistrict],
  );

  const isLookupLoading = schoolsQuery.isLoading || gradeLevelsQuery.isLoading;
  const isLookupError = schoolsQuery.isError || gradeLevelsQuery.isError;

  function togglePermission(permissionId: string, checked: boolean): void {
    if (checked) {
      onPermissionsChange(Array.from(new Set([...permissions, permissionId])));
      return;
    }
    onPermissionsChange(permissions.filter((permission) => permission !== permissionId));
  }

  function setProvince(value: string): void {
    onDataScopeChange({
      ...dataScope,
      provinces: value ? [value] : undefined,
      districts: undefined,
      sub_districts: undefined,
      school_ids: undefined,
    });
  }

  function setDistrict(value: string): void {
    onDataScopeChange({
      ...dataScope,
      districts: value ? [value] : undefined,
      sub_districts: undefined,
      school_ids: undefined,
    });
  }

  function setSubDistrict(value: string): void {
    onDataScopeChange({
      ...dataScope,
      sub_districts: value ? [value] : undefined,
      school_ids: undefined,
    });
  }

  function setSchool(value: string): void {
    const school = schools.find((item) => String(item.id) === value);
    onDataScopeChange({
      ...dataScope,
      provinces: school?.province ? [school.province] : dataScope.provinces,
      districts: school?.district ? [school.district] : dataScope.districts,
      sub_districts: school?.sub_district ? [school.sub_district] : dataScope.sub_districts,
      school_ids: value ? [Number(value)] : undefined,
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="text-base">สิทธิ์การใช้งาน</CardTitle>
          <Button
            disabled={disabled || !hasRole}
            icon={RotateCw}
            isLoading={isRefreshing}
            loadingIconMotion="refresh"
            loadingText="รีเซ็ตเป็นค่ามาตรฐาน"
            onClick={() => void refresh(() => onPermissionsChange(baselinePermissions))}
            size="sm"
            type="button"
            variant="ghost"
          >
            รีเซ็ตเป็นค่ามาตรฐาน
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasRole ? (
            <>
              <p className="text-sm text-slate-500">
                แสดงสิทธิ์มาตรฐานของตำแหน่งไว้ให้แล้ว ปรับเพิ่มหรือเอาออกได้ตามต้องการ
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="text-slate-600">● มาตรฐานของตำแหน่ง</span>
                <span className="font-semibold text-emerald-600">● เพิ่มจากมาตรฐาน</span>
                <span className="text-red-600 line-through">● เอาออกจากมาตรฐาน</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PERMISSION_OPTIONS.map((permission) => {
                  const checked = permissions.includes(permission.id);
                  const inBaseline = baselinePermissions.includes(permission.id);
                  return (
                    <Checkbox
                      checked={checked}
                      className={permissionLabelClass(checked, inBaseline)}
                      disabled={disabled}
                      key={permission.id}
                      label={permission.label}
                      onChange={(event) =>
                        togglePermission(permission.id, event.target.checked)
                      }
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              เลือกตำแหน่งก่อน เพื่อกำหนดสิทธิ์การใช้งาน
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ขอบเขตข้อมูล</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasRole ? (
            <p className="text-sm text-slate-500">
              เลือกตำแหน่งก่อน เพื่อกำหนดขอบเขตข้อมูล
            </p>
          ) : isGlobalScope ? (
            <p className="text-sm text-slate-500">
              ตำแหน่งนี้ใช้ขอบเขตข้อมูลระดับประเทศ จึงไม่ต้องระบุพื้นที่
            </p>
          ) : isLookupError ? (
            <Alert variant="destructive">
              <AlertDescription>
                ไม่สามารถโหลดข้อมูลโรงเรียนหรือระดับชั้นสำหรับกำหนดขอบเขตได้
              </AlertDescription>
            </Alert>
          ) : isLookupLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton className="h-10 w-full" key={index} />
              ))}
            </div>
          ) : (
            <>
              {usesAreaScope ? (
                <p className="text-sm text-slate-500">
                  ตำแหน่งนี้ต้องระบุพื้นที่ตามระดับสิทธิ์ ไม่สามารถเลือก “ทั้งหมด” ได้
                </p>
              ) : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fieldStates.provinces !== "forbidden" ? (
                  <div className="space-y-2">
                    <Label htmlFor="scope-province">
                      จังหวัด
                      {fieldStates.provinces === "required" ? (
                        <span className="ml-1 text-red-600">*</span>
                      ) : null}
                    </Label>
                    <Combobox
                      aria-invalid={
                        showErrors && fieldStates.provinces === "required" && !selectedProvince ? true : undefined
                      }
                      disabled={disabled}
                      id="scope-province"
                      onChange={(next) => setProvince(next)}
                      options={[
                        {
                          value: "",
                          label: fieldStates.provinces === "required" ? "เลือกจังหวัด" : "ทั้งหมด",
                        },
                        ...provinces.map((province) => ({ value: province, label: province })),
                      ]}
                      placeholder="ค้นหาจังหวัด"
                      value={selectedProvince}
                    />
                  </div>
                ) : null}

                {fieldStates.districts !== "forbidden" ? (
                  <div className="space-y-2">
                    <Label htmlFor="scope-district">
                      อำเภอ
                      {fieldStates.districts === "required" ? (
                        <span className="ml-1 text-red-600">*</span>
                      ) : null}
                    </Label>
                    <Combobox
                      aria-invalid={
                        showErrors && fieldStates.districts === "required" && !selectedDistrict ? true : undefined
                      }
                      disabled={disabled}
                      id="scope-district"
                      onChange={(next) => setDistrict(next)}
                      options={[
                        {
                          value: "",
                          label: fieldStates.districts === "required" ? "เลือกอำเภอ" : "ทั้งหมด",
                        },
                        ...districts.map((district) => ({ value: district, label: district })),
                      ]}
                      placeholder="ค้นหาอำเภอ"
                      value={selectedDistrict}
                    />
                  </div>
                ) : null}

                {fieldStates.sub_districts !== "forbidden" ? (
                  <div className="space-y-2">
                    <Label htmlFor="scope-sub-district">
                      ตำบล
                      {fieldStates.sub_districts === "required" ? (
                        <span className="ml-1 text-red-600">*</span>
                      ) : null}
                    </Label>
                    <Combobox
                      aria-invalid={
                        showErrors && fieldStates.sub_districts === "required" && !selectedSubDistrict ? true : undefined
                      }
                      disabled={disabled}
                      id="scope-sub-district"
                      onChange={(next) => setSubDistrict(next)}
                      options={[
                        {
                          value: "",
                          label: fieldStates.sub_districts === "required" ? "เลือกตำบล" : "ทั้งหมด",
                        },
                        ...subDistricts.map((subDistrict) => ({
                          value: subDistrict,
                          label: subDistrict,
                        })),
                      ]}
                      placeholder="ค้นหาตำบล"
                      value={selectedSubDistrict}
                    />
                  </div>
                ) : null}

                {fieldStates.school_ids !== "forbidden" ? (
                  <div className="space-y-2">
                    <Label htmlFor="scope-school">
                      โรงเรียน
                      {fieldStates.school_ids === "required" ? (
                        <span className="ml-1 text-red-600">*</span>
                      ) : null}
                    </Label>
                    <Combobox
                      aria-invalid={
                        showErrors && fieldStates.school_ids === "required" && !selectedSchoolId ? true : undefined
                      }
                      disabled={disabled}
                      id="scope-school"
                      onChange={(next) => setSchool(next)}
                      options={[
                        {
                          value: "",
                          label:
                            fieldStates.school_ids === "required" ? "เลือกโรงเรียน" : "ทุกโรงเรียน",
                        },
                        ...filteredSchools.map((school) => ({
                          value: String(school.id),
                          label: school.name,
                        })),
                      ]}
                      placeholder="ค้นหาโรงเรียน"
                      value={selectedSchoolId}
                    />
                  </div>
                ) : null}

                {fieldStates.grade_levels !== "forbidden" ? (
                  <div className="space-y-2">
                    <Label htmlFor="scope-grade">ระดับชั้น</Label>
                    <Combobox
                      disabled={disabled}
                      id="scope-grade"
                      onChange={(next) =>
                        onDataScopeChange({
                          ...withSingleValue(dataScope, "grade_levels", numberValue(next)),
                          room_ids: undefined,
                        })
                      }
                      options={[
                        { value: "", label: "ทุกระดับชั้น" },
                        ...gradeLevels.map((grade) => ({
                          value: String(grade.id),
                          label: grade.label,
                        })),
                      ]}
                      searchable={false}
                      value={selectedGradeId}
                    />
                  </div>
                ) : null}

                {fieldStates.room_ids !== "forbidden" ? (
                  <div className="space-y-2">
                    <Label htmlFor="scope-room">ห้อง</Label>
                    <Combobox
                      disabled={disabled || !selectedGradeId}
                      id="scope-room"
                      onChange={(next) => onDataScopeChange(withSingleValue(dataScope, "room_ids", next))}
                      options={[
                        { value: "", label: "ทุกห้อง" },
                        ...rooms.map((room) => ({ value: room, label: room })),
                        ...(selectedRoom && !rooms.includes(selectedRoom)
                          ? [{ value: selectedRoom, label: selectedRoom }]
                          : []),
                      ]}
                      searchable={false}
                      value={selectedRoom}
                    />
                  </div>
                ) : null}
              </div>
            </>
          )}

          <p
            className={cn(
              "min-h-5 text-sm font-medium text-red-600",
              !(showErrors && scopeError) && "invisible",
            )}
          >
            {showErrors && scopeError ? scopeError : "."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
