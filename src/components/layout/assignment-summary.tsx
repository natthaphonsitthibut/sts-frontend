import { Input, Textarea } from "../base";

/**
 * Read-only "มอบหมาย" step content shared by the admin case detail page and
 * the guest report page — both show the exact same shape of assignment info,
 * just sourced from different data (case follow-up round vs. guest task).
 * Callers pass already-formatted display strings so each keeps its own
 * date/time formatting utility instead of duplicating one here.
 */
export function AssignmentSummary({
  assigneeLabel,
  endsAtLabel,
  endsOnLabel,
  note,
  startsAtLabel,
  startsOnLabel,
}: {
  assigneeLabel: string;
  endsAtLabel: string;
  endsOnLabel: string;
  note: string;
  startsAtLabel: string;
  startsOnLabel: string;
}) {
  return (
    <div className="grid items-stretch gap-3 lg:grid-cols-2">
      <div className="grid content-start gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-slate-700">วันที่เริ่ม<Input disabled value={startsOnLabel} /></label>
        <label className="space-y-1 text-sm font-medium text-slate-700">เวลาเริ่ม<Input disabled value={startsAtLabel} /></label>
        <label className="space-y-1 text-sm font-medium text-slate-700">วันที่สิ้นสุด<Input disabled value={endsOnLabel} /></label>
        <label className="space-y-1 text-sm font-medium text-slate-700">เวลาสิ้นสุด<Input disabled value={endsAtLabel} /></label>
        <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">คุณครูที่ได้รับมอบหมาย<Input disabled value={assigneeLabel} /></label>
      </div>
      <label className="flex min-h-0 flex-col gap-1 text-sm font-medium text-slate-700">
        คำอธิบายเพิ่มเติม
        <Textarea className="min-h-0 flex-1 resize-none overflow-y-auto" disabled value={note} />
      </label>
    </div>
  );
}
