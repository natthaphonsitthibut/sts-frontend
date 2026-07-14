import { CheckCircle2, ClipboardPenLine, History } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  FormErrorAlert,
  Label,
  Select,
  Textarea,
} from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { cn } from "../../../lib/utils";
import type { TeacherAccessGuestCredential } from "../../teacher-access/hooks/useTeacherAccess";
import {
  useCreateGuestStudentObservation,
  useGuestObservationCatalog,
  useGuestStudentObservations,
} from "../hooks/useStudentObservations";
import type {
  ObservationConcernLevel,
  ObservationDimension,
} from "../types/student-observation.types";
import { GuestFollowUpPanel } from "./GuestFollowUpPanel";

const LEVELS: Array<{
  value: ObservationConcernLevel;
  label: string;
  description: string;
  selectedClass: string;
}> = [
  {
    value: "NOTE",
    label: "บันทึกทั่วไป",
    description: "ข้อมูลประกอบที่ควรเก็บไว้",
    selectedClass: "border-primary-200 bg-primary-50 text-primary",
  },
  {
    value: "WATCH",
    label: "ควรเฝ้าดู",
    description: "ติดตามความเปลี่ยนแปลงต่อเนื่อง",
    selectedClass: "border-warning-200 bg-warning-50 text-warning-700",
  },
  {
    value: "CONCERN",
    label: "น่ากังวล",
    description: "ต้องระบุเหตุผลสั้น ๆ",
    selectedClass: "border-danger-200 bg-danger-50 text-danger-700",
  },
];

const dateTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
});

interface TeacherObservationPanelProps {
  credential: TeacherAccessGuestCredential | null;
  assignmentId: number;
  student: {
    studentTermId: string;
    displayName: string;
  };
  onClose: () => void;
}

function requiresComment(
  level: ObservationConcernLevel,
  dimension: ObservationDimension | undefined,
  selectedTagCodes: string[],
  tags: Array<{ code: string; requiresComment: boolean }>,
): boolean {
  return (
    level === "CONCERN" ||
    Boolean(dimension?.requiresComment) ||
    tags.some(
      (tag) => selectedTagCodes.includes(tag.code) && tag.requiresComment,
    )
  );
}

export function TeacherObservationPanel({
  credential,
  assignmentId,
  student,
  onClose,
}: TeacherObservationPanelProps) {
  const catalogQuery = useGuestObservationCatalog(credential, true);
  const observationsQuery = useGuestStudentObservations(
    credential,
    assignmentId,
    student.studentTermId,
  );
  const createObservation = useCreateGuestStudentObservation(credential);
  const [dimensionCode, setDimensionCode] = useState("");
  const [level, setLevel] = useState<ObservationConcernLevel>("NOTE");
  const [tagCodes, setTagCodes] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const catalog = catalogQuery.data;
  const dimensions = useMemo(
    () => (catalog?.dimensions ?? []).filter((item) => item.isActive),
    [catalog?.dimensions],
  );
  const effectiveDimensionCode = dimensionCode || dimensions[0]?.code || "";
  const selectedDimension = dimensions.find(
    (item) => item.code === effectiveDimensionCode,
  );
  const availableTags = useMemo(
    () =>
      (catalog?.tags ?? []).filter(
        (tag) =>
          tag.isActive &&
          (!tag.dimensionCode || tag.dimensionCode === effectiveDimensionCode),
      ),
    [catalog?.tags, effectiveDimensionCode],
  );
  const commentIsRequired = requiresComment(
    level,
    selectedDimension,
    tagCodes,
    availableTags,
  );

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setValidationError(null);
    setSaved(false);
    if (!effectiveDimensionCode) {
      setValidationError("กรุณาเลือกด้านที่พบ");
      return;
    }
    if (commentIsRequired && !comment.trim()) {
      setValidationError("กรุณาระบุเหตุผลสั้น ๆ สำหรับข้อสังเกตนี้");
      return;
    }
    await createObservation.mutateAsync({
      assignmentId,
      studentTermId: student.studentTermId,
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

  if (catalogQuery.isLoading) return <SkeletonStack lines={5} />;
  if (catalogQuery.isError || !catalog) {
    return (
      <ErrorState
        title="โหลดแบบบันทึกข้อสังเกตไม่สำเร็จ"
        description="กรุณาลองใหม่ หรือติดต่อผู้ดูแลหากลิงก์ไม่ครอบคลุมงานนี้"
        onRetry={() => void catalogQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardPenLine
                  className="size-5 text-primary"
                  aria-hidden="true"
                />
                บันทึกข้อสังเกต: {student.displayName}
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                เลือกข้อมูลที่พบจริง
                ระบบจะไม่เปลี่ยนระดับความเสี่ยงหรือเปิดเคสอัตโนมัติ
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              เปลี่ยนนักเรียน
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={(event) => void submit(event)}>
            <div>
              <Label htmlFor="observation-dimension">ด้านที่พบ</Label>
              <Select
                id="observation-dimension"
                value={effectiveDimensionCode}
                onChange={(event) => {
                  const nextDimensionCode = event.target.value;
                  setDimensionCode(nextDimensionCode);
                  setTagCodes((current) =>
                    current.filter((code) =>
                      (catalog.tags ?? []).some(
                        (tag) =>
                          tag.code === code &&
                          tag.isActive &&
                          (!tag.dimensionCode ||
                            tag.dimensionCode === nextDimensionCode),
                      ),
                    ),
                  );
                  setValidationError(null);
                  setSaved(false);
                }}
              >
                {dimensions.map((dimension) => (
                  <option key={dimension.code} value={dimension.code}>
                    {dimension.labelTh}
                  </option>
                ))}
              </Select>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-bold text-slate-700">
                ระดับข้อสังเกต
              </legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {LEVELS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={level === option.value}
                    className={cn(
                      "min-h-20 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      level === option.value
                        ? option.selectedClass
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                    onClick={() => {
                      setLevel(option.value);
                      setValidationError(null);
                      setSaved(false);
                    }}
                  >
                    <span className="block font-bold">{option.label}</span>
                    <span className="mt-1 block text-xs opacity-80">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-bold text-slate-700">
                สิ่งที่พบ (เลือกได้หลายข้อ)
              </legend>
              {availableTags.length === 0 ? (
                <p className="text-sm text-slate-500">
                  ด้านนี้ยังไม่มีรายการย่อย
                </p>
              ) : (
                <div className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                  {availableTags.map((tag) => (
                    <Checkbox
                      key={tag.code}
                      label={tag.labelTh}
                      checked={tagCodes.includes(tag.code)}
                      onChange={(event) => {
                        setTagCodes((current) =>
                          event.target.checked
                            ? [...current, tag.code]
                            : current.filter((code) => code !== tag.code),
                        );
                        setValidationError(null);
                        setSaved(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </fieldset>

            <div>
              <Label htmlFor="observation-comment">
                รายละเอียดเพิ่มเติม{" "}
                {commentIsRequired ? "(จำเป็น)" : "(ไม่บังคับ)"}
              </Label>
              <Textarea
                id="observation-comment"
                value={comment}
                maxLength={2000}
                rows={4}
                aria-invalid={Boolean(validationError)}
                onChange={(event) => {
                  setComment(event.target.value);
                  setValidationError(null);
                  setSaved(false);
                }}
              />
            </div>

            {validationError ? (
              <Alert variant="destructive">
                <AlertTitle>ข้อมูลยังไม่ครบ</AlertTitle>
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            ) : null}
            <FormErrorAlert
              error={createObservation.error}
              fallback="บันทึกข้อสังเกตไม่สำเร็จ"
            />
            {saved ? (
              <Alert variant="success">
                <AlertTitle className="flex items-center gap-2">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  บันทึกเรียบร้อย
                </AlertTitle>
                <AlertDescription>
                  เพิ่มข้อสังเกตในประวัติของนักเรียนแล้ว
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="flex justify-end">
              <Button
                type="submit"
                isLoading={createObservation.isPending}
                loadingText="กำลังบันทึก"
              >
                บันทึกข้อสังเกต
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <History className="size-5 text-primary" aria-hidden="true" />
            ประวัติข้อสังเกต
          </CardTitle>
        </CardHeader>
        <CardContent>
          {observationsQuery.isLoading ? (
            <SkeletonStack lines={4} />
          ) : observationsQuery.isError ? (
            <ErrorState
              title="โหลดประวัติไม่สำเร็จ"
              description="กรุณาลองใหม่อีกครั้ง"
              onRetry={() => void observationsQuery.refetch()}
            />
          ) : (observationsQuery.data?.data.length ?? 0) === 0 ? (
            <EmptyState
              icon={History}
              title="ยังไม่มีข้อสังเกต"
              description="รายการที่บันทึกจะปรากฏตามลำดับเวลาในส่วนนี้"
            />
          ) : (
            <ol className="space-y-3">
              {observationsQuery.data?.data.map((observation) => (
                <li
                  key={observation.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        observation.concernLevel === "CONCERN"
                          ? "destructive"
                          : observation.concernLevel === "WATCH"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {observation.concernLevel === "CONCERN"
                        ? "น่ากังวล"
                        : observation.concernLevel === "WATCH"
                          ? "ควรเฝ้าดู"
                          : "บันทึกทั่วไป"}
                    </Badge>
                    <span className="font-bold text-slate-800">
                      {observation.dimension.labelTh}
                    </span>
                    <span className="text-xs text-slate-500">
                      แก้ไขครั้งที่ {observation.revision}
                    </span>
                  </div>
                  {observation.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {observation.tags.map((tag) => (
                        <Badge key={tag.id} variant="secondary">
                          {tag.labelTh}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {observation.comment ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                      {observation.comment}
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs text-slate-500">
                    {observation.author.displayName} ·{" "}
                    {dateTimeFormatter.format(new Date(observation.observedAt))}
                    {observation.subject?.name
                      ? ` · ${observation.subject.name}`
                      : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
          {!observationsQuery.isLoading && !observationsQuery.isError ? (
            <GuestFollowUpPanel
              assignmentId={assignmentId}
              credential={credential}
              observations={observationsQuery.data?.data ?? []}
              studentTermId={student.studentTermId}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
