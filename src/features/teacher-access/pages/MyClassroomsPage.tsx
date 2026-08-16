import { useMemo, useState } from "react";
import {
  EmptyState,
  SearchInput,
} from "../../../components/layout/page-primitives";
import { PAGE_ICONS } from "../../../components/layout/page-identity";
import { ClassroomCard } from "../../school-structure/components/ClassroomCard";
import { ClassroomCardDialog } from "../../school-structure/components/ClassroomCardDialog";
import type {
  ClassroomCardCoverColor,
  SchoolClassroom,
} from "../../school-structure/types/school-structure.types";
import { useBlobObjectUrl } from "../../../hooks/useBlobObjectUrl";
import { TeacherLinkShell } from "../components/TeacherLinkShell";
import { useTeacherLink } from "../hooks/useTeacherLink";
import {
  useTeacherClassroomCover,
  useUpdateTeacherClassroomCover,
} from "../hooks/useTeacherAccess";
import {
  assignmentClassLabel,
  assignmentSubjectLabel,
} from "../lib/teacher-link-presentation";
import type { TeacherAccessAssignment } from "../types/teacher-access.types";

const CLASSROOM_ICON = PAGE_ICONS["school-building"];

/**
 * Shapes an assignment into the classroom the shared card renders. A link has
 * no user account behind it, so the personalised fields stay empty and the card
 * hides their controls.
 */
function toCardClassroom(
  assignment: TeacherAccessAssignment,
  context: {
    schoolId: number;
    schoolTermId: string;
    academicYear: number;
    semester: number;
  },
  coverImageUrl: string | null,
): SchoolClassroom {
  return {
    id: assignment.classroomId,
    schoolTermId: context.schoolTermId,
    schoolId: context.schoolId,
    academicYear: context.academicYear,
    semester: context.semester,
    gradeLevelId: assignment.gradeLevelId,
    gradeLabel: assignment.gradeLabel,
    legacyRoomNumber: null,
    roomCode: assignment.roomCode,
    roomName: assignment.roomName,
    classroomStatus: "ACTIVE",
    cardCoverColor: assignment.cardCoverColor as ClassroomCardCoverColor,
    coverImageUrl,
    coverImagePositionX: assignment.coverImagePositionX,
    coverImagePositionY: assignment.coverImagePositionY,
    coverImageScale: assignment.coverImageScale,
    isFavorite: false,
    homeroomTeacherName: null,
    studentCount: 0,
  };
}

/**
 * Landing page of a teacher link — the same classroom cards as ห้องเรียนทั้งหมด,
 * narrowed to the classes this teacher teaches and labelled by subject instead
 * of by homeroom teacher.
 */
function TeacherClassroomCard({
  assignment,
  context,
  onCustomize,
}: {
  assignment: TeacherAccessAssignment;
  context: {
    schoolId: number;
    schoolTermId: string;
    academicYear: number;
    semester: number;
  };
  onCustomize: (classroom: SchoolClassroom) => void;
}) {
  const updateCover = useUpdateTeacherClassroomCover();
  const coverQuery = useTeacherClassroomCover(
    Number(assignment.id),
    assignment.classroomId,
    assignment.hasCoverImage,
  );
  const coverImageUrl = useBlobObjectUrl(
    assignment.hasCoverImage ? coverQuery.data : undefined,
  );
  const classroom = toCardClassroom(assignment, context, coverImageUrl);

  return (
    <ClassroomCard
      classroom={classroom}
      colorPending={updateCover.isPending}
      favoritePending={false}
      onColorChange={(_classroom, cardCoverColor) =>
        updateCover.mutate({
          assignmentId: Number(assignment.id),
          cardCoverColor,
        })
      }
      onCustomize={onCustomize}
      onFavoriteChange={() => undefined}
      showFavorite={false}
      subtitle={assignmentSubjectLabel(assignment)}
      to={`/teacher-access/classes/${assignment.id}/roster`}
    />
  );
}

export function MyClassroomsPage() {
  const { context } = useTeacherLink();
  const [search, setSearch] = useState("");
  const [customizing, setCustomizing] = useState<{
    assignment: TeacherAccessAssignment;
    classroom: SchoolClassroom;
  } | null>(null);
  const savePresentation = useUpdateTeacherClassroomCover();

  const assignments = useMemo(() => {
    // Homeroom is taught as a subject now. Where the room already has that
    // subject card, the legacy HOMEROOM card would be a second card for the same
    // class — hide it here only, so links opened on it keep working.
    const roomsWithHomeroomSubject = new Set(
      context.assignments
        .filter(
          (assignment) =>
            assignment.assignmentKind === "SUBJECT" &&
            assignment.subjectName === "โฮมรูม",
        )
        .map((assignment) => assignment.classroomId),
    );
    const visible = context.assignments.filter(
      (assignment) =>
        assignment.assignmentKind !== "HOMEROOM" ||
        !roomsWithHomeroomSubject.has(assignment.classroomId),
    );
    const term = search.trim().toLowerCase();
    if (!term) return visible;
    return visible.filter((assignment) =>
      `${assignmentClassLabel(assignment)} ${assignmentSubjectLabel(assignment)}`
        .toLowerCase()
        .includes(term),
    );
  }, [context.assignments, search]);

  return (
    <TeacherLinkShell
      icon={CLASSROOM_ICON}
      subtitle={`ปีการศึกษา ${context.academicYear} ภาคเรียนที่ ${context.semester} · ${context.schoolName}`}
      title="ห้องเรียนของฉัน"
    >
      <SearchInput
        className="mb-8 sm:max-w-[560px]"
        onChange={setSearch}
        placeholder="ค้นหา"
        value={search}
      />

      {assignments.length === 0 ? (
        <EmptyState
          description={
            search
              ? "ลองเปลี่ยนคำค้นหาหรือล้างช่องค้นหา"
              : "ลิงก์นี้ยังไม่มีห้องหรือรายวิชาที่เปิดใช้งานในภาคเรียนนี้"
          }
          icon={CLASSROOM_ICON}
          title={search ? "ไม่พบห้องเรียนที่ค้นหา" : "ยังไม่มีห้องเรียน"}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {assignments.map((assignment) => (
            <TeacherClassroomCard
              assignment={assignment}
              context={context}
              key={assignment.id}
              onCustomize={(classroom) =>
                setCustomizing({ assignment, classroom })
              }
            />
          ))}
        </div>
      )}

      {customizing ? (
        <ClassroomCardDialog
          classroom={customizing.classroom}
          isSaving={savePresentation.isPending}
          key={customizing.assignment.id}
          onOpenChange={(open) => {
            if (!open) setCustomizing(null);
          }}
          open
          saveError={savePresentation.error}
          savePresentation={async (input) => {
            await savePresentation.mutateAsync({
              assignmentId: Number(customizing.assignment.id),
              cardCoverColor: input.cardCoverColor,
              coverImagePositionX: input.coverImagePositionX,
              coverImagePositionY: input.coverImagePositionY,
              coverImageScale: input.coverImageScale,
              file: input.file,
              removeCover: input.removeCover,
            });
          }}
        />
      ) : null}
    </TeacherLinkShell>
  );
}
