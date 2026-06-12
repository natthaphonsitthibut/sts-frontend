import { useParams } from "react-router-dom";
import { ArrowLeft, Link2 } from "lucide-react";
import { Badge, Button, buttonVariants, Card } from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { CopyButton } from "../../../components/layout/copy-button";
import { getLeafMenuItems } from "../../auth/lib/permissions";
import { useLoginLinks } from "../hooks/useLoginLinks";
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
  const { links, isLoading } = useLoginLinks();
  const link = links.find((item) => item.id === id) ?? null;

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
  const url = getLoginLinkUrl(link.magic_link);
  const permissions = link.login_permissions ?? [];

  return (
    <PageShell>
      <PageToolbar
        icon={Link2}
        title="รายละเอียดลิงก์เข้าสู่ระบบ"
        description={link.assigned_to_name ?? undefined}
        actions={
          <Button icon={ArrowLeft} onClick={() => window.history.back()} variant="outline">
            ย้อนกลับ
          </Button>
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
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <div>
              <div className="text-sm text-slate-500">สร้างเมื่อ</div>
              <div className="font-bold">{formatLoginLinkDateTime(link.created_at)}</div>
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
          <div className="break-all rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm">
            {url}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton label="คัดลอก" size="md" value={url} variant="outline" />
            <a
              className={buttonVariants({ variant: "outline" })}
              href={url}
              rel="noreferrer"
              target="_blank"
            >
              เปิดลิงก์
            </a>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
