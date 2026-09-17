import { useState } from "react";
import { Copy, Link2Off, RefreshCw, ScrollText } from "lucide-react";
import {
  Badge,
  IconButton,
  Tabs,
  appToast,
  useConfirm,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  SkeletonTable,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { LinkShareDialog } from "../../../components/layout/link-share-dialog";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
import { formatThaiDateTime } from "../../../lib/date-time";
import type { CheckInAccess } from "../../check-in/types/check-in.types";
import {
  useDeactivateMyAssignment,
  useMyAssignmentLinks,
  useMyAssignmentUrl,
  useRotateMyAssignment,
} from "../hooks/useClassroomLinks";
import type { MyAssignmentLink } from "../types/classroom-links.types";

const HEADINGS = [
  "ชั้น/ห้อง",
  "วิชา",
  "วันเริ่ม",
  "วันหมดอายุ",
  "สถานะ",
  "เครื่องมือ",
] as const;

const STATUS_LABELS = {
  ACTIVE: "ใช้งานอยู่",
  EXPIRED: "หมดอายุ",
  INACTIVE: "ปิดแล้ว",
} as const;

function statusBadge(link: MyAssignmentLink) {
  if (link.linkStatus === "INACTIVE")
    return <Badge variant="secondary">ปิดแล้ว</Badge>;
  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now())
    return <Badge variant="warning">หมดอายุ</Badge>;
  return <Badge variant="success">ใช้งานอยู่</Badge>;
}

/**
 * The links this person handed on, managed from where they handed them on.
 *
 * Scoped to the person, not to the lesson: the tab opens on the lesson the
 * teacher came in from because that is what they were just looking at, and one
 * tap widens it to everything they issued this term. A teacher standing in
 * their own link reaches check-in through a card for one lesson, so without
 * that switch they could never see the rest of what they handed out.
 *
 * Closing and re-issuing are here rather than on the link-management page for
 * the same reason มอบหมาย is: the person who needs to take a link back is the
 * one who gave it, and they should not have to ask the office.
 */
export function AssignmentLinksPanel({
  access,
  classroomSubjectId,
  schoolTermId,
  subjectName,
}: {
  access: CheckInAccess;
  /** The lesson the tab opened from; the default filter. */
  classroomSubjectId: number | null;
  schoolTermId: number | null;
  subjectName: string | null;
}) {
  const [scope, setScope] = useState<"SUBJECT" | "ALL">("SUBJECT");
  // Defaults to the one link that still works. A term's worth of finished
  // assignments is history, and history should not be what the teacher has to
  // scroll past to reach the link they just handed out.
  const [status, setStatus] = useState<"" | "ACTIVE" | "EXPIRED" | "INACTIVE">(
    "ACTIVE",
  );
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  // Carries where to come back to, so the page's back button lands on this tab
  // rather than on whatever the surface's default page happens to be.
  const contextualNavigate = useContextualNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const readUrl = useMyAssignmentUrl(access);
  const rotate = useRotateMyAssignment(access);
  const deactivate = useDeactivateMyAssignment(access);

  const narrowed = scope === "SUBJECT" && classroomSubjectId !== null;
  const query = useMyAssignmentLinks(
    access,
    schoolTermId
      ? {
          schoolTermId,
          ...(narrowed ? { classroomSubjectId } : {}),
          ...(status ? { status } : {}),
        }
      : null,
  );
  const rows = query.data ?? [];

  async function copy(link: MyAssignmentLink): Promise<void> {
    const url = await readUrl.mutateAsync(link.id);
    setSharedUrl(url);
  }

  async function reissue(link: MyAssignmentLink): Promise<void> {
    const confirmed = await confirm({
      title: "สร้างลิงก์ใหม่สำหรับการมอบหมายนี้?",
      description:
        "ผู้ที่ถือลิงก์เดิมจะเปิดไม่ได้อีก ต้องส่งลิงก์ใหม่ให้ผู้รับงาน",
      confirmText: "สร้างลิงก์ใหม่",
    });
    if (!confirmed) return;
    const url = await rotate.mutateAsync(link.id);
    setSharedUrl(url);
    appToast.success("สร้างลิงก์ใหม่แล้ว กรุณาส่งลิงก์ใหม่ให้ผู้รับงาน");
  }

  async function close(link: MyAssignmentLink): Promise<void> {
    const confirmed = await confirm({
      title: "ปิดลิงก์การมอบหมายนี้?",
      description: `${link.classroomLabel} · ${link.subjectName} — ผู้ที่ถือลิงก์จะเช็กชื่อต่อไม่ได้`,
      confirmText: "ปิดลิงก์",
      variant: "destructive",
    });
    if (!confirmed) return;
    await deactivate.mutateAsync(link.id);
    appToast.success("ปิดลิงก์แล้ว");
  }

  function actions(link: MyAssignmentLink) {
    const live = link.linkStatus === "ACTIVE";
    return (
      <div className="flex justify-end gap-1.5">
        {/* Copy leads, as it does on every other row of links in the app: it is
            the action a row is opened for, and the order is what a reader has
            already learnt elsewhere. */}
        <IconButton
          aria-label={`คัดลอกลิงก์ ${link.classroomLabel} ${link.subjectName}`}
          disabled={!live || readUrl.isPending}
          icon={Copy}
          onClick={() => void copy(link)}
          title="คัดลอกลิงก์"
          variant="share"
        />
        <IconButton
          aria-label={`ดูการใช้งานลิงก์ ${link.classroomLabel} ${link.subjectName}`}
          icon={ScrollText}
          onClick={() =>
            contextualNavigate(
              access === "INTERNAL"
                ? `/attendance/check-in/links/${link.id}`
                : `/classroom/links/${link.id}`,
            )
          }
          title="ดูรายละเอียด"
          variant="view"
        />
        <IconButton
          aria-label={`สร้างลิงก์ใหม่ ${link.classroomLabel} ${link.subjectName}`}
          disabled={!live || rotate.isPending}
          icon={RefreshCw}
          onClick={() => void reissue(link)}
          title="สร้างลิงก์ใหม่"
          variant="credential"
        />
        <IconButton
          aria-label={`ปิดลิงก์ ${link.classroomLabel} ${link.subjectName}`}
          disabled={!live || deactivate.isPending}
          icon={Link2Off}
          onClick={() => void close(link)}
          title="ปิดลิงก์"
          variant="lock"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {classroomSubjectId !== null ? (
        <Tabs
          aria-label="ขอบเขตลิงก์ที่แสดง"
          className="w-full"
          onChange={(value) => setScope(value as "SUBJECT" | "ALL")}
          options={[
            { value: "SUBJECT", label: subjectName ?? "วิชานี้" },
            { value: "ALL", label: "ทุกวิชาของฉัน" },
          ]}
          value={scope}
        />
      ) : null}

      {/* Same control, container and wording as every other filter in the app —
          `ToolbarControls` with the field pushed right, the way the classroom
          history panel places its own. The options mirror the table's badges. */}
      <ToolbarControls>
        <FilterSelect
          ariaLabel="กรองสถานะลิงก์ที่มอบหมาย"
          className="sm:ml-auto"
          onChange={(value) =>
            setStatus(value as "" | "ACTIVE" | "EXPIRED" | "INACTIVE")
          }
          value={status}
        >
          {(["ACTIVE", "EXPIRED", "INACTIVE"] as const).map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
          <option value="">ทุกสถานะลิงก์</option>
        </FilterSelect>
      </ToolbarControls>

      {query.isLoading ? (
        <SkeletonTable rows={4} />
      ) : query.isError ? (
        <ErrorState
          description="ลองใหม่อีกครั้ง"
          onRetry={() => void query.refetch()}
          title="โหลดลิงก์ที่มอบหมายไม่สำเร็จ"
        />
      ) : rows.length === 0 ? (
        // "ยังไม่ได้มอบหมาย" is only true of the whole term. Filtered to ปิดแล้ว
        // it would tell a teacher who has a live link that they have none.
        <EmptyState
          description={
            status && status !== "ACTIVE"
              ? "ลองเปลี่ยนสถานะที่กรอง หรือดูทุกสถานะลิงก์"
              : narrowed
                ? "ยังไม่ได้มอบหมายวิชานี้ให้ใคร กดปุ่มเครื่องมือแล้วเลือกมอบหมายเพื่อสร้างลิงก์"
                : "ยังไม่ได้มอบหมายวิชาไหนในภาคเรียนนี้"
          }
          icon={Link2Off}
          title={
            status && status !== "ACTIVE"
              ? `ไม่มีลิงก์ที่${STATUS_LABELS[status]}`
              : "ยังไม่มีลิงก์ที่มอบหมาย"
          }
        />
      ) : (
        <>
          <DataTable
            columnWidths={[
              "w-[14%]",
              "w-[24%]",
              "w-[17%]",
              "w-[17%]",
              "w-[12%]",
              "w-[16%]",
            ]}
            headings={[...HEADINGS]}
            minWidthClassName="min-w-[860px]"
            responsiveBreakpoint="lg"
          >
            {rows.map((link) => (
              <DataTableRow key={link.id}>
                <DataTableCell className="font-medium text-slate-800">
                  {link.classroomLabel}
                </DataTableCell>
                <DataTableCell>{link.subjectName}</DataTableCell>
                <DataTableCell className="text-slate-600">
                  {link.opensAt ? formatThaiDateTime(link.opensAt) : "ทันที"}
                </DataTableCell>
                <DataTableCell className="text-slate-600">
                  {link.expiresAt ? formatThaiDateTime(link.expiresAt) : "-"}
                </DataTableCell>
                <DataTableCell>{statusBadge(link)}</DataTableCell>
                <DataTableCell>{actions(link)}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTable>
          <TableCardList desktopBreakpoint="lg">
            {rows.map((link) => (
              <TableCard key={link.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">
                      {link.classroomLabel} · {link.subjectName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {link.opensAt
                        ? formatThaiDateTime(link.opensAt)
                        : "ทันที"}{" "}
                      –{" "}
                      {link.expiresAt
                        ? formatThaiDateTime(link.expiresAt)
                        : "ไม่มีกำหนด"}
                    </p>
                  </div>
                  {statusBadge(link)}
                </div>
                <div className="mt-2">{actions(link)}</div>
              </TableCard>
            ))}
          </TableCardList>
        </>
      )}

      <LinkShareDialog
        description="ผู้รับลิงก์ต้องเป็นครูที่ใช้งานอยู่ในโรงเรียนนี้ และยืนยันตัวตนก่อนเช็กชื่อ"
        link={sharedUrl ?? ""}
        onOpenChange={(open: boolean) => {
          if (!open) setSharedUrl(null);
        }}
        open={Boolean(sharedUrl)}
        title="คัดลอกหรือแชร์ลิงก์มอบหมาย"
      />
      {confirmDialog}
    </div>
  );
}
