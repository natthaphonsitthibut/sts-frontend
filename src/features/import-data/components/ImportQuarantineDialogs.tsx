import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  Button,
  Combobox,
  type ComboboxOption,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  registerField,
} from "../../../components/base";
import { cn } from "../../../lib/utils";
import { formatRoomLabel } from "../../../lib/room-presentation";
import { SchoolAreaSchoolFilter } from "../../attendance/components/SchoolAreaSchoolFilter";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import {
  type ImportQuarantineEditableValues,
  type ImportQuarantineItem,
} from "../types/import.types";
import { useQuarantinePickerOptions } from "../hooks/useQuarantinePickerOptions";

const rejectSchema = z.object({
  note: z.string().trim().min(1, "กรุณาระบุเหตุผล").max(500, "เหตุผลยาวเกินไป"),
});
type RejectValues = z.infer<typeof rejectSchema>;

interface RejectDialogProps {
  isPending: boolean;
  item?: ImportQuarantineItem;
  onClose: () => void;
  onSubmit: (note: string) => void;
}

export function ImportQuarantineRejectDialog({
  isPending,
  item,
  onClose,
  onSubmit,
}: RejectDialogProps) {
  const form = useForm<RejectValues>({
    defaultValues: { note: "" },
    resolver: zodResolver(rejectSchema),
  });

  return (
    <Dialog onOpenChange={(open) => !open && !isPending && onClose()} open={Boolean(item)}>
      <DialogContent onClose={isPending ? undefined : onClose}>
        <DialogHeader>
          <DialogTitle>ปฏิเสธรายการ</DialogTitle>
          <DialogDescription>
            ระบุเหตุผลเพื่อให้ตรวจสอบย้อนหลังได้ รายการจะไม่ถูกนำเข้า
          </DialogDescription>
        </DialogHeader>
        <Form
          form={form}
          onSubmit={(values) => onSubmit(values.note.trim())}
        >
          <DialogBody>
            <FormItem>
              <FormLabel htmlFor="quarantine-reject-note" required>
                เหตุผลที่ปฏิเสธ
              </FormLabel>
              <Textarea
                id="quarantine-reject-note"
                maxLength={500}
                rows={4}
                {...registerField(form, "note")}
              />
              <FormMessage<RejectValues> name="note" />
            </FormItem>
          </DialogBody>
          <DialogFooter>
            <Button disabled={isPending} onClick={onClose} type="button" variant="outline">
              ยกเลิก
            </Button>
            <Button isLoading={isPending} loadingText="กำลังปฏิเสธ" type="submit" variant="destructive">
              ยืนยันปฏิเสธ
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const positiveInteger = (message: string) =>
  z.string().trim().regex(/^[1-9]\d*$/, message).optional();
const fixSchema = z.object({
  AcademicYear_Onec: positiveInteger("กรุณากรอกปีการศึกษาเป็นจำนวนเต็มบวก"),
  Semester_Onec: positiveInteger("กรุณากรอกภาคเรียนเป็นจำนวนเต็มบวก"),
  SchoolID_Onec: positiveInteger("กรุณาเลือกโรงเรียนจากรายการ"),
  GradeLevelID_Onec: positiveInteger("กรุณาเลือกระดับชั้นจากรายการ"),
  RoomID_Onec: positiveInteger("กรุณาเลือกหรือพิมพ์เลขห้องเป็นจำนวนเต็มบวก"),
  StudentStatusID_Onec: positiveInteger("กรุณาเลือกสถานะนักเรียนจากรายการ"),
});
type FixValues = z.infer<typeof fixSchema>;
type FixField = keyof FixValues;

function fixSchemaFor(requiredFields: string[]) {
  return fixSchema.superRefine((values, context) => {
    requiredFields.forEach((field) => {
      const name = field as FixField;
      if (!values[name]?.trim()) {
        context.addIssue({ code: "custom", path: [name], message: "กรุณากรอกข้อมูล" });
      }
    });
  });
}

const FIELD_LABELS: Record<FixField, string> = {
  AcademicYear_Onec: "ปีการศึกษา",
  Semester_Onec: "ภาคเรียน",
  SchoolID_Onec: "โรงเรียน",
  GradeLevelID_Onec: "ระดับชั้น",
  RoomID_Onec: "ห้อง",
  StudentStatusID_Onec: "สถานะนักเรียน",
};

const REASON_FIELD_ISSUES: Partial<Record<string, Partial<Record<FixField, string>>>> = {
  SCHOOL_NOT_FOUND: {
    SchoolID_Onec: "ไม่พบโรงเรียนนี้ในข้อมูลหลัก",
  },
  GRADE_NOT_FOUND: {
    GradeLevelID_Onec: "ไม่พบระดับชั้นนี้ในข้อมูลหลัก",
  },
  ROOM_NOT_FOUND: {
    RoomID_Onec: "ไม่พบห้องเรียนนี้ในข้อมูลหลัก",
  },
  UNMAPPED_STUDENT_STATUS: {
    StudentStatusID_Onec: "สถานะนี้ยังไม่จับคู่กับข้อมูลหลัก",
  },
};

/**
 * Explains what is wrong with the value that came from the import file, so the
 * user sees the bad original ("ว่าง" vs "ใส่มาแต่ไม่ตรง") before fixing it.
 * Returns undefined when this particular value is actually fine — a natural-key
 * row flags only the parts that are empty or malformed, not every editable
 * field.
 */
function fieldIssueText(
  field: FixField,
  rawValue: string | undefined,
  reasonCode: string,
): string | undefined {
  const value = rawValue?.trim();
  if (!value) return "ว่าง — ไม่ได้ระบุค่าในไฟล์";
  const reasonIssue = REASON_FIELD_ISSUES[reasonCode]?.[field];
  if (reasonIssue) {
    return `ค่าจากไฟล์ "${value}" ${reasonIssue}`;
  }
  const wellFormed = /^[1-9]\d*$/.test(value);
  if (reasonCode === "MISSING_NATURAL_KEY_FIELD") {
    if (field === "SchoolID_Onec") {
      return wellFormed
        ? undefined
        : `ค่าจากไฟล์ "${value}" ไม่ใช่รหัสโรงเรียนที่ใช้ทำรายการนำเข้า`;
    }
    return wellFormed
      ? undefined
      : `ค่าจากไฟล์ "${value}" ไม่ถูกต้อง (ต้องเป็นจำนวนเต็มบวก)`;
  }
  if (field === "RoomID_Onec") {
    return wellFormed
      ? undefined
      : `ค่าจากไฟล์ "${value}" ไม่ถูกต้อง (ต้องเป็นจำนวนเต็มบวก)`;
  }
  if (field === "StudentStatusID_Onec") {
    return `ค่าจากไฟล์ "${value}" ยังไม่จับคู่กับสถานะในระบบ`;
  }
  return `ค่าจากไฟล์ "${value}" ไม่พบในข้อมูลหลัก`;
}

interface SourceFieldProps {
  invalidText?: string;
  label: string;
  value: string;
}

function SourceField({ invalidText, label, value }: SourceFieldProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-slate-100 bg-slate-50 px-3 py-2",
        invalidText && "border-amber-200 bg-amber-50",
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
        <span>{label}</span>
        {invalidText ? <span className="text-amber-700">ต้องแก้</span> : null}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-800">{value}</div>
      {invalidText ? (
        <div className="mt-1 text-xs text-amber-700">{invalidText}</div>
      ) : null}
    </div>
  );
}

function sourceValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return !trimmed || trimmed === "-" ? "-" : trimmed;
}

export function QuarantineSourceGrid({
  issueFor,
  item,
}: {
  issueFor?: (field: FixField) => string | undefined;
  item: ImportQuarantineItem;
}) {
  const issue = issueFor ?? (() => undefined);
  const yearTermIssue = issue("AcademicYear_Onec") ?? issue("Semester_Onec");
  const gradeRoomIssue = issue("GradeLevelID_Onec") ?? issue("RoomID_Onec");
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <SourceField
        label="ชื่อ-นามสกุล"
        value={`${item.student.firstName} ${item.student.lastName}`}
      />
      <SourceField label="เลขประจำตัว" value={item.student.personIdMasked} />
      <SourceField
        invalidText={issue("SchoolID_Onec")}
        label="โรงเรียน"
        value={sourceValue(
          item.schoolName ??
            (item.editableValues.SchoolID_Onec
              ? `รหัส ${item.editableValues.SchoolID_Onec}`
              : null),
        )}
      />
      <SourceField
        invalidText={yearTermIssue}
        label="ปี / เทอม"
        value={`${sourceValue(item.student.academicYear)} / ${sourceValue(item.student.semester)}`}
      />
      <SourceField
        invalidText={gradeRoomIssue}
        label="ชั้นและห้อง"
        value={`${sourceValue(item.student.gradeLabel ?? item.student.gradeLevelId)} · ${formatRoomLabel(item.student.roomId)}`}
      />
      <SourceField
        invalidText={issue("StudentStatusID_Onec")}
        label="สถานะนักเรียน"
        value={sourceValue(
          item.student.studentStatusLabel ?? item.student.studentStatusCode,
        )}
      />
    </div>
  );
}

interface FixDialogProps {
  error?: string;
  isPending: boolean;
  item?: ImportQuarantineItem;
  onClose: () => void;
  onSubmit: (values: ImportQuarantineEditableValues) => void;
}

export function ImportQuarantineFixDialog({ item, ...props }: FixDialogProps) {
  if (!item) return null;
  // Key by row id so form + area-cascade state reset when switching rows.
  return <ImportQuarantineFixDialogContent key={item.id} item={item} {...props} />;
}

function ImportQuarantineFixDialogContent({
  error,
  isPending,
  item,
  onClose,
  onSubmit,
}: FixDialogProps & { item: ImportQuarantineItem }) {
  const editableFields = useMemo(
    () => item.resolution.editableFields as FixField[],
    [item.resolution.editableFields],
  );
  const editable = useMemo(() => new Set<FixField>(editableFields), [editableFields]);
  const defaultValues = Object.fromEntries(
    editableFields.map((field) => [
      field,
      item.editableValues[field] || (field === "SchoolID_Onec" && item.schoolId ? String(item.schoolId) : ""),
    ]),
  ) as FixValues;
  const form = useForm<FixValues>({
    defaultValues,
    resolver: zodResolver(fixSchemaFor(item.resolution.editableFields)),
  });
  const area = useSchoolAreaFilter();
  const initializedAreaFor = useRef<string | null>(null);
  const watchedValues = useWatch({ control: form.control });
  const [roomSearch, setRoomSearch] = useState("");
  const { gradeOptions, statusOptions, roomOptions } = useQuarantinePickerOptions({
    enabled: true,
    gradeLabel: item.student.gradeLabel,
    schoolId: item.schoolId,
    roomEnabled: editable.has("RoomID_Onec"),
  });

  const roomValue = watchedValues.RoomID_Onec?.trim() ?? "";
  const typedRoom = roomSearch.trim();
  const roomComboOptions: ComboboxOption[] = [...roomOptions];
  // Known rooms are only suggestions — a new room number typed by the user is
  // valid too (backend only requires a positive integer).
  if (/^[1-9]\d*$/.test(typedRoom) && !roomComboOptions.some((option) => option.value === typedRoom)) {
    roomComboOptions.unshift({ value: typedRoom, label: `ใช้ ${formatRoomLabel(typedRoom)}` });
  }
  if (roomValue && !roomComboOptions.some((option) => option.value === roomValue)) {
    roomComboOptions.unshift({ value: roomValue, label: formatRoomLabel(roomValue) });
  }

  const issueFor = (field: FixField): string | undefined =>
    editable.has(field)
      ? fieldIssueText(field, item.editableValues[field], item.resolution.code)
      : undefined;
  const visibleNaturalKeyFields = editableFields.filter((field) =>
    Boolean(issueFor(field)),
  );
  const visibleEditableFields =
    item.resolution.code === "MISSING_NATURAL_KEY_FIELD" &&
    visibleNaturalKeyFields.length > 0
      ? visibleNaturalKeyFields
      : editableFields;
  const visibleEditable = new Set<FixField>(visibleEditableFields);

  useEffect(() => {
    if (!item.schoolId || initializedAreaFor.current === item.id) return;
    initializedAreaFor.current = item.id;
    area.setAreaFromSchool({
      id: item.schoolId,
      name: item.schoolName ?? "",
      province: item.student.province ?? "",
      district: item.schoolDistrict ?? "",
      sub_district: item.schoolSubDistrict ?? "",
    });
    if (editable.has("SchoolID_Onec") && !form.getValues("SchoolID_Onec")) {
      form.setValue("SchoolID_Onec", String(item.schoolId), {
        shouldValidate: false,
      });
    }
  }, [area, editable, form, item]);

  return (
    <Dialog onOpenChange={(open) => !open && !isPending && onClose()} open>
      <DialogContent
        className="max-h-[92vh] overflow-visible sm:max-w-5xl"
        onClose={isPending ? undefined : onClose}
      >
        <DialogHeader>
          <DialogTitle>แก้ไขข้อมูลก่อนนำเข้า</DialogTitle>
          <DialogDescription>{item.resolution.message}</DialogDescription>
        </DialogHeader>
        <Form
          form={form}
          onSubmit={(values) => {
            onSubmit(
              Object.fromEntries(
                Object.entries(values)
                  .filter(([field]) => visibleEditable.has(field as FixField))
                  .map(([field, value]) => [field, value?.trim() ?? ""]),
              ) as ImportQuarantineEditableValues,
            );
          }}
        >
          <DialogBody className="space-y-4">
            <section>
              <h3 className="mb-2 text-sm font-bold text-slate-900">
                ข้อมูลจากไฟล์นำเข้า
              </h3>
              <QuarantineSourceGrid issueFor={issueFor} item={item} />
            </section>
            {error ? (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            ) : null}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">แก้ข้อมูลให้ถูกต้อง</h3>
              {visibleEditableFields.map((name) => {
                if (name === "SchoolID_Onec") {
                  const selectedSchoolId = watchedValues[name] ?? "";
                  const selectedSchoolName =
                    selectedSchoolId && String(item.schoolId ?? "") === selectedSchoolId
                      ? item.schoolName
                      : (area.filteredSchools.find(
                          (school) => String(school.id) === selectedSchoolId,
                        )?.name ?? null);
                  const selectedSchoolFallbackLabel =
                    selectedSchoolName ??
                    (selectedSchoolId ? `รหัส ${selectedSchoolId}` : null);
                  return (
                    <FormItem key={name}>
                      <FormLabel htmlFor="quarantine-fix-SchoolID_Onec" required>
                        {FIELD_LABELS[name]}
                      </FormLabel>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <SchoolAreaSchoolFilter
                          area={area}
                          disabled={isPending}
                          onSchoolChange={(value) =>
                            form.setValue(name, value, { shouldValidate: true })
                          }
                          schoolId={selectedSchoolId}
                          selectedSchoolFallback={{
                            id: selectedSchoolId || item.schoolId || "",
                            name: selectedSchoolFallbackLabel,
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        โรงเรียนที่เลือก:{" "}
                        {selectedSchoolFallbackLabel ?? "ยังไม่ได้เลือก"}
                      </p>
                      <FormMessage<FixValues> name={name} />
                    </FormItem>
                  );
                }
                if (name === "GradeLevelID_Onec" || name === "StudentStatusID_Onec") {
                  const currentValue = watchedValues[name] ?? "";
                  const picker =
                    name === "GradeLevelID_Onec"
                      ? { options: gradeOptions, placeholder: "เลือกระดับชั้น" }
                      : { options: statusOptions, placeholder: "เลือกสถานะ" };
                  const options =
                    currentValue &&
                    !picker.options.some((option) => option.value === currentValue)
                      ? [
                          {
                            value: currentValue,
                            label:
                              name === "GradeLevelID_Onec"
                                ? `รหัสชั้น ${currentValue}`
                                : `รหัสสถานะ ${currentValue}`,
                          },
                          ...picker.options,
                        ]
                      : picker.options;
                  return (
                    <FormItem key={name}>
                      <FormLabel htmlFor={`quarantine-fix-${name}`} required>
                        {FIELD_LABELS[name]}
                      </FormLabel>
                      <Combobox
                        disabled={isPending}
                        id={`quarantine-fix-${name}`}
                        menuPlacement="top"
                        onChange={(value) =>
                          form.setValue(name, value, { shouldValidate: true })
                        }
                        options={options}
                        placeholder={picker.placeholder}
                        value={currentValue}
                      />
                      <FormMessage<FixValues> name={name} />
                    </FormItem>
                  );
                }
                if (name === "RoomID_Onec") {
                  return (
                    <FormItem key={name}>
                      <FormLabel htmlFor="quarantine-fix-RoomID_Onec" required>
                        {FIELD_LABELS[name]}
                      </FormLabel>
                      <Combobox
                        disabled={isPending}
                        emptyText='พิมพ์เลขห้อง เช่น "2" แล้วเลือกจากรายการ'
                        id="quarantine-fix-RoomID_Onec"
                        menuPlacement="top"
                        onChange={(value) =>
                          form.setValue(name, value, { shouldValidate: true })
                        }
                        onSearchChange={setRoomSearch}
                        options={roomComboOptions}
                        placeholder="เลือกหรือพิมพ์เลขห้อง"
                        value={roomValue}
                      />
                      <FormMessage<FixValues> name={name} />
                    </FormItem>
                  );
                }
                return (
                  <FormItem key={name}>
                    <FormLabel htmlFor={`quarantine-fix-${name}`} required>
                      {FIELD_LABELS[name]}
                    </FormLabel>
                    <Input
                      id={`quarantine-fix-${name}`}
                      inputMode="numeric"
                      {...registerField(form, name)}
                    />
                    <FormMessage<FixValues> name={name} />
                  </FormItem>
                );
              })}
            </section>
          </DialogBody>
          <DialogFooter>
            <Button disabled={isPending} onClick={onClose} type="button" variant="outline">
              ยกเลิก
            </Button>
            <Button isLoading={isPending} loadingText="กำลังตรวจและนำเข้า" type="submit">
              บันทึกและลองนำเข้า
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
