import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import {
  Button,
  Card,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  IconButton,
  Input,
  MultiSelect,
  registerField,
} from "../../../components/base";
import { NavButton } from "../../../components/layout/nav-button";
import {
  ErrorState,
  FormActions,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { formatRoomLabel } from "../../../lib/room-presentation";
import {
  useSchoolClassroomOptions,
  useSchoolTeacherOptions,
} from "../../school-structure/hooks/useSchoolStructure";
import { PdfDropzone } from "../components/PdfDropzone";
import {
  useCurriculumSubject,
  useSaveCurriculumSubject,
} from "../hooks/useCurriculum";
import {
  createTeacherAssignmentDraft,
  curriculumSubjectFormSchema,
  EMPTY_CURRICULUM_SUBJECT_FORM,
  type CurriculumSubjectFormValues,
  type TeacherAssignmentDraft,
} from "../schemas/curriculum.schema";
import type { CurriculumSubject } from "../types/curriculum.types";

const CURRICULUM_PATH = "/curriculum";

function toDrafts(subject: CurriculumSubject | null): TeacherAssignmentDraft[] {
  if (!subject || subject.teachers.length === 0) {
    return [createTeacherAssignmentDraft(0)];
  }
  return subject.teachers.map((block, index) => ({
    key: `teacher-block-${index}`,
    teacherMembershipIds: block.teachers.map(
      (teacher) => teacher.teacherMembershipId,
    ),
    classroomIds: block.classrooms.map((classroom) => classroom.id),
  }));
}

function SubjectForm({
  subject,
  schoolId,
  termId,
  gradeLevelId,
}: {
  subject: CurriculumSubject | null;
  schoolId: number;
  termId: number;
  gradeLevelId: number;
}) {
  const navigate = useNavigate();
  const saveSubject = useSaveCurriculumSubject();

  const [drafts, setDrafts] = useState<TeacherAssignmentDraft[]>(() =>
    toDrafts(subject),
  );
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [contentRemoved, setContentRemoved] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  const form = useForm<CurriculumSubjectFormValues>({
    defaultValues: subject
      ? { subjectCode: subject.subjectCode, subjectName: subject.subjectName }
      : EMPTY_CURRICULUM_SUBJECT_FORM,
    resolver: zodResolver(curriculumSubjectFormSchema),
  });

  const teacherOptionsQuery = useSchoolTeacherOptions(schoolId);
  const classroomOptionsQuery = useSchoolClassroomOptions({
    schoolId,
    termId,
    gradeLevelId,
  });

  const teacherOptions = useMemo(
    () =>
      (teacherOptionsQuery.data ?? []).map((teacher) => ({
        value: teacher.id,
        label: teacher.displayName,
      })),
    [teacherOptionsQuery.data],
  );
  const classroomOptions = useMemo(
    () =>
      (classroomOptionsQuery.data ?? []).map((classroom) => ({
        value: classroom.id,
        label: `${classroom.gradeLabel}/${formatRoomLabel(classroom.roomCode).replace(/^ห้อง\s*/, "")}`,
      })),
    [classroomOptionsQuery.data],
  );

  const backPath = `${CURRICULUM_PATH}/${gradeLevelId}?schoolId=${schoolId}`;

  function updateDraft(
    key: string,
    patch: Partial<TeacherAssignmentDraft>,
  ): void {
    setDrafts((current) =>
      current.map((draft) =>
        draft.key === key ? { ...draft, ...patch } : draft,
      ),
    );
  }

  function handleSubmit(values: CurriculumSubjectFormValues): void {
    const filled = drafts.filter(
      (draft) =>
        draft.teacherMembershipIds.length > 0 && draft.classroomIds.length > 0,
    );
    const partiallyFilled = drafts.some(
      (draft) =>
        (draft.teacherMembershipIds.length > 0 &&
          draft.classroomIds.length === 0) ||
        (draft.teacherMembershipIds.length === 0 &&
          draft.classroomIds.length > 0),
    );
    if (partiallyFilled) {
      setBlockError("แต่ละบล็อกต้องเลือกทั้งครูผู้สอนและห้องเรียนที่รับผิดชอบ");
      return;
    }
    setBlockError(null);

    saveSubject.mutate(
      {
        id: subject?.id ?? null,
        payload: {
          schoolId,
          termId,
          gradeLevelId,
          subjectCode: values.subjectCode.trim(),
          subjectName: values.subjectName.trim(),
          teachers: filled.map((draft) => ({
            teacherMembershipIds: draft.teacherMembershipIds.map(Number),
            classroomIds: draft.classroomIds.map(Number),
          })),
        },
        content: contentFile ?? undefined,
        removeContent: contentRemoved && !contentFile,
      },
      { onSuccess: () => void navigate(backPath) },
    );
  }

  return (
    <Form form={form} onSubmit={handleSubmit}>
      <Card className="p-6">
        <div className="mb-6 flex items-center gap-2">
          <BookOpen className="size-5 text-slate-700" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-800">ข้อมูลรายวิชา</h2>
        </div>
        <FormErrorAlert
          className="mb-4"
          error={saveSubject.error}
          fallback="บันทึกรายวิชาไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
        />
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <FormItem>
            <FormLabel htmlFor="subjectCode" required>
              รหัสวิชา
            </FormLabel>
            <Input
              id="subjectCode"
              placeholder="ระบุรหัสวิชา"
              {...registerField(form, "subjectCode")}
            />
            <FormMessage<CurriculumSubjectFormValues> name="subjectCode" />
          </FormItem>
          <FormItem>
            <FormLabel htmlFor="subjectName" required>
              ชื่อวิชา
            </FormLabel>
            <Input
              id="subjectName"
              placeholder="ระบุชื่อวิชา"
              {...registerField(form, "subjectName")}
            />
            <FormMessage<CurriculumSubjectFormValues> name="subjectName" />
          </FormItem>
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserRound className="size-5 text-slate-700" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-800">
              จัดสรรครูผู้สอน
            </h2>
          </div>
          <Button
            icon={Plus}
            onClick={() =>
              setDrafts((current) => [
                ...current,
                createTeacherAssignmentDraft(current.length + Date.now()),
              ])
            }
            type="button"
          >
            เพิ่มครูผู้สอน
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          {drafts.map((draft) => (
            <div className="flex items-start gap-3" key={draft.key}>
              <div className="flex-1 space-y-4 rounded-xl bg-slate-50 p-4">
                <div>
                  <FormLabel htmlFor={`teacher-${draft.key}`}>
                    ครูผู้สอน
                  </FormLabel>
                  <MultiSelect
                    ariaLabel="ครูผู้สอน"
                    emptyText="ไม่พบครูในโรงเรียนนี้"
                    id={`teacher-${draft.key}`}
                    onChange={(value) =>
                      updateDraft(draft.key, { teacherMembershipIds: value })
                    }
                    options={teacherOptions}
                    placeholder="ครูผู้สอน"
                    value={draft.teacherMembershipIds}
                  />
                </div>
                <div>
                  <FormLabel htmlFor={`classrooms-${draft.key}`}>
                    ห้องเรียนที่รับผิดชอบ
                  </FormLabel>
                  <MultiSelect
                    ariaLabel="ห้องเรียนที่รับผิดชอบ"
                    emptyText="ไม่พบห้องเรียนในระดับชั้นนี้"
                    id={`classrooms-${draft.key}`}
                    onChange={(value) =>
                      updateDraft(draft.key, { classroomIds: value })
                    }
                    options={classroomOptions}
                    placeholder="ห้องเรียน"
                    value={draft.classroomIds}
                  />
                </div>
              </div>
              <IconButton
                aria-label="ลบบล็อกครูผู้สอนนี้"
                className="mt-4"
                disabled={drafts.length === 1}
                icon={Trash2}
                onClick={() =>
                  setDrafts((current) =>
                    current.filter((item) => item.key !== draft.key),
                  )
                }
                variant="delete"
              />
            </div>
          ))}
        </div>

        {blockError ? (
          <p className="mt-4 text-sm font-medium text-danger">{blockError}</p>
        ) : null}
      </Card>

      <Card className="mt-6 p-6">
        <div className="mb-6 flex items-center gap-2">
          <Upload className="size-5 text-slate-700" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-800">
            อัปโหลดไฟล์สาระการเรียนรู้
          </h2>
        </div>
        <PdfDropzone
          disabled={saveSubject.isPending}
          file={contentFile}
          onFileChange={setContentFile}
          onRemoveStored={() => setContentRemoved(true)}
          storedFileName={subject?.contentFileName}
          storedFileSizeBytes={subject?.contentFileSizeBytes}
          storedRemoved={contentRemoved}
        />
      </Card>

      <FormActions>
        <Button
          onClick={() => void navigate(backPath)}
          size="lg"
          type="button"
          variant="outline"
        >
          ยกเลิก
        </Button>
        <Button
          isLoading={saveSubject.isPending}
          loadingText="กำลังบันทึก"
          size="lg"
          type="submit"
        >
          บันทึก
        </Button>
      </FormActions>
    </Form>
  );
}

export function CurriculumSubjectFormPage() {
  const { gradeLevelId, subjectId } = useParams<{
    gradeLevelId: string;
    subjectId: string;
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const schoolId = Number(searchParams.get("schoolId")) || null;
  const gradeId = Number(gradeLevelId) || null;
  const isEdit = Boolean(subjectId);
  const {
    data: subject = null,
    isLoading,
    isError,
  } = useCurriculumSubject(subjectId ?? null);

  // On create the term rides in the query string; on edit it belongs to the row.
  const termId = isEdit
    ? Number(subject?.schoolTermId) || null
    : Number(searchParams.get("termId")) || null;
  const backPath = `${CURRICULUM_PATH}/${gradeId}?schoolId=${schoolId}`;

  return (
    <PageShell>
      <PageToolbar
        actions={
          <NavButton icon={ArrowLeft} to={backPath} variant="outline">
            ย้อนกลับ
          </NavButton>
        }
        description="กรอกข้อมูลรายวิชา จัดสรรครูผู้สอน และแนบไฟล์สาระการเรียนรู้"
        parentBreadcrumb={{
          label: "จัดการข้อมูลหลักสูตร",
          to: CURRICULUM_PATH,
        }}
        title={isEdit ? "แก้ไขข้อมูลรายวิชา" : "เพิ่มข้อมูลรายวิชา"}
      />

      {isEdit && isLoading ? (
        <Card className="p-6">
          <SkeletonStack lines={6} />
        </Card>
      ) : isEdit && (isError || !subject) ? (
        <ErrorState
          description="ไม่พบรายวิชาที่ต้องการแก้ไข"
          onRetry={() => void navigate(backPath)}
          retryLabel="กลับไปหน้าหลักสูตร"
          title="ไม่พบรายวิชา"
        />
      ) : !schoolId || !gradeId || !termId ? (
        <ErrorState
          description="กรุณากลับไปเลือกโรงเรียน ระดับชั้น และภาคเรียนจากหน้าหลักสูตร"
          onRetry={() => void navigate(CURRICULUM_PATH)}
          retryLabel="กลับไปหน้าหลักสูตร"
          title="ข้อมูลบริบทไม่ครบ"
        />
      ) : (
        <SubjectForm
          gradeLevelId={gradeId}
          schoolId={schoolId}
          subject={subject}
          termId={termId}
        />
      )}
    </PageShell>
  );
}
