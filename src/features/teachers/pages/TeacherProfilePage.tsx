import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Eye, SquarePen } from "lucide-react";
import { useParams } from "react-router-dom";
import {
  Avatar,
  Badge,
  Button,
  Card,
  FormItem,
  FormLabel,
  Input,
  PersonIcon,
} from "../../../components/base";
import { NavButton } from "../../../components/layout/nav-button";
import { useSafeBackTarget } from "../../../components/layout/navigation-context";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { resolveApiMediaUrl } from "../../../lib/media-url";
import {
  getEffectivePermissions,
  hasPermission,
} from "../../auth/lib/permissions";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { TeacherNationalIdRevealDialog } from "../components/TeacherNationalIdRevealDialog";
import { useTeacherProfile } from "../hooks/useTeachers";

function ReadOnlyField({
  action,
  id,
  label,
  value,
}: {
  action?: ReactNode;
  id: string;
  label: string;
  value: string | null;
}) {
  return (
    <FormItem>
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <div className="flex gap-2">
        <Input
          className="cursor-default bg-slate-50 text-slate-800"
          id={id}
          readOnly
          value={value || "-"}
        />
        {action}
      </div>
    </FormItem>
  );
}

export function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: teacher,
    isLoading,
    isError,
    refetch,
  } = useTeacherProfile(id ?? null);
  const [revealedNationalId, setRevealedNationalId] = useState<string | null>(
    null,
  );
  const [revealOpen, setRevealOpen] = useState(false);
  const safeBackTarget = useSafeBackTarget();
  const user = useAuthSessionStore((state) => state.user);
  const permissions = getEffectivePermissions(
    user?.roles ?? [],
    user?.permissions ?? [],
  );
  const canEdit = hasPermission(permissions, "manage-teachers");
  const canOpenDirectory = hasPermission(permissions, "teachers");
  const canRevealNationalId = canEdit || canOpenDirectory;
  const fallbackBack = canEdit
    ? "/manage-teachers"
    : canOpenDirectory
      ? "/teachers"
      : "/attendance/classroom-links";
  const backTarget =
    typeof safeBackTarget === "string" && safeBackTarget === "/"
      ? fallbackBack
      : safeBackTarget;

  return (
    <PageShell>
      <PageToolbar
        actions={
          canEdit && teacher ? (
            <NavButton
              contextual
              icon={SquarePen}
              to={`/manage-teachers/${teacher.id}/edit`}
            >
              แก้ไขข้อมูล
            </NavButton>
          ) : undefined
        }
        navigation={
          <NavButton icon={ArrowLeft} to={backTarget} variant="outline">
            ย้อนกลับ
          </NavButton>
        }
        parentBreadcrumb={{
          label: canEdit
            ? "จัดการข้อมูลครู"
            : canOpenDirectory
              ? "รายชื่อครู"
              : "จัดการลิงก์ห้องเรียน",
          to: fallbackBack,
        }}
        title="ข้อมูลคุณครู"
      />

      {isLoading ? (
        <Card className="p-6">
          <SkeletonStack lines={6} />
        </Card>
      ) : isError || !teacher ? (
        <ErrorState
          description="ข้อมูลอาจอยู่นอกขอบเขตที่คุณได้รับอนุญาต"
          onRetry={() => void refetch()}
          retryLabel="ลองอีกครั้ง"
          title="ไม่พบข้อมูลคุณครู"
        />
      ) : (
        <>
          <Card className="p-6">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <PersonIcon
                className="size-5 text-slate-700"
                aria-hidden="true"
              />
              <h2 className="text-lg font-bold text-slate-800">ข้อมูลทั่วไป</h2>
              <Badge
                className="ml-auto"
                variant={
                  teacher.membershipStatus === "ACTIVE"
                    ? "success"
                    : "secondary"
                }
              >
                {teacher.membershipStatus === "ACTIVE"
                  ? "ใช้งานอยู่"
                  : "ไม่ใช้งาน"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <Avatar
                  className="size-36 text-4xl"
                  gradientName={teacher.fullName}
                  imageAlt={`รูปประจำตัวของ ${teacher.fullName}`}
                  imageUrl={resolveApiMediaUrl(teacher.photoUrl)}
                />
                <p className="mt-4 text-sm font-semibold text-slate-700">
                  รูปประจำตัวคุณครู
                </p>
                <p className="mt-1 text-xs text-slate-500">ดูได้อย่างเดียว</p>
              </div>

              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                <ReadOnlyField
                  id="teacher-profile-first-name"
                  label="ชื่อ"
                  value={teacher.firstName}
                />
                <ReadOnlyField
                  id="teacher-profile-last-name"
                  label="นามสกุล"
                  value={teacher.lastName}
                />
                <ReadOnlyField
                  id="teacher-profile-email"
                  label="อีเมล"
                  value={teacher.email}
                />
                <ReadOnlyField
                  id="teacher-profile-line-id"
                  label="ไอดีไลน์"
                  value={teacher.lineId}
                />
                <ReadOnlyField
                  action={
                    canRevealNationalId && teacher.citizenId ? (
                      <Button
                        aria-label="แสดงเลขบัตรประชาชน"
                        icon={Eye}
                        onClick={() => setRevealOpen(true)}
                        type="button"
                        variant="outline"
                      >
                        แสดง
                      </Button>
                    ) : undefined
                  }
                  id="teacher-profile-citizen-id"
                  label="เลขบัตรประชาชน"
                  value={revealedNationalId ?? teacher.citizenId}
                />
                <ReadOnlyField
                  id="teacher-profile-phone"
                  label="เบอร์โทรศัพท์"
                  value={teacher.phone}
                />
              </div>
            </div>
          </Card>

          {teacher.citizenId ? (
            <TeacherNationalIdRevealDialog
              maskedValue={teacher.citizenId}
              onOpenChange={setRevealOpen}
              onRevealed={setRevealedNationalId}
              open={revealOpen}
              teacherId={teacher.id}
            />
          ) : null}
        </>
      )}
    </PageShell>
  );
}
