import { BellRing } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  FormErrorAlert,
  Label,
  Select,
  Textarea,
} from "../../../components/base";
import { SkeletonStack } from "../../../components/layout/page-primitives";
import { formatThaiDateTime } from "../../../lib/date-time";
import {
  useCreateManagedFollowUp,
  useCreateManagedStudentObservation,
  useCreateTaskLinkStudentObservation,
  useManagedObservationCatalog,
  useManagedStudentObservations,
  useTaskLinkObservationCatalog,
  useTaskLinkStudentObservations,
} from "../hooks/useStudentObservations";
import type {
  CreateStudentObservationInput,
  FollowUpUrgency,
  StudentObservation,
} from "../types/student-observation.types";
import { getObservationConcernPresentation } from "../lib/observation-presentation";
import { ObservationWorkspace } from "./ObservationWorkspace";

function ManagedFollowUpComposer({
  observations,
  studentTermId,
}: {
  observations: StudentObservation[];
  studentTermId: string;
}) {
  const create = useCreateManagedFollowUp(studentTermId);
  const [sourceId, setSourceId] = useState("");
  const [urgency, setUrgency] = useState<FollowUpUrgency>("NORMAL");
  const [reason, setReason] = useState("");
  const [saved, setSaved] = useState(false);
  const selected = observations.find((item) => item.id === sourceId);
  const selectedConcern = selected
    ? getObservationConcernPresentation(selected.concernLevel)
    : null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) return;
    const observationId = selected ? Number(selected.id) : null;
    if (selected && !Number.isSafeInteger(observationId)) return;
    const rawAssignmentId = selected?.assignmentId
      ? Number(selected.assignmentId)
      : undefined;
    const assignmentId =
      rawAssignmentId !== undefined &&
      Number.isSafeInteger(rawAssignmentId) &&
      rawAssignmentId > 0
        ? rawAssignmentId
        : undefined;
    try {
      await create.mutateAsync({
        assignmentId,
        urgency,
        reason: reason.trim(),
        sourceObservations: selected && observationId !== null
          ? [{ observationId, revision: selected.revision }]
          : [],
      });
    } catch {
      // Shown through create.error via FormErrorAlert.
      return;
    }
    setReason("");
    setSaved(true);
  }

  return (
    <section>
      <div className="flex items-start gap-2">
        <BellRing className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h3 className="font-bold text-slate-800">ขอเยี่ยมบ้าน</h3>
          <p className="text-sm text-slate-500">ส่งคำขอได้โดยตรง หรือเลือกข้อสังเกตเพื่อแนบเป็นหลักฐาน ผู้รับผิดชอบจะอนุมัติหรือไม่อนุมัติ</p>
        </div>
      </div>
      <form className="mt-3 space-y-3 rounded-lg bg-slate-50 p-4" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="managed-follow-up-source">ข้อสังเกตอ้างอิง (ไม่บังคับ)</Label>
            <Select id="managed-follow-up-source" value={sourceId} onChange={(event) => { setSourceId(event.target.value); setSaved(false); }}>
              <option value="">ไม่แนบข้อสังเกต</option>
              {observations.map((item) => <option key={item.id} value={item.id}>{item.dimension.labelTh} · ครั้งที่ {item.revision}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="managed-follow-up-urgency">ความเร่งด่วน</Label>
            <Select id="managed-follow-up-urgency" value={urgency} onChange={(event) => setUrgency(event.target.value as FollowUpUrgency)}>
              <option value="NORMAL">ปกติ</option>
              <option value="URGENT">เร่งด่วน</option>
            </Select>
          </div>
        </div>
        {selected && selectedConcern ? (
          <div
            aria-live="polite"
            className="border-t border-slate-200 pt-3"
            id="managed-follow-up-source-detail"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-800">
                {selected.dimension.labelTh}
              </span>
              <Badge variant={selectedConcern.variant}>{selectedConcern.label}</Badge>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {selected.comment || "ไม่ได้ระบุความเห็น"}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {selected.author.displayName} · {formatThaiDateTime(selected.observedAt)}
            </p>
          </div>
        ) : null}
        <div>
          <Label required htmlFor="managed-follow-up-reason">เหตุผลที่ขอเยี่ยมบ้าน</Label>
          <Textarea id="managed-follow-up-reason" maxLength={1000} required rows={2} value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
        <FormErrorAlert error={create.error} fallback="ส่งคำขอเยี่ยมบ้านไม่สำเร็จ" />
        {saved ? <Alert variant="success"><AlertTitle>ส่งคำขอแล้ว</AlertTitle><AlertDescription>คำขออยู่ในหน้าคำขอเยี่ยมบ้านเพื่อรอพิจารณา</AlertDescription></Alert> : null}
        <div className="flex justify-end"><Button type="submit" disabled={!reason.trim()} isLoading={create.isPending} loadingText="กำลังส่ง">ส่งคำขอเยี่ยมบ้าน</Button></div>
      </form>
    </section>
  );
}

export function ManagedObservationEntryPanel({
  studentTermId,
  studentName,
  timetableSlotId,
}: {
  studentTermId: string;
  studentName: string;
  timetableSlotId?: number;
}) {
  const catalog = useManagedObservationCatalog();
  const observations = useManagedStudentObservations(studentTermId);
  const create = useCreateManagedStudentObservation(studentTermId);
  const rows = observations.data?.data ?? [];
  return (
    <ObservationWorkspace
      studentName={studentName}
      catalog={catalog.data}
      observations={rows}
      isLoading={catalog.isLoading || observations.isLoading}
      isError={catalog.isError || observations.isError}
      loadError={catalog.error ?? observations.error}
      error={create.error}
      isSaving={create.isPending}
      context={{ timetableSlotId }}
      onRetry={() => { void catalog.refetch(); void observations.refetch(); }}
      onCreate={(input) => create.mutateAsync({
        timetableSlotId: input.timetableSlotId,
        dimensionCode: input.dimensionCode,
        concernLevel: input.concernLevel,
        tagCodes: input.tagCodes,
        comment: input.comment,
      })}
    />
  );
}

export function ManagedHomeVisitRequestPanel({ studentTermId }: { studentTermId: string }) {
  const observations = useManagedStudentObservations(studentTermId);
  if (observations.isLoading) return <SkeletonStack lines={4} />;
  return (
    <>
      {observations.isError ? (
        <Alert className="mb-4" variant="warning">
          <AlertTitle>โหลดข้อสังเกตอ้างอิงไม่สำเร็จ</AlertTitle>
          <AlertDescription>ยังส่งคำขอเยี่ยมบ้านโดยไม่แนบข้อสังเกตได้ตามปกติ</AlertDescription>
        </Alert>
      ) : null}
      <ManagedFollowUpComposer
        observations={observations.data?.data ?? []}
        studentTermId={studentTermId}
      />
    </>
  );
}

export function TaskLinkObservationEntryPanel({
  token,
  sessionToken,
  studentTermId,
  studentName,
  timetableSlotId,
}: {
  token: string;
  sessionToken?: string;
  studentTermId: string;
  studentName: string;
  timetableSlotId?: number;
}) {
  const catalog = useTaskLinkObservationCatalog(token, sessionToken, true);
  const observations = useTaskLinkStudentObservations(token, sessionToken, studentTermId, timetableSlotId);
  const create = useCreateTaskLinkStudentObservation(token, sessionToken);
  const rows = useMemo(() => observations.data?.data ?? [], [observations.data?.data]);
  return (
    <ObservationWorkspace
      studentName={studentName}
      catalog={catalog.data}
      observations={rows}
      isLoading={catalog.isLoading || observations.isLoading}
      isError={catalog.isError || observations.isError}
      loadError={catalog.error ?? observations.error}
      error={create.error}
      isSaving={create.isPending}
      context={{ timetableSlotId }}
      onRetry={() => { void catalog.refetch(); void observations.refetch(); }}
      onCreate={(input: CreateStudentObservationInput) => create.mutateAsync({ ...input, studentTermId })}
    />
  );
}
