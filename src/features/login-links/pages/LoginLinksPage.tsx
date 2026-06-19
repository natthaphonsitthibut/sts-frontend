import { useMemo, useState } from "react";
import { Link2, Plus } from "lucide-react";
import { useConfirm } from "../../../components/base";
import { getLinkLockConfirm } from "../../../lib/link-lock";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
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
import { Pagination } from "../../../components/layout/pagination";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { LoginLinkTable } from "../components/LoginLinkTable";
import {
  useLoginLinks,
  useSetLinkLock,
} from "../hooks/useLoginLinks";
import {
  isLoginLinkLocked,
  LOGIN_LINK_STATE_OPTIONS,
} from "../lib/login-links-presentation";
import type { LoginLink, LoginLinkListQuery } from "../types/login-links.types";

export function LoginLinksPage() {
  const setLinkLock = useSetLinkLock();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);

  const query = useMemo<LoginLinkListQuery>(
    () => ({
      status,
      searchTerm: debouncedSearch || undefined,
      page,
      limit: rowsPerPage,
    }),
    [status, debouncedSearch, page, rowsPerPage],
  );

  const { links, meta, summary, isLoading, isError, refetch } = useLoginLinks(query);
  const totalCount = meta?.totalCount ?? 0;
  const hasActiveFilter = Boolean(debouncedSearch) || status !== "ALL";

  function handleSearchChange(value: string): void {
    setSearchQuery(value);
    setPage(1);
  }

  function handleStatusChange(value: string): void {
    setStatus(value);
    setPage(1);
  }

  function handleRowsPerPageChange(value: number): void {
    setRowsPerPage(value);
    setPage(1);
  }

  async function handleToggleLock(link: LoginLink): Promise<void> {
    const locked = isLoginLinkLocked(link);
    const confirmed = await confirm(getLinkLockConfirm(locked));
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
            onChange={handleSearchChange}
            placeholder="ค้นหาชื่อ อีเมล ตำแหน่ง หรือสถานะ..."
            value={searchQuery}
          />
          <FilterSelect
            ariaLabel="สถานะลิงก์เข้าสู่ระบบ"
            className="sm:w-[220px]"
            onChange={handleStatusChange}
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
            title={hasActiveFilter ? "ไม่พบลิงก์ที่ค้นหา" : "ยังไม่มีลิงก์เข้าสู่ระบบ"}
            description={
              hasActiveFilter
                ? "ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ"
                : "กดปุ่ม “สร้างลิงก์” เพื่อสร้างลิงก์เข้าสู่ระบบใหม่"
            }
          />
        ) : (
          <>
            <LoginLinkTable links={links} onToggleLock={handleToggleLock} />
            <Pagination
              onPageChange={setPage}
              onRowsPerPageChange={handleRowsPerPageChange}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={PAGE_SIZE_OPTIONS}
              totalCount={totalCount}
              unitLabel="ลิงก์"
            />
          </>
        )}
      </div>

      {confirmDialog}
    </PageShell>
  );
}
