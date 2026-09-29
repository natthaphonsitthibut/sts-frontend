import { Badge } from "../../../components/base";
import { formatThaiDateTime } from "../../../lib/date-time";
import {
  formatAuditLogDetailValue,
  getAuditLogTargetLabel,
  hasAuditLogTargetReference,
} from "../lib/audit-log-presentation";
import type { AuditLogEntry } from "../types/audit-log.types";

export function AuditLogDetailBlock({ entry }: { entry: AuditLogEntry }) {
  const hasTargetReference = hasAuditLogTargetReference(entry);

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg bg-slate-50 px-4 py-3">
        <dt className="text-xs font-semibold text-slate-500">เลขรายการ</dt>
        <dd className="mt-1 text-sm font-semibold leading-6 text-slate-800">
          #{entry.id}
        </dd>
      </div>
      <div className="rounded-lg bg-slate-50 px-4 py-3">
        <dt className="text-xs font-semibold text-slate-500">เวลา</dt>
        <dd className="mt-1 text-sm font-semibold leading-6 tabular-nums text-slate-800">
          {formatThaiDateTime(entry.createdAt)}
        </dd>
      </div>
      <div className="rounded-lg bg-slate-50 px-4 py-3">
        <dt className="text-xs font-semibold text-slate-500">การดำเนินการ</dt>
        <dd className="mt-1 text-sm font-semibold leading-6 text-slate-800">
          <Badge variant="secondary">{entry.actionLabel}</Badge>
        </dd>
      </div>
      <div className="rounded-lg bg-slate-50 px-4 py-3">
        <dt className="text-xs font-semibold text-slate-500">ผู้ทำรายการ</dt>
        <dd className="mt-1 text-sm font-semibold leading-6 text-slate-800">
          {entry.actorLabel}
        </dd>
      </div>
      {hasTargetReference ? (
        <div className="rounded-lg bg-slate-50 px-4 py-3 sm:col-span-2">
          <dt className="text-xs font-semibold text-slate-500">เป้าหมาย</dt>
          <dd className="mt-1 break-words text-sm font-semibold leading-6 text-slate-800">
            {getAuditLogTargetLabel(entry)}
          </dd>
        </div>
      ) : null}
      {entry.details.map((detail) => (
        <div className="rounded-lg bg-slate-50 px-4 py-3" key={detail.label}>
          <dt className="text-xs font-semibold text-slate-500">
            {detail.label}
          </dt>
          <dd className="mt-1 break-words text-sm font-semibold leading-6 text-slate-800">
            {formatAuditLogDetailValue(detail.value, detail.label)}
          </dd>
        </div>
      ))}
      {entry.details.length === 0 ? (
        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500 sm:col-span-2">
          ไม่มีรายละเอียดเพิ่มเติมสำหรับรายการนี้
        </div>
      ) : null}
    </dl>
  );
}
