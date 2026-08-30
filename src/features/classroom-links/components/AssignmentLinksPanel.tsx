import { useState } from "react";
import { Copy, Link2Off, RefreshCw, ScrollText } from "lucide-react";
import {
  Badge,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  SkeletonTable,
} from "../../../components/layout/page-primitives";
import { LinkShareDialog } from "../../../components/layout/link-share-dialog";
import { formatThaiDateTime } from "../../../lib/date-time";
import type { CheckInAccess } from "../../check-in/types/check-in.types";
import {
  useDeactivateMyAssignment,
  useMyAssignmentLinks,
  useMyAssignmentUrl,
  useMyAssignmentUsage,
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

/**
 * What became of one assignment: everyone who opened it, and every register
 * taken through it, each as a moment in time — laid out the way a student's
 * profile lays out their attendance.
 */
function AssignmentUsageDialog({
  access,
  link,
  onClose,
}: {
  access: CheckInAccess;
  link: MyAssignmentLink;
  onClose: () => void;
}) {
  const usage = useMyAssignmentUsage(access, link.id);

  return (
    <Dialog open onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="max-w-3xl" onClose={onClose}>
        <DialogHeader>
          <DialogTitle icon={ScrollText}>การใช้งานลิงก์</DialogTitle>
          <p className="mt-1 text-sm text-slate-500">
            {link.classroomLabel} · {link.subjectName} · สร้างเมื่อ{" "}
            {formatThaiDateTime(link.issuedAt)}
          </p>
        </DialogHeader>
        <DialogBody className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">
              ผู้เข้าใช้ลิงก์
            </h3>
            {usage.isLoading ? (
              <SkeletonTable rows={2} />
            ) : usage.error ? (
              <ErrorState
                description="ลองใหม่อีกครั้ง"
                onRetry={() => void usage.refetch()}
                title="โหลดการใช้งานไม่สำเร็จ"
              />
            ) : usage.data?.opens.length ? (
              <ul className="space-y-2">
                {usage.data.opens.map((open) => (
                  <li
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
                    key={`${open.openedAt}-${open.teacherName}`}
                  >
                    <span className="font-medium text-slate-800">
                      {open.teacherName}
                    </span>
                    <span className="text-sm text-slate-500">
                      {formatThaiDateTime(open.openedAt)}
                      {open.authMethod ? ` · ${open.authMethod}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">ยังไม่มีใครเปิดลิงก์นี้</p>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">
              การเช็กชื่อผ่านลิงก์นี้
            </h3>
            {usage.isLoading ? (
              <SkeletonTable rows={2} />
            ) : usage.data?.sessions.length ? (
              <ul className="space-y-2">
                {usage.data.sessions.map((session) => (
                  <li
                    className="space-y-1 rounded-lg border border-slate-200 px-3 py-2"
                    key={session.id}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-slate-800">
                        {session.classroomLabel} · {session.subjectName}
                      </span>
                      <Badge
                        variant={session.submittedAt ? "success" : "warning"}
                      >
                        {session.submittedAt ? "ส่งผลแล้ว" : "ยังไม่ส่งผล"}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">
                      เริ่ม {formatThaiDateTime(session.startedAt)}
                      {session.startedByName
                        ? ` โดย ${session.startedByName}`
                        : ""}
                    </p>
                    {session.submittedAt ? (
                      <p className="text-sm text-slate-500">
                        ส่งผล {formatThaiDateTime(session.submittedAt)}
                        {session.submittedByName
                          ? ` โดย ${session.submittedByName}`
                          : ""}
                        {` · ข้อยกเว้น ${session.exceptionCount} คน จาก ${session.expectedRosterCount} คน`}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                ยังไม่มีการเช็กชื่อผ่านลิงก์นี้
              </p>
            )}
          </section>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

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
  const [detail, setDetail] = useState<MyAssignmentLink | null>(null);
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
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
        <IconButton
          aria-label={`ดูการใช้งานลิงก์ ${link.classroomLabel} ${link.subjectName}`}
          icon={ScrollText}
          onClick={() => setDetail(link)}
          title="ดูรายละเอียด"
          variant="view"
        />
        <IconButton
          aria-label={`คัดลอกลิงก์ ${link.classroomLabel} ${link.subjectName}`}
          disabled={!live || readUrl.isPending}
          icon={Copy}
          onClick={() => void copy(link)}
          title="คัดลอกลิงก์"
          variant="share"
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

      {query.isLoading ? (
        <SkeletonTable rows={4} />
      ) : query.isError ? (
        <ErrorState
          description="ลองใหม่อีกครั้ง"
          onRetry={() => void query.refetch()}
          title="โหลดลิงก์ที่มอบหมายไม่สำเร็จ"
        />
      ) : rows.length === 0 ? (
        <EmptyState
          description={
            narrowed
              ? "ยังไม่ได้มอบหมายวิชานี้ให้ใคร กดปุ่มเครื่องมือแล้วเลือกมอบหมายเพื่อสร้างลิงก์"
              : "ยังไม่ได้มอบหมายวิชาไหนในภาคเรียนนี้"
          }
          icon={Link2Off}
          title="ยังไม่มีลิงก์ที่มอบหมาย"
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

      {detail ? (
        <AssignmentUsageDialog
          access={access}
          link={detail}
          onClose={() => setDetail(null)}
        />
      ) : null}
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
