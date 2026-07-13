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
  InfoTooltip,
  Input,
  TimePicker,
  useConfirm,
} from "../../../components/base";
import { cn } from "../../../lib/utils";
import {
  useGeneratePeriodTimes,
  useOverridePeriodTime,
  usePeriodTimes,
} from "../hooks/useTimetable";
import { addHoursToTime, DAY_LABELS, formatDurationHours, hoursBetween } from "../lib/period-times";
import type { SchoolPeriodTime } from "../types/timetable.types";

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const EMPTY_PERIOD_TIMES: SchoolPeriodTime[] = [];

const generateSchema = z
  .object({
    daysOfWeek: z.array(z.number()).min(1, "เลือกอย่างน้อย 1 วัน"),
    periodsCount: z
      .number({ error: "กรุณาระบุจำนวนคาบ" })
      .int("จำนวนคาบต้องเป็นจำนวนเต็ม")
      .min(1, "ต้องมีอย่างน้อย 1 คาบ")
      .max(20, "ได้สูงสุด 20 คาบ"),
    firstPeriodStartsAt: z.string().regex(/^\d{2}:\d{2}$/, "กรุณาระบุเวลา"),
    periodLengthMinutes: z
      .number({ error: "กรุณาระบุความยาวคาบ" })
      .int("ความยาวคาบต้องเป็นจำนวนเต็ม")
      .min(1, "ความยาวคาบต้องมากกว่า 0 นาที"),
    breakAfterPeriod: z
      .number({ error: "กรุณาระบุคาบที่พัก" })
      .int("คาบที่พักต้องเป็นจำนวนเต็ม")
      .min(1, "คาบที่พักต้องมากกว่า 0")
      .optional(),
    breakMinutes: z
      .number({ error: "กรุณาระบุจำนวนนาทีที่พัก" })
      .int("จำนวนนาทีที่พักต้องเป็นจำนวนเต็ม")
      .min(0, "จำนวนนาทีที่พักต้องไม่ติดลบ")
      .optional(),
    lunchAfterPeriod: z
      .number({ error: "กรุณาระบุคาบที่พักเที่ยง" })
      .int("คาบที่พักเที่ยงต้องเป็นจำนวนเต็ม")
      .min(1, "คาบที่พักเที่ยงต้องมากกว่า 0")
      .optional(),
    lunchMinutes: z
      .number({ error: "กรุณาระบุจำนวนนาทีพักเที่ยง" })
      .int("จำนวนนาทีพักเที่ยงต้องเป็นจำนวนเต็ม")
      .min(0, "จำนวนนาทีพักเที่ยงต้องไม่ติดลบ")
      .optional(),
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
  const [durationInput, setDurationInput] = useState(() =>
    formatDurationHours(hoursBetween(row.starts_at.slice(0, 5), row.ends_at.slice(0, 5))),
  );
  const override = useOverridePeriodTime();
  const durationHours = Number(durationInput);
  const isDurationInvalid = durationInput.trim() !== "" && !Number.isFinite(durationHours);
  const isEndBeforeStart = endsAt <= startsAt;
  const durationHint = isDurationInvalid
    ? "จำนวนชั่วโมงไม่ถูกต้อง"
    : isEndBeforeStart
      ? "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม"
      : "ทศนิยมของชั่วโมง เช่น 1.5 = 1 ชั่วโมง 30 นาที, 0.75 = 45 นาที (ไม่ใช่นาฬิกา 1.30)";
  // Start time is the anchor: nudging it keeps the period's length and
  // shifts the end time to match, instead of leaving a stale end behind.
  function handleStartChange(value: string): void {
    setStartsAt(value);
    if (Number.isFinite(durationHours)) {
      setEndsAt(addHoursToTime(value, durationHours));
    } else {
      setDurationInput(formatDurationHours(hoursBetween(value, endsAt)));
    }
  }

  // Entering a duration derives the end time from the current start.
  function handleDurationChange(value: string): void {
    setDurationInput(value);
    const parsed = Number(value);
    if (value.trim() !== "" && Number.isFinite(parsed)) {
      setEndsAt(addHoursToTime(startsAt, parsed));
    }
  }

  // Entering an end time derives the duration from the current start.
  function handleEndChange(value: string): void {
    setEndsAt(value);
    setDurationInput(formatDurationHours(hoursBetween(startsAt, value)));
  }

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
      <td className="w-[440px] px-3 py-2 align-middle">
        {editing ? (
          <div className="flex flex-nowrap items-center gap-2">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
              <TimePicker
                ariaLabel={`เวลาเริ่มคาบ ${row.period}`}
                onChange={handleStartChange}
                value={startsAt}
              />
              <span className="text-slate-500">–</span>
              <TimePicker
                ariaLabel={`เวลาสิ้นสุดคาบ ${row.period}`}
                onChange={handleEndChange}
                value={endsAt}
              />
            </div>
            <div className="flex items-center gap-1">
              <Input
                aria-label="จำนวนชั่วโมง"
                className={cn(
                  "h-9 w-24 text-sm",
                  (isDurationInvalid || isEndBeforeStart) && "border-danger-500",
                )}
                min="0"
                onChange={(event) => handleDurationChange(event.target.value)}
                step="0.25"
                type="number"
                value={durationInput}
              />
              <span className="text-xs text-slate-500">ชม.</span>
              <InfoTooltip
                align="end"
                label={durationHint}
                triggerClassName={cn(
                  (isDurationInvalid || isEndBeforeStart) &&
                    "text-danger-600 hover:text-danger-700",
                )}
              >
                {durationHint}
              </InfoTooltip>
            </div>
          </div>
        ) : (
          <span className="text-sm text-slate-700">
            {row.starts_at.slice(0, 5)}–{row.ends_at.slice(0, 5)}
          </span>
        )}
      </td>
      <td className="w-28 px-3 py-2 align-middle">
        <Badge className="whitespace-nowrap text-xs" variant={sourceVariant}>
          {sourceLabel}
        </Badge>
      </td>
      <td className="w-36 px-3 py-2 align-middle text-right">
        {editing ? (
          <div className="flex justify-end gap-1.5 whitespace-nowrap">
            <Button onClick={() => setEditing(false)} size="sm" variant="outline">
              ยกเลิก
            </Button>
            <Button
              disabled={isDurationInvalid || isEndBeforeStart}
              isLoading={override.isPending}
              onClick={handleSave}
              size="sm"
            >
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
  const firstPeriodStartsAt = useWatch({
    control: form.control,
    name: "firstPeriodStartsAt",
  });
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
        <DialogBody className="max-h-[70vh] space-y-6 overflow-y-auto pb-2">
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
                    value={firstPeriodStartsAt}
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
                      <th className="w-[440px] px-3 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
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
