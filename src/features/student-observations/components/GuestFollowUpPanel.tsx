import { BellRing } from "lucide-react";
import { useState } from "react";
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
import type { TeacherAccessGuestCredential } from "../../teacher-access/hooks/useTeacherAccess";
import {
  useCreateGuestFollowUp,
  useGuestStudentFollowUps,
} from "../hooks/useStudentObservations";
import type {
  FollowUpStatus,
  FollowUpUrgency,
  StudentObservation,
} from "../types/student-observation.types";

const statusLabels: Record<FollowUpStatus, string> = {
  PENDING_REVIEW: "รอโรงเรียนพิจารณา",
  APPROVE_AND_ASSIGN: "อนุมัติให้มอบหมายต่อ",
  NEED_MORE_INFO: "ขอข้อมูลเพิ่ม",
  REJECT: "ไม่อนุมัติ",
};

interface GuestFollowUpPanelProps {
  assignmentId: number;
  credential: TeacherAccessGuestCredential | null;
  observations: StudentObservation[];
  studentTermId: string;
}

export function GuestFollowUpPanel({
  assignmentId,
  credential,
  observations,
  studentTermId,
}: GuestFollowUpPanelProps) {
  const followUpsQuery = useGuestStudentFollowUps(
    credential,
    assignmentId,
    studentTermId,
  );
  const createFollowUp = useCreateGuestFollowUp(credential, studentTermId);
  const [sourceId, setSourceId] = useState("");
  const [urgency, setUrgency] = useState<FollowUpUrgency>("NORMAL");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [saveResult, setSaveResult] = useState<"CREATED" | "MERGED" | null>(
    null,
  );

  const selectedObservation = observations.find(
    (observation) => observation.id === sourceId,
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedObservation || !reason.trim()) return;
    const observationId = Number(selectedObservation.id);
    if (!Number.isSafeInteger(observationId) || observationId < 1) return;
    setSaveResult(null);
    try {
      const result = await createFollowUp.mutateAsync({
        assignmentId,
        urgency,
        reason: reason.trim(),
        note: note.trim() || undefined,
        sourceObservations: [
          { observationId, revision: selectedObservation.revision },
        ],
      });
      setSaveResult(result.meta.created ? "CREATED" : "MERGED");
      setReason("");
      setNote("");
    } catch {
      // The mutation owns the sanitized error state rendered below.
    }
  }

  return (
    <section className="mt-5 border-t border-slate-200 pt-5">
      <div className="flex items-start gap-3">
        <BellRing
          className="mt-0.5 size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <div>
          <h3 className="font-semibold text-slate-900">
            ขอให้โรงเรียนพิจารณาติดตาม
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            คำขอเป็นสัญญาณให้ผู้รับผิดชอบทบทวน
            ไม่ได้เปิดเคสหรือมอบหมายงานอัตโนมัติ
          </p>
        </div>
      </div>

      {observations.length > 0 ? (
        <form
          className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4"
          onSubmit={(event) => void submit(event)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="follow-up-source">ข้อสังเกตอ้างอิง</Label>
              <Select
                id="follow-up-source"
                onChange={(event) => {
                  setSourceId(event.target.value);
                  setSaveResult(null);
                }}
                required
                value={sourceId}
              >
                <option value="">เลือกข้อสังเกต</option>
                {observations.map((observation) => (
                  <option key={observation.id} value={observation.id}>
                    {observation.dimension.labelTh} · revision{" "}
                    {observation.revision}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="follow-up-urgency">ความเร่งด่วน</Label>
              <Select
                id="follow-up-urgency"
                onChange={(event) =>
                  setUrgency(event.target.value as FollowUpUrgency)
                }
                value={urgency}
              >
                <option value="NORMAL">ปกติ</option>
                <option value="URGENT">เร่งด่วน</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="follow-up-reason">เหตุผลที่ขอติดตาม</Label>
            <Textarea
              id="follow-up-reason"
              maxLength={1000}
              onChange={(event) => setReason(event.target.value)}
              required
              rows={2}
              value={reason}
            />
          </div>
          <div>
            <Label htmlFor="follow-up-note">ข้อมูลเพิ่มเติม (ไม่บังคับ)</Label>
            <Textarea
              id="follow-up-note"
              maxLength={2000}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              value={note}
            />
          </div>
          <FormErrorAlert
            error={createFollowUp.error}
            fallback="ส่งคำขอติดตามไม่สำเร็จ"
          />
          {saveResult ? (
            <Alert variant="success">
              <AlertTitle>
                {saveResult === "CREATED"
                  ? "ส่งคำขอแล้ว"
                  : "เพิ่มหลักฐานในคำขอเดิมแล้ว"}
              </AlertTitle>
              <AlertDescription>
                ระบบรวมคำขอที่ยังรอพิจารณาเพื่อไม่ให้เกิดรายการซ้ำ
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="flex justify-end">
            <Button
              disabled={!sourceId || !reason.trim()}
              isLoading={createFollowUp.isPending}
              loadingText="กำลังส่งคำขอ"
              type="submit"
            >
              ส่งคำขอติดตาม
            </Button>
          </div>
        </form>
      ) : null}

      {followUpsQuery.isLoading ? (
        <p className="mt-4 text-sm text-slate-500" role="status">
          กำลังโหลดสถานะคำขอติดตาม…
        </p>
      ) : followUpsQuery.isError ? (
        <Alert className="mt-4" variant="warning">
          <AlertTitle>โหลดสถานะคำขอไม่สำเร็จ</AlertTitle>
          <AlertDescription>
            ประวัติข้อสังเกตส่วนอื่นยังใช้งานได้ตามปกติ
          </AlertDescription>
          <Button
            className="mt-3"
            onClick={() => void followUpsQuery.refetch()}
            size="sm"
            variant="outline"
          >
            โหลดสถานะใหม่
          </Button>
        </Alert>
      ) : (followUpsQuery.data?.data.length ?? 0) > 0 ? (
        <ul className="mt-4 space-y-2" aria-label="สถานะคำขอติดตาม">
          {followUpsQuery.data?.data.map((request) => (
            <li
              className="rounded-lg border border-slate-200 p-3"
              key={request.id}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    request.status === "PENDING_REVIEW"
                      ? "warning"
                      : "secondary"
                  }
                >
                  {statusLabels[request.status]}
                </Badge>
                <Badge
                  variant={
                    request.urgency === "URGENT" ? "destructive" : "secondary"
                  }
                >
                  {request.urgency === "URGENT" ? "เร่งด่วน" : "ปกติ"}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-slate-700">{request.reason}</p>
              {request.review?.reason ? (
                <p className="mt-1 text-xs text-slate-500">
                  ผลพิจารณา: {request.review.reason}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-500">ยังไม่มีคำขอติดตามสำหรับนักเรียนคนนี้</p>
      )}
    </section>
  );
}
