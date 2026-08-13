import type { ReactNode } from "react";
import { History, MapPin, PhoneCall, TriangleAlert } from "lucide-react";
import { IconButton, PersonIcon } from "../base";
import { Card } from "../base/card";
import { formatThaiDateTime } from "../../lib/date-time";

export interface TrackingHistoryItem {
  id: string;
  assignee: string;
  at: string | null | undefined;
  reason: string;
  note: string;
}

/**
 * "ข้อมูลนักเรียน" card shared by the admin case detail page and the guest
 * report page — same avatar/name/contact-buttons/note/history layout, just
 * sourced from different data shapes per caller.
 */
export function StudentTrackingCard({
  avatar,
  historyItems,
  name,
  noteLabel = "หมายเหตุ",
  noteValue,
  onOpenContacts,
  onOpenLocation,
  schoolLine,
}: {
  avatar: ReactNode;
  historyItems: TrackingHistoryItem[];
  name: string;
  noteLabel?: string;
  noteValue: string;
  onOpenContacts: () => void;
  onOpenLocation: () => void;
  schoolLine: string;
}) {
  return (
    <Card className="mb-5 p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <PersonIcon className="size-5 text-ink" aria-hidden="true" />
        ข้อมูลนักเรียน
      </h2>
      <div className="mt-5 grid items-stretch gap-5 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5 sm:flex-row lg:border-r lg:border-slate-200 lg:pr-5">
          {avatar}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="truncate text-xl font-bold text-slate-900">{name}</h3>
              <div className="flex shrink-0 gap-2">
                <IconButton
                  aria-label="ดูเบอร์ติดต่อนักเรียน"
                  icon={PhoneCall}
                  onClick={onOpenContacts}
                  size="sm"
                  title="ดูเบอร์ติดต่อนักเรียน"
                  variant="default"
                />
                <IconButton
                  aria-label="ดูพิกัดบ้านนักเรียน"
                  icon={MapPin}
                  onClick={onOpenLocation}
                  size="sm"
                  title="ดูพิกัดบ้านนักเรียน"
                  variant="default"
                />
              </div>
            </div>
            <p className="mt-1 text-sm text-slate-500">{schoolLine}</p>
            <div className="mt-3">
              <p className="flex items-center gap-1 text-sm font-semibold text-slate-800">
                <TriangleAlert className="size-4 text-danger" aria-hidden="true" />
                {noteLabel}
              </p>
              <div className="mt-1 h-24 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                {noteValue || "ไม่มีข้อมูลการบันทึก"}
              </div>
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-col self-stretch">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <History className="size-4" aria-hidden="true" />
            ประวัติการติดตาม
          </h3>
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
            {historyItems.length === 0 ? (
              <p className="flex min-h-24 items-center justify-center text-sm text-slate-500">
                ไม่มีข้อมูลการบันทึก
              </p>
            ) : (
              <div className="space-y-2">
                {historyItems.map((item) => (
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700" key={item.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-800">ผู้ติดตาม: {item.assignee}</span>
                      <span className="shrink-0 tabular-nums text-slate-500">{formatThaiDateTime(item.at)}</span>
                    </div>
                    <p className="mt-1">สาเหตุการติดตาม: {item.reason}</p>
                    <p className="mt-1">คำอธิบายเพิ่มเติม: {item.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
