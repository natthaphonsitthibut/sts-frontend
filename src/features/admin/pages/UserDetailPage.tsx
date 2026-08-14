import type { ReactNode } from "react";
import { useState } from "react";
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  SquarePen,
  UserRound,
} from "lucide-react";
import { Navigate, useParams } from "react-router-dom";
import {
  AvatarPhotoEditor,
  Button,
  Card,
  CardContent,
  PersonIcon,
  SchoolIcon,
} from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { SensitiveValueToggleButton } from "../../../components/security/SensitiveValueToggleButton";
import { maskNationalId } from "../../../lib/pii-presentation";
import { resolveApiMediaUrl } from "../../../lib/media-url";
import { useTimedSensitiveReveal } from "../../../hooks/useTimedSensitiveReveal";
import { usePermissionCatalog } from "../../auth/hooks/usePermissionCatalog";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { RoleGroupSelector } from "../components/RoleGroupSelector";
import { describeDataScopeForDisplay } from "../../auth/lib/permissions";
import { UserNationalIdRevealDialog } from "../components/UserNationalIdRevealDialog";
import { UserAddressRevealDialog } from "../components/UserAddressRevealDialog";
import { getUserDisplayName, getUserRoleText } from "../lib/admin-presentation";
import { useUserDetail } from "../hooks/useUsers";
import type { ManagedUserDetail, RoleDefinition } from "../types/admin.types";

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

function UserPersonalInfoCard({ user }: { user: ManagedUserDetail }) {
  const [nationalIdDialogOpen, setNationalIdDialogOpen] = useState(false);
  const { hide, reveal, showCached, values, visibleFields } =
    useTimedSensitiveReveal<"nationalId">(`user:${user.id}`);
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
    <Card className="p-6">
      <div className="mb-6 flex items-center gap-2">
        <PersonIcon className="size-5 text-slate-700" aria-hidden="true" />
        <h2 className="text-lg font-bold text-slate-800">ข้อมูลทั่วไป</h2>
      </div>
      <div className="space-y-3">
        {/* Same two-column shape as เพิ่ม/แก้ไขผู้ใช้งาน and โปรไฟล์ของฉัน: photo
            on the left, identity on the right. */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
          <AvatarPhotoEditor
            label="รูปประจำตัวผู้ใช้งาน"
            name={getUserDisplayName(user)}
            onSelect={() => undefined}
            photoUrl={resolveApiMediaUrl(user.photo_url ?? null)}
            shape="square"
          />

          <div className="grid h-fit gap-3 sm:grid-cols-2">
            <DetailItem label="ชื่อ" value={text(user.FirstName)} />
            <DetailItem label="นามสกุล" value={text(user.LastName)} />
            <DetailItem label="อีเมล" value={text(user.email)} />
            <DetailItem label="เบอร์โทรศัพท์" value={text(user.phone)} />
            <DetailItem
              label="หน่วยงาน/สังกัด"
              value={text(user.affiliation)}
            />
            <DetailItem label="ชื่อผู้ใช้งาน" value={text(user.username)} />
            <DetailItem label="LINE ID" value={text(user.line_id)} />
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
          </div>
        </div>
      </div>
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

function UserDetailContent({ user }: { user: ManagedUserDetail }) {
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const { labelOf } = usePermissionCatalog();
  const canOpenStudentDetail = Boolean(user.student_uuid);
  const roleName = user.role || user.roles?.[0] || "";
  // One locked row for this account's role, carrying the permissions it
  // actually holds (role defaults plus any per-account changes).
  const roleGroups: Array<
    Pick<RoleDefinition, "name" | "label" | "default_permissions">
  > = roleName
    ? [
        {
          name: roleName,
          label: user.labels?.[0] ?? getUserRoleText(user),
          default_permissions: user.permissions ?? [],
        },
      ]
    : [];

  return (
    <div className="space-y-5">
      <UserPersonalInfoCard user={user} />

      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-bold text-slate-800">
                ที่อยู่และแผนที่
              </h2>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {user.has_profile_location
                ? "ข้อมูลนี้เป็นข้อมูลส่วนบุคคล ระบบจะบันทึกเหตุผลเมื่อเปิดดู"
                : "ผู้ใช้งานรายนี้ยังไม่ได้บันทึกที่อยู่หรือพิกัด"}
            </p>
          </div>
          {user.has_profile_location && user.id ? (
            <Button
              icon={MapPin}
              onClick={() => setAddressDialogOpen(true)}
              variant="outline"
            >
              ดูที่อยู่และแผนที่
            </Button>
          ) : null}
        </div>
      </Card>

      {user.id ? (
        <UserAddressRevealDialog
          onOpenChange={setAddressDialogOpen}
          open={addressDialogOpen}
          userId={user.id}
        />
      ) : null}

      {/* Same card as the form's กำหนดสิทธิ์การเข้าถึง, locked for viewing. */}
      <Card className="p-6">
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck className="size-5 text-slate-700" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-800">
            กำหนดสิทธิ์การเข้าถึง
          </h2>
        </div>
        <RoleGroupSelector
          disabled
          labelOf={labelOf}
          onChange={() => undefined}
          roleGroups={roleGroups}
          value={roleName}
        />
        <p className="mt-4 text-xs text-slate-500">
          ขอบเขตข้อมูล: {describeScope(user)}
        </p>
      </Card>

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
              contextual
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
  const currentUserId = useAuthSessionStore((state) => state.user?.id ?? null);
  const isOwnProfile = userId !== null && userId === currentUserId;
  const query = useUserDetail(isOwnProfile ? null : userId);

  if (isOwnProfile) return <Navigate replace to="/profile" />;

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
        actions={
          <NavButton
            contextual
            icon={SquarePen}
            to={`/manage-users/${userId}/edit`}
          >
            แก้ไขผู้ใช้งาน
          </NavButton>
        }
        description="ตรวจสอบข้อมูลบัญชี สิทธิ์ และขอบเขตการใช้งาน"
        icon={UserRound}
        navigation={
          <NavButton icon={ArrowLeft} to={-1} variant="outline">
            ย้อนกลับ
          </NavButton>
        }
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
        <UserDetailContent user={query.data} />
      ) : (
        <ErrorState
          title="ไม่พบผู้ใช้งาน"
          description="ไม่มีข้อมูลผู้ใช้งานนี้ในระบบ"
        />
      )}
    </PageShell>
  );
}
