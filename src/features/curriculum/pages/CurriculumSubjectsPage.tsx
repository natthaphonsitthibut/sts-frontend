import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Plus } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FormErrorAlert, useConfirm } from "../../../components/base";
import { NavButton } from "../../../components/layout/nav-button";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
import { Pagination } from "../../../components/layout/pagination";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  PageShell,
  PageToolbar,
  SkeletonStack,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import {
  readPositiveIntegerSearchParam,
  useSyncedSearchParams,
} from "../../../hooks/useSyncedSearchParams";
import { attendanceService } from "../../attendance/api/attendance.service";
import { formatSchoolTermLabel } from "../../attendance/lib/attendance-presentation";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import { CurriculumSubjectCard } from "../components/CurriculumSubjectCard";
import {
  useCurriculumSubjects,
  useDeleteCurriculumSubject,
} from "../hooks/useCurriculum";
import type {
  CurriculumSubject,
  CurriculumSubjectQuery,
} from "../types/curriculum.types";

const CURRICULUM_PATH = "/curriculum";

export function CurriculumSubjectsPage() {
  const { gradeLevelId } = useParams<{ gradeLevelId: string }>();
  const navigate = useNavigate();
  const contextualNavigate = useContextualNavigate();
  const [searchParams] = useSearchParams();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const termStatusCatalog = useStatusCatalog("SCHOOL_TERM");
  const schoolId = Number(searchParams.get("schoolId")) || null;
  const gradeId = Number(gradeLevelId) || null;
  const [termInput, setTermInput] = useState(
    () => searchParams.get("termId") ?? "",
  );
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

  const termsQuery = useQuery({
    queryKey: ["curriculum", "terms", schoolId],
    queryFn: () => attendanceService.getTerms(schoolId!),
    enabled: Boolean(schoolId),
  });
  const terms = useMemo(() => termsQuery.data ?? [], [termsQuery.data]);
  const defaultTerm =
    terms.find((term) => term.status === "ACTIVE") ?? terms[0];
  const selectedTermId = Number(termInput || defaultTerm?.id || 0) || null;
  const query = useMemo<CurriculumSubjectQuery | null>(
    () =>
      schoolId && gradeId && selectedTermId
        ? {
            schoolId,
            termId: selectedTermId,
            gradeLevelId: gradeId,
            page,
            limit: rowsPerPage,
          }
        : null,
    [gradeId, page, rowsPerPage, schoolId, selectedTermId],
  );
  const subjectsQuery = useCurriculumSubjects(query);
  const deleteSubject = useDeleteCurriculumSubject(query);
  const gradeLabel = subjectsQuery.subjects[0]?.gradeLabel ?? "";
  useSyncedSearchParams({
    termId: termInput || undefined,
    page: page > 1 ? page : undefined,
    limit: rowsPerPage !== DEFAULT_PAGE_SIZE ? rowsPerPage : undefined,
  });

  function openEdit(subject: CurriculumSubject): void {
    contextualNavigate(
      `${CURRICULUM_PATH}/${gradeId}/subjects/${subject.id}/edit?schoolId=${schoolId}&termId=${selectedTermId}`,
    );
  }

  async function handleDelete(subject: CurriculumSubject): Promise<void> {
    const confirmed = await confirm({
      title: "ลบรายวิชาออกจากระดับชั้น",
      description: `ต้องการนำ “${subject.subjectName}” ออกจากห้องเรียนทั้งหมดของระดับชั้นนี้ใช่หรือไม่?`,
      confirmText: "ลบ",
      variant: "destructive",
    });
    if (confirmed) deleteSubject.mutate(subject.id);
  }

  if (!schoolId || !gradeId) {
    return (
      <PageShell>
        <PageToolbar title="จัดการข้อมูลหลักสูตร" />
        <ErrorState
          description="กรุณากลับไปเลือกโรงเรียนและระดับชั้นจากหน้าหลักสูตร"
          onRetry={() => void navigate(CURRICULUM_PATH)}
          retryLabel="กลับไปหน้าหลักสูตร"
          title="ยังไม่ได้เลือกระดับชั้น"
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageToolbar
        actions={
          <NavButton
            contextual
            disabled={!selectedTermId}
            icon={Plus}
            to={`${CURRICULUM_PATH}/${gradeId}/subjects/new?schoolId=${schoolId}&termId=${selectedTermId ?? ""}`}
          >
            เพิ่มรายวิชา
          </NavButton>
        }
        description="กำหนดรายวิชาและห้องเรียนที่ใช้เช็กชื่อในระดับชั้นนี้"
        navigation={
          <NavButton icon={ArrowLeft} to={-1} variant="outline">
            ย้อนกลับ
          </NavButton>
        }
        parentBreadcrumb={{
          label: "จัดการข้อมูลหลักสูตร",
          to: CURRICULUM_PATH,
        }}
        title={
          gradeLabel
            ? `จัดการข้อมูลหลักสูตร (${gradeLabel})`
            : "จัดการข้อมูลหลักสูตร"
        }
      >
        <ToolbarControls>
          <FilterSelect
            ariaLabel="เลือกภาคเรียน"
            className="sm:w-[260px]"
            disabled={terms.length === 0}
            onChange={(value) => {
              setTermInput(value);
              setPage(1);
            }}
            value={String(selectedTermId ?? "")}
          >
            {terms.length === 0 ? (
              <option value="">ยังไม่มีภาคเรียน</option>
            ) : null}
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {formatSchoolTermLabel(term, termStatusCatalog.items)}
              </option>
            ))}
          </FilterSelect>
        </ToolbarControls>
      </PageToolbar>

      <FormErrorAlert
        error={deleteSubject.error}
        fallback="ลบรายวิชาไม่สำเร็จ กรุณาลองอีกครั้ง"
      />

      {termsQuery.isError || subjectsQuery.isError ? (
        <ErrorState
          description="ไม่สามารถโหลดรายวิชาในหลักสูตรได้"
          onRetry={() => {
            void termsQuery.refetch();
            subjectsQuery.refetch();
          }}
          title="โหลดหลักสูตรไม่สำเร็จ"
        />
      ) : termsQuery.isLoading || subjectsQuery.isLoading ? (
        <SkeletonStack lines={6} />
      ) : !selectedTermId ? (
        <EmptyState icon={BookOpen} title="ยังไม่มีภาคเรียน" />
      ) : subjectsQuery.subjects.length === 0 ? (
        <EmptyState
          description="เพิ่มรายวิชาแรกของระดับชั้นนี้และเลือกห้องเรียนที่ใช้วิชา"
          icon={BookOpen}
          title="ยังไม่มีรายวิชาในระดับชั้นนี้"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {subjectsQuery.subjects.map((subject) => (
            <CurriculumSubjectCard
              isDeleting={
                deleteSubject.isPending &&
                deleteSubject.variables === subject.id
              }
              key={subject.id}
              onDelete={(item) => {
                void handleDelete(item);
              }}
              onEdit={openEdit}
              subject={subject}
            />
          ))}
          <Pagination
            onPageChange={setPage}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value);
              setPage(1);
            }}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            totalCount={subjectsQuery.meta?.totalCount ?? 0}
            unitLabel="รายวิชา"
          />
        </div>
      )}
      {confirmDialog}
    </PageShell>
  );
}
