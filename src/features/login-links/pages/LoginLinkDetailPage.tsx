import { useParams } from "react-router-dom";
import { ArrowLeft, Link2 } from "lucide-react";
import { Badge, Button, Card } from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { LinkShareActions } from "../../../components/layout/link-share-actions";
import { LinkStatusBadge } from "../../../components/layout/link-status-badge";
import { LinkLockToggleButton } from "../../../components/layout/link-lock-toggle-button";
import { getLeafMenuItems } from "../../auth/lib/permissions";
import {
  LOGIN_LINK_DETAIL_QUERY_KEY,
  LOGIN_LINKS_QUERY_KEY,
  useLoginLinkDetail,
} from "../hooks/useLoginLinks";
import {
  formatLoginLinkDateTime,
  getLoginLinkStatusMeta,
  getLoginLinkUrl,
} from "../lib/login-links-presentation";

const PERMISSION_LABELS: Record<string, string> = Object.fromEntries(
  getLeafMenuItems().map((item) => [item.id, item.label]),
);

/**
 * Detail page for one login link — who it is for, the granted role/permissions,
 * and the shareable link. Same layout as the other dashboards' detail pages.
 */
export function LoginLinkDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: link = null, isLoading } = useLoginLinkDetail(id);

  if (isLoading && !link) {
    return (
      <PageShell>
        <Card className="p-6">
          <SkeletonStack lines={5} />
        </Card>
      </PageShell>
    );
  }

  if (!link) {
    return (
      <PageShell>
        <ErrorState
          title="ไม่พบลิงก์เข้าสู่ระบบ"
          description="ลิงก์อาจถูกลบหรือหมดอายุไปแล้ว"
        />
      </PageShell>
    );
  }

  const status = getLoginLinkStatusMeta(link);
  const url = getLoginLinkUrl(link.magic_link ?? "");
  const permissions = link.login_permissions ?? [];

  return (
    <PageShell>
      <PageToolbar
        icon={Link2}
        title="รายละเอียดลิงก์เข้าสู่ระบบ"
        description={link.assigned_to_name ?? undefined}
        actions={
          <div className="flex flex-nowrap items-center gap-3">
            <LinkLockToggleButton
              linkId={link.link_id}
              locked={link.admin_locked ?? 0}
              invalidateKeys={[[LOGIN_LINKS_QUERY_KEY], [LOGIN_LINK_DETAIL_QUERY_KEY, id]]}
            />
            <Button icon={ArrowLeft} onClick={() => window.history.back()} variant="outline">
              ย้อนกลับ
            </Button>
          </div>
        }
      />
      <div className="space-y-5">
        <Card className="rounded-lg p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">ข้อมูลลิงก์</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-slate-500">ผู้รับลิงก์</div>
              <div className="font-bold">{link.assigned_to_name || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">อีเมล</div>
              <div className="font-bold">{link.assigned_to_email || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">ตำแหน่ง</div>
              <div className="font-bold">{link.login_role_label || link.login_role || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">สถานะ</div>
              <LinkStatusBadge label={status.label} variant={status.variant} />
            </div>
            <div>
              <div className="text-sm text-slate-500">สร้างเมื่อ</div>
              <div className="font-bold">{formatLoginLinkDateTime(link.created_at ?? "")}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">หมดอายุ</div>
              <div className="font-bold">{formatLoginLinkDateTime(link.expires_at)}</div>
            </div>
          </div>
        </Card>

        <Card className="rounded-lg p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">สิทธิ์ที่ได้รับ</h2>
          {permissions.length === 0 ? (
            <p className="text-sm text-slate-500">ใช้สิทธิ์มาตรฐานของตำแหน่ง</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {permissions.map((permission) => (
                <Badge key={permission} variant="secondary">
                  {PERMISSION_LABELS[permission] ?? permission}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        <Card className="rounded-lg p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">ลิงก์เข้าสู่ระบบ</h2>
          <LinkShareActions link={url} />
        </Card>
      </div>
    </PageShell>
  );
}
