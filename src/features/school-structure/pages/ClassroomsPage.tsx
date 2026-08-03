import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "../../../components/base";
import { PAGE_IDENTITIES } from "../../../components/layout/page-identity";
import { Pagination } from "../../../components/layout/pagination";
import {
  EmptyState,
  ErrorState,
  FilterCombobox,
  PageToolbar,
  PageShell,
  SearchInput,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { attendanceService } from "../../attendance/api/attendance.service";
import { ClassroomCard } from "../components/ClassroomCard";
import { ClassroomCardDialog } from "../components/ClassroomCardDialog";
import {
  useSchoolClassrooms,
  useScopedSchools,
  useSetClassroomFavorite,
  useUpdateClassroomPresentation,
} from "../hooks/useSchoolStructure";
import type {
  ClassroomCardCoverColor,
  SchoolClassroom,
} from "../types/school-structure.types";

const CLASSROOMS_ICON = PAGE_IDENTITIES["/classrooms"].icon;

function ClassroomCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <Skeleton className="aspect-[16/7] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

export function ClassroomsPage() {
  const schoolsQuery = useScopedSchools();
  const schools = useMemo(() => schoolsQuery.data ?? [], [schoolsQuery.data]);
  const [schoolInput, setSchoolInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [customizingClassroom, setCustomizingClassroom] = useState<SchoolClassroom | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const schoolId = schools.length === 1 ? String(schools[0].id) : schoolInput;
  const selectedSchoolId = Number(schoolId) || null;
  const termsQuery = useQuery({
    queryKey: ["classrooms", "terms", selectedSchoolId],
    queryFn: () => attendanceService.getTerms(selectedSchoolId!),
    enabled: selectedSchoolId !== null,
  });
  const currentTerm =
    termsQuery.data?.find((term) => term.status === "ACTIVE") ?? termsQuery.data?.[0] ?? null;
  const classroomsQuery = useSchoolClassrooms(
    selectedSchoolId && currentTerm
      ? {
          schoolId: selectedSchoolId,
          termId: Number(currentTerm.id),
          search: search || undefined,
          page,
          limit: rowsPerPage,
          sortBy: "grade",
          sortDirection: "asc",
        }
      : null,
  );
  const favoriteMutation = useSetClassroomFavorite();
  const presentationMutation = useUpdateClassroomPresentation();
  const classrooms = classroomsQuery.data?.data ?? [];
  const multipleSchools = schools.length > 1;

  function handleSchoolChange(value: string): void {
    setSchoolInput(value);
    setPage(1);
  }

  function handleFavoriteChange(classroom: SchoolClassroom, isFavorite: boolean): void {
    favoriteMutation.mutate({ classroomId: classroom.id, isFavorite });
  }

  function handleColorChange(
    classroom: SchoolClassroom,
    cardCoverColor: ClassroomCardCoverColor,
  ): void {
    presentationMutation.mutate({
      classroomId: classroom.id,
      cardCoverColor,
      coverImagePositionX: classroom.coverImagePositionX,
      coverImagePositionY: classroom.coverImagePositionY,
      coverImageScale: classroom.coverImageScale,
    });
  }

  const isInitialLoading = schoolsQuery.isLoading || (selectedSchoolId && termsQuery.isLoading);
  const pageError = schoolsQuery.error ?? termsQuery.error ?? classroomsQuery.error;

  return (
    <PageShell>
      <PageToolbar title="ห้องเรียนทั้งหมด" />
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
            options={schools.map((school) => ({ value: String(school.id), label: school.name }))}
            placeholder="เลือกโรงเรียน"
            value={schoolId}
          />
        ) : null}
      </ToolbarControls>

      {pageError ? (
        <ErrorState
          description="ไม่สามารถโหลดรายการห้องเรียนได้ กรุณาลองใหม่อีกครั้ง"
          onRetry={() => {
            void schoolsQuery.refetch();
            void termsQuery.refetch();
            void classroomsQuery.refetch();
          }}
        />
      ) : isInitialLoading || classroomsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <ClassroomCardSkeleton key={index} />
          ))}
        </div>
      ) : schools.length === 0 ? (
        <EmptyState
          description="บัญชีนี้ยังไม่มีโรงเรียนที่อยู่ในขอบเขตการดูแล"
          icon={CLASSROOMS_ICON}
          title="ไม่พบโรงเรียนในขอบเขต"
        />
      ) : multipleSchools && !selectedSchoolId ? (
        <EmptyState
          description="เลือกโรงเรียนจากตัวกรองด้านบนเพื่อแสดงห้องเรียน"
          icon={CLASSROOMS_ICON}
          title="เลือกโรงเรียน"
        />
      ) : !currentTerm ? (
        <EmptyState
          description="เพิ่มหรือเปิดใช้งานภาคเรียนในหน้าจัดการภาคเรียนและห้องเรียนก่อน"
          icon={CLASSROOMS_ICON}
          title="ยังไม่มีภาคเรียน"
        />
      ) : classrooms.length === 0 ? (
        <EmptyState
          description={
            search
              ? "ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง"
              : "ยังไม่มีห้องเรียนในภาคเรียนปัจจุบัน"
          }
          icon={CLASSROOMS_ICON}
          title={search ? "ไม่พบห้องเรียนที่ค้นหา" : "ยังไม่มีห้องเรียน"}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {classrooms.map((classroom) => (
              <ClassroomCard
                classroom={classroom}
                colorPending={
                  presentationMutation.isPending &&
                  presentationMutation.variables?.classroomId === classroom.id
                }
                favoritePending={
                  favoriteMutation.isPending &&
                  favoriteMutation.variables?.classroomId === classroom.id
                }
                key={classroom.id}
                onColorChange={handleColorChange}
                onCustomize={setCustomizingClassroom}
                onFavoriteChange={handleFavoriteChange}
              />
            ))}
          </div>
          <Pagination
            onPageChange={setPage}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value);
              setPage(1);
            }}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            totalCount={classroomsQuery.data?.meta.totalCount ?? 0}
            unitLabel="ห้อง"
          />
        </>
      )}

      {customizingClassroom ? (
        <ClassroomCardDialog
          classroom={customizingClassroom}
          key={customizingClassroom.id}
          onOpenChange={(open) => {
            if (!open) setCustomizingClassroom(null);
          }}
          open
        />
      ) : null}
    </PageShell>
  );
}
