import { Badge } from "../../../components/base";
import { formatThaiDateTime } from "../../../lib/date-time";
import {
  getAuditLogTargetLabel,
  hasAuditLogTargetReference,
} from "../lib/audit-log-presentation";
import type { AuditLogEntry } from "../types/audit-log.types";

export function AuditLogDetailBlock({
  entry,
  showSummary = true,
}: {
  entry: AuditLogEntry;
  showSummary?: boolean;
}) {
  const hasTargetReference = hasAuditLogTargetReference(entry);

  return (
    <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
      {showSummary ? (
        <>
          <dt className="font-semibold text-slate-500">เวลา</dt>
          <dd className="font-medium tabular-nums text-slate-800">
            {formatThaiDateTime(entry.createdAt)}
          </dd>
          <dt className="font-semibold text-slate-500">ประเภท</dt>
          <dd>
            <Badge variant="secondary">{entry.actionLabel}</Badge>
          </dd>
          <dt className="font-semibold text-slate-500">ผู้ทำรายการ</dt>
          <dd className="font-medium text-slate-800">{entry.actorLabel}</dd>
          {hasTargetReference ? (
            <>
              <dt className="font-semibold text-slate-500">เป้าหมาย</dt>
              <dd className="break-all font-medium text-slate-800">
                {getAuditLogTargetLabel(entry)}
              </dd>
            </>
          ) : null}
        </>
      ) : null}
      {entry.details.map((detail) => (
        <div className="contents" key={detail.label}>
          <dt className="font-semibold text-slate-500">{detail.label}</dt>
          <dd className="break-words font-medium text-slate-800">{String(detail.value)}</dd>
        </div>
      ))}
      {entry.details.length === 0 ? (
        <div className="text-sm font-medium text-slate-500">ไม่มีรายละเอียดเพิ่มเติม</div>
      ) : null}
    </dl>
  );
}
