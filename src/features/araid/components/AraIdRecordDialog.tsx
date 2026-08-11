import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  Button,
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
  PasswordInput,
  Select,
  registerField,
} from "../../../components/base";
import { appToast } from "../../../components/base/app-toast";
import { useCreateAraIdRecord, useUpdateAraIdRecord } from "../hooks/useAraId";
import type { AraIdRecord, AraIdRecordInput } from "../types/araid.types";

const CUSTOM_TITLE = "CUSTOM";
const TITLE_OPTIONS = [
  "เด็กชาย",
  "เด็กหญิง",
  "นาย",
  "นาง",
  "นางสาว",
  "พระ",
  "สามเณร",
  "ดร.",
  "ผศ.",
  "รศ.",
  "ศ.",
  "ผศ. ดร.",
  "รศ. ดร.",
  "ศ. ดร.",
] as const;

function optionalText(maxLength: number) {
  return z.string().trim().max(maxLength, `กรอกได้ไม่เกิน ${maxLength} ตัวอักษร`);
}

function createRecordSchema(editing: boolean) {
  return z
    .object({
      identityNumber: z.string().regex(/^\d{13}$/, "กรุณากรอกเลขประจำตัวให้ครบ 13 หลัก"),
      titlePreset: z.string().min(1, "กรุณาเลือกคำนำหน้า"),
      titleCustom: z.string().trim().max(32, "กรอกได้ไม่เกิน 32 ตัวอักษร"),
      givenNameTh: z.string().trim().min(1, "กรุณากรอกชื่อ").max(100, "กรอกได้ไม่เกิน 100 ตัวอักษร"),
      familyNameTh: z.string().trim().min(1, "กรุณากรอกนามสกุล").max(100, "กรอกได้ไม่เกิน 100 ตัวอักษร"),
      givenNameEn: optionalText(100),
      familyNameEn: optionalText(100),
      dateOfBirth: z.string(),
      genderCode: z.enum(["", "MALE", "FEMALE", "OTHER"]),
      phoneNumber: optionalText(20),
      emailAddress: z
        .string()
        .trim()
        .max(254, "กรอกได้ไม่เกิน 254 ตัวอักษร")
        .refine((value) => !value || z.email().safeParse(value).success, "รูปแบบอีเมลไม่ถูกต้อง"),
      addressLine: optionalText(255),
      subDistrictName: optionalText(100),
      districtName: optionalText(100),
      provinceName: optionalText(100),
      postalCode: z
        .string()
        .refine((value) => !value || /^\d{5}$/.test(value), "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก"),
      pin: editing
        ? z.string().refine((value) => !value || /^\d{8}$/.test(value), "PIN ใหม่ต้องเป็นตัวเลข 8 หลัก")
        : z.string().regex(/^\d{8}$/, "กรุณากรอก PIN ให้ครบ 8 หลัก"),
      confirmPin: z.string(),
    })
    .superRefine((values, context) => {
      if (values.titlePreset === CUSTOM_TITLE && !values.titleCustom) {
        context.addIssue({
          code: "custom",
          message: "กรุณาระบุคำนำหน้า ยศ หรือตำแหน่ง",
          path: ["titleCustom"],
        });
      }
      if (values.pin !== values.confirmPin) {
        context.addIssue({
          code: "custom",
          message: "PIN ทั้งสองช่องไม่ตรงกัน",
          path: ["confirmPin"],
        });
      }
    });
}

type RecordFormValues = z.infer<ReturnType<typeof createRecordSchema>>;

const EMPTY_FORM: RecordFormValues = {
  identityNumber: "",
  titlePreset: "",
  titleCustom: "",
  givenNameTh: "",
  familyNameTh: "",
  givenNameEn: "",
  familyNameEn: "",
  dateOfBirth: "",
  genderCode: "",
  phoneNumber: "",
  emailAddress: "",
  addressLine: "",
  subDistrictName: "",
  districtName: "",
  provinceName: "",
  postalCode: "",
  pin: "",
  confirmPin: "",
};

function recordToForm(record: AraIdRecord): RecordFormValues {
  const knownTitle = TITLE_OPTIONS.some((title) => title === record.titleTh);
  return {
    identityNumber: record.identityNumber,
    titlePreset: knownTitle ? (record.titleTh ?? "") : CUSTOM_TITLE,
    titleCustom: knownTitle ? "" : (record.titleTh ?? ""),
    givenNameTh: record.givenNameTh,
    familyNameTh: record.familyNameTh,
    givenNameEn: record.givenNameEn ?? "",
    familyNameEn: record.familyNameEn ?? "",
    dateOfBirth: record.dateOfBirth ?? "",
    genderCode: record.genderCode ?? "",
    phoneNumber: record.phoneNumber ?? "",
    emailAddress: record.emailAddress ?? "",
    addressLine: record.addressLine ?? "",
    subDistrictName: record.subDistrictName ?? "",
    districtName: record.districtName ?? "",
    provinceName: record.provinceName ?? "",
    postalCode: record.postalCode ?? "",
    pin: "",
    confirmPin: "",
  };
}

function nullable(value: string): string | null {
  return value.trim() || null;
}

interface AraIdRecordDialogProps {
  open: boolean;
  record: AraIdRecord | null;
  onOpenChange: (open: boolean) => void;
}

export function AraIdRecordDialog({ open, record, onOpenChange }: AraIdRecordDialogProps) {
  const editing = Boolean(record);
  const schema = useMemo(() => createRecordSchema(editing), [editing]);
  const createRecord = useCreateAraIdRecord();
  const updateRecord = useUpdateAraIdRecord();
  const pending = createRecord.isPending || updateRecord.isPending;
  const mutationError = createRecord.error ?? updateRecord.error;
  const form = useForm<RecordFormValues>({
    defaultValues: EMPTY_FORM,
    resolver: zodResolver(schema),
  });
  const titlePreset = useWatch({ control: form.control, name: "titlePreset" });
  const pin = useWatch({ control: form.control, name: "pin" });

  useEffect(() => {
    if (!open) return;
    form.reset(record ? recordToForm(record) : EMPTY_FORM);
  }, [form, open, record]);

  function handleOpenChange(nextOpen: boolean): void {
    if (pending) return;
    if (!nextOpen) {
      createRecord.reset();
      updateRecord.reset();
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(values: RecordFormValues): Promise<void> {
    const titleTh = values.titlePreset === CUSTOM_TITLE ? values.titleCustom.trim() : values.titlePreset;
    const payload: AraIdRecordInput = {
      identityNumber: values.identityNumber,
      titleTh,
      givenNameTh: values.givenNameTh.trim(),
      familyNameTh: values.familyNameTh.trim(),
      givenNameEn: nullable(values.givenNameEn),
      familyNameEn: nullable(values.familyNameEn),
      dateOfBirth: nullable(values.dateOfBirth),
      genderCode: values.genderCode || null,
      phoneNumber: nullable(values.phoneNumber),
      emailAddress: nullable(values.emailAddress),
      addressLine: nullable(values.addressLine),
      subDistrictName: nullable(values.subDistrictName),
      districtName: nullable(values.districtName),
      provinceName: nullable(values.provinceName),
      postalCode: nullable(values.postalCode),
      pin: values.pin,
    };

    if (record) {
      if (!payload.pin) delete (payload as Partial<AraIdRecordInput>).pin;
      await updateRecord.mutateAsync({ id: record.id, payload });
      appToast.success("บันทึกการแก้ไขแล้ว");
    } else {
      await createRecord.mutateAsync(payload);
      appToast.success("เพิ่มข้อมูล AraID แล้ว");
    }
    createRecord.reset();
    updateRecord.reset();
    onOpenChange(false);
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-hidden border-0 p-0"
        onClose={() => handleOpenChange(false)}
      >
        <Form form={form} onSubmit={handleSubmit}>
          <DialogHeader className="m-0 border-b border-slate-200 px-5 py-4 pr-14 sm:px-6">
            <DialogTitle>{record ? "แก้ไขข้อมูล AraID" : "เพิ่มข้อมูล AraID"}</DialogTitle>
            <DialogDescription>
              ช่องที่มีเครื่องหมาย * จำเป็นสำหรับการเข้าใช้งาน ส่วนข้อมูลอื่นเพิ่มภายหลังได้
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="m-0 max-h-[calc(100dvh-10.5rem)] overflow-y-auto px-5 py-5 sm:px-6">
            <FormErrorAlert error={mutationError} fallback="บันทึกข้อมูลไม่สำเร็จ" />

            <section className="mt-1">
              <h3 className="text-sm font-bold text-araid-brand-deep">ข้อมูลสำหรับเข้าใช้งาน</h3>
              <div className="mt-4 grid gap-x-4 sm:grid-cols-2">
                <FormItem className="sm:col-span-2">
                  <FormLabel htmlFor="araid-identity-number" required>เลขประจำตัว 13 หลัก</FormLabel>
                  <NumericInput
                    id="araid-identity-number"
                    maxLength={13}
                    placeholder="กรอกตัวเลข 13 หลัก"
                    {...registerField(form, "identityNumber")}
                  />
                  <FormMessage<RecordFormValues> name="identityNumber" />
                </FormItem>
                <FormItem className="sm:col-span-2">
                  <FormLabel htmlFor="araid-pin" required={!record}>
                    {record ? "PIN ใหม่ (เว้นว่างหากไม่เปลี่ยน)" : "PIN 8 หลัก"}
                  </FormLabel>
                  <PasswordInput
                    id="araid-pin"
                    inputMode="numeric"
                    maxLength={8}
                    placeholder={record ? "กรอกเฉพาะเมื่อต้องการเปลี่ยน PIN" : "กรอก PIN 8 หลัก"}
                    {...registerField(form, "pin")}
                  />
                  <FormMessage<RecordFormValues> name="pin" />
                </FormItem>
                <FormItem className="sm:col-span-2">
                  <FormLabel htmlFor="araid-confirm-pin" required={!record || Boolean(pin)}>
                    {record ? "ยืนยัน PIN ใหม่" : "ยืนยัน PIN 8 หลัก"}
                  </FormLabel>
                  <PasswordInput
                    id="araid-confirm-pin"
                    inputMode="numeric"
                    maxLength={8}
                    placeholder={record ? "กรอกซ้ำเฉพาะเมื่อต้องการเปลี่ยน PIN" : "กรอก PIN เดิมอีกครั้ง"}
                    {...registerField(form, "confirmPin")}
                  />
                  <FormMessage<RecordFormValues> name="confirmPin" />
                </FormItem>
              </div>
            </section>

            <section className="mt-4 border-t border-slate-200 pt-5">
              <h3 className="text-sm font-bold text-araid-brand-deep">ข้อมูลบุคคล</h3>
              <div className="mt-4 grid gap-x-4 sm:grid-cols-2">
                <FormItem>
                  <FormLabel htmlFor="araid-title" required>คำนำหน้า</FormLabel>
                  <Select id="araid-title" {...registerField(form, "titlePreset")}>
                    <option value="">เลือกคำนำหน้า</option>
                    {TITLE_OPTIONS.map((title) => <option key={title} value={title}>{title}</option>)}
                    <option value={CUSTOM_TITLE}>กำหนดเอง…</option>
                  </Select>
                  <FormMessage<RecordFormValues> name="titlePreset" />
                </FormItem>
                {titlePreset === CUSTOM_TITLE ? (
                  <FormItem>
                    <FormLabel htmlFor="araid-title-custom" required>คำนำหน้า/ยศ/ตำแหน่ง</FormLabel>
                    <Input
                      id="araid-title-custom"
                      placeholder="เช่น พ.ต.อ. หรือ พระครู…"
                      {...registerField(form, "titleCustom")}
                    />
                    <FormMessage<RecordFormValues> name="titleCustom" />
                  </FormItem>
                ) : <div className="hidden sm:block" />}
                <FormItem>
                  <FormLabel htmlFor="araid-given-name-th" required>ชื่อ</FormLabel>
                  <Input id="araid-given-name-th" {...registerField(form, "givenNameTh")} />
                  <FormMessage<RecordFormValues> name="givenNameTh" />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="araid-family-name-th" required>นามสกุล</FormLabel>
                  <Input id="araid-family-name-th" {...registerField(form, "familyNameTh")} />
                  <FormMessage<RecordFormValues> name="familyNameTh" />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="araid-given-name-en">ชื่อภาษาอังกฤษ</FormLabel>
                  <Input id="araid-given-name-en" {...registerField(form, "givenNameEn")} />
                  <FormMessage<RecordFormValues> name="givenNameEn" />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="araid-family-name-en">นามสกุลภาษาอังกฤษ</FormLabel>
                  <Input id="araid-family-name-en" {...registerField(form, "familyNameEn")} />
                  <FormMessage<RecordFormValues> name="familyNameEn" />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="araid-birth-date">วันเกิด</FormLabel>
                  <Input id="araid-birth-date" type="date" {...registerField(form, "dateOfBirth")} />
                  <FormMessage<RecordFormValues> name="dateOfBirth" />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="araid-gender">เพศ</FormLabel>
                  <Select id="araid-gender" {...registerField(form, "genderCode")}>
                    <option value="">ไม่ระบุ</option>
                    <option value="MALE">ชาย</option>
                    <option value="FEMALE">หญิง</option>
                    <option value="OTHER">อื่น ๆ</option>
                  </Select>
                  <FormMessage<RecordFormValues> name="genderCode" />
                </FormItem>
              </div>
            </section>

            <section className="mt-4 border-t border-slate-200 pt-5">
              <h3 className="text-sm font-bold text-araid-brand-deep">ข้อมูลติดต่อและที่อยู่ <span className="font-normal text-slate-500">(ไม่บังคับ)</span></h3>
              <div className="mt-4 grid gap-x-4 sm:grid-cols-2">
                <FormItem>
                  <FormLabel htmlFor="araid-phone">เบอร์โทรศัพท์</FormLabel>
                  <Input id="araid-phone" inputMode="tel" {...registerField(form, "phoneNumber")} />
                  <FormMessage<RecordFormValues> name="phoneNumber" />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="araid-email">อีเมล</FormLabel>
                  <Input id="araid-email" type="email" {...registerField(form, "emailAddress")} />
                  <FormMessage<RecordFormValues> name="emailAddress" />
                </FormItem>
                <FormItem className="sm:col-span-2">
                  <FormLabel htmlFor="araid-address">บ้านเลขที่/หมู่/ถนน</FormLabel>
                  <Input id="araid-address" {...registerField(form, "addressLine")} />
                  <FormMessage<RecordFormValues> name="addressLine" />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="araid-subdistrict">ตำบล/แขวง</FormLabel>
                  <Input id="araid-subdistrict" {...registerField(form, "subDistrictName")} />
                  <FormMessage<RecordFormValues> name="subDistrictName" />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="araid-district">อำเภอ/เขต</FormLabel>
                  <Input id="araid-district" {...registerField(form, "districtName")} />
                  <FormMessage<RecordFormValues> name="districtName" />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="araid-province">จังหวัด</FormLabel>
                  <Input id="araid-province" {...registerField(form, "provinceName")} />
                  <FormMessage<RecordFormValues> name="provinceName" />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="araid-postal-code">รหัสไปรษณีย์</FormLabel>
                  <NumericInput id="araid-postal-code" maxLength={5} {...registerField(form, "postalCode")} />
                  <FormMessage<RecordFormValues> name="postalCode" />
                </FormItem>
              </div>
            </section>
          </DialogBody>

          <DialogFooter className="m-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
            <Button onClick={() => handleOpenChange(false)} type="button" variant="outline">ยกเลิก</Button>
            <Button
              className="bg-araid-brand hover:bg-araid-brand-deep"
              icon={Save}
              isLoading={pending}
              loadingText="กำลังบันทึก"
              type="submit"
            >
              {record ? "บันทึกการแก้ไข" : "เพิ่มข้อมูล"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
