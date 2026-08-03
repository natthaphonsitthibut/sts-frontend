import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Plus } from "lucide-react";
import { FormErrorAlert, useConfirm } from "../../../components/base";
import { NavButton } from "../../../components/layout/nav-button";
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
  const [searchParams] = useSearchParams();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const termStatusCatalog = useStatusCatalog("SCHOOL_TERM");
  const deleteSubject = useDeleteCurriculumSubject();

  const schoolId = Number(searchParams.get("schoolId")) || null;
  const gradeId = Number(gradeLevelId) || null;

  const [termInput, setTermInput] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);

  const termsQuery = useQuery({
    queryKey: ["curriculum", "terms", schoolId],
    queryFn: () => attendanceService.getTerms(schoolId!),
    enabled: schoolId !== null,
  });
  const terms = useMemo(() => termsQuery.data ?? [], [termsQuery.data]);
  const selectedTermId = Number(termInput || terms[0]?.id || 0) || null;

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
  const { subjects, meta, isLoading, isError, refetch } = useCurriculumSubjects(query);
  const gradeLabel = subjects[0]?.gradeLabel ?? "";
  const listPath = `${CURRICULUM_PATH}${schoolId ? `?schoolId=${schoolId}` : ""}`;

  function openEdit(subject: CurriculumSubject): void {
    void navigate(
      `${CURRICULUM_PATH}/${gradeId}/subjects/${subject.id}/edit?schoolId=${schoolId}&termId=${selectedTermId}`,
    );
  }

  async function handleDelete(subject: CurriculumSubject): Promise<void> {
    const confirmed = await confirm({
      title: "ลบรายวิชาออกจากหลักสูตร",
      description: `ต้องการลบ “${subject.subjectCode} ${subject.subjectName}” ออกจากหลักสูตรของภาคเรียนนี้ใช่หรือไม่?`,
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
            disabled={!selectedTermId}
            icon={Plus}
            to={`${CURRICULUM_PATH}/${gradeId}/subjects/new?schoolId=${schoolId}&termId=${selectedTermId ?? ""}`}
          >
            เพิ่มรายวิชา
          </NavButton>
        }
        description="กำหนดรายวิชา ครูผู้สอน ห้องเรียนที่รับผิดชอบ และไฟล์สาระการเรียนรู้"
        navigation={
          <NavButton icon={ArrowLeft} to={listPath} variant="outline">
            ย้อนกลับ
          </NavButton>
        }
        parentBreadcrumb={{ label: "จัดการข้อมูลหลักสูตร", to: CURRICULUM_PATH }}
        title={gradeLabel ? `จัดการข้อมูลหลักสูตร (${gradeLabel})` : "จัดการข้อมูลหลักสูตร"}
      />

      <ToolbarControls className="mb-8">
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
          {terms.length === 0 ? <option value="">ยังไม่มีภาคเรียน</option> : null}
          {terms.map((term) => (
            <option key={term.id} value={term.id}>
              {formatSchoolTermLabel(term, termStatusCatalog.items)}
            </option>
          ))}
        </FilterSelect>
      </ToolbarControls>

      <FormErrorAlert
        error={deleteSubject.error}
        fallback="ลบรายวิชาไม่สำเร็จ กรุณาลองอีกครั้ง"
      />

      {termsQuery.isError || isError ? (
        <ErrorState
          description="ไม่สามารถโหลดรายวิชาในหลักสูตรได้"
          onRetry={() => {
            void termsQuery.refetch();
            refetch();
          }}
          title="โหลดหลักสูตรไม่สำเร็จ"
        />
      ) : termsQuery.isLoading || isLoading ? (
        <SkeletonStack lines={6} />
      ) : !selectedTermId ? (
        <EmptyState
          description="เพิ่มภาคเรียนในหน้าจัดการภาคเรียนและห้องเรียนก่อน จึงจะจัดหลักสูตรได้"
          icon={BookOpen}
          title="ยังไม่มีภาคเรียน"
        />
      ) : subjects.length === 0 ? (
        <EmptyState
          description="เพิ่มรายวิชาแรกของระดับชั้นนี้เพื่อเริ่มจัดหลักสูตร"
          icon={BookOpen}
          title="ยังไม่มีรายวิชาในหลักสูตร"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {subjects.map((subject) => (
            <CurriculumSubjectCard
              isDeleting={deleteSubject.isPending && deleteSubject.variables === subject.id}
              key={subject.id}
              onDelete={(item) => void handleDelete(item)}
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
            totalCount={meta?.totalCount ?? 0}
            unitLabel="รายวิชา"
          />
        </div>
      )}

      {confirmDialog}
    </PageShell>
  );
}
