import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  DoorOpen,
  FileUp,
  Plus,
  School,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatRoomLabel } from "../../../lib/room-presentation";
import {
  Badge,
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  SchoolIcon,
  Card,
  CardContent,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormErrorAlert,
  FormLabel,
  Input,
  Label,
  Select,
  Tabs,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
  SummaryMetrics,
  FilterCombobox,
  FilterSelect,
  ToolbarFilterGrid,
} from "../../../components/layout/page-primitives";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { ClearFiltersButton } from "../../../components/layout/clear-filters-button";
import { Pagination } from "../../../components/layout/pagination";
import { attendanceService } from "../../attendance/api/attendance.service";
import { SchoolTermDialog, type SchoolTermFormValues } from "../../attendance/components/SchoolTermDialog";
import { formatSchoolTermLabel } from "../../attendance/lib/attendance-presentation";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import {
  useClassroomAssignments,
  useClassroomRoster,
  useCreateHomeroomAssignment,
  useCreateSchoolClassroom,
  useSchoolClassroomOptions,
  useSchoolClassrooms,
  useSchoolTeacherOptions,
  useSchoolTeachers,
  useScopedSchools,
  useTeacherRosterImport,
} from "../hooks/useSchoolStructure";
import type { ScopedSchool } from "../types/school-structure.types";

type StructureTab = "classrooms" | "teachers" | "roster";
const EMPTY_SCHOOLS: ScopedSchool[] = [];
const ROWS_PER_PAGE_OPTIONS = [10, 20, 50] as const;

function displayStudentName(firstName: string | null, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ") || "ไม่ระบุชื่อ";
}

function summaryLabels(input: {
  hasTerm: boolean;
  hasGrade: boolean;
  hasClassroom: boolean;
}): { classroom: string; teacher: string; student: string } {
  if (input.hasClassroom) {
    return { classroom: "ห้องที่เลือก", teacher: "ครูในห้อง", student: "นักเรียนในห้อง" };
  }
  if (input.hasGrade) {
    return {
      classroom: "ห้องในระดับชั้น",
      teacher: "ครูในระดับชั้น",
      student: "นักเรียนในระดับชั้น",
    };
  }
  if (input.hasTerm) {
    return {
      classroom: "ห้องในภาคเรียน",
      teacher: "ครูในภาคเรียน",
      student: "นักเรียนในภาคเรียน",
    };
  }
  return { classroom: "ห้องในโรงเรียน", teacher: "ครูในโรงเรียน", student: "นักเรียนในโรงเรียน" };
}

export function SchoolStructurePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const termStatusCatalog = useStatusCatalog("SCHOOL_TERM");
  const [schoolInput, setSchoolInput] = useState("");
  const [termInput, setTermInput] = useState("");
  const [classroomInput, setClassroomInput] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [subDistrictFilter, setSubDistrictFilter] = useState("");
  const [classroomGradeFilter, setClassroomGradeFilter] = useState("");
  const [classroomRoomFilter, setClassroomRoomFilter] = useState("");
  const [classroomSort, setClassroomSort] = useState<DataTableSortState>({
    key: "grade",
    direction: "asc",
  });
  const [teacherSort, setTeacherSort] = useState<DataTableSortState>({
    key: "name",
    direction: "asc",
  });
  const [rosterSort, setRosterSort] = useState<DataTableSortState>({
    key: "name",
    direction: "asc",
  });
  const [classroomPage, setClassroomPage] = useState(1);
  const [classroomRowsPerPage, setClassroomRowsPerPage] = useState(10);
  const [teacherPage, setTeacherPage] = useState(1);
  const [teacherRowsPerPage, setTeacherRowsPerPage] = useState(10);
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterRowsPerPage, setRosterRowsPerPage] = useState(20);
  const [tab, setTab] = useState<StructureTab>("classrooms");
  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [classroomDialogOpen, setClassroomDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [teacherImportDialogOpen, setTeacherImportDialogOpen] = useState(false);
  const [teacherImportFile, setTeacherImportFile] = useState<File | null>(null);
  const [gradeLevelId, setGradeLevelId] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [legacyRoomNumber, setLegacyRoomNumber] = useState("");
  const [roomName, setRoomName] = useState("");
  const [teacherMembershipId, setTeacherMembershipId] = useState("");

  const schoolsQuery = useScopedSchools();
  const schools = schoolsQuery.data ?? EMPTY_SCHOOLS;
  const provinces = useMemo(
    () => [...new Set(schools.map((school) => school.province).filter(Boolean))] as string[],
    [schools],
  );
  const districts = useMemo(
    () =>
      [...new Set(
        schools
          .filter((school) => !provinceFilter || school.province === provinceFilter)
          .map((school) => school.district)
          .filter(Boolean),
      )] as string[],
    [provinceFilter, schools],
  );
  const subDistricts = useMemo(
    () =>
      [...new Set(
        schools
          .filter(
            (school) =>
              (!provinceFilter || school.province === provinceFilter) &&
              (!districtFilter || school.district === districtFilter),
          )
          .map((school) => school.subDistrict)
          .filter(Boolean),
      )] as string[],
    [districtFilter, provinceFilter, schools],
  );
  const availableSchools = useMemo(
    () =>
      schools.filter(
        (school) =>
          (!provinceFilter || school.province === provinceFilter) &&
          (!districtFilter || school.district === districtFilter) &&
          (!subDistrictFilter || school.subDistrict === subDistrictFilter),
      ),
    [districtFilter, provinceFilter, schools, subDistrictFilter],
  );
  const selectedSchool =
    availableSchools.find((school) => school.id === Number(schoolInput)) ??
    (schools.length === 1 ? availableSchools[0] : undefined);
  const selectedSchoolId = selectedSchool?.id;
  const displayedProvince = provinceFilter || selectedSchool?.province || "";
  const displayedDistrict = districtFilter || selectedSchool?.district || "";
  const displayedSubDistrict = subDistrictFilter || selectedSchool?.subDistrict || "";

  function selectSchool(value: string): void {
    const school = schools.find((candidate) => candidate.id === Number(value));
    setSchoolInput(value);
    setProvinceFilter(school?.province ?? "");
    setDistrictFilter(school?.district ?? "");
    setSubDistrictFilter(school?.subDistrict ?? "");
    setTermInput("");
    setClassroomInput("");
    setClassroomGradeFilter("");
    setClassroomRoomFilter("");
    setClassroomPage(1);
    setTeacherPage(1);
    setRosterPage(1);
  }

  function clearStructureFilters(): void {
    setProvinceFilter("");
    setDistrictFilter("");
    setSubDistrictFilter("");
    setSchoolInput("");
    setTermInput("");
    setClassroomInput("");
    setClassroomGradeFilter("");
    setClassroomRoomFilter("");
    setClassroomPage(1);
    setTeacherPage(1);
    setRosterPage(1);
  }

  const termsQuery = useQuery({
    queryKey: ["school-structure", "terms", selectedSchoolId],
    queryFn: () => attendanceService.getTerms(selectedSchoolId!),
    enabled: Boolean(selectedSchoolId),
  });
  const terms = termsQuery.data ?? [];
  const selectedTermId = Number(termInput || terms[0]?.id || 0) || undefined;

  const gradeLevelsQuery = useQuery({
    queryKey: ["school-structure", "grade-levels"],
    queryFn: attendanceLookupService.getGradeLevels,
  });
  const classroomsQuery = useSchoolClassrooms(
    selectedSchoolId
      ? {
          schoolId: selectedSchoolId,
          termId: selectedTermId,
          gradeLevelId: Number(classroomGradeFilter) || undefined,
          classroomId: Number(classroomRoomFilter) || undefined,
          page: classroomPage,
          limit: classroomRowsPerPage,
          sortBy: classroomSort.key as "room" | "grade" | "students",
          sortDirection: classroomSort.direction,
        }
      : null,
  );
  const classrooms = useMemo(
    () => classroomsQuery.data?.data ?? [],
    [classroomsQuery.data?.data],
  );
  const classroomOptionsQuery = useSchoolClassroomOptions(
    selectedSchoolId
      ? {
          schoolId: selectedSchoolId,
          termId: selectedTermId,
          gradeLevelId: Number(classroomGradeFilter) || undefined,
        }
      : null,
  );
  const roomFilterOptions = classroomOptionsQuery.data ?? [];
  const selectedClassroom = useMemo(
    () => classrooms.find((room) => room.id === classroomInput) ?? classrooms[0],
    [classroomInput, classrooms],
  );
  const teachersQuery = useSchoolTeachers(
    selectedSchoolId
      ? {
          schoolId: selectedSchoolId,
          termId: selectedTermId,
          gradeLevelId: Number(classroomGradeFilter) || undefined,
          classroomId: Number(classroomRoomFilter) || undefined,
          assignedToFilteredClassrooms: true,
          page: teacherPage,
          limit: teacherRowsPerPage,
          sortBy: teacherSort.key as "name" | "status",
          sortDirection: teacherSort.direction,
        }
      : null,
  );
  const teachers = teachersQuery.data?.data ?? [];
  const structureSummary = classroomsQuery.data?.summary;
  const structureSummaryLabels = summaryLabels({
    hasTerm: Boolean(selectedTermId),
    hasGrade: Boolean(classroomGradeFilter),
    hasClassroom: Boolean(classroomRoomFilter),
  });
  const teacherOptionsQuery = useSchoolTeacherOptions(selectedSchoolId);
  const activeTeachers = teacherOptionsQuery.data ?? [];
  const assignmentsQuery = useClassroomAssignments(
    selectedClassroom ? Number(selectedClassroom.id) : undefined,
  );
  const rosterQuery = useClassroomRoster(
    selectedSchoolId
      ? {
          schoolId: selectedSchoolId,
          termId: selectedTermId,
          gradeLevelId: Number(classroomGradeFilter) || undefined,
          classroomId: Number(classroomRoomFilter) || undefined,
          page: rosterPage,
          limit: rosterRowsPerPage,
          sortBy: rosterSort.key as "name" | "status",
          sortDirection: rosterSort.direction,
        }
      : null,
  );

  const createClassroom = useCreateSchoolClassroom();
  const createAssignment = useCreateHomeroomAssignment();
  const teacherImport = useTeacherRosterImport();
  const createTerm = useMutation({
    mutationFn: (values: SchoolTermFormValues) =>
      attendanceService.upsertTerm({ ...values, schoolId: selectedSchoolId! }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["school-structure", "terms", selectedSchoolId],
      });
      setTermDialogOpen(false);
    },
  });

  async function submitClassroom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTermId || !gradeLevelId || !roomCode.trim() || !legacyRoomNumber) return;
    await createClassroom.mutateAsync({
      schoolTermId: selectedTermId,
      gradeLevelId: Number(gradeLevelId),
      roomCode: roomCode.trim(),
      roomName: roomName.trim() || undefined,
      legacyRoomNumber: Number(legacyRoomNumber),
    });
    setRoomCode("");
    setLegacyRoomNumber("");
    setRoomName("");
    setClassroomDialogOpen(false);
  }

  async function submitAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClassroom || !teacherMembershipId) return;
    await createAssignment.mutateAsync({
      classroomId: Number(selectedClassroom.id),
      teacherMembershipId: Number(teacherMembershipId),
    });
    setTeacherMembershipId("");
    setAssignmentDialogOpen(false);
  }

  if (schoolsQuery.isLoading) {
    return <PageShell><SkeletonStack lines={5} /></PageShell>;
  }
  if (schoolsQuery.isError) {
    return (
      <PageShell>
        <ErrorState
          description="ไม่สามารถโหลดโรงเรียนในขอบเขตของคุณได้"
          onRetry={() => void schoolsQuery.refetch()}
          title="โหลดโครงสร้างโรงเรียนไม่สำเร็จ"
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageToolbar
        actions={
          <Button
            disabled={!selectedSchoolId}
            icon={Plus}
            onClick={() => setTermDialogOpen(true)}
          >
            เพิ่มภาคเรียน
          </Button>
        }
        description="ตั้งภาคเรียน ห้อง ครูประจำชั้น และตรวจรายชื่อนักเรียนของโรงเรียนที่คุณดูแล"
        footerActions={(
          <>
            <RefreshButton onRefresh={() => Promise.all([schoolsQuery.refetch(), classroomsQuery.refetch(), classroomOptionsQuery.refetch(), teachersQuery.refetch(), teacherOptionsQuery.refetch(), assignmentsQuery.refetch(), rosterQuery.refetch()])} updatedAt={Math.max(schoolsQuery.dataUpdatedAt, classroomsQuery.dataUpdatedAt, classroomOptionsQuery.dataUpdatedAt, teachersQuery.dataUpdatedAt, teacherOptionsQuery.dataUpdatedAt, assignmentsQuery.dataUpdatedAt, rosterQuery.dataUpdatedAt)} />
            <ClearFiltersButton onClear={clearStructureFilters} />
          </>
        )}
        icon={Building2}
        title="โครงสร้างโรงเรียน"
      >
        <ToolbarFilterGrid className="xl:grid-cols-4">
          <FilterCombobox
            ariaLabel="กรองตามจังหวัด"
            onChange={(value) => {
              setProvinceFilter(value);
              setDistrictFilter("");
              setSubDistrictFilter("");
              setSchoolInput("");
              setTermInput("");
              setClassroomInput("");
              setClassroomPage(1);
              setTeacherPage(1);
              setRosterPage(1);
            }}
            options={[
              { value: "", label: "ทุกจังหวัด" },
              ...provinces.map((province) => ({ value: province, label: province })),
            ]}
            placeholder="ค้นหาจังหวัด"
            value={displayedProvince}
          />
          <FilterCombobox
            ariaLabel="กรองตามอำเภอหรือเขต"
            disabled={!displayedProvince}
            onChange={(value) => {
              setDistrictFilter(value);
              setSubDistrictFilter("");
              setSchoolInput("");
              setTermInput("");
              setClassroomInput("");
              setClassroomPage(1);
              setTeacherPage(1);
              setRosterPage(1);
            }}
            options={[
              { value: "", label: "ทุกอำเภอ/เขต" },
              ...districts.map((district) => ({ value: district, label: district })),
            ]}
            placeholder="ค้นหาอำเภอ/เขต"
            value={displayedDistrict}
          />
          <FilterCombobox
            ariaLabel="กรองตามตำบลหรือแขวง"
            disabled={!displayedDistrict}
            onChange={(value) => {
              setSubDistrictFilter(value);
              setSchoolInput("");
              setTermInput("");
              setClassroomInput("");
              setClassroomPage(1);
              setTeacherPage(1);
              setRosterPage(1);
            }}
            options={[
              { value: "", label: "ทุกตำบล/แขวง" },
              ...subDistricts.map((subDistrict) => ({
                value: subDistrict,
                label: subDistrict,
              })),
            ]}
            placeholder="ค้นหาตำบล/แขวง"
            value={displayedSubDistrict}
          />
          <FilterCombobox
            ariaLabel="เลือกโรงเรียน"
            onChange={selectSchool}
            options={[
              { value: "", label: "เลือกโรงเรียน" },
              ...availableSchools.map((school) => ({
                value: String(school.id),
                label: school.name,
              })),
            ]}
            placeholder="ค้นหาโรงเรียน"
            value={String(selectedSchoolId ?? "")}
          />
          <FilterSelect
              ariaLabel="เลือกภาคเรียน"
              value={String(selectedTermId ?? "")}
              onChange={(value) => {
                setTermInput(value);
                setClassroomInput("");
                setClassroomRoomFilter("");
                setClassroomPage(1);
                setTeacherPage(1);
                setRosterPage(1);
              }}
            >
              {terms.length === 0 ? <option value="">ยังไม่มีภาคเรียน</option> : null}
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {formatSchoolTermLabel(term, termStatusCatalog.items)}
                </option>
              ))}
          </FilterSelect>
          <FilterCombobox
            ariaLabel="กรองตามระดับชั้น"
            disabled={!selectedSchoolId}
            onChange={(value) => {
              setClassroomGradeFilter(value);
              setClassroomRoomFilter("");
              setClassroomInput("");
              setClassroomPage(1);
              setTeacherPage(1);
              setRosterPage(1);
            }}
            options={[
              { value: "", label: "ทุกชั้น" },
              ...(gradeLevelsQuery.data ?? []).map((grade) => ({
                value: String(grade.id),
                label: grade.label,
              })),
            ]}
            placeholder="ค้นหาระดับชั้น"
            value={classroomGradeFilter}
          />
          <FilterCombobox
            ariaLabel="กรองตามห้องเรียน"
            disabled={!selectedSchoolId}
            onChange={(value) => {
              setClassroomRoomFilter(value);
              setClassroomInput(value);
              setClassroomPage(1);
              setTeacherPage(1);
              setRosterPage(1);
            }}
            options={[
              { value: "", label: "ทุกห้อง" },
              ...roomFilterOptions.map((room) => ({
                value: room.id,
                label: formatRoomLabel(room.roomCode),
              })),
            ]}
            placeholder="ค้นหาห้องเรียน"
            value={classroomRoomFilter}
          />
        </ToolbarFilterGrid>
      </PageToolbar>

      {schools.length === 0 ? (
        <EmptyState icon={School} title="ยังไม่มีโรงเรียนที่บัญชีนี้ดูแล" description="ติดต่อผู้ดูแลเพื่อเพิ่มโรงเรียนที่บัญชีนี้รับผิดชอบ" />
      ) : !selectedSchoolId ? (
        <EmptyState icon={School} title="เลือกโรงเรียนเพื่อดูโครงสร้าง" description="เลือกโรงเรียนจากตัวกรองด้านบนเพื่อดูห้อง ครู และรายชื่อนักเรียน" />
      ) : (
        <>
          <SummaryMetrics
            className="mb-5"
            columns={3}
            items={[
              {
                label: structureSummaryLabels.classroom,
                value: structureSummary?.classroomCount ?? 0,
                icon: DoorOpen,
                emphasis: true,
                onSelect: () => setTab("classrooms"),
                selected: tab === "classrooms",
                selectionLabel: "เปิดแท็บห้องเรียน",
              },
              {
                label: structureSummaryLabels.teacher,
                value: structureSummary?.teacherCount ?? 0,
                icon: SchoolIcon,
                tone: "info",
                onSelect: () => setTab("teachers"),
                selected: tab === "teachers",
                selectionLabel: "เปิดแท็บครู",
              },
              {
                label: structureSummaryLabels.student,
                value: structureSummary?.studentCount ?? 0,
                icon: Users,
                tone: "success",
                onSelect: () => setTab("roster"),
                selected: tab === "roster",
                selectionLabel: "เปิดแท็บนักเรียน",
              },
            ]}
          />

          <Card className="mb-4">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <Tabs
                aria-label="ส่วนจัดการโครงสร้าง"
                value={tab}
                onChange={(value) => setTab(value as StructureTab)}
                options={[
                  { value: "classrooms", label: "ห้องเรียน" },
                  { value: "teachers", label: "ครู" },
                  { value: "roster", label: "นักเรียน" },
                ]}
              />
              {tab === "classrooms" ? (
                <Button icon={Plus} onClick={() => setClassroomDialogOpen(true)} disabled={!selectedTermId}>เพิ่มห้อง</Button>
              ) : null}
              {tab === "teachers" ? (
                <Button icon={FileUp} variant="outline" onClick={() => setTeacherImportDialogOpen(true)} disabled={!selectedSchoolId}>นำเข้าครู</Button>
              ) : null}
              {tab === "roster" ? (
                <Button
                  disabled={!selectedSchoolId || !selectedTermId || !classroomRoomFilter}
                  icon={FileUp}
                  onClick={() => navigate(`/import-data?source=school-structure&schoolId=${selectedSchoolId}&schoolTermId=${selectedTermId}&classroomId=${classroomRoomFilter}`)}
                  title={!classroomRoomFilter ? "เลือกห้องก่อนนำเข้านักเรียน" : undefined}
                  variant="outline"
                >
                  นำเข้านักเรียน
                </Button>
              ) : null}
            </CardContent>
          </Card>

          {tab === "classrooms" ? (
              <div>
                {classroomsQuery.isLoading ? <div className="p-6"><SkeletonStack lines={4} /></div> : classrooms.length === 0 ? (
                  <EmptyState icon={DoorOpen} title="ยังไม่มีห้องในภาคเรียนนี้" description="เพิ่มห้องจากระดับชั้นและรหัสห้องก่อนนำเข้ารายชื่อนักเรียน" />
                ) : (
                  <DataTable
                    footer={
                      <div className="bg-slate-50 px-5 pb-4">
                        <Pagination
                          onPageChange={setClassroomPage}
                          onRowsPerPageChange={(value) => {
                            setClassroomRowsPerPage(value);
                            setClassroomPage(1);
                          }}
                          page={classroomPage}
                          rowsPerPage={classroomRowsPerPage}
                          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                          totalCount={classroomsQuery.data?.meta.totalCount ?? 0}
                          unitLabel="ห้อง"
                        />
                        {selectedClassroom ? (
                          <div className="mt-3 flex justify-end">
                            <Button variant="outline" onClick={() => setAssignmentDialogOpen(true)} disabled={activeTeachers.length === 0}>
                            กำหนดครูประจำชั้น
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    }
                    headings={[
                      { label: "ห้อง", sortKey: "room" },
                      { label: "ระดับชั้น", sortKey: "grade" },
                      { label: "นักเรียน", sortKey: "students" },
                      "ครูประจำชั้น",
                      "",
                    ]}
                    minWidthClassName="min-w-[680px]"
                    onSortChange={(next) => {
                      setClassroomSort(next ?? { key: "grade", direction: "asc" });
                      setClassroomPage(1);
                    }}
                    responsive={false}
                    sort={classroomSort}
                  >
                      {classrooms.map((room) => {
                        const selected = room.id === selectedClassroom?.id;
                        const homeroom = selected
                          ? assignmentsQuery.data?.find((item) => item.assignmentKind === "HOMEROOM" && item.assignmentStatus === "ACTIVE")
                          : undefined;
                        return (
                          <DataTableRow key={room.id} className={selected ? "bg-primary-soft/50" : undefined}>
                            <DataTableCell className="font-semibold text-slate-900">{room.roomName || formatRoomLabel(room.roomCode)}</DataTableCell>
                            <DataTableCell>{room.gradeLabel}</DataTableCell>
                            <DataTableCell className="tabular-nums">{room.studentCount}</DataTableCell>
                            <DataTableCell>{homeroom?.teacherName ?? (selected ? "ยังไม่กำหนด" : "เลือกห้องเพื่อดู")}</DataTableCell>
                            <DataTableCell className="text-right">
                              <Button size="sm" variant={selected ? "secondary" : "outline"} onClick={() => { setClassroomInput(room.id); setRosterPage(1); }}>เลือก</Button>
                            </DataTableCell>
                          </DataTableRow>
                        );
                      })}
                  </DataTable>
                )}
              </div>
          ) : null}

          {tab === "teachers" ? (
              teachersQuery.isLoading ? <div className="p-6"><SkeletonStack lines={4} /></div> : teachers.length === 0 ? (
                <EmptyState
                  icon={SchoolIcon}
                  title="ยังไม่มีครูตามตัวกรองนี้"
                  description="ยังไม่มีครูที่ได้รับมอบหมายให้ดูแลห้องตามโรงเรียน ภาคเรียน ระดับชั้น และห้องที่เลือก"
                />
              ) : (
                <DataTable
                  footer={
                    <div className="bg-slate-50 px-5 pb-4">
                      <Pagination
                        onPageChange={setTeacherPage}
                        onRowsPerPageChange={(value) => {
                          setTeacherRowsPerPage(value);
                          setTeacherPage(1);
                        }}
                        page={teacherPage}
                        rowsPerPage={teacherRowsPerPage}
                        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                        totalCount={teachersQuery.data?.meta.totalCount ?? 0}
                        unitLabel="ครู"
                      />
                    </div>
                  }
                  headings={[
                    { label: "ชื่อครู", sortKey: "name" },
                    { label: "สถานะ", sortKey: "status" },
                  ]}
                  minWidthClassName="min-w-[560px]"
                  onSortChange={(next) => {
                    setTeacherSort(next ?? { key: "name", direction: "asc" });
                    setTeacherPage(1);
                  }}
                  responsive={false}
                  sort={teacherSort}
                >
                  {teachers.map((teacher) => (
                    <DataTableRow key={teacher.id}>
                      <DataTableCell><p className="font-semibold text-slate-900">{teacher.displayName}</p><p className="text-xs text-slate-500">{teacher.username}</p></DataTableCell>
                      <DataTableCell><Badge variant={teacher.membershipStatus === "ACTIVE" ? "success" : "secondary"}>{teacher.membershipStatus === "ACTIVE" ? "ใช้งาน" : "ยุติการใช้งาน"}</Badge></DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTable>
              )
          ) : null}

          {tab === "roster" ? (
              <div>
                {rosterQuery.isLoading ? <div className="p-6"><SkeletonStack lines={5} /></div> : (rosterQuery.data?.data.length ?? 0) === 0 ? (
                  <EmptyState icon={Users} title="ยังไม่มีนักเรียนตามตัวกรองนี้" description="ตรวจสอบภาคเรียน ระดับชั้น และห้องที่เลือก หรือนำเข้ารายชื่อนักเรียนเพิ่ม" />
                ) : (
                  <DataTable
                    footer={
                      <div className="bg-slate-50 px-5 pb-4">
                        <Pagination
                          onPageChange={setRosterPage}
                          onRowsPerPageChange={(value) => {
                            setRosterRowsPerPage(value);
                            setRosterPage(1);
                          }}
                          page={rosterPage}
                          rowsPerPage={rosterRowsPerPage}
                          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                          totalCount={rosterQuery.data?.meta.totalCount ?? 0}
                          unitLabel="นักเรียน"
                        />
                      </div>
                    }
                    headings={[
                      "ลำดับ",
                      { label: "ชื่อนักเรียน", sortKey: "name" },
                      "ระดับชั้น",
                      "ห้อง",
                      { label: "สถานะ", sortKey: "status" },
                    ]}
                    minWidthClassName="min-w-[720px]"
                    onSortChange={(next) => {
                      setRosterSort(next ?? { key: "name", direction: "asc" });
                      setRosterPage(1);
                    }}
                    responsive={false}
                    sort={rosterSort}
                  >
                    {rosterQuery.data?.data.map((student, index) => (
                      <DataTableRow key={student.studentUuid}>
                        <DataTableCell className="tabular-nums">{(rosterPage - 1) * rosterRowsPerPage + index + 1}</DataTableCell>
                        <DataTableCell className="font-medium text-slate-900">{displayStudentName(student.firstName, student.lastName)}</DataTableCell>
                        <DataTableCell>{student.gradeLabel}</DataTableCell>
                        <DataTableCell>{formatRoomLabel(student.roomCode)}</DataTableCell>
                        <DataTableCell>
                          <Badge variant={student.studentStatusBadgeVariant ?? "secondary"}>
                            {student.studentStatusLabel ?? "ไม่ระบุสถานะ"}
                          </Badge>
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTable>
                )}
              </div>
          ) : null}
        </>
      )}

      <SchoolTermDialog
        error={createTerm.error}
        isPending={createTerm.isPending}
        onClose={() => setTermDialogOpen(false)}
        onSubmit={(values) => createTerm.mutateAsync(values).then(() => undefined)}
        open={termDialogOpen}
        term={null}
      />

      <Dialog open={classroomDialogOpen} onOpenChange={setClassroomDialogOpen}>
        <DialogContent onClose={() => setClassroomDialogOpen(false)}>
          <DialogHeader><DialogTitle>เพิ่มห้องเรียน</DialogTitle></DialogHeader>
          <form onSubmit={(event) => void submitClassroom(event)}>
            <DialogBody className="space-y-4">
              <FormErrorAlert error={createClassroom.error} fallback="ไม่สามารถเพิ่มห้องได้" />
              <div><FormLabel htmlFor="classroom-grade" required>ระดับชั้น</FormLabel><Select id="classroom-grade" required value={gradeLevelId} onChange={(event) => setGradeLevelId(event.target.value)}><option value="">เลือกระดับชั้น</option>{gradeLevelsQuery.data?.map((grade) => <option key={grade.id} value={grade.id}>{grade.label}</option>)}</Select></div>
              <div><FormLabel htmlFor="classroom-code" required>รหัสห้อง</FormLabel><Input id="classroom-code" required maxLength={32} value={roomCode} onChange={(event) => setRoomCode(event.target.value)} placeholder="เช่น 1 หรือ ก" /></div>
              <div><FormLabel htmlFor="classroom-legacy-room" required>เลขห้องในข้อมูลเดิม</FormLabel><Input id="classroom-legacy-room" required min={1} step={1} type="number" value={legacyRoomNumber} onChange={(event) => setLegacyRoomNumber(event.target.value)} placeholder="เช่น 1" /><p className="mt-1 text-xs leading-5 text-slate-500">กรอกเลขห้องที่ใช้ในรายชื่อนักเรียนเดิม เพื่อให้ระบบนำนักเรียนเข้าห้องนี้ได้ถูกต้อง เช่น ข้อมูลเดิมระบุห้อง 1 ให้กรอก 1</p></div>
              <div><Label htmlFor="classroom-name">ชื่อห้อง (ถ้ามี)</Label><Input id="classroom-name" maxLength={120} value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="เช่น ห้องวิทยาศาสตร์" /></div>
            </DialogBody>
            <DialogFooter><Button variant="outline" onClick={() => setClassroomDialogOpen(false)}>ยกเลิก</Button><Button type="submit" isLoading={createClassroom.isPending} loadingText="กำลังบันทึก">บันทึกห้อง</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent onClose={() => setAssignmentDialogOpen(false)}>
          <DialogHeader><DialogTitle>กำหนดครูประจำชั้น</DialogTitle></DialogHeader>
          <form onSubmit={(event) => void submitAssignment(event)}>
            <DialogBody className="space-y-4">
              <FormErrorAlert error={createAssignment.error} fallback="ไม่สามารถกำหนดครูประจำชั้นได้" />
              <p className="text-sm text-slate-600">{selectedClassroom ? `${selectedClassroom.gradeLabel} / ${formatRoomLabel(selectedClassroom.roomCode)}` : ""}</p>
              <div><FormLabel htmlFor="homeroom-teacher" required>ครูประจำชั้น</FormLabel><Select id="homeroom-teacher" required value={teacherMembershipId} onChange={(event) => setTeacherMembershipId(event.target.value)}><option value="">เลือกครู</option>{activeTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.displayName}</option>)}</Select></div>
            </DialogBody>
            <DialogFooter><Button variant="outline" onClick={() => setAssignmentDialogOpen(false)}>ยกเลิก</Button><Button type="submit" isLoading={createAssignment.isPending} loadingText="กำลังบันทึก">บันทึกการมอบหมาย</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={teacherImportDialogOpen}
        onOpenChange={(open) => {
          setTeacherImportDialogOpen(open);
          if (!open) {
            setTeacherImportFile(null);
            teacherImport.preview.reset();
            teacherImport.submit.reset();
          }
        }}
      >
        <DialogContent onClose={() => setTeacherImportDialogOpen(false)}>
          <DialogHeader><DialogTitle>นำเข้ารายชื่อครู</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              ใช้ไฟล์รายชื่อครูที่มีคอลัมน์ <strong>ชื่อผู้ใช้</strong>
              และคอลัมน์วันที่เริ่มปฏิบัติงาน (YYYY-MM-DD) หากต้องการ
            </p>
            <Input
              accept=".csv,.xlsx"
              aria-label="ไฟล์รายชื่อครู"
              type="file"
              onChange={(event) => {
                setTeacherImportFile(event.target.files?.[0] ?? null);
                teacherImport.preview.reset();
                teacherImport.submit.reset();
              }}
            />
            <FormErrorAlert
              error={teacherImport.preview.error ?? teacherImport.submit.error}
              fallback="ไม่สามารถนำเข้ารายชื่อครูได้"
            />
            {teacherImport.preview.data ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div><p className="text-slate-500">ทั้งหมด</p><p className="text-lg font-bold tabular-nums">{teacherImport.preview.data.rowsProcessed}</p></div>
                  <div><p className="text-slate-500">พร้อมเพิ่ม</p><p className="text-lg font-bold text-success-700 tabular-nums">{teacherImport.preview.data.rowsReady}</p></div>
                  <div><p className="text-slate-500">มีอยู่แล้ว</p><p className="text-lg font-bold tabular-nums">{teacherImport.preview.data.rowsSkipped}</p></div>
                  <div><p className="text-slate-500">รอตรวจสอบ</p><p className="text-lg font-bold text-warning-700 tabular-nums">{teacherImport.preview.data.rowsToQuarantine}</p></div>
                </div>
                <div className="mt-4 max-h-48 divide-y divide-slate-200 overflow-y-auto border-t border-slate-200">
                  {teacherImport.preview.data.sampleRows.map((row) => (
                    <div key={row.rowNumber} className="flex items-start justify-between gap-3 py-2 text-sm">
                      <div><p className="font-medium text-slate-900">{row.displayName === "-" ? row.username : row.displayName}</p><p className="text-slate-500">{row.username}</p></div>
                      <span className={row.action === "insert" ? "text-success-700" : row.action === "skip" ? "text-slate-500" : "text-warning-700"}>{row.issue ?? (row.action === "skip" ? "มีอยู่แล้ว" : "พร้อมเพิ่ม")}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {teacherImport.submit.data ? (
              <Alert variant="success">
                <AlertTitle>นำเข้ารายชื่อครูแล้ว</AlertTitle>
                <AlertDescription>
                  เพิ่ม {teacherImport.submit.data.rowsInserted} รายการ · รอตรวจสอบ {teacherImport.submit.data.rowsQuarantined} รายการ
                </AlertDescription>
              </Alert>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeacherImportDialogOpen(false)}>ปิด</Button>
            {!teacherImport.preview.data ? (
              <Button
                disabled={!teacherImportFile || !selectedSchoolId}
                isLoading={teacherImport.preview.isPending}
                loadingText="กำลังตรวจสอบ"
                onClick={() => teacherImportFile && selectedSchoolId && teacherImport.preview.mutate({ file: teacherImportFile, schoolId: selectedSchoolId })}
              >
                ตรวจสอบไฟล์
              </Button>
            ) : (
              <Button
                disabled={!teacherImportFile || !selectedSchoolId || Boolean(teacherImport.submit.data)}
                isLoading={teacherImport.submit.isPending}
                loadingText="กำลังนำเข้า"
                onClick={() => teacherImportFile && selectedSchoolId && teacherImport.submit.mutate({ file: teacherImportFile, schoolId: selectedSchoolId })}
              >
                ยืนยันนำเข้า
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
