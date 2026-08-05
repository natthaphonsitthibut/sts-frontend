import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, UserRound } from "lucide-react";
import {
  Button,
  Card,
  EMPTY_PHOTO_PICKER_VALUE,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  NumericInput,
  PhotoPicker,
  registerField,
  type PhotoPickerValue,
} from "../../../components/base";
import { NavButton } from "../../../components/layout/nav-button";
import {
  ErrorState,
  FormActions,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { resolveApiMediaUrl } from "../../../lib/media-url";
import { useSaveTeacher, useTeacher } from "../hooks/useTeachers";
import {
  EMPTY_TEACHER_FORM,
  teacherFormSchema,
  type TeacherFormValues,
} from "../schemas/teacher.schema";
import type { Teacher } from "../types/teachers.types";

const TEACHERS_PATH = "/manage-teachers";

/** Carries the chosen school back so the list does not fall back to the picker. */
function teachersListPath(schoolId: number | null): string {
  return schoolId ? `${TEACHERS_PATH}?schoolId=${schoolId}` : TEACHERS_PATH;
}

function toDefaults(teacher: Teacher | null): TeacherFormValues {
  if (!teacher) return EMPTY_TEACHER_FORM;
  return {
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    citizenId: teacher.citizenId ?? "",
    phone: teacher.phone ?? "",
    email: teacher.email ?? "",
    lineId: teacher.lineId ?? "",
  };
}

/** Blank optional fields are omitted so the API keeps them null instead of "". */
function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function TeacherForm({
  teacher,
  schoolId,
}: {
  teacher: Teacher | null;
  schoolId: number;
}) {
  const navigate = useNavigate();
  const saveTeacher = useSaveTeacher();
  const [photo, setPhoto] = useState<PhotoPickerValue>(
    EMPTY_PHOTO_PICKER_VALUE,
  );
  const form = useForm<TeacherFormValues>({
    defaultValues: toDefaults(teacher),
    resolver: zodResolver(teacherFormSchema),
  });

  function goBack(): void {
    void navigate(teachersListPath(schoolId));
  }

  function handleSubmit(values: TeacherFormValues): void {
    saveTeacher.mutate(
      {
        id: teacher?.id ?? null,
        payload: {
          schoolId,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          citizenId: optionalText(values.citizenId),
          phone: optionalText(values.phone),
          email: optionalText(values.email),
          lineId: optionalText(values.lineId),
        },
        photo: photo.file ?? undefined,
        removePhoto: photo.removed,
      },
      { onSuccess: goBack },
    );
  }

  return (
    <Form form={form} onSubmit={handleSubmit}>
      <Card className="p-6">
        <div className="mb-6 flex items-center gap-2">
          <UserRound className="size-5 text-slate-700" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-800">ข้อมูลทั่วไป</h2>
        </div>

        <FormErrorAlert
          className="mb-4"
          error={saveTeacher.error}
          fallback="บันทึกข้อมูลครูไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
          <PhotoPicker
            disabled={saveTeacher.isPending}
            label="รูปประจำตัวคุณครู"
            onChange={setPhoto}
            storedUrl={resolveApiMediaUrl(teacher?.photoUrl ?? null)}
            value={photo}
          />

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <FormItem>
              <FormLabel htmlFor="firstName" required>
                ชื่อ
              </FormLabel>
              <Input
                id="firstName"
                placeholder="ระบุชื่อคุณครู"
                {...registerField(form, "firstName")}
              />
              <FormMessage<TeacherFormValues> name="firstName" />
            </FormItem>

            <FormItem>
              <FormLabel htmlFor="lastName" required>
                นามสกุล
              </FormLabel>
              <Input
                id="lastName"
                placeholder="ระบุนามสกุลคุณครู"
                {...registerField(form, "lastName")}
              />
              <FormMessage<TeacherFormValues> name="lastName" />
            </FormItem>

            <FormItem>
              <FormLabel htmlFor="email" required>
                อีเมล
              </FormLabel>
              <Input
                id="email"
                placeholder="example@gmail.com"
                type="email"
                {...registerField(form, "email")}
              />
              <FormMessage<TeacherFormValues> name="email" />
            </FormItem>

            <FormItem>
              <FormLabel htmlFor="lineId">ไอดีไลน์</FormLabel>
              <Input
                id="lineId"
                placeholder="ระบุไอดีไลน์"
                {...registerField(form, "lineId")}
              />
              <FormMessage<TeacherFormValues> name="lineId" />
            </FormItem>

            <FormItem>
              <FormLabel htmlFor="citizenId" required>
                เลขบัตรประชาชน
              </FormLabel>
              <NumericInput
                id="citizenId"
                maxLength={13}
                placeholder="XXXXXXXXXXXXX"
                {...registerField(form, "citizenId")}
              />
              <FormMessage<TeacherFormValues> name="citizenId" />
            </FormItem>

            <FormItem>
              <FormLabel htmlFor="phone">เบอร์โทรศัพท์</FormLabel>
              <NumericInput
                id="phone"
                maxLength={10}
                placeholder="XXXXXXXXXX"
                {...registerField(form, "phone")}
              />
              <FormMessage<TeacherFormValues> name="phone" />
            </FormItem>
          </div>
        </div>
      </Card>

      <FormActions>
        <Button onClick={goBack} size="lg" type="button" variant="outline">
          ยกเลิก
        </Button>
        <Button
          isLoading={saveTeacher.isPending}
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

export function TeacherFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { data: teacher = null, isLoading, isError } = useTeacher(id ?? null);

  // On create the school comes from the list page's filter; on edit it rides
  // along with the teacher's membership.
  const schoolId = isEdit
    ? (teacher?.schoolId ?? null)
    : Number(searchParams.get("schoolId")) || null;

  return (
    <PageShell>
      <PageToolbar
        description="กรอกข้อมูลรายละเอียดของคุณครู"
        navigation={
          <NavButton
            icon={ArrowLeft}
            to={teachersListPath(schoolId)}
            variant="outline"
          >
            ย้อนกลับ
          </NavButton>
        }
        title={isEdit ? "แก้ไขข้อมูลคุณครู" : "เพิ่มข้อมูลคุณครู"}
      />

      {isEdit && isLoading ? (
        <Card className="p-6">
          <SkeletonStack lines={6} />
        </Card>
      ) : isEdit && (isError || !teacher) ? (
        <ErrorState
          description="ไม่พบข้อมูลครูที่ต้องการแก้ไข"
          onRetry={() => void navigate(teachersListPath(schoolId))}
          retryLabel="กลับไปรายชื่อคุณครู"
          title="ไม่พบข้อมูลครู"
        />
      ) : !schoolId ? (
        <ErrorState
          description="กรุณากลับไปเลือกโรงเรียนจากหน้ารายชื่อคุณครูก่อนเพิ่มข้อมูล"
          onRetry={() => void navigate(TEACHERS_PATH)}
          retryLabel="กลับไปเลือกโรงเรียน"
          title="ยังไม่ได้เลือกโรงเรียน"
        />
      ) : (
        <TeacherForm schoolId={schoolId} teacher={teacher} />
      )}
    </PageShell>
  );
}
