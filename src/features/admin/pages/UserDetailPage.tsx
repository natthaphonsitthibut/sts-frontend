import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, GraduationCap, MapPin, SquarePen, UserRound } from "lucide-react";
import { useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormItem,
  FormLabel,
  Input,
  Tabs,
} from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { LocationMapPicker } from "../../../components/maps/LocationMapPicker";
import { formatThaiDateTime } from "../../../lib/date-time";
import { cn } from "../../../lib/utils";
import { geoService } from "../../tasks/api/geo.service";
import { UserAddressRevealDialog } from "../components/UserAddressRevealDialog";
import {
  getAccountLifecycleStatusMeta,
  getManagedUserLifecycleStatus,
  getUserAvatarGradient,
  getUserDisplayName,
  getUserInitial,
  getUserRoleText,
} from "../lib/admin-presentation";
import { useUserDetail } from "../hooks/useUsers";
import type { ManagedUserDetail, UserAddressDetail } from "../types/admin.types";

function parseUserId(value: string | undefined): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function text(value: string | number | boolean | null | undefined): string {
  if (value === true) return "ใช่";
  if (value === false) return "ไม่ใช่";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function describeScope(user: ManagedUserDetail): string {
  const scope = user.data_scope;
  if (!scope) return "-";
  if (scope.own_only) return "เฉพาะข้อมูลของตนเอง";
  const parts: string[] = [];
  const schoolLabels = user.data_scope_labels?.schools ?? [];
  if (scope.global) parts.push("ทั้งประเทศ");
  if (scope.provinces?.length) parts.push(`จังหวัด: ${scope.provinces.join(", ")}`);
  if (scope.districts?.length) parts.push(`อำเภอ/เขต: ${scope.districts.join(", ")}`);
  if (scope.sub_districts?.length) parts.push(`ตำบล/แขวง: ${scope.sub_districts.join(", ")}`);
  if (scope.school_ids?.length) {
    const schoolText =
      schoolLabels.length > 0
        ? schoolLabels.map((school) => school.name ?? school.id).join(", ")
        : scope.school_ids.join(", ");
    parts.push(`โรงเรียน: ${schoolText}`);
  }
  if (scope.grade_levels?.length) parts.push(`ระดับชั้น: ${scope.grade_levels.join(", ")}`);
  if (scope.room_ids?.length) parts.push(`ห้อง: ${scope.room_ids.join(", ")}`);
  return parts.length > 0 ? parts.join(" · ") : "ทั้งประเทศ";
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function UserHero({ user }: { user: ManagedUserDetail }) {
  const displayName = getUserDisplayName(user);
  const lifecycle = getAccountLifecycleStatusMeta(getManagedUserLifecycleStatus(user));

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className="flex size-24 shrink-0 items-center justify-center rounded-full text-2xl font-extrabold shadow-card"
            style={getUserAvatarGradient(displayName)}
          >
            {getUserInitial(user)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-2xl font-bold text-slate-900">{displayName}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>@{user.username}</span>
              <span aria-hidden="true">•</span>
              <span>{getUserRoleText(user)}</span>
            </div>
          </div>
        </div>
        <Badge className={cn("w-fit whitespace-nowrap", lifecycle.badgeClass)} variant="secondary">
          {lifecycle.label}
        </Badge>
      </CardContent>
    </Card>
  );
}

function ReadOnlyProfileField({ label, value }: { label: string; value: string }) {
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <Input readOnly value={value === "-" ? "" : value} />
      <div className="min-h-5" aria-hidden="true" />
    </FormItem>
  );
}

function UserAddressPanel({ hasProfileLocation, userId }: { hasProfileLocation: boolean; userId: number }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [address, setAddress] = useState<UserAddressDetail | null>(null);
  const fullAddress = address
    ? [
        address.address_line,
        address.address_village_no,
        address.address_trok,
        address.address_soi,
        address.address_street,
        address.address_sub_district,
        address.address_district,
        address.address_province,
        address.address_postal_code,
      ].filter(Boolean).join(" ")
    : "";
  const geocode = useQuery({
    queryKey: ["admin-user-address-geocode", userId, fullAddress],
    queryFn: () => geoService.geocodeProfileAddress(fullAddress),
    enabled: Boolean(address && fullAddress && address.address_latitude === null),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
  const lat = address?.address_latitude ?? geocode.data?.lat ?? null;
  const lng = address?.address_longitude ?? geocode.data?.lng ?? null;
  return (
    <>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="size-5 text-primary" aria-hidden="true" />
            ที่อยู่ติดต่อ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {address ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ReadOnlyProfileField label="บ้านเลขที่" value={text(address.address_line)} />
                <ReadOnlyProfileField label="หมู่" value={text(address.address_village_no)} />
                <ReadOnlyProfileField label="ตรอก" value={text(address.address_trok)} />
                <ReadOnlyProfileField label="ซอย" value={text(address.address_soi)} />
                <ReadOnlyProfileField label="ถนน" value={text(address.address_street)} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <ReadOnlyProfileField label="จังหวัด" value={text(address.address_province)} />
                <ReadOnlyProfileField label="อำเภอ/เขต" value={text(address.address_district)} />
                <ReadOnlyProfileField label="ตำบล/แขวง" value={text(address.address_sub_district)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ReadOnlyProfileField label="รหัสไปรษณีย์" value={text(address.address_postal_code)} />
              </div>
            </>
          ) : hasProfileLocation ? (
            <div className="flex justify-end">
              <Button icon={Eye} onClick={() => setDialogOpen(true)}>แสดงที่อยู่และหมุด</Button>
            </div>
          ) : null}

          <div className="space-y-3 border-t border-slate-200 pt-4">
            <div>
              <div className="text-sm font-bold text-slate-700">พิกัดที่อยู่ติดต่อ</div>
              <div className="text-xs text-slate-500">
                {hasProfileLocation
                  ? "ใช้พิกัดที่บันทึกไว้ก่อน และค้นหาจากที่อยู่เมื่อยังไม่มีพิกัด"
                  : "ผู้ใช้งานยังไม่ได้บันทึกที่อยู่หรือพิกัด"}
              </div>
            </div>
            <LocationMapPicker
              address={fullAddress || undefined}
              emptyDescription={hasProfileLocation
                ? "ระบุเหตุผลเพื่อแสดงที่อยู่และหมุดของผู้ใช้งาน"
                : "ผู้ใช้งานยังไม่ได้บันทึกที่อยู่หรือพิกัด"}
              emptyTitle={hasProfileLocation ? "ยังไม่เปิดดู" : "ยังไม่มีพิกัด"}
              lat={lat}
              lng={lng}
              markerLabel={address?.address_latitude != null ? "พิกัดที่บันทึกไว้" : "พิกัดจากที่อยู่"}
              title="ตำแหน่งที่อยู่บนแผนที่"
            />
          </div>
        </CardContent>
      </Card>
      <UserAddressRevealDialog
        onOpenChange={setDialogOpen}
        onRevealed={setAddress}
        open={dialogOpen}
        userId={userId}
      />
    </>
  );
}

function DetailSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {children}
      </CardContent>
    </Card>
  );
}

function UserPersonalInfoCard({ user }: { user: ManagedUserDetail }) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserRound className="size-5 text-primary" aria-hidden="true" />
          ข้อมูลส่วนตัว
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyProfileField label="ชื่อ" value={text(user.FirstName)} />
          <ReadOnlyProfileField label="นามสกุล" value={text(user.LastName)} />
        </div>
        <ReadOnlyProfileField label="เบอร์โทรศัพท์" value={text(user.phone)} />
        <ReadOnlyProfileField label="อีเมล" value={text(user.email)} />
        <ReadOnlyProfileField label="หน่วยงาน/สังกัด" value={text(user.affiliation)} />
        <ReadOnlyProfileField label="LINE ID" value={text(user.line_id)} />
      </CardContent>
    </Card>
  );
}

function UserDetailContent({
  activeTab,
  user,
}: {
  activeTab: string;
  user: ManagedUserDetail;
}) {
  const permissions = user.permissions ?? [];
  const canOpenStudentDetail = Boolean(user.student_uuid);

  return (
    <div className="space-y-5">
      <UserHero user={user} />

      {activeTab === "info" ? (
        <>
          <UserPersonalInfoCard user={user} />
          {user.id ? (
            <UserAddressPanel
              hasProfileLocation={user.has_profile_location === true}
              userId={user.id}
            />
          ) : null}
        </>
      ) : (
        <>
          <DetailSection title="ข้อมูลบัญชี">
            <DetailItem label="ชื่อผู้ใช้" value={text(user.username)} />
            <DetailItem label="บทบาท" value={getUserRoleText(user)} />
            <DetailItem label="สถานะ" value={text(user.status)} />
            <DetailItem label="ต้องเปลี่ยนรหัส" value={text(user.must_change_password)} />
            <DetailItem label="สร้างเมื่อ" value={formatThaiDateTime(user.created_at)} />
            <DetailItem label="ปิดใช้งานเมื่อ" value={formatThaiDateTime(user.deactivated_at)} />
          </DetailSection>
          <DetailSection title="สิทธิ์และขอบเขตข้อมูล">
            <DetailItem label="ขอบเขตข้อมูล" value={describeScope(user)} />
            <DetailItem label="จำนวน permission" value={`${permissions.length} รายการ`} />
            <div className="sm:col-span-2">
              <div className="mb-2 text-xs font-semibold text-slate-500">Permission</div>
              <div className="flex flex-wrap gap-2">
                {permissions.length > 0 ? (
                  permissions.map((permission) => (
                    <Badge key={permission} variant="secondary">
                      {permission}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">-</span>
                )}
              </div>
            </div>
          </DetailSection>
        </>
      )}

      {canOpenStudentDetail ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-bold text-slate-800">บัญชีนักเรียน</div>
              <div className="mt-1 text-sm text-slate-500">
                โปรไฟล์นักเรียน canonical อยู่ที่หน้า Student Detail
              </div>
            </div>
            <NavButton icon={GraduationCap} to={`/students/${user.student_uuid}`}>
              เปิดข้อมูลนักเรียน
            </NavButton>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function UserDetailPage() {
  const { id: rawId } = useParams();
  const userId = parseUserId(rawId);
  const [activeTab, setActiveTab] = useState("info");
  const query = useUserDetail(userId);

  if (userId === null) {
    return (
      <PageShell>
        <ErrorState title="ไม่พบผู้ใช้งาน" description="รหัสผู้ใช้งานไม่ถูกต้อง" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageToolbar
        actions={
          <Tabs
            aria-label="โหมดรายละเอียดผู้ใช้งาน"
            onChange={setActiveTab}
            options={[
              { value: "info", label: "ข้อมูล" },
              { value: "permissions", label: "สิทธิ์" },
            ]}
            value={activeTab}
          />
        }
        footerActions={
          <>
            <NavButton icon={SquarePen} to={`/manage-users/${userId}/edit`}>
              แก้ไขบัญชีและสิทธิ์
            </NavButton>
            <NavButton icon={ArrowLeft} to={-1} variant="outline">
              ย้อนกลับ
            </NavButton>
          </>
        }
        icon={UserRound}
        title="รายละเอียดผู้ใช้งาน"
      />

      {query.isLoading ? (
        <SkeletonStack className="rounded-lg border border-slate-100 bg-white p-5 shadow-card" lines={8} />
      ) : query.isError ? (
        <ErrorState
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : query.data ? (
        <UserDetailContent activeTab={activeTab} user={query.data} />
      ) : (
        <ErrorState title="ไม่พบผู้ใช้งาน" description="ไม่มีข้อมูลผู้ใช้งานนี้ในระบบ" />
      )}
    </PageShell>
  );
}
