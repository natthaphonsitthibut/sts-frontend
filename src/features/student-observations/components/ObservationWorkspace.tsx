import { CheckCircle2, History } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Checkbox,
  FormErrorAlert,
  Label,
  Select,
  Textarea,
} from "../../../components/base";
import { EmptyState, ErrorState, SkeletonStack } from "../../../components/layout/page-primitives";
import { cn } from "../../../lib/utils";
import type {
  CreateStudentObservationInput,
  ObservationCatalog,
  ObservationConcernLevel,
  StudentObservation,
} from "../types/student-observation.types";

const LEVELS: Array<{
  value: ObservationConcernLevel;
  label: string;
  description: string;
  selectedClass: string;
}> = [
  { value: "NOTE", label: "บันทึกทั่วไป", description: "ข้อมูลประกอบที่ควรเก็บไว้", selectedClass: "border-primary-200 bg-primary-50 text-primary" },
  { value: "WATCH", label: "ควรเฝ้าดู", description: "ติดตามความเปลี่ยนแปลงต่อเนื่อง", selectedClass: "border-warning-200 bg-warning-50 text-warning-700" },
  { value: "CONCERN", label: "น่ากังวล", description: "ต้องระบุเหตุผลสั้น ๆ", selectedClass: "border-danger-200 bg-danger-50 text-danger-700" },
];

const formatter = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" });

export interface ObservationWorkspaceProps {
  studentName: string;
  catalog?: ObservationCatalog;
  observations: StudentObservation[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  isSaving: boolean;
  context?: Pick<CreateStudentObservationInput, "assignmentId" | "timetableSlotId">;
  onRetry: () => void;
  onCreate: (input: CreateStudentObservationInput) => Promise<unknown>;
  footer?: React.ReactNode;
}

export function ObservationWorkspace({
  studentName,
  catalog,
  observations,
  isLoading,
  isError,
  error,
  isSaving,
  context,
  onRetry,
  onCreate,
  footer,
}: ObservationWorkspaceProps) {
  const [dimensionCode, setDimensionCode] = useState("");
  const [level, setLevel] = useState<ObservationConcernLevel>("NOTE");
  const [tagCodes, setTagCodes] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dimensions = useMemo(
    () => (catalog?.dimensions ?? []).filter((item) => item.isActive),
    [catalog?.dimensions],
  );
  const effectiveDimensionCode = dimensionCode || dimensions[0]?.code || "";
  const dimension = dimensions.find((item) => item.code === effectiveDimensionCode);
  const tags = useMemo(
    () => (catalog?.tags ?? []).filter((tag) => tag.isActive && (!tag.dimensionCode || tag.dimensionCode === effectiveDimensionCode)),
    [catalog?.tags, effectiveDimensionCode],
  );
  const commentRequired =
    level === "CONCERN" ||
    Boolean(dimension?.requiresComment) ||
    tags.some((tag) => tagCodes.includes(tag.code) && tag.requiresComment);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    setSaved(false);
    if (!effectiveDimensionCode) {
      setValidationError("กรุณาเลือกด้านที่พบ");
      return;
    }
    if (commentRequired && !comment.trim()) {
      setValidationError("กรุณาระบุเหตุผลสั้น ๆ สำหรับข้อสังเกตนี้");
      return;
    }
    await onCreate({
      studentTermId: "",
      ...context,
      dimensionCode: effectiveDimensionCode,
      concernLevel: level,
      tagCodes,
      comment: comment.trim() || undefined,
    });
    setLevel("NOTE");
    setTagCodes([]);
    setComment("");
    setSaved(true);
  }

  if (isLoading) return <SkeletonStack lines={6} />;
  if (isError || !catalog) {
    return <ErrorState title="โหลดแบบบันทึกข้อสังเกตไม่สำเร็จ" onRetry={onRetry} />;
  }

  return (
    <div className="space-y-5">
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <p className="text-sm text-slate-500">
          บันทึกสิ่งที่พบจริงของ {studentName} ข้อมูลจะส่งเข้าคิวรายงานตามระดับข้อสังเกต
        </p>
        <div>
          <Label htmlFor="observation-workspace-dimension">ด้านที่พบ</Label>
          <Select
            id="observation-workspace-dimension"
            value={effectiveDimensionCode}
            onChange={(event) => {
              setDimensionCode(event.target.value);
              setTagCodes([]);
              setSaved(false);
            }}
          >
            {dimensions.map((item) => <option key={item.code} value={item.code}>{item.labelTh}</option>)}
          </Select>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-slate-700">ระดับข้อสังเกต</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {LEVELS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={level === item.value}
                className={cn(
                  "min-h-20 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  level === item.value ? item.selectedClass : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
                onClick={() => { setLevel(item.value); setSaved(false); }}
              >
                <span className="block font-bold">{item.label}</span>
                <span className="mt-1 block text-xs opacity-80">{item.description}</span>
              </button>
            ))}
          </div>
        </fieldset>
        {tags.length > 0 ? (
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-slate-700">สิ่งที่พบ</legend>
            <div className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
              {tags.map((tag) => (
                <Checkbox
                  key={tag.code}
                  label={tag.labelTh}
                  checked={tagCodes.includes(tag.code)}
                  onChange={(event) => setTagCodes((current) => event.target.checked ? [...current, tag.code] : current.filter((code) => code !== tag.code))}
                />
              ))}
            </div>
          </fieldset>
        ) : null}
        <div>
          <Label htmlFor="observation-workspace-comment">รายละเอียดเพิ่มเติม {commentRequired ? "(จำเป็น)" : "(ไม่บังคับ)"}</Label>
          <Textarea id="observation-workspace-comment" maxLength={2000} rows={3} value={comment} onChange={(event) => setComment(event.target.value)} />
        </div>
        {validationError ? <Alert variant="destructive"><AlertTitle>ข้อมูลยังไม่ครบ</AlertTitle><AlertDescription>{validationError}</AlertDescription></Alert> : null}
        <FormErrorAlert error={error} fallback="บันทึกข้อสังเกตไม่สำเร็จ" />
        {saved ? <Alert variant="success"><AlertTitle className="flex items-center gap-2"><CheckCircle2 className="size-4" />บันทึกเรียบร้อย</AlertTitle></Alert> : null}
        <div className="flex justify-end"><Button type="submit" isLoading={isSaving} loadingText="กำลังบันทึก">บันทึกข้อสังเกต</Button></div>
      </form>

      <section className="border-t border-slate-200 pt-4">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-800"><History className="size-4 text-primary" />ประวัติข้อสังเกต</h3>
        {observations.length === 0 ? (
          <EmptyState icon={History} title="ยังไม่มีข้อสังเกต" />
        ) : (
          <ol className="space-y-2">
            {observations.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={item.concernLevel === "CONCERN" ? "destructive" : item.concernLevel === "WATCH" ? "warning" : "secondary"}>
                    {LEVELS.find((levelItem) => levelItem.value === item.concernLevel)?.label}
                  </Badge>
                  <span className="font-bold text-slate-800">{item.dimension.labelTh}</span>
                </div>
                {item.comment ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.comment}</p> : null}
                <p className="mt-2 text-xs text-slate-500">{item.author.displayName} · {formatter.format(new Date(item.observedAt))}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
      {footer}
    </div>
  );
}
