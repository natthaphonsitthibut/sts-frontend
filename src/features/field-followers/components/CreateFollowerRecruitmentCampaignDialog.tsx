import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Button,
  Combobox,
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
  Textarea,
} from "../../../components/base";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import type { CreateFollowerRecruitmentCampaignPayload } from "../types/follower-recruitment-campaign.types";

const DATE_INPUT_CLASS_NAME =
  "text-slate-900 [color-scheme:light] [-webkit-text-fill-color:#0f172a] [&::-webkit-datetime-edit]:text-slate-900 [&::-webkit-datetime-edit-day-field]:text-slate-900 [&::-webkit-datetime-edit-month-field]:text-slate-900 [&::-webkit-datetime-edit-year-field]:text-slate-900";

const campaignSchema = z
  .object({
    name: z.string().trim().min(1, "กรุณาระบุชื่อลิงก์รับสมัคร").max(200),
    description: z.string().trim().max(1000).optional(),
    opensOn: z.string(),
    closesOn: z.string(),
  })
  .refine((value) => !value.opensOn || !value.closesOn || value.opensOn <= value.closesOn, {
    message: "วันปิดรับสมัครต้องไม่ก่อนวันเปิดรับสมัคร",
    path: ["closesOn"],
  });

type CampaignFormValues = z.infer<typeof campaignSchema>;

interface CreateFollowerRecruitmentCampaignDialogProps {
  error: unknown;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateFollowerRecruitmentCampaignPayload) => void;
  open: boolean;
}

export function CreateFollowerRecruitmentCampaignDialog({
  error,
  isPending,
  onClose,
  onSubmit,
  open,
}: CreateFollowerRecruitmentCampaignDialogProps) {
  const area = useSchoolAreaFilter();
  const form = useForm<CampaignFormValues>({
    defaultValues: { name: "", description: "", opensOn: "", closesOn: "" },
    resolver: zodResolver(campaignSchema),
  });

  useEffect(() => {
    if (open) form.reset({ name: "", description: "", opensOn: "", closesOn: "" });
  }, [form, open]);

  function handleSubmit(values: CampaignFormValues): void {
    const hasAreaScope = Boolean(area.province || area.district || area.subDistrict);
    onSubmit({
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      data_scope: hasAreaScope
        ? {
            provinces: area.province ? [area.province] : undefined,
            districts: area.district ? [area.district] : undefined,
            sub_districts: area.subDistrict ? [area.subDistrict] : undefined,
          }
        : undefined,
      // Coarse-grained on purpose (day boundary, not exact time) — mirrors
      // school-term date handling elsewhere in the app.
      opens_at: values.opensOn || undefined,
      closes_at: values.closesOn || undefined,
    });
  }

  return (
    <Dialog onOpenChange={(next) => !next && onClose()} open={open}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>สร้างลิงก์รับสมัคร อสม./ผู้ติดตาม</DialogTitle>
        </DialogHeader>
        <Form form={form} onSubmit={handleSubmit}>
          <DialogBody>
            <FormErrorAlert className="mb-3" error={error} fallback="สร้างลิงก์รับสมัครไม่สำเร็จ" />
            <div className="space-y-3">
              <FormItem>
                <FormLabel htmlFor="campaign-name" required>
                  ชื่อลิงก์
                </FormLabel>
                <Input
                  id="campaign-name"
                  placeholder="เช่น รับสมัคร อสม. อำเภอเมือง รุ่น 1"
                  {...form.register("name")}
                />
                <FormMessage<CampaignFormValues> name="name" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="campaign-description">รายละเอียด (ถ้ามี)</FormLabel>
                <Textarea id="campaign-description" rows={2} {...form.register("description")} />
                <FormMessage<CampaignFormValues> name="description" />
              </FormItem>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  ขอบเขตพื้นที่ (ไม่เลือก = ใช้ขอบเขตของคุณ)
                </span>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Combobox
                    onChange={area.setProvince}
                    options={[
                      { value: "", label: "ทุกจังหวัดในขอบเขตของคุณ" },
                      ...area.provinces.map((name) => ({ value: name, label: name })),
                    ]}
                    placeholder="จังหวัด"
                    value={area.province}
                  />
                  <Combobox
                    disabled={!area.province}
                    onChange={area.setDistrict}
                    options={[
                      { value: "", label: "ทุกอำเภอ/เขต" },
                      ...area.districts.map((name) => ({ value: name, label: name })),
                    ]}
                    placeholder="อำเภอ/เขต"
                    value={area.district}
                  />
                  <Combobox
                    disabled={!area.district}
                    onChange={area.setSubDistrict}
                    options={[
                      { value: "", label: "ทุกตำบล/แขวง" },
                      ...area.subDistricts.map((name) => ({ value: name, label: name })),
                    ]}
                    placeholder="ตำบล/แขวง"
                    value={area.subDistrict}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormItem>
                  <FormLabel htmlFor="campaign-opens-on">เปิดรับสมัครตั้งแต่ (ไม่ระบุ = เปิดทันที)</FormLabel>
                  <Input
                    className={DATE_INPUT_CLASS_NAME}
                    id="campaign-opens-on"
                    type="date"
                    {...form.register("opensOn")}
                  />
                  <FormMessage<CampaignFormValues> name="opensOn" />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="campaign-closes-on">ปิดรับสมัครวันที่ (ไม่ระบุ = ไม่หมดอายุ)</FormLabel>
                  <Input
                    className={DATE_INPUT_CLASS_NAME}
                    id="campaign-closes-on"
                    type="date"
                    {...form.register("closesOn")}
                  />
                  <FormMessage<CampaignFormValues> name="closesOn" />
                </FormItem>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={onClose} type="button" variant="outline">
              ยกเลิก
            </Button>
            <Button isLoading={isPending} loadingText="กำลังสร้าง" type="submit">
              สร้างลิงก์
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
