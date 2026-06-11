import { useMemo, useState } from "react";
import { Link2, Plus } from "lucide-react";
import { useConfirm } from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  PageShell,
  PageToolbar,
  SearchInput,
  SkeletonTable,
  SummaryMetrics,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { LoginLinkTable } from "../components/LoginLinkTable";
import {
  useLoginLinks,
  useSetLinkLock,
} from "../hooks/useLoginLinks";
import {
  getLoginLinkState,
  getLoginLinkStatusMeta,
  getLoginLinkUrl,
  isLoginLinkLocked,
  LOGIN_LINK_STATE_OPTIONS,
} from "../lib/login-links-presentation";
import type { LoginLink } from "../types/login-links.types";

export function LoginLinksPage() {
  const { links, isLoading, isError, refetch } = useLoginLinks();
  const setLinkLock = useSetLinkLock();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("ALL");

  const filteredLinks = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return links.filter((link) => {
      if (status !== "ALL" && getLoginLinkState(link) !== status) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const searchable = [
        link.assigned_to_name,
        link.assigned_to_email,
        link.login_role_label,
        link.login_role,
        getLoginLinkStatusMeta(link).label,
        getLoginLinkUrl(link.magic_link),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [links, searchQuery, status]);

  const summary = useMemo(
    () => ({
      total: links.length,
      active: links.filter((link) => getLoginLinkState(link) === "ACTIVE").length,
      locked: links.filter((link) => getLoginLinkState(link) === "LOCKED").length,
      expired: links.filter((link) => getLoginLinkState(link) === "EXPIRED").length,
    }),
    [links],
  );

  async function handleToggleLock(link: LoginLink): Promise<void> {
    const locked = isLoginLinkLocked(link);
    const confirmed = await confirm({
      title: locked ? "เปิดลิงก์อีกครั้ง" : "ปิดลิงก์",
      description: locked
        ? "ต้องการเปิดลิงก์นี้อีกครั้งใช่หรือไม่?"
        : "ต้องการปิดลิงก์นี้ใช่หรือไม่?",
      confirmText: locked ? "เปิดลิงก์" : "ปิดลิงก์",
      variant: locked ? "default" : "destructive",
    });
    if (!confirmed) {
      return;
    }
    setLinkLock.mutate({
      linkId: link.id,
      payload: {
        action: locked ? "unlock" : "lock",
        reason: locked
          ? "เปิดลิงก์อีกครั้งโดยผู้ดูแลระบบ"
          : "ปิดลิงก์โดยผู้ดูแลระบบ",
      },
    });
  }

  return (
    <PageShell maxWidthClassName="max-w-[1100px]">
      <PageToolbar
        icon={Link2}
        title="ลิงก์เข้าสู่ระบบ"
        description="สร้างและจัดการลิงก์เข้าสู่ระบบสำหรับผู้รับสิทธิ์"
        actions={
          <div className="flex gap-2">
            <RefreshButton onRefresh={refetch} />
            <NavButton icon={Plus} to="/create">
              สร้างลิงก์
            </NavButton>
          </div>
        }
      >
        <ToolbarControls>
          <SearchInput
            onChange={setSearchQuery}
            placeholder="ค้นหาชื่อ อีเมล ตำแหน่ง หรือสถานะ..."
            value={searchQuery}
          />
          <FilterSelect
            ariaLabel="สถานะลิงก์เข้าสู่ระบบ"
            className="sm:w-[220px]"
            onChange={setStatus}
            value={status}
          >
            {LOGIN_LINK_STATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
        </ToolbarControls>
      </PageToolbar>

      <div className="space-y-5">
        <SummaryMetrics
          items={[
            { label: "ทั้งหมด", value: summary.total, tone: "default" },
            { label: "ใช้งานอยู่", value: summary.active, tone: "success" },
            { label: "ถูกปิด", value: summary.locked, tone: "danger" },
            { label: "หมดอายุ", value: summary.expired, tone: "warning" },
          ]}
        />

        {isError ? (
          <ErrorState
            title="ไม่สามารถโหลดลิงก์ได้"
            description="เกิดข้อผิดพลาดระหว่างโหลดรายการลิงก์เข้าสู่ระบบ"
            onRetry={refetch}
          />
        ) : isLoading ? (
          <SkeletonTable />
        ) : links.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="ยังไม่มีลิงก์เข้าสู่ระบบ"
            description="กดปุ่ม “สร้างลิงก์” เพื่อสร้างลิงก์เข้าสู่ระบบใหม่"
          />
        ) : filteredLinks.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="ไม่พบลิงก์ที่ค้นหา"
            description="ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ"
          />
        ) : (
          <LoginLinkTable links={filteredLinks} onToggleLock={handleToggleLock} />
        )}
      </div>

      {confirmDialog}
    </PageShell>
  );
}
