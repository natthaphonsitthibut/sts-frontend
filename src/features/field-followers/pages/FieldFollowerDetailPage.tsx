import { useParams } from "react-router-dom";
import { ArrowLeft, UserCheck } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Skeleton,
  useConfirm,
} from "../../../components/base";
import { NavButton } from "../../../components/layout/nav-button";
import {
  ErrorState,
  PageShell,
  PageToolbar,
} from "../../../components/layout/page-primitives";
import { formatThaiDateTime } from "../../../lib/date-time";
import { getApiErrorMessage } from "../../../lib/api-error";
import { AuditLogPanel } from "../../audit-log/components/AuditLogPanel";
import {
  findStatusCatalogItem,
  useStatusCatalog,
} from "../../status-catalog/hooks/useStatusCatalog";
import {
  useFieldFollower,
  useReviewFieldFollower,
} from "../hooks/useFieldFollowers";
import {
  getAvailableFieldFollowerActions,
  getFieldFollowerAreaText,
  getFieldFollowerFullName,
  getFieldFollowerReviewActionLabel,
  getFieldFollowerStatusMeta,
} from "../lib/field-follower-presentation";
import type { FieldFollowerReviewAction } from "../types/field-follower.types";

const REVIEW_AUDIT_ACTION_OPTIONS = [
  { value: "FIELD_FOLLOWER_REVIEW", label: "ตรวจสอบใบสมัคร" },
] as const;

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-800">{value || "-"}</div>
    </div>
  );
}

function reviewButtonLabel(action: FieldFollowerReviewAction): string {
  if (action === "APPROVE") return "อนุมัติใบสมัคร";
  if (action === "REJECT") return "ปฏิเสธใบสมัคร";
  return getFieldFollowerReviewActionLabel(action);
}

export function FieldFollowerDetailPage() {
  const { id = "" } = useParams();
  const followerQuery = useFieldFollower(id);
  const reviewMutation = useReviewFieldFollower();
  const statusCatalog = useStatusCatalog("FIELD_FOLLOWER_STATUS").items;
  const { confirm, dialog } = useConfirm();
  const follower = followerQuery.data ?? null;
  const statusMeta = follower
    ? getFieldFollowerStatusMeta(statusCatalog, follower.status)
    : null;
  const actions = follower ? getAvailableFieldFollowerActions(follower.status) : [];

  async function handleReview(action: FieldFollowerReviewAction): Promise<void> {
    if (!follower) return;

    const accepted = await confirm({
      title: reviewButtonLabel(action),
      description: "การดำเนินการนี้จะถูกบันทึกในประวัติการตรวจสอบ",
      confirmText: reviewButtonLabel(action),
      variant: action === "REJECT" || action === "SUSPEND" ? "destructive" : "default",
    });
    if (accepted) {
      reviewMutation.mutate({ id: follower.id, action });
    }
  }

  return (
    <PageShell>
      <PageToolbar
        actions={
          <NavButton icon={ArrowLeft} to="/field-followers/review" variant="outline">
            ย้อนกลับ
          </NavButton>
        }
        description="ตรวจข้อมูลผู้สมัครก่อนอนุมัติหรือปฏิเสธสิทธิ์ผู้ติดตามภาคสนาม"
        icon={UserCheck}
        title="รายละเอียดใบสมัคร"
      />

      {followerQuery.isError ? (
        <ErrorState
          description="เกิดข้อผิดพลาดระหว่างโหลดข้อมูลผู้สมัคร"
          onRetry={followerQuery.refetch}
          title="โหลดรายละเอียดใบสมัครไม่สำเร็จ"
        />
      ) : followerQuery.isLoading ? (
        <div className="rounded-lg border border-slate-100 bg-white p-5 shadow-card">
          <Skeleton className="h-6 w-56" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </div>
      ) : follower ? (
        <div className="space-y-5">
          {reviewMutation.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {getApiErrorMessage(reviewMutation.error, "ดำเนินการใบสมัครไม่สำเร็จ")}
              </AlertDescription>
            </Alert>
          ) : null}

          <section className="rounded-lg border border-slate-100 bg-white p-5 shadow-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {getFieldFollowerFullName(follower)}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  สมัครเมื่อ {formatThaiDateTime(follower.created_at)}
                </p>
              </div>
              {statusMeta ? (
                <Badge className="w-fit whitespace-nowrap text-[11px]" variant={statusMeta.variant}>
                  {statusMeta.label}
                </Badge>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DetailItem label="เบอร์โทรศัพท์" value={follower.phone} />
              <DetailItem label="พื้นที่" value={getFieldFollowerAreaText(follower)} />
              <DetailItem label="ลิงก์รับสมัคร" value={follower.campaign_name} />
              <DetailItem
                label="สถานะ"
                value={
                  findStatusCatalogItem(statusCatalog, follower.status)?.label ??
                  "ไม่ระบุสถานะ"
                }
              />
              <DetailItem
                label="วันที่ตรวจสอบ"
                value={
                  follower.reviewed_at
                    ? formatThaiDateTime(follower.reviewed_at)
                    : null
                }
              />
              <DetailItem label="รหัสใบสมัคร" value={follower.id} />
            </div>

            {actions.length > 0 ? (
              <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                {actions.map((action) => (
                  <Button
                    disabled={reviewMutation.isPending}
                    isLoading={reviewMutation.isPending}
                    key={action}
                    onClick={() => void handleReview(action)}
                    size="sm"
                    variant={action === "REJECT" || action === "SUSPEND" ? "destructive" : "default"}
                  >
                    {reviewButtonLabel(action)}
                  </Button>
                ))}
              </div>
            ) : null}
          </section>

          <AuditLogPanel
            actionOptions={REVIEW_AUDIT_ACTION_OPTIONS}
            description="ดูประวัติการตรวจสอบใบสมัครนี้ย้อนหลัง"
            domain="field_followers"
            fixedAction="FIELD_FOLLOWER_REVIEW"
            targetId={follower.id}
            targetType="field_follower"
            title="ประวัติการตรวจสอบใบสมัครนี้"
          />
        </div>
      ) : null}
      {dialog}
    </PageShell>
  );
}
