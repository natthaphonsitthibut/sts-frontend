import type { ReactNode } from "react";
import { getAvatarGradient } from "../../../lib/avatar-gradient";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Eye,
  MapPin,
  SquarePen,
  UserRound,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  SchoolIcon,
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
import { SensitiveValueToggleButton } from "../../../components/security/SensitiveValueToggleButton";
import { formatThaiDateTime } from "../../../lib/date-time";
import { maskNationalId } from "../../../lib/pii-presentation";
import { useTimedSensitiveReveal } from "../../../hooks/useTimedSensitiveReveal";
import { PermissionBadgeList } from "../../auth/components/PermissionBadgeList";
import { describeDataScopeForDisplay } from "../../auth/lib/permissions";
import { geoService } from "../../tasks/api/geo.service";
import { UserAddressRevealDialog } from "../components/UserAddressRevealDialog";
import { UserNationalIdRevealDialog } from "../components/UserNationalIdRevealDialog";
import {
  getAccountLifecycleStatusMeta,
  getManagedUserLifecycleStatus,
  getUserDisplayName,
  getUserInitial,
  getUserRoleText,
} from "../lib/admin-presentation";
import { useUserDetail } from "../hooks/useUsers";
import type {
  ManagedUserDetail,
  UserAddressDetail,
} from "../types/admin.types";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";

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
  return describeDataScopeForDisplay(
    user.data_scope,
    user.data_scope_labels?.schools,
    user.data_scope_labels?.gradeLevels,
  );
}

function DetailItem({
  action,
  label,
  value,
}: {
  action?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-500">{label}</div>
          <div className="mt-1 break-words text-sm font-semibold leading-5 text-slate-800">
            {value}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

function UserHero({ user }: { user: ManagedUserDetail }) {
  const displayName = getUserDisplayName(user);
  const lifecycleCatalog = useStatusCatalog("USER_ACCOUNT_LIFECYCLE").items;
  const lifecycle = getAccountLifecycleStatusMeta(
    getManagedUserLifecycleStatus(user),
    lifecycleCatalog,
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className="flex size-24 shrink-0 items-center justify-center rounded-full text-2xl font-extrabold shadow-card"
            style={getAvatarGradient(displayName)}
          >
            {getUserInitial(user)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-2xl font-bold text-slate-900">
              {displayName}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>@{user.username}</span>
              <span aria-hidden="true">•</span>
              <span>{getUserRoleText(user)}</span>
            </div>
          </div>
        </div>
        <Badge
          className="w-fit whitespace-nowrap"
          variant={lifecycle.badgeVariant}
        >
          {lifecycle.label}
        </Badge>
      </CardContent>
    </Card>
  );
}

function UserAddressPanel({
  hasProfileLocation,
  userId,
}: {
  hasProfileLocation: boolean;
  userId: number;
}) {
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
      ]
        .filter(Boolean)
        .join(" ")
    : "";
  const geocode = useQuery({
    queryKey: ["admin-user-address-geocode", userId, fullAddress],
    queryFn: () => geoService.geocodeProfileAddress(fullAddress),
    enabled: Boolean(
      address && fullAddress && address.address_latitude === null,
    ),
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="บ้านเลขที่" value={text(address.address_line)} />
              <DetailItem label="หมู่" value={text(address.address_village_no)} />
              <DetailItem label="ถนน" value={text(address.address_street)} />
              <DetailItem label="ซอย" value={text(address.address_soi)} />
              <DetailItem label="ตรอก" value={text(address.address_trok)} />
              <DetailItem
                label="ตำบล/แขวง"
                value={text(address.address_sub_district)}
              />
              <DetailItem
                label="อำเภอ/เขต"
                value={text(address.address_district)}
              />
              <DetailItem label="จังหวัด" value={text(address.address_province)} />
              <DetailItem
                label="รหัสไปรษณีย์"
                value={text(address.address_postal_code)}
              />
            </div>
          ) : hasProfileLocation ? (
            <div className="flex justify-end">
              <Button icon={Eye} onClick={() => setDialogOpen(true)} variant="outline">
                แสดงที่อยู่และหมุด
              </Button>
            </div>
          ) : null}

          <div className="border-t border-slate-200 pt-4">
            <LocationMapPicker
              address={fullAddress || undefined}
              emptyDescription={
                hasProfileLocation
                  ? "ระบุเหตุผลเพื่อแสดงที่อยู่และหมุดของผู้ใช้งาน"
                  : "ผู้ใช้งานยังไม่ได้บันทึกที่อยู่หรือพิกัด"
              }
              emptyTitle={hasProfileLocation ? "ยังไม่เปิดดู" : "ยังไม่มีพิกัด"}
              lat={lat}
              lng={lng}
              markerLabel={
                address?.address_latitude != null
                  ? "พิกัดที่บันทึกไว้"
                  : "พิกัดจากที่อยู่"
              }
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
  const [nationalIdDialogOpen, setNationalIdDialogOpen] = useState(false);
  const {
    hide,
    reveal,
    showCached,
    values,
    visibleFields,
  } = useTimedSensitiveReveal<"nationalId">(`user:${user.id}`);
  const revealedNationalId = values.nationalId;
  const isNationalIdVisible =
    visibleFields.nationalId === true && revealedNationalId !== undefined;
  const displayedNationalId = isNationalIdVisible
    ? revealedNationalId
    : maskNationalId(user.PersonID_Onec) || "-";

  function toggleNationalId(): void {
    if (isNationalIdVisible) {
      hide("nationalId");
    } else if (revealedNationalId !== undefined) {
      showCached("nationalId");
    } else {
      setNationalIdDialogOpen(true);
    }
  }
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserRound className="size-5 text-primary" aria-hidden="true" />
          ข้อมูลส่วนตัว
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailItem label="ชื่อ" value={text(user.FirstName)} />
          <DetailItem label="นามสกุล" value={text(user.LastName)} />
          <div className="sm:col-span-2">
            <DetailItem
              action={
                <SensitiveValueToggleButton
                  isVisible={isNationalIdVisible}
                  label="เลขบัตร"
                  onClick={toggleNationalId}
                />
              }
              label="เลขบัตรประชาชน"
              value={text(displayedNationalId)}
            />
          </div>
          <DetailItem label="เบอร์โทรศัพท์" value={text(user.phone)} />
          <DetailItem label="อีเมล" value={text(user.email)} />
          <DetailItem
            label="หน่วยงาน/สังกัด"
            value={text(user.affiliation)}
          />
          <DetailItem label="LINE ID" value={text(user.line_id)} />
        </div>
        <p className="text-xs text-slate-500">
          เลขบัตรประชาชนแก้ไขได้ที่{" "}
          <Link
            className="font-semibold text-primary underline-offset-4 hover:underline"
            to={`/manage-users/${user.id}/edit`}
          >
            หน้าแก้ไขผู้ใช้งาน
          </Link>
        </p>
      </CardContent>
      {user.id ? (
        <UserNationalIdRevealDialog
          onOpenChange={setNationalIdDialogOpen}
          onRevealed={(nationalId) => {
            if (nationalId) {
              reveal({ nationalId });
            }
          }}
          open={nationalIdDialogOpen}
          userId={user.id}
        />
      ) : null}
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
            <DetailItem label="ตำแหน่ง" value={getUserRoleText(user)} />
            <DetailItem label="สถานะ" value={text(user.status)} />
            <DetailItem
              label="ต้องเปลี่ยนรหัส"
              value={text(user.must_change_password)}
            />
            <DetailItem
              label="สร้างเมื่อ"
              value={formatThaiDateTime(user.created_at)}
            />
            <DetailItem
              label="ปิดใช้งานเมื่อ"
              value={formatThaiDateTime(user.deactivated_at)}
            />
          </DetailSection>
          <DetailSection title="สิทธิ์และขอบเขตข้อมูล">
            <DetailItem label="ขอบเขตข้อมูล" value={describeScope(user)} />
            <DetailItem
              label="จำนวนสิทธิ์"
              value={`${permissions.length} รายการ`}
            />
            <div className="sm:col-span-2">
              <div className="mb-2 text-xs font-semibold text-slate-500">
                สิทธิ์การใช้งาน
              </div>
              <div className="flex flex-wrap gap-2">
                <PermissionBadgeList permissions={permissions} />
              </div>
            </div>
          </DetailSection>
        </>
      )}

      {canOpenStudentDetail ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-bold text-slate-800">
                บัญชีนักเรียน
              </div>
              <div className="mt-1 text-sm text-slate-500">
                ข้อมูลนักเรียนฉบับเต็มอยู่ที่หน้ารายละเอียดนักเรียน
              </div>
            </div>
            <NavButton
              icon={SchoolIcon}
              to={`/students/${user.student_uuid}`}
            >
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
  const [activeTab, setActiveTab] = useRouteTab(
    {
      info: `/manage-users/${userId ?? rawId ?? ""}`,
      permissions: `/manage-users/${userId ?? rawId ?? ""}/permissions`,
    } as const,
    "info",
  );
  const query = useUserDetail(userId);

  if (userId === null) {
    return (
      <PageShell>
        <ErrorState
          title="ไม่พบผู้ใช้งาน"
          description="รหัสผู้ใช้งานไม่ถูกต้อง"
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageToolbar
        navigation={
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
        description="ตรวจสอบข้อมูลบัญชี สิทธิ์ และขอบเขตการใช้งาน"
        icon={UserRound}
        title="รายละเอียดผู้ใช้งาน"
      />

      {query.isLoading ? (
        <SkeletonStack
          className="rounded-lg border border-slate-200 bg-white p-5"
          lines={8}
        />
      ) : query.isError ? (
        <ErrorState
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : query.data ? (
        <UserDetailContent activeTab={activeTab} user={query.data} />
      ) : (
        <ErrorState
          title="ไม่พบผู้ใช้งาน"
          description="ไม่มีข้อมูลผู้ใช้งานนี้ในระบบ"
        />
      )}
    </PageShell>
  );
}
