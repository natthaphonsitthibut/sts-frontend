import { BellRing } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  FormErrorAlert,
  Label,
  Select,
  Textarea,
} from "../../../components/base";
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
import { ObservationWorkspace } from "./ObservationWorkspace";

function ManagedFollowUpComposer({
  observations,
  studentTermId,
}: {
  observations: StudentObservation[];
  studentTermId: string;
}) {
  const eligible = observations.filter((item) => {
    const assignmentId = Number(item.assignmentId);
    return Number.isSafeInteger(assignmentId) && assignmentId > 0;
  });
  const create = useCreateManagedFollowUp(studentTermId);
  const [sourceId, setSourceId] = useState("");
  const [urgency, setUrgency] = useState<FollowUpUrgency>("NORMAL");
  const [reason, setReason] = useState("");
  const [saved, setSaved] = useState(false);
  const selected = eligible.find((item) => item.id === sourceId);

  if (eligible.length === 0) return null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !reason.trim()) return;
    const observationId = Number(selected.id);
    const assignmentId = Number(selected.assignmentId);
    if (!Number.isSafeInteger(observationId) || !Number.isSafeInteger(assignmentId)) return;
    await create.mutateAsync({
      assignmentId,
      urgency,
      reason: reason.trim(),
      sourceObservations: [{ observationId, revision: selected.revision }],
    });
    setReason("");
    setSaved(true);
  }

  return (
    <section className="border-t border-slate-200 pt-4">
      <div className="flex items-start gap-2">
        <BellRing className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h3 className="font-bold text-slate-800">ขอให้โรงเรียนพิจารณาติดตาม</h3>
          <p className="text-sm text-slate-500">ผู้รับผิดชอบจะอนุมัติหรือไม่อนุมัติ หากอนุมัติระบบจะเปิดเคสทันที</p>
        </div>
      </div>
      <form className="mt-3 space-y-3 rounded-lg bg-slate-50 p-4" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="managed-follow-up-source">ข้อสังเกตอ้างอิง</Label>
            <Select id="managed-follow-up-source" required value={sourceId} onChange={(event) => { setSourceId(event.target.value); setSaved(false); }}>
              <option value="">เลือกข้อสังเกต</option>
              {eligible.map((item) => <option key={item.id} value={item.id}>{item.dimension.labelTh} · ครั้งที่ {item.revision}</option>)}
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
        <div>
          <Label htmlFor="managed-follow-up-reason">เหตุผลที่ขอติดตาม</Label>
          <Textarea id="managed-follow-up-reason" maxLength={1000} required rows={2} value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
        <FormErrorAlert error={create.error} fallback="ส่งคำขอติดตามไม่สำเร็จ" />
        {saved ? <Alert variant="success"><AlertTitle>ส่งคำขอแล้ว</AlertTitle><AlertDescription>คำขออยู่ในแท็บรายงานจากครูเพื่อรอพิจารณา</AlertDescription></Alert> : null}
        <div className="flex justify-end"><Button type="submit" disabled={!selected || !reason.trim()} isLoading={create.isPending} loadingText="กำลังส่ง">ส่งคำขอติดตาม</Button></div>
      </form>
    </section>
  );
}

export function ManagedObservationEntryPanel({
  studentTermId,
  studentName,
  timetableSlotId,
  allowFollowUp = false,
}: {
  studentTermId: string;
  studentName: string;
  timetableSlotId?: number;
  allowFollowUp?: boolean;
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
      footer={allowFollowUp ? <ManagedFollowUpComposer observations={rows} studentTermId={studentTermId} /> : null}
    />
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
      error={create.error}
      isSaving={create.isPending}
      context={{ timetableSlotId }}
      onRetry={() => { void catalog.refetch(); void observations.refetch(); }}
      onCreate={(input: CreateStudentObservationInput) => create.mutateAsync({ ...input, studentTermId })}
    />
  );
}
