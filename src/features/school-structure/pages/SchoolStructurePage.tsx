import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  DoorOpen,
  FileUp,
  GraduationCap,
  Plus,
  School,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormErrorAlert,
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
  FilterSelect,
  ToolbarFilterGrid,
} from "../../../components/layout/page-primitives";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { attendanceService } from "../../attendance/api/attendance.service";
import { SchoolTermDialog, type SchoolTermFormValues } from "../../attendance/components/SchoolTermDialog";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import { useTimetableTeachers } from "../../timetable/hooks/useTimetable";
import {
  useClassroomAssignments,
  useClassroomRoster,
  useCreateHomeroomAssignment,
  useCreateSchoolClassroom,
  useCreateSchoolTeacher,
  useSchoolClassrooms,
  useSchoolTeachers,
  useScopedSchools,
  useTeacherRosterImport,
} from "../hooks/useSchoolStructure";
import type { ScopedSchool } from "../types/school-structure.types";

type StructureTab = "classrooms" | "teachers" | "roster";
const EMPTY_SCHOOLS: ScopedSchool[] = [];

function displayStudentName(firstName: string | null, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ") || "ไม่ระบุชื่อ";
}

export function SchoolStructurePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const [tab, setTab] = useState<StructureTab>("classrooms");
  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [classroomDialogOpen, setClassroomDialogOpen] = useState(false);
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [teacherImportDialogOpen, setTeacherImportDialogOpen] = useState(false);
  const [teacherImportFile, setTeacherImportFile] = useState<File | null>(null);
  const [gradeLevelId, setGradeLevelId] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [legacyRoomNumber, setLegacyRoomNumber] = useState("");
  const [roomName, setRoomName] = useState("");
  const [teacherUserId, setTeacherUserId] = useState("");
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
  const classroomsQuery = useSchoolClassrooms(selectedSchoolId, selectedTermId);
  const classrooms = useMemo(() => classroomsQuery.data ?? [], [classroomsQuery.data]);
  const filteredClassrooms = useMemo(
    () =>
      classrooms.filter(
        (classroom) =>
          (!classroomGradeFilter || classroom.gradeLevelId === Number(classroomGradeFilter)) &&
          (!classroomRoomFilter || classroom.id === classroomRoomFilter),
      ),
    [classroomGradeFilter, classroomRoomFilter, classrooms],
  );
  const visibleClassrooms = useMemo(
    () =>
      [...filteredClassrooms].sort((left, right) => {
        const leftValue =
          classroomSort.key === "room"
            ? left.roomCode
            : classroomSort.key === "students"
              ? left.studentCount
              : left.gradeLabel;
        const rightValue =
          classroomSort.key === "room"
            ? right.roomCode
            : classroomSort.key === "students"
              ? right.studentCount
              : right.gradeLabel;
        const result = typeof leftValue === "number"
          ? leftValue - (rightValue as number)
          : leftValue.localeCompare(rightValue as string, "th");
        return classroomSort.direction === "asc" ? result : -result;
      }),
    [classroomSort, filteredClassrooms],
  );
  const roomFilterOptions = useMemo(
    () =>
      classrooms.filter(
        (classroom) =>
          !classroomGradeFilter || classroom.gradeLevelId === Number(classroomGradeFilter),
      ),
    [classroomGradeFilter, classrooms],
  );
  const selectedClassroom = useMemo(
    () => visibleClassrooms.find((room) => room.id === classroomInput) ?? visibleClassrooms[0],
    [classroomInput, visibleClassrooms],
  );
  const teachersQuery = useSchoolTeachers(selectedSchoolId);
  const teachers = teachersQuery.data ?? [];
  const activeTeachers = teachers.filter((teacher) => teacher.membershipStatus === "ACTIVE");
  const candidatesQuery = useTimetableTeachers(
    selectedSchoolId ? { schoolId: selectedSchoolId } : null,
  );
  const existingTeacherIds = new Set(teachers.map((teacher) => teacher.teacherUserId));
  const candidates = (candidatesQuery.data?.data ?? []).filter(
    (candidate) => !existingTeacherIds.has(candidate.id),
  );
  const assignmentsQuery = useClassroomAssignments(
    selectedClassroom ? Number(selectedClassroom.id) : undefined,
  );
  const rosterQuery = useClassroomRoster(
    selectedClassroom ? Number(selectedClassroom.id) : undefined,
  );

  const createClassroom = useCreateSchoolClassroom();
  const createTeacher = useCreateSchoolTeacher();
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

  async function submitTeacher(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSchoolId || !teacherUserId) return;
    await createTeacher.mutateAsync({
      schoolId: selectedSchoolId,
      teacherUserId: Number(teacherUserId),
    });
    setTeacherUserId("");
    setTeacherDialogOpen(false);
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
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!selectedSchoolId}
              icon={Plus}
              variant="outline"
              onClick={() => setTermDialogOpen(true)}
            >
              เพิ่มภาคเรียน
            </Button>
            <Button
              disabled={!selectedSchoolId || !selectedTermId || !selectedClassroom}
              icon={FileUp}
              variant="outline"
              onClick={() => navigate(`/import-data?source=school-structure&schoolId=${selectedSchoolId}&schoolTermId=${selectedTermId}&classroomId=${selectedClassroom?.id}`)}
            >
              นำเข้ารายชื่อนักเรียน
            </Button>
          </div>
        }
        description="ตั้งภาคเรียน ห้อง ครูประจำชั้น และตรวจ roster จากข้อมูลที่อยู่ในขอบเขตโรงเรียนของคุณ"
        footerActions={<RefreshButton onRefresh={() => Promise.all([schoolsQuery.refetch(), classroomsQuery.refetch(), teachersQuery.refetch(), assignmentsQuery.refetch(), rosterQuery.refetch()])} />}
        icon={Building2}
        title="โครงสร้างโรงเรียน"
      >
        <ToolbarFilterGrid className="xl:grid-cols-4">
          <FilterSelect
            ariaLabel="กรองตามจังหวัด"
            onChange={(value) => {
              setProvinceFilter(value);
              setDistrictFilter("");
              setSubDistrictFilter("");
              setSchoolInput("");
              setTermInput("");
              setClassroomInput("");
            }}
            value={displayedProvince}
          >
            <option value="">ทุกจังหวัด</option>
            {provinces.map((province) => <option key={province} value={province}>{province}</option>)}
          </FilterSelect>
          <FilterSelect
            ariaLabel="กรองตามอำเภอหรือเขต"
            disabled={!displayedProvince}
            onChange={(value) => {
              setDistrictFilter(value);
              setSubDistrictFilter("");
              setSchoolInput("");
              setTermInput("");
              setClassroomInput("");
            }}
            value={displayedDistrict}
          >
            <option value="">ทุกอำเภอ/เขต</option>
            {districts.map((district) => <option key={district} value={district}>{district}</option>)}
          </FilterSelect>
          <FilterSelect
            ariaLabel="กรองตามตำบลหรือแขวง"
            disabled={!displayedDistrict}
            onChange={(value) => {
              setSubDistrictFilter(value);
              setSchoolInput("");
              setTermInput("");
              setClassroomInput("");
            }}
            value={displayedSubDistrict}
          >
            <option value="">ทุกตำบล/แขวง</option>
            {subDistricts.map((subDistrict) => <option key={subDistrict} value={subDistrict}>{subDistrict}</option>)}
          </FilterSelect>
          <FilterSelect
            ariaLabel="เลือกโรงเรียน"
            value={String(selectedSchoolId ?? "")}
            onChange={selectSchool}
          >
            <option value="">เลือกโรงเรียน</option>
            {availableSchools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
          </FilterSelect>
          <FilterSelect
              ariaLabel="เลือกภาคเรียน"
              value={String(selectedTermId ?? "")}
              onChange={(value) => {
                setTermInput(value);
                setClassroomInput("");
              }}
            >
              {terms.length === 0 ? <option value="">ยังไม่มีภาคเรียน</option> : null}
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  ปี {term.academicYear} / ภาค {term.semester} ({term.status})
                </option>
              ))}
          </FilterSelect>
          <FilterSelect
            ariaLabel="กรองตามระดับชั้น"
            disabled={!selectedSchoolId}
            onChange={(value) => {
              setClassroomGradeFilter(value);
              setClassroomRoomFilter("");
              setClassroomInput("");
            }}
            value={classroomGradeFilter}
          >
            <option value="">ทุกชั้น</option>
            {gradeLevelsQuery.data?.map((grade) => <option key={grade.id} value={grade.id}>{grade.label}</option>)}
          </FilterSelect>
          <FilterSelect
            ariaLabel="กรองตามห้องเรียน"
            disabled={!classroomGradeFilter}
            onChange={(value) => {
              setClassroomRoomFilter(value);
              setClassroomInput(value);
            }}
            value={classroomRoomFilter}
          >
            <option value="">ทุกห้อง</option>
            {roomFilterOptions.map((room) => <option key={room.id} value={room.id}>{room.roomCode}</option>)}
          </FilterSelect>
        </ToolbarFilterGrid>
      </PageToolbar>

      {schools.length === 0 ? (
                  <EmptyState icon={School} title="ไม่พบโรงเรียนที่เข้าถึงได้" description="ติดต่อผู้ดูแลเพื่อกำหนดขอบเขตโรงเรียนให้บัญชีนี้" />
      ) : (
        <>
          <SummaryMetrics
            className="mb-5"
            columns={3}
            items={[
              { label: "ห้องในภาคเรียน", value: classrooms.length, icon: DoorOpen, emphasis: true },
              { label: "ครูในโรงเรียน", value: activeTeachers.length, icon: GraduationCap, tone: "info" },
              { label: "นักเรียนในห้อง", value: selectedClassroom?.studentCount ?? 0, icon: Users, tone: "success" },
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
                  { value: "roster", label: "รายชื่อนักเรียน" },
                ]}
              />
              {tab === "classrooms" ? (
                <Button icon={Plus} onClick={() => setClassroomDialogOpen(true)} disabled={!selectedTermId}>เพิ่มห้อง</Button>
              ) : null}
              {tab === "teachers" ? (
                <div className="flex flex-wrap gap-2">
                  <Button icon={FileUp} variant="outline" onClick={() => setTeacherImportDialogOpen(true)} disabled={!selectedSchoolId}>นำเข้าครู</Button>
                  <Button icon={Plus} onClick={() => setTeacherDialogOpen(true)} disabled={!selectedSchoolId}>เพิ่มครู</Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {tab === "classrooms" ? (
              <div>
                {classroomsQuery.isLoading ? <div className="p-6"><SkeletonStack lines={4} /></div> : visibleClassrooms.length === 0 ? (
                  <EmptyState icon={DoorOpen} title="ยังไม่มีห้องในภาคเรียนนี้" description="เพิ่มห้องจากระดับชั้นและรหัสห้องก่อนนำเข้ารายชื่อนักเรียน" />
                ) : (
                  <DataTable
                    footer={
                      selectedClassroom ? (
                        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-3">
                          <Button variant="outline" onClick={() => setAssignmentDialogOpen(true)} disabled={activeTeachers.length === 0}>
                            กำหนดครูประจำชั้น
                          </Button>
                        </div>
                      ) : null
                    }
                    headings={[
                      { label: "ห้อง", sortKey: "room" },
                      { label: "ระดับชั้น", sortKey: "grade" },
                      { label: "นักเรียน", sortKey: "students" },
                      "ครูประจำชั้น",
                      "",
                    ]}
                    minWidthClassName="min-w-[680px]"
                    onSortChange={(next) => setClassroomSort(next ?? { key: "grade", direction: "asc" })}
                    responsive={false}
                    sort={classroomSort}
                  >
                      {visibleClassrooms.map((room) => {
                        const selected = room.id === selectedClassroom?.id;
                        const homeroom = selected
                          ? assignmentsQuery.data?.find((item) => item.assignmentKind === "HOMEROOM" && item.assignmentStatus === "ACTIVE")
                          : undefined;
                        return (
                          <DataTableRow key={room.id} className={selected ? "bg-primary-soft/50" : undefined}>
                            <DataTableCell className="font-semibold text-slate-900">{room.roomName || `ห้อง ${room.roomCode}`}</DataTableCell>
                            <DataTableCell>{room.gradeLabel}</DataTableCell>
                            <DataTableCell className="tabular-nums">{room.studentCount}</DataTableCell>
                            <DataTableCell>{homeroom?.teacherName ?? (selected ? "ยังไม่กำหนด" : "เลือกห้องเพื่อดู")}</DataTableCell>
                            <DataTableCell className="text-right">
                              <Button size="sm" variant={selected ? "secondary" : "outline"} onClick={() => setClassroomInput(room.id)}>เลือก</Button>
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
                <EmptyState icon={GraduationCap} title="ยังไม่มีครูในโรงเรียน" description="เพิ่มจากบัญชีผู้ใช้ที่มีสิทธิ์ปฏิบัติงานครู" />
              ) : (
                <div className="divide-y divide-slate-200">
                  {teachers.map((teacher) => (
                    <div key={teacher.id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div><p className="font-semibold text-slate-900">{teacher.displayName}</p><p className="text-sm text-slate-500">{teacher.username}</p></div>
                      <Badge variant={teacher.membershipStatus === "ACTIVE" ? "success" : "secondary"}>{teacher.membershipStatus === "ACTIVE" ? "ใช้งาน" : "ยุติการใช้งาน"}</Badge>
                    </div>
                  ))}
                </div>
              )
          ) : null}

          {tab === "roster" ? (
              <div>
                {rosterQuery.isLoading ? <div className="p-6"><SkeletonStack lines={5} /></div> : (rosterQuery.data?.length ?? 0) === 0 ? (
                  <EmptyState icon={Users} title="ยังไม่มีนักเรียนในห้องนี้" description="นำเข้ารายชื่อนักเรียนหลังเลือกโรงเรียน ภาคเรียน และห้องเรียนด้านบน" />
                ) : (
                  <DataTable headings={["ลำดับ", "ชื่อนักเรียน", "สถานะ"]} minWidthClassName="min-w-[560px]" responsive={false}>
                    {rosterQuery.data?.map((student, index) => (
                      <DataTableRow key={student.studentUuid}>
                        <DataTableCell className="tabular-nums">{index + 1}</DataTableCell>
                        <DataTableCell className="font-medium text-slate-900">{displayStudentName(student.firstName, student.lastName)}</DataTableCell>
                        <DataTableCell>{student.studentStatusLabel ?? "ไม่ระบุสถานะ"}</DataTableCell>
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
              <div><Label htmlFor="classroom-grade">ระดับชั้น</Label><Select id="classroom-grade" required value={gradeLevelId} onChange={(event) => setGradeLevelId(event.target.value)}><option value="">เลือกระดับชั้น</option>{gradeLevelsQuery.data?.map((grade) => <option key={grade.id} value={grade.id}>{grade.label}</option>)}</Select></div>
              <div><Label htmlFor="classroom-code">รหัสห้อง</Label><Input id="classroom-code" required maxLength={32} value={roomCode} onChange={(event) => setRoomCode(event.target.value)} placeholder="เช่น 1 หรือ A" /></div>
              <div><Label htmlFor="classroom-legacy-room">เลขห้องสำหรับข้อมูลนักเรียนเดิม</Label><Input id="classroom-legacy-room" required min={1} step={1} type="number" value={legacyRoomNumber} onChange={(event) => setLegacyRoomNumber(event.target.value)} placeholder="เช่น 1" /><p className="mt-1 text-xs text-slate-500">ใช้จับคู่คอลัมน์ RoomID_Onec ระหว่างช่วงเปลี่ยนผ่านข้อมูล</p></div>
              <div><Label htmlFor="classroom-name">ชื่อห้อง (ถ้ามี)</Label><Input id="classroom-name" maxLength={120} value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="เช่น ห้องวิทยาศาสตร์" /></div>
            </DialogBody>
            <DialogFooter><Button variant="outline" onClick={() => setClassroomDialogOpen(false)}>ยกเลิก</Button><Button type="submit" isLoading={createClassroom.isPending} loadingText="กำลังบันทึก">บันทึกห้อง</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={teacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
        <DialogContent onClose={() => setTeacherDialogOpen(false)}>
          <DialogHeader><DialogTitle>เพิ่มครูเข้าโรงเรียน</DialogTitle></DialogHeader>
          <form onSubmit={(event) => void submitTeacher(event)}>
            <DialogBody className="space-y-4">
              <FormErrorAlert error={createTeacher.error} fallback="ไม่สามารถเพิ่มครูได้" />
              <div><Label htmlFor="teacher-user">บัญชีครู</Label><Select id="teacher-user" required value={teacherUserId} onChange={(event) => setTeacherUserId(event.target.value)}><option value="">เลือกบัญชีครู</option>{candidates.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.display_name}</option>)}</Select></div>
              {candidates.length === 0 ? <p className="text-sm text-slate-500">ไม่มีบัญชีครูที่เพิ่มได้ในขอบเขตโรงเรียนนี้</p> : null}
            </DialogBody>
            <DialogFooter><Button variant="outline" onClick={() => setTeacherDialogOpen(false)}>ยกเลิก</Button><Button type="submit" isLoading={createTeacher.isPending} loadingText="กำลังบันทึก">เพิ่มครู</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent onClose={() => setAssignmentDialogOpen(false)}>
          <DialogHeader><DialogTitle>กำหนดครูประจำชั้น</DialogTitle></DialogHeader>
          <form onSubmit={(event) => void submitAssignment(event)}>
            <DialogBody className="space-y-4">
              <FormErrorAlert error={createAssignment.error} fallback="ไม่สามารถกำหนดครูประจำชั้นได้" />
              <p className="text-sm text-slate-600">{selectedClassroom ? `${selectedClassroom.gradeLabel} / ห้อง ${selectedClassroom.roomCode}` : ""}</p>
              <div><Label htmlFor="homeroom-teacher">ครูประจำชั้น</Label><Select id="homeroom-teacher" required value={teacherMembershipId} onChange={(event) => setTeacherMembershipId(event.target.value)}><option value="">เลือกครู</option>{activeTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.displayName}</option>)}</Select></div>
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
              ใช้ไฟล์ CSV หรือ Excel ที่มีคอลัมน์ <strong>username</strong> หรือ <strong>ชื่อผู้ใช้</strong>
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
