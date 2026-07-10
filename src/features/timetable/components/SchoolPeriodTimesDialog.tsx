import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  Badge,
  Button,
  Checkbox,
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
  useConfirm,
} from "../../../components/base";
import { TimePicker } from "../../admin/components/TimePicker";
import {
  useGeneratePeriodTimes,
  useOverridePeriodTime,
  usePeriodTimes,
} from "../hooks/useTimetable";
import { DAY_LABELS } from "../lib/period-times";
import type { SchoolPeriodTime } from "../types/timetable.types";

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const EMPTY_PERIOD_TIMES: SchoolPeriodTime[] = [];

const generateSchema = z
  .object({
    daysOfWeek: z.array(z.number()).min(1, "เลือกอย่างน้อย 1 วัน"),
    periodsCount: z.number().int().min(1).max(20),
    firstPeriodStartsAt: z.string().regex(/^\d{2}:\d{2}$/, "กรุณาระบุเวลา"),
    periodLengthMinutes: z.number().int().min(1),
    breakAfterPeriod: z.number().int().min(1).optional(),
    breakMinutes: z.number().int().min(0).optional(),
    lunchAfterPeriod: z.number().int().min(1).optional(),
    lunchMinutes: z.number().int().min(0).optional(),
  })
  .refine((v) => v.periodsCount >= (v.breakAfterPeriod ?? 0), {
    message: "คาบที่พักต้องไม่เกินจำนวนคาบทั้งหมด",
    path: ["breakAfterPeriod"],
  })
  .refine((v) => v.periodsCount >= (v.lunchAfterPeriod ?? 0), {
    message: "คาบที่พักเที่ยงต้องไม่เกินจำนวนคาบทั้งหมด",
    path: ["lunchAfterPeriod"],
  });

type GenerateFormValues = z.infer<typeof generateSchema>;

function optionalNumber(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
}

function OverrideRow({
  row,
  schoolId,
  showDay = true,
}: {
  row: SchoolPeriodTime;
  schoolId: number;
  showDay?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [startsAt, setStartsAt] = useState(row.starts_at.slice(0, 5));
  const [endsAt, setEndsAt] = useState(row.ends_at.slice(0, 5));
  const override = useOverridePeriodTime();

  function handleSave(): void {
    override.mutate(
      { schoolId, dayOfWeek: row.day_of_week, period: row.period, startsAt, endsAt },
      { onSuccess: () => setEditing(false) },
    );
  }

  const sourceLabel =
    row.source === "MANUAL" ? "แก้เอง" : row.source === "BACKFILL" ? "ค่าตั้งต้น" : "สร้างอัตโนมัติ";
  const sourceVariant = row.source === "MANUAL" ? "warning" : "secondary";

  return (
    <tr className="h-16 border-t border-slate-100">
      {showDay ? (
        <td className="px-3 py-2 align-middle text-sm text-slate-700">{DAY_LABELS[row.day_of_week]}</td>
      ) : null}
      <td className="w-20 px-3 py-2 align-middle text-sm text-slate-700">คาบ {row.period}</td>
      <td className="w-[300px] px-3 py-2 align-middle">
        {editing ? (
          <div className="grid w-[280px] grid-cols-[1fr_auto_1fr] items-center gap-1.5">
            <TimePicker
              ariaLabel={`เวลาเริ่มคาบ ${row.period}`}
              onChange={setStartsAt}
              value={startsAt}
            />
            <span className="text-slate-400">–</span>
            <TimePicker
              ariaLabel={`เวลาสิ้นสุดคาบ ${row.period}`}
              onChange={setEndsAt}
              value={endsAt}
            />
          </div>
        ) : (
          <span className="text-sm text-slate-700">
            {row.starts_at.slice(0, 5)}–{row.ends_at.slice(0, 5)}
          </span>
        )}
      </td>
      <td className="w-28 px-3 py-2 align-middle">
        <Badge className="whitespace-nowrap text-[11px]" variant={sourceVariant}>
          {sourceLabel}
        </Badge>
      </td>
      <td className="w-36 px-3 py-2 align-middle text-right">
        {editing ? (
          <div className="flex justify-end gap-1.5 whitespace-nowrap">
            <Button onClick={() => setEditing(false)} size="sm" variant="outline">
              ยกเลิก
            </Button>
            <Button isLoading={override.isPending} onClick={handleSave} size="sm">
              บันทึก
            </Button>
          </div>
        ) : (
          <Button onClick={() => setEditing(true)} size="sm" variant="outline">
            แก้ไข
          </Button>
        )}
      </td>
    </tr>
  );
}

interface SchoolPeriodTimesDialogProps {
  onClose: () => void;
  open: boolean;
  schoolId: number;
  schoolName: string;
}

export function SchoolPeriodTimesDialog({
  onClose,
  open,
  schoolId,
  schoolName,
}: SchoolPeriodTimesDialogProps) {
  const periodTimesQuery = usePeriodTimes(open ? schoolId : null);
  const generate = useGeneratePeriodTimes();
  const { confirm, dialog } = useConfirm();
  const rows = periodTimesQuery.data?.data ?? EMPTY_PERIOD_TIMES;
  const currentDays = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.day_of_week))).sort(
        (left, right) => left - right,
      ),
    [rows],
  );
  const [selectedCurrentDay, setSelectedCurrentDay] = useState<number | null>(null);

  const form = useForm<GenerateFormValues>({
    defaultValues: {
      daysOfWeek: [1, 2, 3, 4, 5],
      periodsCount: 8,
      firstPeriodStartsAt: "08:30",
      periodLengthMinutes: 50,
      breakAfterPeriod: undefined,
      breakMinutes: undefined,
      lunchAfterPeriod: 4,
      lunchMinutes: 70,
    },
    resolver: zodResolver(generateSchema),
  });
  const selectedDays = useWatch({ control: form.control, name: "daysOfWeek" }) ?? [];
  const effectiveCurrentDay =
    selectedCurrentDay && currentDays.includes(selectedCurrentDay)
      ? selectedCurrentDay
      : (currentDays[0] ?? null);
  const visibleRows = effectiveCurrentDay
    ? rows.filter((row) => row.day_of_week === effectiveCurrentDay)
    : [];

  async function handleGenerate(values: GenerateFormValues): Promise<void> {
    const manualDaysAffected = rows.some(
      (row) => row.source === "MANUAL" && values.daysOfWeek.includes(row.day_of_week),
    );
    if (manualDaysAffected) {
      const accepted = await confirm({
        title: "แทนที่เวลาคาบที่เคยแก้เองไหม?",
        description:
          "บางวันที่เลือกมีเวลาคาบที่เคยแก้เองไว้ — การสร้างใหม่จะแทนที่ค่าเดิมทั้งหมดของวันนั้น",
        confirmText: "แทนที่",
        variant: "destructive",
      });
      if (!accepted) return;
    }
    generate.mutate({ schoolId, ...values });
  }

  return (
    <Dialog onOpenChange={(next) => !next && onClose()} open={open}>
      <DialogContent className="max-w-4xl" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>ตั้งเวลาคาบเรียน — {schoolName}</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[70vh] space-y-6 overflow-y-auto">
          <Form form={form} onSubmit={handleGenerate}>
            <div className="space-y-3 rounded-lg border border-slate-200 p-3">
              <h3 className="text-sm font-bold text-slate-900">สร้างตารางเวลาอัตโนมัติ</h3>
              <FormErrorAlert error={generate.error} fallback="สร้างตารางเวลาไม่สำเร็จ" />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormItem>
                  <FormLabel htmlFor="pt-first-start" required>
                    เวลาเริ่มคาบ 1
                  </FormLabel>
                  <TimePicker
                    ariaLabel="เวลาเริ่มคาบ 1"
                    onChange={(val) => form.setValue("firstPeriodStartsAt", val, { shouldValidate: true })}
                    value={form.watch("firstPeriodStartsAt")}
                  />
                  <FormMessage<GenerateFormValues> name="firstPeriodStartsAt" />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="pt-length" required>
                    ความยาวคาบ (นาที)
                  </FormLabel>
                  <Input
                    id="pt-length"
                    type="number"
                    {...form.register("periodLengthMinutes", { valueAsNumber: true })}
                  />
                  <FormMessage<GenerateFormValues> name="periodLengthMinutes" />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="pt-count" required>
                    จำนวนคาบ
                  </FormLabel>
                  <Input
                    id="pt-count"
                    type="number"
                    {...form.register("periodsCount", { valueAsNumber: true })}
                  />
                  <FormMessage<GenerateFormValues> name="periodsCount" />
                </FormItem>
                <div />
                <FormItem>
                  <FormLabel htmlFor="pt-break-after">พักหลังคาบที่ (ถ้ามี)</FormLabel>
                  <Input
                    id="pt-break-after"
                    placeholder="เช่น 1"
                    type="number"
                    {...form.register("breakAfterPeriod", { setValueAs: optionalNumber })}
                  />
                  <FormMessage<GenerateFormValues> name="breakAfterPeriod" />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="pt-break-minutes">พักนาน (นาที)</FormLabel>
                  <Input
                    id="pt-break-minutes"
                    placeholder="เช่น 10"
                    type="number"
                    {...form.register("breakMinutes", { setValueAs: optionalNumber })}
                  />
                  <FormMessage<GenerateFormValues> name="breakMinutes" />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="pt-lunch-after">พักเที่ยงหลังคาบที่ (ถ้ามี)</FormLabel>
                  <Input
                    id="pt-lunch-after"
                    placeholder="เช่น 4"
                    type="number"
                    {...form.register("lunchAfterPeriod", { setValueAs: optionalNumber })}
                  />
                  <FormMessage<GenerateFormValues> name="lunchAfterPeriod" />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="pt-lunch-minutes">พักเที่ยงนาน (นาที)</FormLabel>
                  <Input
                    id="pt-lunch-minutes"
                    placeholder="เช่น 70"
                    type="number"
                    {...form.register("lunchMinutes", { setValueAs: optionalNumber })}
                  />
                  <FormMessage<GenerateFormValues> name="lunchMinutes" />
                </FormItem>
              </div>
              <div>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  ใช้กับวัน
                </span>
                <div className="flex flex-wrap gap-3">
                  {DAYS.map((day) => {
                    const checked = selectedDays.includes(day);
                    return (
                      <Checkbox
                        checked={checked}
                        key={day}
                        label={DAY_LABELS[day]}
                        onChange={(e) => {
                          const next = e.currentTarget.checked
                            ? [...selectedDays, day]
                            : selectedDays.filter((d) => d !== day);
                          form.setValue("daysOfWeek", next, { shouldValidate: true });
                        }}
                      />
                    );
                  })}
                </div>
                <FormMessage<GenerateFormValues> name="daysOfWeek" />
              </div>
              <div className="flex justify-end">
                <Button isLoading={generate.isPending} loadingText="กำลังสร้าง" type="submit">
                  สร้าง/แทนที่ตารางเวลา
                </Button>
              </div>
            </div>
          </Form>

          <div>
            <h3 className="mb-2 text-sm font-bold text-slate-900">ตารางเวลาปัจจุบัน</h3>
            {periodTimesQuery.isError ? (
              <p className="text-sm text-danger-600">โหลดตารางเวลาไม่สำเร็จ</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-slate-500">
                ยังไม่มีตารางเวลา — ใช้ฟอร์มด้านบนเพื่อสร้างครั้งแรก
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 p-2">
                  <div className="flex flex-wrap gap-1.5">
                    {currentDays.map((day) => (
                      <Button
                        className="h-8 px-2.5"
                        key={day}
                        onClick={() => setSelectedCurrentDay(day)}
                        size="sm"
                        type="button"
                        variant={effectiveCurrentDay === day ? "default" : "outline"}
                      >
                        {DAY_LABELS[day]}
                      </Button>
                    ))}
                  </div>
                </div>
                <table className="w-full table-fixed text-left">
                  <thead>
                    <tr className="bg-muted">
                      <th className="w-24 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
                        คาบ
                      </th>
                      <th className="w-[320px] px-3 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
                        เวลา
                      </th>
                      <th className="w-28 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
                        ที่มา
                      </th>
                      <th className="w-36 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <OverrideRow
                        key={`${row.id}-${row.starts_at}-${row.ends_at}`}
                        row={row}
                        schoolId={schoolId}
                        showDay={false}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onClose} type="button" variant="outline">
            ปิด
          </Button>
        </DialogFooter>
      </DialogContent>
      {dialog}
    </Dialog>
  );
}
