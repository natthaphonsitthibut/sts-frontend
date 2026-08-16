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
  // The note shares the grid rows with the fields beside it, so its top and
  // bottom edges are the same lines as the first and last field by
  // construction. Spacing uses `gap` rather than child margins, which would sit
  // outside the flex calculation and leave the box short.
  const fieldClass = "flex flex-col gap-1 text-sm font-medium text-slate-700";
  return (
    <div className="grid gap-3 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto]">
      <div
        className="grid content-start gap-3 sm:grid-cols-2 lg:col-start-1 lg:row-span-3 lg:row-start-1"
        data-assignment-summary-fields
      >
        <label className={fieldClass}>วันที่เริ่ม<Input disabled value={startsOnLabel} /></label>
        <label className={fieldClass}>เวลาเริ่ม<Input disabled value={startsAtLabel} /></label>
        <label className={fieldClass}>วันที่สิ้นสุด<Input disabled value={endsOnLabel} /></label>
        <label className={fieldClass}>เวลาสิ้นสุด<Input disabled value={endsAtLabel} /></label>
        <label className={`${fieldClass} sm:col-span-2`}>คุณครูที่ได้รับมอบหมาย<Input disabled value={assigneeLabel} /></label>
      </div>
      <label
        className="flex min-h-0 flex-col gap-1 text-sm font-medium text-slate-700 lg:col-start-2 lg:row-span-3 lg:row-start-1"
        data-assignment-summary-note
      >
        คำอธิบายเพิ่มเติม
        <Textarea className="min-h-0 flex-1 resize-none overflow-y-auto" disabled value={note} />
      </label>
    </div>
  );
}
