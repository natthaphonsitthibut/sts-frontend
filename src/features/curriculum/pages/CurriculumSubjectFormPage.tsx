import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BookOpen, School } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Button,
  Card,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
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
import { formatClassLabel } from "../../../lib/room-presentation";
import { useSchoolClassroomOptions } from "../../school-structure/hooks/useSchoolStructure";
import {
  useCurriculumSubject,
  useSaveCurriculumSubject,
} from "../hooks/useCurriculum";
import {
  curriculumSubjectFormSchema,
  EMPTY_CURRICULUM_SUBJECT_FORM,
  type CurriculumSubjectFormValues,
} from "../schemas/curriculum.schema";
import type { CurriculumSubjectQuery } from "../types/curriculum.types";

const CURRICULUM_PATH = "/curriculum";

export function CurriculumSubjectFormPage() {
  const { gradeLevelId, subjectId } = useParams<{
    gradeLevelId: string;
    subjectId: string;
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const schoolId = Number(searchParams.get("schoolId")) || null;
  const termId = Number(searchParams.get("termId")) || null;
  const gradeId = Number(gradeLevelId) || null;
  const targetSubjectId = Number(subjectId) || null;
  const isEdit = Boolean(targetSubjectId);
  const query = useMemo<CurriculumSubjectQuery | null>(
    () =>
      schoolId && termId && gradeId
        ? { schoolId, termId, gradeLevelId: gradeId, page: 1, limit: 1 }
        : null,
    [gradeId, schoolId, termId],
  );
  const subjectQuery = useCurriculumSubject(targetSubjectId, query);
  const classroomQuery = useSchoolClassroomOptions(
    schoolId && termId && gradeId
      ? { schoolId, termId, gradeLevelId: gradeId }
      : null,
  );
  const saveSubject = useSaveCurriculumSubject();
  const [classroomDraft, setClassroomDraft] = useState<{
    subjectId: number | null;
    ids: string[];
  } | null>(null);
  const [classroomError, setClassroomError] = useState<string | null>(null);
  const backPath = `${CURRICULUM_PATH}/${gradeId}?schoolId=${schoolId}`;
  const form = useForm<CurriculumSubjectFormValues>({
    defaultValues: EMPTY_CURRICULUM_SUBJECT_FORM,
    resolver: zodResolver(curriculumSubjectFormSchema),
  });

  useEffect(() => {
    const subject = subjectQuery.data;
    if (!subject) return;
    form.reset({
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
    });
  }, [form, subjectQuery.data]);

  const classroomIds =
    classroomDraft?.subjectId === targetSubjectId
      ? classroomDraft.ids
      : (subjectQuery.data?.classrooms ?? []).map((classroom) =>
          String(classroom.id),
        );

  const classroomOptions = useMemo(
    () =>
      (classroomQuery.data ?? []).map((classroom) => ({
        value: classroom.id,
        label: formatClassLabel(classroom.gradeLabel, classroom.roomCode),
      })),
    [classroomQuery.data],
  );

  function handleSubmit(values: CurriculumSubjectFormValues): void {
    if (!schoolId || !termId || !gradeId) return;
    if (classroomIds.length === 0) {
      setClassroomError("กรุณาเลือกห้องเรียนอย่างน้อย 1 ห้อง");
      return;
    }
    setClassroomError(null);
    saveSubject.mutate(
      {
        id: targetSubjectId,
        payload: {
          schoolId,
          termId,
          gradeLevelId: gradeId,
          code: values.subjectCode.trim().toUpperCase(),
          nameTh: values.subjectName.trim(),
          classroomIds: classroomIds.map(Number),
        },
      },
      {
        onSuccess: () => {
          void navigate(backPath);
        },
      },
    );
  }

  return (
    <PageShell>
      <PageToolbar
        description="กรอกข้อมูลรายวิชาและเลือกห้องเรียนในระดับชั้นนี้"
        navigation={
          <NavButton icon={ArrowLeft} to={backPath} variant="outline">
            ย้อนกลับ
          </NavButton>
        }
        parentBreadcrumb={{
          label: "จัดการข้อมูลหลักสูตร",
          to: CURRICULUM_PATH,
        }}
        title={isEdit ? "แก้ไขข้อมูลรายวิชา" : "เพิ่มข้อมูลรายวิชา"}
      />

      {isEdit && subjectQuery.isLoading ? (
        <Card className="p-6">
          <SkeletonStack lines={6} />
        </Card>
      ) : isEdit && (subjectQuery.isError || !subjectQuery.data) ? (
        <ErrorState
          description="ไม่พบรายวิชาที่ต้องการแก้ไข"
          onRetry={() => void navigate(backPath)}
          retryLabel="กลับไปหน้าหลักสูตร"
          title="ไม่พบรายวิชา"
        />
      ) : !schoolId || !termId || !gradeId ? (
        <ErrorState
          description="กรุณากลับไปเลือกโรงเรียน ระดับชั้น และภาคเรียนจากหน้าหลักสูตร"
          onRetry={() => void navigate(CURRICULUM_PATH)}
          retryLabel="กลับไปหน้าหลักสูตร"
          title="ข้อมูลบริบทไม่ครบ"
        />
      ) : (
        <Form form={form} onSubmit={handleSubmit}>
          <Card className="p-6">
            <div className="mb-6 flex items-center gap-2">
              <BookOpen aria-hidden="true" className="size-5 text-slate-700" />
              <h2 className="text-lg font-bold text-slate-800">
                ข้อมูลรายวิชา
              </h2>
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
                  disabled={isEdit}
                  id="subjectCode"
                  placeholder="เช่น ค21101 หรือ M22101"
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
                  placeholder="เช่น คณิตศาสตร์"
                  {...registerField(form, "subjectName")}
                />
                <FormMessage<CurriculumSubjectFormValues> name="subjectName" />
              </FormItem>
            </div>
          </Card>

          <Card className="mt-6 p-6">
            <div className="mb-6 flex items-center gap-2">
              <School aria-hidden="true" className="size-5 text-slate-700" />
              <h2 className="text-lg font-bold text-slate-800">ห้องเรียน</h2>
            </div>
            <FormLabel htmlFor="curriculum-classrooms" required>
              ห้องเรียนที่ใช้รายวิชานี้
            </FormLabel>
            <MultiSelect
              ariaLabel="ห้องเรียนที่ใช้รายวิชานี้"
              emptyText="ไม่พบห้องเรียนในระดับชั้นนี้"
              id="curriculum-classrooms"
              onChange={(value) => {
                setClassroomDraft({ subjectId: targetSubjectId, ids: value });
                setClassroomError(null);
              }}
              options={classroomOptions}
              placeholder="ค้นหาและเลือกห้องเรียน"
              value={classroomIds}
            />
            <p className="mt-2 min-h-5 text-sm font-medium text-danger">
              {classroomError ?? ""}
            </p>
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
      )}
    </PageShell>
  );
}
