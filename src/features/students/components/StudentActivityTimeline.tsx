import { useMemo } from "react";
import { Badge } from "../../../components/base";
import { EmptyState } from "../../../components/layout/page-primitives";
import { formatThaiDate, formatThaiTimeWithSeconds } from "../../../lib/date-time";
import type { BadgeProps } from "../../../components/base";
import { History } from "lucide-react";

/**
 * One entry on the student's timeline. Both sources — teacher comments and
 * follow-up rounds — collapse into this shape so the merged view does not need
 * to know where each entry came from beyond its label.
 */
export interface StudentTimelineEntry {
  id: string;
  /** Sort key; also what the date column shows. */
  occurredAt: string;
  sourceLabel: string;
  /** Badge treatment comes from the shared variants, never a literal colour. */
  sourceVariant: NonNullable<BadgeProps["variant"]>;
  title: string;
  lines: string[];
  /** Rendered right-aligned under the lines — status badges, links. */
  footer?: React.ReactNode;
}

/**
 * Teacher comments and follow-up rounds on one rail, newest first — the view
 * that answers "what happened to this student, in order".
 */
export function StudentActivityTimeline({ entries }: { entries: StudentTimelineEntry[] }) {
  const ordered = useMemo(
    () =>
      [...entries].sort(
        (left, right) =>
          new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
      ),
    [entries],
  );

  if (ordered.length === 0) {
    return (
      <EmptyState
        className="border-none py-6 shadow-none"
        description="ความคิดเห็นจากครูและการติดตามจะมารวมกันในไทม์ไลน์นี้"
        icon={History}
        title="ยังไม่มีความเคลื่อนไหว"
      />
    );
  }

  return (
    // No gap between items and the spacing lives inside each one, so the
    // connector runs unbroken from the first marker to the last.
    <ol>
      {ordered.map((entry, index) => (
        // Same rail shape as the ขั้นตอนการติดตาม stepper: the marker sits
        // centred against its card, with the connector filling the space above
        // and below it.
        <li
          className="grid grid-cols-[104px_minmax(0,1fr)] items-stretch gap-3 pb-4 last:pb-0"
          key={entry.id}
        >
          {/* Same rail as the ขั้นตอนการติดตาม stepper: the connector is a
              flex segment, so it keeps its distance from the marker, and the
              negative margin carries it through the row's padding to meet the
              next one instead of stopping short. */}
          <div className="flex flex-col items-center gap-2">
            <div
              aria-hidden="true"
              className={index > 0 ? "-mt-4 w-px flex-1 bg-slate-200" : "flex-1"}
            />
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-700">
              {ordered.length - index}
            </span>
            <span className="whitespace-nowrap text-xs text-slate-500">
              {formatThaiDate(entry.occurredAt)}
            </span>
            <div
              aria-hidden="true"
              className={index < ordered.length - 1 ? "-mb-4 w-px flex-1 bg-slate-200" : "flex-1"}
            />
          </div>

          <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <Badge variant={entry.sourceVariant}>{entry.sourceLabel}</Badge>
              <time className="text-xs text-slate-500" dateTime={entry.occurredAt}>
                {formatThaiTimeWithSeconds(entry.occurredAt)}
              </time>
            </div>
            <p className="mt-2 text-sm font-bold text-slate-800">{entry.title}</p>
            {entry.lines.map((line) => (
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700" key={line}>
                {line}
              </p>
            ))}
            {entry.footer ? (
              <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                {entry.footer}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
