import { MessageSquareText } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
} from "../../../components/layout/data-table";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { Pagination } from "../../../components/layout/pagination";
import { RefreshButton } from "../../../components/layout/refresh-button";
import {
  EmptyState,
  ErrorState,
  ListPageToolbar,
  PageShell,
  SkeletonTable,
} from "../../../components/layout/page-primitives";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useRememberedState } from "../../../hooks/useRememberedState";
import {
  readPositiveIntegerSearchParam,
  useSyncedSearchParams,
} from "../../../hooks/useSyncedSearchParams";
import { formatThaiDateTime } from "../../../lib/date-time";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { formatRoomLabel } from "../../../lib/room-presentation";
import { formatProblemCategoryOption } from "../../school-structure/lib/classroom-student-comment-form";
import { RiskReportTabs } from "../components/RiskReportTabs";
import { useTeacherComments } from "../hooks/useTeacherComments";
import { getConcernLevelPresentation } from "../lib/comment-presentation";
import { usePermissions } from "../../auth/hooks/usePermissions";

/**
 * ความคิดเห็นจากคุณครู — every comment teachers wrote about a student, across
 * the actor's scope. NOTE remains history-only; WATCH and CONCERN also feed the
 * separately scoped watchlist.
 */
export function TeacherCommentReportsPage() {
  const { can } = usePermissions();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(() =>
    readPositiveIntegerSearchParam(searchParams, "page", 1),
  );
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const value = readPositiveIntegerSearchParam(
      searchParams,
      "limit",
      DEFAULT_PAGE_SIZE,
    );
    return PAGE_SIZE_OPTIONS.includes(
      value as (typeof PAGE_SIZE_OPTIONS)[number],
    )
      ? value
      : DEFAULT_PAGE_SIZE;
  });
  const [search, setSearch] = useRememberedState(
    "teacher-comment-reports:search",
    "",
  );
  useSyncedSearchParams({
    page: page > 1 ? page : undefined,
    limit: rowsPerPage !== DEFAULT_PAGE_SIZE ? rowsPerPage : undefined,
  });
  const debouncedSearch = useDebouncedValue(search, 300);
  const comments = useTeacherComments({
    page,
    limit: rowsPerPage,
    searchTerm: debouncedSearch.trim() || undefined,
  });
  const rows = comments.data?.data ?? [];
  const totalCount = comments.data?.meta.totalCount ?? 0;

  return (
    <PageShell>
      <ListPageToolbar
        description="ความคิดเห็นที่ครูบันทึกไว้กับนักเรียน — นักเรียนที่มีความคิดเห็นจะอยู่ในสถานะเฝ้าระวัง"
        icon={MessageSquareText}
        navigation={<RiskReportTabs />}
        onClearFilters={() => {
          setSearch("");
          setPage(1);
        }}
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPage(1);
          },
          placeholder: "ค้นหาชื่อนักเรียนหรือข้อความ",
        }}
        tableActions={
          <RefreshButton
            onRefresh={() => void comments.refetch()}
            updatedAt={comments.dataUpdatedAt}
          />
        }
        title="ความคิดเห็นจากคุณครู"
      />

      {comments.isLoading ? (
        <SkeletonTable rows={8} />
      ) : comments.isError ? (
        <ErrorState
          onRetry={() => void comments.refetch()}
          title="โหลดความคิดเห็นจากคุณครูไม่สำเร็จ"
        />
      ) : rows.length === 0 ? (
        <EmptyState
          description="เมื่อครูบันทึกความคิดเห็นกับนักเรียน รายการจะปรากฏที่นี่"
          icon={MessageSquareText}
          title="ยังไม่มีความคิดเห็นจากคุณครู"
        />
      ) : (
        <>
          <DataTable
            headings={[
              "นักเรียน",
              "หัวข้อปัญหาและคำอธิบาย",
              "ผู้บันทึก",
              { label: "เครื่องมือ", className: "text-center" },
            ]}
            minWidthClassName="min-w-[900px]"
            responsive={false}
          >
            {rows.map((row) => (
              <DataTableRow key={row.id}>
                <DataTableCell>
                  <p className="text-slate-800">{row.studentName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {row.schoolName}
                    {row.gradeLabel ? ` · ${row.gradeLabel}` : ""}
                    {row.roomNo
                      ? `/${formatRoomLabel(row.roomNo).replace("ห้อง ", "")}`
                      : ""}
                  </p>
                </DataTableCell>
                <DataTableCell>
                  <div className="max-w-[46ch] space-y-1 text-sm text-slate-600">
                    <p className="font-medium text-slate-800">
                      {formatProblemCategoryOption({
                        label: row.problemCategoryLabel,
                        guidance: row.problemCategoryGuidance,
                      })}
                    </p>
                    <Badge
                      variant={
                        getConcernLevelPresentation(row.concernLevelCode)
                          .variant
                      }
                    >
                      {row.concernLevelLabel}
                    </Badge>
                    <p className="line-clamp-2 whitespace-pre-wrap">
                      {row.problemDescription}
                    </p>
                  </div>
                </DataTableCell>
                <DataTableCell>
                  <p className="text-slate-700">{row.authorDisplayName}</p>
                  <p className="text-xs text-slate-500">
                    {formatThaiDateTime(row.commentedAt)}
                  </p>
                </DataTableCell>
                <DataTableCell>
                  <div className="flex justify-center">
                    {can("students") ? (
                      <DetailLinkButton
                        aria-label={`เปิดข้อมูลนักเรียน ${row.studentName}`}
                        iconOnly
                        title="เปิดข้อมูลนักเรียน"
                        to={`/students/${row.studentUuid}`}
                      />
                    ) : null}
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTable>
          <Pagination
            onPageChange={setPage}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value);
              setPage(1);
            }}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            totalCount={totalCount}
          />
        </>
      )}
    </PageShell>
  );
}
