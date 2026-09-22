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
  FormItem,
  FormLabel,
  Input,
  PersonIcon,
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
import {
  getManageUserPath,
  getManageUsersPath,
  getUserDisplayName,
  getUserRealm,
  getUserRoleText,
} from "../lib/admin-presentation";
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

/** Same disabled-input pattern as TeacherProfilePage's ReadOnlyField and
 *  StudentEditPage's read-only fields (โรงเรียน, ปี/ภาคเรียน, ...) — one
 *  read-only-field convention across all three "ดู" surfaces. */
function ReadOnlyField({
  action,
  className,
  id,
  label,
  value,
}: {
  action?: ReactNode;
  className?: string;
  id: string;
  label: string;
  value: string;
}) {
  return (
    <FormItem className={className}>
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <div className="flex gap-2">
        <Input
          className="cursor-default bg-slate-50 text-slate-800"
          id={id}
          readOnly
          value={value}
        />
        {action}
      </div>
    </FormItem>
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
      <div className="mb-5 flex items-center gap-2">
        <PersonIcon className="size-5 text-slate-700" aria-hidden="true" />
        <h2 className="text-lg font-bold text-slate-800">ข้อมูลทั่วไป</h2>
      </div>
      <div className="space-y-3">
        {/* Same two-column shape as เพิ่ม/แก้ไขผู้ใช้งาน and โปรไฟล์ของฉัน: photo
            on the left, identity on the right. */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[187px_minmax(0,1fr)]">
          <AvatarPhotoEditor
            label="รูปประจำตัวผู้ใช้งาน"
            name={getUserDisplayName(user)}
            onSelect={() => undefined}
            photoUrl={resolveApiMediaUrl(user.photo_url ?? null)}
          />

          <div className="grid grid-cols-1 gap-4 self-start sm:grid-cols-2">
            <ReadOnlyField
              id="user-detail-first-name"
              label="ชื่อ"
              value={text(user.FirstName)}
            />
            <ReadOnlyField
              id="user-detail-last-name"
              label="นามสกุล"
              value={text(user.LastName)}
            />
            <ReadOnlyField
              id="user-detail-email"
              label="อีเมล"
              value={text(user.email)}
            />
            <ReadOnlyField
              id="user-detail-phone"
              label="เบอร์โทรศัพท์"
              value={text(user.phone)}
            />
            <ReadOnlyField
              id="user-detail-line-id"
              label="LINE ID"
              value={text(user.line_id)}
            />
            <ReadOnlyField
              id="user-detail-affiliation"
              label="หน่วยงาน/สังกัด"
              value={text(user.affiliation)}
            />
            <ReadOnlyField
              id="user-detail-username"
              label="ชื่อผู้ใช้งาน"
              value={text(user.username)}
            />
            <ReadOnlyField
              action={
                <SensitiveValueToggleButton
                  isVisible={isNationalIdVisible}
                  label="เลขบัตร"
                  onClick={toggleNationalId}
                />
              }
              id="user-detail-national-id"
              label="เลขบัตรประชาชน"
              value={text(displayedNationalId)}
            />
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
        <div className="mb-5 flex items-center gap-2">
          <ShieldCheck className="size-5 text-slate-700" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-800">
            กำหนดสิทธิ์การเข้าถึง
          </h2>
        </div>
        <RoleGroupSelector
          disabled
          labelOf={labelOf}
          onChange={() => undefined}
          onPermissionsChange={() => undefined}
          permissions={user.permissions ?? []}
          roleGroups={roleGroups}
          value={roleName}
        />
        <p className="mt-4 text-xs text-slate-500">
          ขอบเขตข้อมูล: {describeScope(user)}
        </p>
      </Card>
    </div>
  );
}

export function UserDetailPage({
  scope = "school",
}: {
  scope?: "school" | "council";
}) {
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
            to={
              query.data
                ? getManageUserPath(query.data, "/edit")
                : `${getManageUsersPath(scope)}/${userId}/edit`
            }
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
        getUserRealm(query.data) !== scope ? (
          <ErrorState
            description="ผู้ใช้งานนี้ไม่อยู่ในขอบเขตของเส้นทางที่เลือก"
            title="ขอบเขตบัญชีไม่ตรงกับเส้นทางนี้"
          />
        ) : (
          <UserDetailContent user={query.data} />
        )
      ) : (
        <ErrorState
          title="ไม่พบผู้ใช้งาน"
          description="ไม่มีข้อมูลผู้ใช้งานนี้ในระบบ"
        />
      )}
    </PageShell>
  );
}
