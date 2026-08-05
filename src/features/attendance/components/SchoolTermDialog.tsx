import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  Button,
  DatePicker,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
} from "../../../components/base";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import {
  getSchoolTermStatusLabel,
  SCHOOL_TERM_STATUSES,
} from "../lib/attendance-presentation";
import type { SchoolTerm, SchoolTermStatus } from "../types/attendance.types";

const termSchema = z
  .object({
    academicYear: z.number().int().positive(),
    semester: z.number().int().min(1).max(3),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "กรุณาเลือกวันเริ่ม"),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "กรุณาเลือกวันสิ้นสุด"),
    status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]),
  })
  .refine((value) => value.startsOn <= value.endsOn, {
    message: "วันสิ้นสุดต้องไม่ก่อนวันเริ่ม",
    path: ["endsOn"],
  });

export type SchoolTermFormValues = z.infer<typeof termSchema>;

interface SchoolTermDialogProps {
  error: unknown;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (values: SchoolTermFormValues) => Promise<void>;
  open: boolean;
  term: SchoolTerm | null;
}


function getDefaults(term: SchoolTerm | null): SchoolTermFormValues {
  return {
    academicYear: term?.academicYear ?? new Date().getFullYear() + 543,
    semester: term?.semester ?? 1,
    startsOn: term?.startsOn ?? "",
    endsOn: term?.endsOn ?? "",
    status: (term?.status ?? "DRAFT") as SchoolTermStatus,
  };
}

export function SchoolTermDialog({
  isPending,
  error,
  onClose,
  onSubmit,
  open,
  term,
}: SchoolTermDialogProps) {
  const termStatusCatalog = useStatusCatalog("SCHOOL_TERM");
  const form = useForm<SchoolTermFormValues>({
    resolver: zodResolver(termSchema),
    defaultValues: getDefaults(term),
  });
  const startsOn = useWatch({ control: form.control, name: "startsOn" });
  const endsOn = useWatch({ control: form.control, name: "endsOn" });

  useEffect(() => {
    if (open) form.reset(getDefaults(term));
  }, [form, open, term]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{term ? "แก้ไขภาคเรียน" : "เพิ่มภาคเรียน"}</DialogTitle>
        </DialogHeader>
        <Form form={form} onSubmit={onSubmit}>
          <DialogBody>
            <FormErrorAlert
              className="mb-3"
              error={error}
              fallback="ไม่สามารถบันทึกภาคเรียนได้"
            />
            <div className="grid gap-3 sm:grid-cols-2">
            <FormItem>
              <FormLabel htmlFor="term-academic-year" required>ปีการศึกษา</FormLabel>
              <Input
                id="term-academic-year"
                inputMode="numeric"
                {...form.register("academicYear", { valueAsNumber: true })}
              />
              <FormMessage<SchoolTermFormValues> name="academicYear" />
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="term-semester" required>ภาคเรียน</FormLabel>
              <Select
                id="term-semester"
                {...form.register("semester", { valueAsNumber: true })}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </Select>
              <FormMessage<SchoolTermFormValues> name="semester" />
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="term-start" required>วันเริ่ม</FormLabel>
              <DatePicker
                ariaLabel="วันเริ่ม"
                id="term-start"
                max={endsOn || undefined}
                onChange={(next) => form.setValue("startsOn", next, { shouldValidate: true })}
                value={startsOn}
              />
              <FormMessage<SchoolTermFormValues> name="startsOn" />
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="term-end" required>วันสิ้นสุด</FormLabel>
              <DatePicker
                ariaLabel="วันสิ้นสุด"
                id="term-end"
                min={startsOn || undefined}
                onChange={(next) => form.setValue("endsOn", next, { shouldValidate: true })}
                value={endsOn}
              />
              <FormMessage<SchoolTermFormValues> name="endsOn" />
            </FormItem>
            <FormItem className="sm:col-span-2">
              <FormLabel htmlFor="term-status" required>สถานะ</FormLabel>
              <Select id="term-status" {...form.register("status")}>
                {SCHOOL_TERM_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {getSchoolTermStatusLabel(status, termStatusCatalog.items)}
                  </option>
                ))}
              </Select>
              <FormMessage<SchoolTermFormValues> name="status" />
            </FormItem>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
            <Button isLoading={isPending} loadingText="กำลังบันทึก" type="submit">
              บันทึก
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
