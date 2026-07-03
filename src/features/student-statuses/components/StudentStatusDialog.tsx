import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  NumericInput,
  Select,
  registerField,
} from "../../../components/base";
import { useSaveStudentStatus } from "../hooks/useStudentStatuses";
import {
  studentStatusFormSchema,
  type StudentStatusFormValues,
} from "../schemas/student-status.schema";
import {
  STUDENT_STATUS_BADGE_VARIANTS,
  type StudentStatus,
} from "../types/student-status.types";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";

const EMPTY_FORM: StudentStatusFormValues = {
  code: "",
  labelTh: "",
  category: "UNMAPPED",
  badgeVariant: "warning",
  isActiveForLogin: false,
  isTerminal: false,
  requiresFollowup: false,
  isEnabled: true,
  sortOrder: "0",
  sourceSystem: "ONEC",
};

interface StudentStatusDialogProps {
  open: boolean;
  status: StudentStatus | null;
  onOpenChange: (open: boolean) => void;
}

export function StudentStatusDialog({
  onOpenChange,
  open,
  status,
}: StudentStatusDialogProps) {
  const categories = useStatusCatalog("STUDENT_STATUS_CATEGORY").items;
  const saveStatus = useSaveStudentStatus();
  const form = useForm<StudentStatusFormValues>({
    defaultValues: EMPTY_FORM,
    resolver: zodResolver(studentStatusFormSchema),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      status
        ? {
            code: String(status.code),
            labelTh: status.labelTh,
            category: status.category,
            badgeVariant: status.badgeVariant,
            isActiveForLogin: status.isActiveForLogin,
            isTerminal: status.isTerminal,
            requiresFollowup: status.requiresFollowup,
            isEnabled: status.isEnabled,
            sortOrder: String(status.sortOrder),
            sourceSystem: status.sourceSystem,
          }
        : EMPTY_FORM,
    );
  }, [form, open, status]);

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      saveStatus.reset();
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(values: StudentStatusFormValues): void {
    const payload = {
      code: Number(values.code),
      labelTh: values.labelTh.trim(),
      category: values.category,
      badgeVariant: values.badgeVariant,
      isActiveForLogin: values.isActiveForLogin,
      isTerminal: values.isTerminal,
      requiresFollowup: values.requiresFollowup,
      isEnabled: values.isEnabled,
      sortOrder: Number(values.sortOrder),
      sourceSystem: values.sourceSystem.trim(),
    };
    saveStatus.mutate(
      { code: payload.code, payload, isEdit: Boolean(status) },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" onClose={() => handleOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{status ? "แก้ไขสถานะนักเรียน" : "เพิ่มสถานะนักเรียน"}</DialogTitle>
          <DialogDescription>
            สถานะการศึกษาเป็นข้อมูลอ้างอิง ส่วน “ควรพิจารณาติดตาม” ไม่ได้สร้าง Case อัตโนมัติ
          </DialogDescription>
        </DialogHeader>
        <Form form={form} onSubmit={handleSubmit}>
          <DialogBody>
            <FormErrorAlert
              className="mb-4"
              error={saveStatus.error}
              fallback="บันทึกสถานะนักเรียนไม่สำเร็จ"
            />
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <FormItem>
                <FormLabel htmlFor="student-status-code" required>รหัสสถานะ</FormLabel>
                <NumericInput
                  disabled={Boolean(status)}
                  id="student-status-code"
                  placeholder="เช่น 10"
                  {...registerField(form, "code")}
                />
                <FormMessage<StudentStatusFormValues> name="code" />
              </FormItem>
              <FormItem>
                <FormLabel htmlFor="student-status-label" required>ชื่อภาษาไทย</FormLabel>
                <Input
                  id="student-status-label"
                  placeholder="เช่น กำลังศึกษา"
                  {...registerField(form, "labelTh")}
                />
                <FormMessage<StudentStatusFormValues> name="labelTh" />
              </FormItem>
              <FormItem>
                <FormLabel htmlFor="student-status-category" required>หมวดสถานะ</FormLabel>
                <Select id="student-status-category" {...registerField(form, "category")}>
                  {categories.map((category) => (
                    <option key={category.code} value={category.code}>{category.label}</option>
                  ))}
                </Select>
                <FormMessage<StudentStatusFormValues> name="category" />
              </FormItem>
              <FormItem>
                <FormLabel htmlFor="student-status-source" required>ระบบต้นทาง</FormLabel>
                <Input id="student-status-source" {...registerField(form, "sourceSystem")} />
                <FormMessage<StudentStatusFormValues> name="sourceSystem" />
              </FormItem>
              <FormItem>
                <FormLabel htmlFor="student-status-badge" required>รูปแบบป้ายสถานะ</FormLabel>
                <Select id="student-status-badge" {...registerField(form, "badgeVariant")}>
                  {STUDENT_STATUS_BADGE_VARIANTS.map((variant) => (
                    <option key={variant} value={variant}>{variant}</option>
                  ))}
                </Select>
                <FormMessage<StudentStatusFormValues> name="badgeVariant" />
              </FormItem>
              <FormItem>
                <FormLabel htmlFor="student-status-sort" required>ลำดับแสดงผล</FormLabel>
                <NumericInput id="student-status-sort" {...registerField(form, "sortOrder")} />
                <FormMessage<StudentStatusFormValues> name="sortOrder" />
              </FormItem>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              <Checkbox label="เข้าสู่ระบบได้ (policy รอบถัดไป)" {...registerField(form, "isActiveForLogin")} />
              <Checkbox label="เป็นสถานะสิ้นสุด" {...registerField(form, "isTerminal")} />
              <Checkbox label="ควรพิจารณาติดตาม" {...registerField(form, "requiresFollowup")} />
              <Checkbox label="เปิดใช้งาน" {...registerField(form, "isEnabled")} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => handleOpenChange(false)} type="button" variant="outline">ยกเลิก</Button>
            <Button isLoading={saveStatus.isPending} loadingText="กำลังบันทึก" type="submit">บันทึก</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
