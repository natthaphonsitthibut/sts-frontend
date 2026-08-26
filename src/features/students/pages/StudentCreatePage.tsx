import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, GraduationCap, Save, UserRound } from "lucide-react";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  Card,
  Button,
  Combobox,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  registerField,
} from "../../../components/base";
import {
  FormActions,
  PageShell,
  PageToolbar,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { useStudentStatuses } from "../../student-statuses/hooks/useStudentStatuses";
import {
  useCreateStudent,
  useStudentManagementOptions,
} from "../hooks/useCreateStudent";

const schema = z.object({
  PersonID_Onec: z
    .string()
    .trim()
    .regex(/^[0-9]{13}$/, "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก"),
  PassportNumber_Onec: z.string().trim().max(50),
  FirstName_Onec: z.string().trim().min(1, "กรุณากรอกชื่อ").max(100),
  MiddleName_Onec: z.string().trim().max(100),
  LastName_Onec: z.string().trim().min(1, "กรุณากรอกนามสกุล").max(100),
  classroom_id: z.string().min(1, "กรุณาเลือกห้องเรียน"),
  student_number: z.string().trim().max(50),
  student_status_code: z.string().min(1, "กรุณาเลือกสถานะนักเรียน"),
  term_gpa: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (Number(value) >= 0 && Number(value) <= 4),
      "เกรดเฉลี่ยต้องอยู่ระหว่าง 0.00–4.00",
    ),
  contact_phone: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[0-9]{9,10}$/.test(value), {
      message: "เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก",
    }),
  contact_email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      "รูปแบบอีเมลไม่ถูกต้อง",
    ),
  contact_line_id: z.string().trim().max(64),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  PersonID_Onec: "",
  PassportNumber_Onec: "",
  FirstName_Onec: "",
  MiddleName_Onec: "",
  LastName_Onec: "",
  classroom_id: "",
  student_number: "",
  student_status_code: "",
  term_gpa: "",
  contact_phone: "",
  contact_email: "",
  contact_line_id: "",
};

function optional(value: string): string | null {
  return value.trim() || null;
}

export function StudentCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const createStudent = useCreateStudent();
  const optionsQuery = useStudentManagementOptions();
  const statusesQuery = useStudentStatuses({
    page: 1,
    limit: 50,
    sortBy: "sortOrder",
    sortDirection: "asc",
  });
  const form = useForm<FormValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(schema),
  });
  const classroomId = useWatch({ control: form.control, name: "classroom_id" });
  const studentStatusCode = useWatch({
    control: form.control,
    name: "student_status_code",
  });
  const classroomOptions = useMemo(
    () =>
      (optionsQuery.data?.classrooms ?? []).map((classroom) => ({
        value: classroom.id,
        label: `${classroom.schoolName} · ปี ${classroom.academicYear}/${classroom.semester} · ${classroom.gradeLabel}/${classroom.roomCode}`,
      })),
    [optionsQuery.data],
  );
  const statusOptions = useMemo(
    () =>
      (statusesQuery.data?.items ?? [])
        .filter((status) => status.isEnabled && status.category !== "UNMATCHED")
        .map((status) => ({
          value: String(status.code),
          label: status.labelTh,
        })),
    [statusesQuery.data],
  );

  async function submit(values: FormValues): Promise<void> {
    const created = await createStudent.mutateAsync({
      PersonID_Onec: values.PersonID_Onec.trim(),
      PassportNumber_Onec: optional(values.PassportNumber_Onec),
      FirstName_Onec: values.FirstName_Onec.trim(),
      MiddleName_Onec: optional(values.MiddleName_Onec),
      LastName_Onec: values.LastName_Onec.trim(),
      classroom_id: Number(values.classroom_id),
      student_number: optional(values.student_number),
      student_status_code: Number(values.student_status_code),
      term_gpa: values.term_gpa === "" ? null : Number(values.term_gpa),
      contact: {
        phone: optional(values.contact_phone),
        email: optional(values.contact_email),
        line_id: optional(values.contact_line_id),
      },
    });
    const studentId = String(created.id ?? "");
    navigate(studentId ? `/students/${studentId}` : "/manage-students", {
      replace: true,
      state: location.state,
    });
  }

  return (
    <PageShell>
      <PageToolbar
        icon={UserRound}
        navigation={
          <NavButton icon={ArrowLeft} to="/manage-students" variant="outline">
            ย้อนกลับ
          </NavButton>
        }
        title="เพิ่มข้อมูลนักเรียน"
      />
      <Form form={form} onSubmit={submit}>
        <div className="space-y-5">
          <FormErrorAlert
            error={
              createStudent.error ?? optionsQuery.error ?? statusesQuery.error
            }
            fallback="เพิ่มข้อมูลนักเรียนไม่สำเร็จ"
          />
          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <UserRound className="size-5" aria-hidden="true" />
              ข้อมูลระบุตัวตน
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <FormItem>
                <FormLabel htmlFor="student-national-id" required>
                  เลขบัตรประชาชน
                </FormLabel>
                <Input
                  id="student-national-id"
                  inputMode="numeric"
                  maxLength={13}
                  {...registerField(form, "PersonID_Onec")}
                />
                <FormMessage<FormValues> name="PersonID_Onec" />
              </FormItem>
              <FormItem>
                <FormLabel htmlFor="student-passport">
                  เลขหนังสือเดินทาง
                </FormLabel>
                <Input
                  id="student-passport"
                  {...registerField(form, "PassportNumber_Onec")}
                />
              </FormItem>
              <FormItem>
                <FormLabel required>ชื่อ</FormLabel>
                <Input {...registerField(form, "FirstName_Onec")} />
                <FormMessage<FormValues> name="FirstName_Onec" />
              </FormItem>
              <FormItem>
                <FormLabel required>นามสกุล</FormLabel>
                <Input {...registerField(form, "LastName_Onec")} />
                <FormMessage<FormValues> name="LastName_Onec" />
              </FormItem>
              <FormItem>
                <FormLabel>ชื่อกลาง</FormLabel>
                <Input {...registerField(form, "MiddleName_Onec")} />
              </FormItem>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <GraduationCap className="size-5" aria-hidden="true" />
              ข้อมูลการเรียน
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <FormItem className="sm:col-span-2">
                <FormLabel required>โรงเรียน ปีการศึกษา ชั้น และห้อง</FormLabel>
                <Combobox
                  disabled={optionsQuery.isLoading}
                  emptyText="ไม่พบห้องเรียนที่เปิดใช้งานในขอบเขตของคุณ"
                  onChange={(value) =>
                    form.setValue("classroom_id", value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  options={classroomOptions}
                  placeholder="เลือกห้องเรียน"
                  value={classroomId}
                />
                <FormMessage<FormValues> name="classroom_id" />
              </FormItem>
              <FormItem>
                <FormLabel>เลขประจำตัวนักเรียน</FormLabel>
                <Input {...registerField(form, "student_number")} />
              </FormItem>
              <FormItem>
                <FormLabel required>สถานะนักเรียน</FormLabel>
                <Combobox
                  disabled={statusesQuery.isLoading}
                  onChange={(value) =>
                    form.setValue("student_status_code", value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  options={statusOptions}
                  placeholder="เลือกสถานะ"
                  value={studentStatusCode}
                />
                <FormMessage<FormValues> name="student_status_code" />
              </FormItem>
              <FormItem>
                <FormLabel>เกรดเฉลี่ยภาคเรียน</FormLabel>
                <Input
                  inputMode="decimal"
                  placeholder="0.00–4.00"
                  {...registerField(form, "term_gpa")}
                />
                <FormMessage<FormValues> name="term_gpa" />
              </FormItem>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold text-slate-800">
              ช่องทางติดต่อนักเรียน
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <FormItem>
                <FormLabel>เบอร์โทร</FormLabel>
                <Input
                  inputMode="numeric"
                  {...registerField(form, "contact_phone")}
                />
                <FormMessage<FormValues> name="contact_phone" />
              </FormItem>
              <FormItem>
                <FormLabel>อีเมล</FormLabel>
                <Input type="email" {...registerField(form, "contact_email")} />
                <FormMessage<FormValues> name="contact_email" />
              </FormItem>
              <FormItem>
                <FormLabel>LINE ID</FormLabel>
                <Input {...registerField(form, "contact_line_id")} />
              </FormItem>
            </div>
          </Card>

          <FormActions>
            <Button
              onClick={() =>
                navigate("/manage-students", { state: location.state })
              }
              size="lg"
              type="button"
              variant="outline"
            >
              ยกเลิก
            </Button>
            <Button
              icon={Save}
              isLoading={createStudent.isPending}
              loadingText="กำลังเพิ่มข้อมูล"
              size="lg"
              type="submit"
            >
              เพิ่มข้อมูลนักเรียน
            </Button>
          </FormActions>
        </div>
      </Form>
    </PageShell>
  );
}
