import { Input, Textarea } from "../../../components/base";
import { formatThaiDate, formatThaiDateTime } from "../../../lib/date-time";

const UNANSWERED = "ไม่ระบุ";
const FIELD_CLASS = "flex flex-col gap-1 text-sm font-medium text-slate-700";

interface ReferralSummaryProps {
  agencyName: string | null;
  agencyKindLabel: string | null;
  referredAt: string | null | undefined;
  referredBy: string | null | undefined;
  referralNote: string | null | undefined;
  /** The agency's link window, when the page shows it (the agency's own page). */
  linkWindow?: { startsAt: string | null; expiresAt: string | null };
}

/**
 * What the school sent: step "ส่งต่อหน่วยงาน", read-only, the same on the case
 * page and on the agency's referral link — like `AssignmentSummary` is for a
 * home-visit round.
 */
export function ReferralSummary({
  agencyName,
  agencyKindLabel,
  referredAt,
  referredBy,
  referralNote,
  linkWindow,
}: ReferralSummaryProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className={FIELD_CLASS}>
        หน่วยงาน
        <Input disabled value={agencyName || UNANSWERED} />
      </label>
      <label className={FIELD_CLASS}>
        ประเภทหน่วยงาน
        <Input disabled value={agencyKindLabel || UNANSWERED} />
      </label>
      <label className={FIELD_CLASS}>
        วันที่ส่งต่อ
        <Input disabled value={referredAt ? formatThaiDate(referredAt) : "-"} />
      </label>
      <label className={FIELD_CLASS}>
        ผู้ส่งต่อ
        <Input disabled value={referredBy || UNANSWERED} />
      </label>
      {linkWindow ? (
        <>
          <label className={FIELD_CLASS}>
            เริ่มรายงานได้
            <Input
              disabled
              value={
                linkWindow.startsAt
                  ? formatThaiDateTime(linkWindow.startsAt)
                  : "-"
              }
            />
          </label>
          <label className={FIELD_CLASS}>
            รายงานได้ถึง
            <Input
              disabled
              value={
                linkWindow.expiresAt
                  ? formatThaiDateTime(linkWindow.expiresAt)
                  : "-"
              }
            />
          </label>
        </>
      ) : null}
      <label className={`${FIELD_CLASS} sm:col-span-2`}>
        เหตุผลการส่งต่อ
        <Textarea
          className="min-h-20 resize-none overflow-y-auto"
          disabled
          rows={3}
          value={referralNote || UNANSWERED}
        />
      </label>
    </div>
  );
}
