import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DoorOpen,
  Plus,
  School,
  SquarePen,
  Trash2,
  UserPlus,
} from "lucide-react";
import { formatRoomLabel } from "../../../lib/room-presentation";
import {
  Badge,
  Button,
  Combobox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormErrorAlert,
  FormLabel,
  IconButton,
  Input,
  Label,
  NumericInput,
  Select,
  useConfirm,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import {
  EmptyState,
  ErrorState,
  FilterCombobox,
  FilterSelect,
  PageShell,
  PageToolbar,
  SearchInput,
  SkeletonTable,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { Pagination } from "../../../components/layout/pagination";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { attendanceService } from "../../attendance/api/attendance.service";
import {
  SchoolTermDialog,
  type SchoolTermFormValues,
} from "../../attendance/components/SchoolTermDialog";
import { formatSchoolTermLabel } from "../../attendance/lib/attendance-presentation";
import type { SchoolTerm } from "../../attendance/types/attendance.types";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import {
  useCreateHomeroomAssignment,
  useCreateSchoolClassroom,
  useDeleteSchoolClassroom,
  useSchoolClassrooms,
  useSchoolTeacherOptions,
  useScopedSchools,
  useUpdateSchoolClassroom,
} from "../hooks/useSchoolStructure";
import type { SchoolClassroom } from "../types/school-structure.types";

/**
 * Term, classroom and homeroom-teacher setup for a school.
 *
 * Deliberately narrow: the teacher roster lives on /manage-teachers and the
 * student roster on /classrooms/:classroomId, so this page only owns the
 * structure those pages read.
 */
export function SchoolStructurePage() {
  const queryClient = useQueryClient();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const termStatusCatalog = useStatusCatalog("SCHOOL_TERM");

  const [schoolInput, setSchoolInput] = useState("");
  const [termInput, setTermInput] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<DataTableSortState | undefined>({
    key: "grade",
    direction: "asc",
  });

  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [termDialogTerm, setTermDialogTerm] = useState<SchoolTerm | null>(null);
  const [classroomDialogOpen, setClassroomDialogOpen] = useState(false);
  // Room the homeroom dialog is assigning for; null = dialog closed.
  const [assigningClassroom, setAssigningClassroom] =
    useState<SchoolClassroom | null>(null);
  const [gradeLevelId, setGradeLevelId] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomName, setRoomName] = useState("");
  // Room the classroom dialog is editing; null = creating a new room.
  const [editingClassroom, setEditingClassroom] =
    useState<SchoolClassroom | null>(null);
  const [teacherMembershipId, setTeacherMembershipId] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const schoolsQuery = useScopedSchools();
  const schools = useMemo(() => schoolsQuery.data ?? [], [schoolsQuery.data]);
  // Same rule as /classrooms: one school is implied, several must be chosen.
  const schoolId = schools.length === 1 ? String(schools[0].id) : schoolInput;
  const selectedSchoolId = Number(schoolId) || null;
  const multipleSchools = schools.length > 1;

  const termsQuery = useQuery({
    queryKey: ["school-structure", "terms", selectedSchoolId],
    queryFn: () => attendanceService.getTerms(selectedSchoolId!),
    enabled: selectedSchoolId !== null,
  });
  const terms = useMemo(() => termsQuery.data ?? [], [termsQuery.data]);
  const selectedTermId = Number(termInput || terms[0]?.id || 0) || undefined;
  const selectedTerm =
    terms.find((term) => Number(term.id) === selectedTermId) ?? null;

  const gradeLevelsQuery = useQuery({
    queryKey: ["school-structure", "grade-levels"],
    queryFn: attendanceLookupService.getGradeLevels,
  });

  const classroomsQuery = useSchoolClassrooms(
    selectedSchoolId
      ? {
          schoolId: selectedSchoolId,
          termId: selectedTermId,
          gradeLevelId: Number(gradeFilter) || undefined,
          search: search || undefined,
          page,
          limit: rowsPerPage,
          sortBy: sort?.key as
            | "room"
            | "grade"
            | "students"
            | "homeroomTeacher"
            | undefined,
          sortDirection: sort?.direction,
        }
      : null,
  );
  const classrooms = useMemo(
    () => classroomsQuery.data?.data ?? [],
    [classroomsQuery.data?.data],
  );

  const teacherOptionsQuery = useSchoolTeacherOptions(
    selectedSchoolId ?? undefined,
  );
  const teacherOptions = useMemo(
    () => teacherOptionsQuery.data ?? [],
    [teacherOptionsQuery.data],
  );

  const createClassroom = useCreateSchoolClassroom();
  const updateClassroom = useUpdateSchoolClassroom();
  const deleteClassroom = useDeleteSchoolClassroom();
  const createAssignment = useCreateHomeroomAssignment();
  const saveTerm = useMutation({
    mutationFn: (values: SchoolTermFormValues) =>
      attendanceService.upsertTerm({ ...values, schoolId: selectedSchoolId! }),
    onSuccess: async (term) => {
      await queryClient.invalidateQueries({
        queryKey: ["school-structure", "terms", selectedSchoolId],
      });
      setTermInput(term.id);
      setTermDialogOpen(false);
      setTermDialogTerm(null);
    },
  });

  function openTermDialog(term: SchoolTerm | null): void {
    saveTerm.reset();
    setTermDialogTerm(term);
    setTermDialogOpen(true);
  }

  function handleSchoolChange(value: string): void {
    setSchoolInput(value);
    setTermInput("");
    setGradeFilter("");
    setPage(1);
  }

  function openClassroomDialog(room: SchoolClassroom | null): void {
    setEditingClassroom(room);
    setGradeLevelId(room ? String(room.gradeLevelId) : "");
    setRoomCode(room ? room.roomCode : "");
    setRoomName(room?.roomName ?? "");
    createClassroom.reset();
    updateClassroom.reset();
    setClassroomDialogOpen(true);
  }

  function openAssignmentDialog(room: SchoolClassroom): void {
    setAssigningClassroom(room);
    setTeacherMembershipId("");
    createAssignment.reset();
  }

  async function submitClassroom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gradeLevelId || !roomCode.trim()) return;
    if (editingClassroom) {
      await updateClassroom.mutateAsync({
        classroomId: editingClassroom.id,
        gradeLevelId: Number(gradeLevelId),
        roomCode: roomCode.trim(),
        roomName: roomName.trim() || "",
      });
    } else {
      if (!selectedTermId) return;
      await createClassroom.mutateAsync({
        schoolTermId: selectedTermId,
        gradeLevelId: Number(gradeLevelId),
        roomCode: roomCode.trim(),
        roomName: roomName.trim() || undefined,
      });
    }
    setRoomCode("");
    setRoomName("");
    setEditingClassroom(null);
    setClassroomDialogOpen(false);
  }

  async function submitAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assigningClassroom || !teacherMembershipId) return;
    await createAssignment.mutateAsync({
      classroomId: Number(assigningClassroom.id),
      teacherMembershipId: Number(teacherMembershipId),
    });
    setTeacherMembershipId("");
    setAssigningClassroom(null);
  }

  async function handleDeleteClassroom(room: SchoolClassroom): Promise<void> {
    const accepted = await confirm({
      title: "ลบห้องนี้?",
      description: `${room.gradeLabel} ${room.roomName || formatRoomLabel(room.roomCode)}`,
      confirmText: "ลบ",
      variant: "destructive",
    });
    if (accepted) deleteClassroom.mutate(room.id);
  }

  function renderRoomActions(room: SchoolClassroom) {
    const roomLabel = `${room.gradeLabel} ${room.roomName || formatRoomLabel(room.roomCode)}`;
    return (
      <div className="flex items-center justify-center gap-1">
        <Button
          aria-label={`${room.homeroomTeacherName ? "เปลี่ยนครูประจำชั้น" : "กำหนดครูประจำชั้น"} ${roomLabel}`}
          disabled={teacherOptions.length === 0}
          icon={UserPlus}
          onClick={() => openAssignmentDialog(room)}
          title={
            teacherOptions.length === 0 ? "ยังไม่มีครูในโรงเรียนนี้" : undefined
          }
          variant="outline"
        >
          {room.homeroomTeacherName ? "เปลี่ยนครู" : "กำหนดครู"}
        </Button>
        <IconButton
          aria-label={`แก้ไขห้อง ${roomLabel}`}
          icon={SquarePen}
          onClick={() => openClassroomDialog(room)}
          variant="edit"
        />
        <IconButton
          aria-label={`ลบห้อง ${roomLabel}`}
          disabled={room.studentCount > 0 || deleteClassroom.isPending}
          icon={Trash2}
          onClick={() => void handleDeleteClassroom(room)}
          title={
            room.studentCount > 0 ? "ห้องที่มีนักเรียนอยู่ลบไม่ได้" : undefined
          }
          variant="delete"
        />
      </div>
    );
  }

  const isLoadingPage =
    schoolsQuery.isLoading ||
    (selectedSchoolId !== null && termsQuery.isLoading);

  return (
    <PageShell>
      <PageToolbar
        actions={
          <>
            <Button
              disabled={!selectedSchoolId}
              icon={Plus}
              onClick={() => openTermDialog(null)}
              variant="outline"
            >
              เพิ่มภาคเรียน
            </Button>
            <Button
              disabled={!selectedTerm}
              icon={SquarePen}
              onClick={() => openTermDialog(selectedTerm)}
              title={
                !selectedTerm ? "เลือกภาคเรียนก่อนจึงจะแก้ไขได้" : undefined
              }
              variant="outline"
            >
              แก้ภาคเรียน
            </Button>
            <Button
              disabled={!selectedTermId}
              icon={Plus}
              onClick={() => openClassroomDialog(null)}
              title={
                !selectedTermId
                  ? "เพิ่มภาคเรียนก่อนจึงจะเพิ่มห้องได้"
                  : undefined
              }
            >
              เพิ่มห้องเรียน
            </Button>
          </>
        }
        description="ตั้งภาคเรียน เพิ่มหรือแก้ไขห้อง และกำหนดครูประจำชั้นของโรงเรียนที่คุณดูแล"
        title="จัดการภาคเรียนและห้องเรียน"
      />

      <ToolbarControls className="mb-8">
        <SearchInput
          className="sm:max-w-[560px]"
          onChange={setSearchInput}
          placeholder="ค้นหาห้อง"
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
        <FilterSelect
          ariaLabel="เลือกภาคเรียน"
          className="sm:w-[220px]"
          disabled={!selectedSchoolId || terms.length === 0}
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
        <FilterSelect
          ariaLabel="กรองตามระดับชั้น"
          disabled={!selectedSchoolId}
          onChange={(value) => {
            setGradeFilter(value);
            setPage(1);
          }}
          value={gradeFilter}
        >
          <option value="">ทุกชั้น</option>
          {(gradeLevelsQuery.data ?? []).map((grade) => (
            <option key={grade.id} value={String(grade.id)}>
              {grade.label}
            </option>
          ))}
        </FilterSelect>
      </ToolbarControls>

      <FormErrorAlert
        error={deleteClassroom.error}
        fallback="ไม่สามารถลบห้องได้"
      />

      {schoolsQuery.isError ? (
        <ErrorState
          description="ไม่สามารถโหลดโรงเรียนในขอบเขตของคุณได้"
          onRetry={() => void schoolsQuery.refetch()}
          title="โหลดข้อมูลโรงเรียนไม่สำเร็จ"
        />
      ) : isLoadingPage ? (
        <SkeletonTable />
      ) : schools.length === 0 ? (
        <EmptyState
          description="ติดต่อผู้ดูแลเพื่อเพิ่มโรงเรียนที่บัญชีนี้รับผิดชอบ"
          icon={School}
          title="ยังไม่มีโรงเรียนที่บัญชีนี้ดูแล"
        />
      ) : !selectedSchoolId ? (
        <EmptyState
          description="เลือกโรงเรียนจากตัวกรองด้านบนเพื่อจัดการภาคเรียนและห้องเรียน"
          icon={School}
          title="เลือกโรงเรียน"
        />
      ) : classroomsQuery.isError ? (
        <ErrorState
          description="ไม่สามารถโหลดรายการห้องเรียนได้"
          onRetry={() => void classroomsQuery.refetch()}
          title="โหลดห้องเรียนไม่สำเร็จ"
        />
      ) : classroomsQuery.isLoading ? (
        <SkeletonTable />
      ) : classrooms.length === 0 ? (
        <EmptyState
          description={
            search
              ? "ลองเปลี่ยนคำค้นหา หรือเคลียร์ช่องค้นหาเพื่อดูห้องทั้งหมด"
              : selectedTermId
                ? "เพิ่มห้องจากระดับชั้นและรหัสห้องเพื่อเริ่มจัดโครงสร้างภาคเรียนนี้"
                : "เพิ่มภาคเรียนก่อน แล้วจึงเพิ่มห้องเรียนของภาคเรียนนั้น"
          }
          icon={DoorOpen}
          title={search ? "ไม่พบห้องที่ค้นหา" : "ยังไม่มีห้องในภาคเรียนนี้"}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <DataTable
            columnWidths={[
              "w-[12%]",
              "w-[16%]",
              "w-[10%]",
              "w-[24%]",
              "w-[12%]",
              "w-[26%]",
            ]}
            headings={[
              { label: "ชั้น", sortKey: "grade" },
              { label: "ห้อง", sortKey: "room" },
              { label: "นักเรียน", sortKey: "students" },
              { label: "ครูประจำชั้น", sortKey: "homeroomTeacher" },
              "สถานะ",
              { label: "เครื่องมือ", className: "text-center" },
            ]}
            minWidthClassName="min-w-[900px]"
            onSortChange={(next) => {
              setSort(next);
              setPage(1);
            }}
            sort={sort}
          >
            {classrooms.map((room) => (
              <DataTableRow key={room.id}>
                <DataTableCell className="text-slate-900">
                  {room.gradeLabel}
                </DataTableCell>
                <DataTableCell>
                  {room.roomName || formatRoomLabel(room.roomCode)}
                </DataTableCell>
                <DataTableCell className="tabular-nums">
                  {room.studentCount}
                </DataTableCell>
                <DataTableCell>
                  {room.homeroomTeacherName ?? (
                    <span className="text-slate-500">ยังไม่กำหนด</span>
                  )}
                </DataTableCell>
                <DataTableCell>
                  <Badge
                    variant={
                      room.classroomStatus === "ACTIVE"
                        ? "success"
                        : "secondary"
                    }
                  >
                    {room.classroomStatus === "ACTIVE" ? "ใช้งาน" : "ปิดใช้งาน"}
                  </Badge>
                </DataTableCell>
                <DataTableCell>{renderRoomActions(room)}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTable>

          <TableCardList>
            {classrooms.map((room) => (
              <TableCard key={room.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-slate-800">
                      {room.gradeLabel}{" "}
                      {room.roomName || formatRoomLabel(room.roomCode)}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      นักเรียน {room.studentCount} คน
                    </div>
                  </div>
                  <Badge
                    variant={
                      room.classroomStatus === "ACTIVE"
                        ? "success"
                        : "secondary"
                    }
                  >
                    {room.classroomStatus === "ACTIVE" ? "ใช้งาน" : "ปิดใช้งาน"}
                  </Badge>
                </div>
                <div className="mt-3 flex justify-between gap-3 rounded-md bg-slate-50 p-3 text-sm">
                  <span className="text-slate-500">ครูประจำชั้น</span>
                  <span className="truncate text-slate-700">
                    {room.homeroomTeacherName ?? "ยังไม่กำหนด"}
                  </span>
                </div>
                <div className="mt-3">{renderRoomActions(room)}</div>
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
            totalCount={classroomsQuery.data?.meta.totalCount ?? 0}
            unitLabel="ห้อง"
          />
        </div>
      )}

      <SchoolTermDialog
        error={saveTerm.error}
        isPending={saveTerm.isPending}
        onClose={() => {
          setTermDialogOpen(false);
          setTermDialogTerm(null);
        }}
        onSubmit={(values) =>
          saveTerm.mutateAsync(values).then(() => undefined)
        }
        open={termDialogOpen}
        term={termDialogTerm}
      />

      {confirmDialog}

      <Dialog onOpenChange={setClassroomDialogOpen} open={classroomDialogOpen}>
        <DialogContent onClose={() => setClassroomDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>
              {editingClassroom ? "แก้ไขห้องเรียน" : "เพิ่มห้องเรียน"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(event) => void submitClassroom(event)}>
            <DialogBody className="space-y-4">
              <FormErrorAlert
                error={createClassroom.error ?? updateClassroom.error}
                fallback={
                  editingClassroom
                    ? "ไม่สามารถแก้ไขห้องได้"
                    : "ไม่สามารถเพิ่มห้องได้"
                }
              />
              <div>
                <FormLabel htmlFor="classroom-grade" required>
                  ระดับชั้น
                </FormLabel>
                <Select
                  disabled={Boolean(
                    editingClassroom && editingClassroom.studentCount > 0,
                  )}
                  id="classroom-grade"
                  onChange={(event) => setGradeLevelId(event.target.value)}
                  required
                  value={gradeLevelId}
                >
                  <option value="">เลือกระดับชั้น</option>
                  {gradeLevelsQuery.data?.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.label}
                    </option>
                  ))}
                </Select>
                {editingClassroom && editingClassroom.studentCount > 0 ? (
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    ห้องนี้มีนักเรียนแล้ว จึงเปลี่ยนระดับชั้นไม่ได้
                  </p>
                ) : null}
              </div>
              <div>
                <FormLabel htmlFor="classroom-code" required>
                  รหัสห้อง
                </FormLabel>
                <NumericInput
                  id="classroom-code"
                  maxLength={10}
                  onChange={(event) => setRoomCode(event.target.value)}
                  pattern="[1-9][0-9]*"
                  placeholder="เช่น 1"
                  required
                  value={roomCode}
                />
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  กรอกเลขห้องในระดับชั้น เช่น ชั้น ป.1 ห้อง 1 ให้กรอก 1
                </p>
              </div>
              <div>
                <Label htmlFor="classroom-name">ชื่อห้อง (ถ้ามี)</Label>
                <Input
                  id="classroom-name"
                  maxLength={120}
                  onChange={(event) => setRoomName(event.target.value)}
                  placeholder="เช่น ห้องวิทยาศาสตร์"
                  value={roomName}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                onClick={() => setClassroomDialogOpen(false)}
                type="button"
                variant="outline"
              >
                ยกเลิก
              </Button>
              <Button
                isLoading={
                  createClassroom.isPending || updateClassroom.isPending
                }
                loadingText="กำลังบันทึก"
                type="submit"
              >
                บันทึกห้อง
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setAssigningClassroom(null);
        }}
        open={Boolean(assigningClassroom)}
      >
        <DialogContent onClose={() => setAssigningClassroom(null)}>
          <DialogHeader>
            <DialogTitle>
              {assigningClassroom?.homeroomTeacherName
                ? "เปลี่ยนครูประจำชั้น"
                : "กำหนดครูประจำชั้น"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(event) => void submitAssignment(event)}>
            <DialogBody className="space-y-4">
              <FormErrorAlert
                error={createAssignment.error}
                fallback="ไม่สามารถกำหนดครูประจำชั้นได้"
              />
              <p className="text-sm text-slate-600">
                {assigningClassroom
                  ? `${assigningClassroom.gradeLabel} / ${
                      assigningClassroom.roomName ||
                      formatRoomLabel(assigningClassroom.roomCode)
                    }`
                  : ""}
                {assigningClassroom?.homeroomTeacherName
                  ? ` · ปัจจุบัน ${assigningClassroom.homeroomTeacherName}`
                  : ""}
              </p>
              <div>
                <FormLabel htmlFor="homeroom-teacher" required>
                  ครูประจำชั้น
                </FormLabel>
                <Combobox
                  ariaLabel="ครูประจำชั้น"
                  emptyText="ไม่พบครู"
                  id="homeroom-teacher"
                  onChange={setTeacherMembershipId}
                  options={teacherOptions.map((teacher) => ({
                    value: String(teacher.id),
                    label: teacher.displayName,
                  }))}
                  placeholder="ค้นหาชื่อครู"
                  value={teacherMembershipId}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                onClick={() => setAssigningClassroom(null)}
                type="button"
                variant="outline"
              >
                ยกเลิก
              </Button>
              <Button
                isLoading={createAssignment.isPending}
                loadingText="กำลังบันทึก"
                type="submit"
              >
                บันทึกการมอบหมาย
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
