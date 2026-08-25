import { useEffect, useMemo, useState } from "react";
import { GraduationCap } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Skeleton } from "../../../components/base";
import { ContextLink } from "../../../components/layout/context-link";
import { PAGE_IDENTITIES } from "../../../components/layout/page-identity";
import {
  EmptyState,
  ErrorState,
  FilterCombobox,
  PageShell,
  PageToolbar,
  SearchInput,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { useScopedSchools } from "../../school-structure/hooks/useSchoolStructure";
import { useCurriculumGrades } from "../hooks/useCurriculum";

const PAGE_ICON = PAGE_IDENTITIES["/curriculum"].icon;

function GradeCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

export function CurriculumGradesPage() {
  const schoolsQuery = useScopedSchools();
  const schools = useMemo(() => schoolsQuery.data ?? [], [schoolsQuery.data]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const selectedSchoolValue =
    schools.length === 1
      ? String(schools[0]?.id ?? "")
      : (searchParams.get("schoolId") ?? "");
  const schoolId = Number(selectedSchoolValue) || null;

  useEffect(() => {
    const timer = window.setTimeout(
      () => setSearchTerm(searchInput.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const gradesQuery = useCurriculumGrades(
    schoolId ? { schoolId, searchTerm: searchTerm || undefined } : null,
  );

  return (
    <PageShell>
      <PageToolbar
        description="ดูและจัดการรายวิชาในหลักสูตรของแต่ละระดับชั้น"
        title="จัดการข้อมูลหลักสูตร"
      />
      <ToolbarControls className="mb-8">
        <SearchInput
          className="sm:max-w-[560px]"
          onChange={setSearchInput}
          placeholder="ค้นหาระดับชั้น"
          value={searchInput}
        />
        {schools.length > 1 ? (
          <FilterCombobox
            ariaLabel="กรองตามโรงเรียน"
            emptyText="ไม่พบโรงเรียน"
            onChange={(value) => {
              setSearchParams(value ? { schoolId: value } : {}, {
                replace: true,
              });
            }}
            options={schools.map((school) => ({
              value: String(school.id),
              label: school.name,
            }))}
            placeholder="เลือกโรงเรียน"
            value={selectedSchoolValue}
          />
        ) : null}
      </ToolbarControls>

      {schoolsQuery.isError || gradesQuery.isError ? (
        <ErrorState
          description="ไม่สามารถโหลดระดับชั้นของหลักสูตรได้"
          onRetry={() => {
            void schoolsQuery.refetch();
            void gradesQuery.refetch();
          }}
          title="โหลดข้อมูลหลักสูตรไม่สำเร็จ"
        />
      ) : schoolsQuery.isLoading || (schoolId && gradesQuery.isLoading) ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <GradeCardSkeleton key={index} />
          ))}
        </div>
      ) : schools.length === 0 ? (
        <EmptyState icon={PAGE_ICON} title="ไม่พบโรงเรียนในขอบเขต" />
      ) : !schoolId ? (
        <EmptyState
          description="เลือกโรงเรียนจากตัวกรองด้านบน"
          icon={PAGE_ICON}
          title="เลือกโรงเรียน"
        />
      ) : gradesQuery.grades.length === 0 ? (
        <EmptyState
          description={
            searchTerm
              ? "ลองเปลี่ยนคำค้นหา"
              : "เพิ่มห้องเรียนก่อน จึงจะจัดหลักสูตรของระดับชั้นได้"
          }
          icon={PAGE_ICON}
          title={
            searchTerm
              ? "ไม่พบระดับชั้นที่ค้นหา"
              : "ยังไม่มีระดับชั้นในโรงเรียนนี้"
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {gradesQuery.grades.map((grade) => (
            <ContextLink
              className="flex cursor-pointer items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-[transform,box-shadow] duration-150 ease-out hover:scale-[1.01] hover:shadow-md motion-reduce:transition-none motion-reduce:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              key={grade.gradeLevelId}
              to={`/curriculum/${grade.gradeLevelId}?schoolId=${schoolId}`}
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
                <GraduationCap aria-hidden="true" className="size-7" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-lg font-bold text-slate-900">
                  {grade.gradeLabel}
                </span>
                <span className="block text-sm text-slate-500">
                  จำนวน {grade.subjectCount} รายวิชา
                </span>
              </span>
            </ContextLink>
          ))}
        </div>
      )}
    </PageShell>
  );
}
