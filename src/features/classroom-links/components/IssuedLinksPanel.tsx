import { useState } from "react";
import { CalendarClock, Link2, ScrollText } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { Pagination } from "../../../components/layout/pagination";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  SearchInput,
  SkeletonTable,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { formatThaiDateTime } from "../../../lib/date-time";
import {
  useClassroomLinkUsage,
  useIssuedClassroomLinks,
} from "../hooks/useClassroomLinks";
import type { IssuedClassroomLink } from "../types/classroom-links.types";

const HEADINGS = [
  "ลิงก์",
  "ช่วงเวลา",
  "สถานะ",
  "การใช้งาน",
  "รายละเอียด",
] as const;

/** Who the link is for, in one line: a teacher, or the lesson it covers. */
function linkSubject(row: IssuedClassroomLink): string {
  if (row.kind === "TEACHER") return row.teacherName ?? "ไม่ทราบชื่อครู";
  return [row.classroomLabel, row.subjectName].filter(Boolean).join(" · ");
}

function linkWindow(row: IssuedClassroomLink): string {
  // A teacher link runs for the term and carries no window of its own; only an
  // assignment names a start and an end, which is the whole point of it.
  if (row.kind === "TEACHER") return "ตลอดภาคเรียน";
  const opens = row.opensAt ? formatThaiDateTime(row.opensAt) : "ทันที";
  const expires = row.expiresAt ? formatThaiDateTime(row.expiresAt) : "-";
  return `${opens} – ${expires}`;
}

/**
 * What became of one link: everyone who opened it, and every register taken
 * through it, each as a moment in time — the same way a student's profile lays
 * out their attendance.
 */
function LinkUsageDialog({
  link,
  onClose,
}: {
  link: IssuedClassroomLink;
  onClose: () => void;
}) {
  const usage = useClassroomLinkUsage(link.id);

  return (
    <Dialog open onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="max-w-3xl" onClose={onClose}>
        <DialogHeader>
          <DialogTitle icon={ScrollText}>การใช้งานลิงก์</DialogTitle>
          <p className="mt-1 text-sm text-slate-500">
            {linkSubject(link)} · สร้างเมื่อ {formatThaiDateTime(link.issuedAt)}
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

/**
 * The register of links a school has issued this term.
 *
 * The table above it answers "who has a link"; this answers "what did we hand
 * out, and what came of it" — which is a different question, and the only one
 * that can see an assignment at all, since an assignment belongs to no teacher.
 */
export function IssuedLinksPanel({
  schoolId,
  schoolTermId,
}: {
  schoolId: number | null;
  schoolTermId: number | null;
}) {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [detail, setDetail] = useState<IssuedClassroomLink | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useIssuedClassroomLinks(
    schoolId && schoolTermId
      ? {
          schoolId,
          schoolTermId,
          kind: kind ? (kind as "TEACHER" | "ASSIGNMENT") : undefined,
          search: debouncedSearch || undefined,
          page,
          limit: rowsPerPage,
        }
      : null,
  );
  const rows = query.data?.data ?? [];

  return (
    <div className="space-y-4">
      <ToolbarControls>
        <SearchInput
          className="sm:max-w-[360px]"
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="ค้นหาครู ห้องเรียน หรือวิชา"
          value={search}
        />
        <FilterSelect
          ariaLabel="กรองประเภทลิงก์"
          onChange={(value) => {
            setKind(value);
            setPage(1);
          }}
          value={kind}
        >
          <option value="">ทุกประเภท</option>
          <option value="TEACHER">ลิงก์ครู</option>
          <option value="ASSIGNMENT">ลิงก์มอบหมาย</option>
        </FilterSelect>
      </ToolbarControls>

      {query.isLoading ? (
        <SkeletonTable rows={5} />
      ) : query.error ? (
        <ErrorState
          description="ลองใหม่อีกครั้ง"
          onRetry={() => void query.refetch()}
          title="โหลดรายการลิงก์ไม่สำเร็จ"
        />
      ) : rows.length === 0 ? (
        <EmptyState
          description={
            search || kind
              ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง"
              : "ยังไม่มีลิงก์ที่ถูกสร้างในภาคเรียนนี้"
          }
          icon={Link2}
          title="ไม่พบลิงก์"
        />
      ) : (
        <>
          <DataTable className="hidden md:table" headings={[...HEADINGS]}>
            {rows.map((row) => (
              <DataTableRow key={row.id}>
                <DataTableCell>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={row.kind === "TEACHER" ? "secondary" : "warning"}
                    >
                      {row.kind === "TEACHER" ? "ลิงก์ครู" : "มอบหมาย"}
                    </Badge>
                    <span className="font-medium text-slate-800">
                      {linkSubject(row)}
                    </span>
                  </div>
                </DataTableCell>
                <DataTableCell>
                  <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                    <CalendarClock className="size-4" />
                    {linkWindow(row)}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <Badge
                    variant={
                      row.linkStatus === "ACTIVE" ? "success" : "secondary"
                    }
                  >
                    {row.linkStatus === "ACTIVE" ? "ใช้งานอยู่" : "ปิดแล้ว"}
                  </Badge>
                </DataTableCell>
                <DataTableCell>
                  <span className="text-sm text-slate-600">
                    เปิด {row.openCount} ครั้ง · เช็กชื่อ {row.sessionCount}{" "}
                    ครั้ง
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <Button
                    icon={ScrollText}
                    onClick={() => setDetail(row)}
                    size="sm"
                    variant="outline"
                  >
                    ดูการใช้งาน
                  </Button>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTable>

          <TableCardList className="md:hidden">
            {rows.map((row) => (
              <TableCard
                interactive
                key={row.id}
                onClick={() => setDetail(row)}
              >
                <p className="font-semibold text-slate-900">
                  {linkSubject(row)}
                </p>
                <p className="text-xs text-slate-500">{linkWindow(row)}</p>
                <p className="mt-2 text-sm text-slate-600">
                  เปิด {row.openCount} ครั้ง · เช็กชื่อ {row.sessionCount} ครั้ง
                </p>
              </TableCard>
            ))}
          </TableCardList>

          <Pagination
            onPageChange={setPage}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value);
              setPage(1);
            }}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            totalCount={query.data?.meta.total ?? 0}
            unitLabel="ลิงก์"
          />
        </>
      )}

      {detail ? (
        <LinkUsageDialog link={detail} onClose={() => setDetail(null)} />
      ) : null}
    </div>
  );
}
