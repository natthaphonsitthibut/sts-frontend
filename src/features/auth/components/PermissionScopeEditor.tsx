import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  Select,
  Skeleton,
} from "../../../components/base";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import type {
  GradeLevelOption,
  SchoolOption,
} from "../../tasks/api/attendance-lookup.service";
import {
  MENU_ITEMS,
  ROLE_BASELINES,
  type DataScope,
  type MenuItem,
} from "../lib/permissions";

interface PermissionScopeEditorProps {
  role: string;
  permissions: string[];
  dataScope: DataScope;
  customizePermissions: boolean;
  onPermissionsChange: (permissions: string[]) => void;
  onDataScopeChange: (dataScope: DataScope) => void;
  onCustomizePermissionsChange: (enabled: boolean) => void;
  disabled?: boolean;
}

interface PermissionOption {
  id: string;
  label: string;
}

const EMPTY_PERMISSIONS: string[] = [];
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

function normalizePermissions(role: string, permissions: string[]): string[] {
  if (permissions.length > 0) {
    return permissions;
  }
  return ROLE_BASELINES[role] ?? EMPTY_PERMISSIONS;
}

export function PermissionScopeEditor({
  role,
  permissions,
  dataScope = EMPTY_SCOPE,
  customizePermissions,
  onPermissionsChange,
  onDataScopeChange,
  onCustomizePermissionsChange,
  disabled = false,
}: PermissionScopeEditorProps) {
  const schoolsQuery = useQuery({
    queryKey: ["permission-scope-schools"],
    queryFn: attendanceLookupService.getSchools,
  });
  const gradeLevelsQuery = useQuery({
    queryKey: ["permission-scope-grade-levels"],
    queryFn: attendanceLookupService.getGradeLevels,
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
    enabled: Boolean(selectedGradeLabel),
  });
  const rooms = roomsQuery.data ?? EMPTY_ROOMS;

  const provinces = useMemo(
    () =>
      Array.from(
        new Set(schools.map((school) => school.province).filter(Boolean)),
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
            .filter(Boolean),
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
            .filter(Boolean),
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

  const effectivePermissions = normalizePermissions(role, permissions);
  const isLookupLoading = schoolsQuery.isLoading || gradeLevelsQuery.isLoading;
  const isLookupError = schoolsQuery.isError || gradeLevelsQuery.isError;

  function togglePermission(permissionId: string, checked: boolean): void {
    const source = normalizePermissions(role, permissions);
    if (checked) {
      onPermissionsChange(Array.from(new Set([...source, permissionId])));
      return;
    }
    onPermissionsChange(source.filter((permission) => permission !== permissionId));
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base">สิทธิ์การใช้งาน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Checkbox
            checked={customizePermissions}
            disabled={disabled}
            label="กำหนดสิทธิ์เองแทนสิทธิ์มาตรฐานของตำแหน่ง"
            onChange={(event) => {
              const checked = event.target.checked;
              onCustomizePermissionsChange(checked);
              onPermissionsChange(checked ? normalizePermissions(role, permissions) : []);
            }}
          />
          {customizePermissions ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PERMISSION_OPTIONS.map((permission) => (
                <Checkbox
                  checked={effectivePermissions.includes(permission.id)}
                  disabled={disabled}
                  key={permission.id}
                  label={permission.label}
                  onChange={(event) =>
                    togglePermission(permission.id, event.target.checked)
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              ใช้สิทธิ์มาตรฐานตามตำแหน่งที่เลือก หากต้องการจำกัดหรือเพิ่มสิทธิ์ให้เปิดการกำหนดเอง
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ขอบเขตข้อมูล</CardTitle>
        </CardHeader>
        <CardContent>
          {isLookupError ? (
            <Alert variant="destructive">
              <AlertDescription>
                ไม่สามารถโหลดข้อมูลโรงเรียนหรือระดับชั้นสำหรับกำหนดขอบเขตได้
              </AlertDescription>
            </Alert>
          ) : isLookupLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton className="h-10 w-full" key={index} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scope-province">จังหวัด</Label>
                <Select
                  disabled={disabled}
                  id="scope-province"
                  onChange={(event) => setProvince(event.target.value)}
                  value={selectedProvince}
                >
                  <option value="">ทั้งหมด</option>
                  {provinces.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope-district">อำเภอ</Label>
                <Select
                  disabled={disabled}
                  id="scope-district"
                  onChange={(event) => setDistrict(event.target.value)}
                  value={selectedDistrict}
                >
                  <option value="">ทั้งหมด</option>
                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope-sub-district">ตำบล</Label>
                <Select
                  disabled={disabled}
                  id="scope-sub-district"
                  onChange={(event) => setSubDistrict(event.target.value)}
                  value={selectedSubDistrict}
                >
                  <option value="">ทั้งหมด</option>
                  {subDistricts.map((subDistrict) => (
                    <option key={subDistrict} value={subDistrict}>
                      {subDistrict}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope-school">โรงเรียน</Label>
                <Select
                  disabled={disabled}
                  id="scope-school"
                  onChange={(event) => setSchool(event.target.value)}
                  value={selectedSchoolId}
                >
                  <option value="">ทุกโรงเรียน</option>
                  {filteredSchools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope-grade">ระดับชั้น</Label>
                <Select
                  disabled={disabled}
                  id="scope-grade"
                  onChange={(event) =>
                    onDataScopeChange({
                      ...withSingleValue(dataScope, "grade_levels", numberValue(event.target.value)),
                      room_ids: undefined,
                    })
                  }
                  value={selectedGradeId}
                >
                  <option value="">ทุกระดับชั้น</option>
                  {gradeLevels.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope-room">ห้อง</Label>
                <Select
                  disabled={disabled || !selectedGradeId}
                  id="scope-room"
                  onChange={(event) =>
                    onDataScopeChange(withSingleValue(dataScope, "room_ids", event.target.value))
                  }
                  value={selectedRoom}
                >
                  <option value="">ทุกห้อง</option>
                  {rooms.map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                  {selectedRoom && !rooms.includes(selectedRoom) ? (
                    <option value={selectedRoom}>{selectedRoom}</option>
                  ) : null}
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Checkbox
                  checked={dataScope.own_only === true}
                  disabled={disabled}
                  label="เห็นเฉพาะข้อมูลของตนเอง"
                  onChange={(event) =>
                    onDataScopeChange({
                      ...dataScope,
                      own_only: event.target.checked ? true : undefined,
                    })
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
