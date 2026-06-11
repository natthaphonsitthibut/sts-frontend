import { useMemo, useState } from "react";
import { Link2, Plus } from "lucide-react";
import { useConfirm } from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SearchInput,
  SkeletonTable,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { LoginLinkTable } from "../components/LoginLinkTable";
import {
  useLoginLinks,
  useSetLinkLock,
} from "../hooks/useLoginLinks";
import {
  getLoginLinkStatusMeta,
  getLoginLinkUrl,
  isLoginLinkLocked,
} from "../lib/login-links-presentation";
import type { LoginLink } from "../types/login-links.types";

export function LoginLinksPage() {
  const { links, isLoading, isError, refetch } = useLoginLinks();
  const setLinkLock = useSetLinkLock();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLinks = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) {
      return links;
    }

    return links.filter((link) => {
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
  }, [links, searchQuery]);

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
          <NavButton icon={Plus} to="/login-links/new">
            สร้างลิงก์
          </NavButton>
        }
      >
        <ToolbarControls>
          <SearchInput
            onChange={setSearchQuery}
            placeholder="ค้นหาชื่อ อีเมล ตำแหน่ง หรือสถานะ..."
            value={searchQuery}
          />
        </ToolbarControls>
      </PageToolbar>

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
          description="ลองเปลี่ยนคำค้นหา หรือเคลียร์ช่องค้นหาเพื่อดูรายการทั้งหมด"
        />
      ) : (
        <LoginLinkTable links={filteredLinks} onToggleLock={handleToggleLock} />
      )}

      {confirmDialog}
    </PageShell>
  );
}
