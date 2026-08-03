import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { Skeleton } from "../../../components/base";
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
import type { CurriculumGradeQuery } from "../types/curriculum.types";

const CURRICULUM_ICON = PAGE_IDENTITIES["/curriculum"].icon;

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

  // Kept in the URL so returning from a grade keeps the chosen school.
  const [searchParams, setSearchParams] = useSearchParams();
  const schoolInput = searchParams.get("schoolId") ?? "";
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Same rule as /classrooms: one school is implied, several must be chosen.
  const schoolId = schools.length === 1 ? String(schools[0].id) : schoolInput;
  const selectedSchoolId = Number(schoolId) || null;
  const multipleSchools = schools.length > 1;

  const query = useMemo<CurriculumGradeQuery | null>(
    () =>
      selectedSchoolId
        ? { schoolId: selectedSchoolId, searchTerm: search || undefined }
        : null,
    [search, selectedSchoolId],
  );
  const { grades, isLoading, isError, refetch } = useCurriculumGrades(query);

  function handleSchoolChange(value: string): void {
    setSearchParams(
      (params) => {
        if (value) params.set("schoolId", value);
        else params.delete("schoolId");
        return params;
      },
      { replace: true },
    );
  }

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
          placeholder="ค้นหา"
          value={searchInput}
        />
        {multipleSchools ? (
          <FilterCombobox
            ariaLabel="กรองตามโรงเรียน"
            emptyText="ไม่พบโรงเรียน"
            onChange={handleSchoolChange}
            options={schools.map((school) => ({
              value: String(school.id),
              label: school.name,
            }))}
            placeholder="เลือกโรงเรียน"
            value={schoolId}
          />
        ) : null}
      </ToolbarControls>

      {schoolsQuery.isError || isError ? (
        <ErrorState
          description="ไม่สามารถโหลดระดับชั้นของหลักสูตรได้"
          onRetry={() => {
            void schoolsQuery.refetch();
            refetch();
          }}
          title="โหลดข้อมูลหลักสูตรไม่สำเร็จ"
        />
      ) : schoolsQuery.isLoading || (selectedSchoolId && isLoading) ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <GradeCardSkeleton key={index} />
          ))}
        </div>
      ) : schools.length === 0 ? (
        <EmptyState
          description="บัญชีนี้ยังไม่มีโรงเรียนที่อยู่ในขอบเขตการดูแล"
          icon={CURRICULUM_ICON}
          title="ไม่พบโรงเรียนในขอบเขต"
        />
      ) : !selectedSchoolId ? (
        <EmptyState
          description="เลือกโรงเรียนจากตัวกรองด้านบนเพื่อดูหลักสูตรของแต่ละระดับชั้น"
          icon={CURRICULUM_ICON}
          title="เลือกโรงเรียน"
        />
      ) : grades.length === 0 ? (
        <EmptyState
          description={
            search
              ? "ลองเปลี่ยนคำค้นหา หรือเคลียร์ช่องค้นหาเพื่อดูทุกระดับชั้น"
              : "เพิ่มห้องเรียนในหน้าจัดการภาคเรียนและห้องเรียนก่อน จึงจะจัดหลักสูตรของระดับชั้นได้"
          }
          icon={CURRICULUM_ICON}
          title={search ? "ไม่พบระดับชั้นที่ค้นหา" : "ยังไม่มีระดับชั้นในโรงเรียนนี้"}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {grades.map((grade) => (
            <Link
              className="flex cursor-pointer items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-[transform,box-shadow] duration-150 ease-out hover:scale-[1.01] hover:shadow-md motion-reduce:transition-none motion-reduce:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              key={grade.gradeLevelId}
              to={`/curriculum/${grade.gradeLevelId}?schoolId=${selectedSchoolId}`}
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
                <GraduationCap className="size-7" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-lg font-bold text-slate-900">
                  {grade.gradeLabel}
                </span>
                <span className="block text-sm text-slate-500">
                  จำนวน {grade.subjectCount} รายวิชา
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
