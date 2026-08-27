import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import {
  AttachmentViewer,
  attachmentKindOf,
  type AttachmentViewerItem,
} from "../../../components/base";
import { resolveApiMediaUrl } from "../../../lib/media-url";
import { formatThaiDateTime } from "../../../lib/date-time";
import {
  formatFollowUpProblemCategory,
  formatOptionLabels,
} from "../lib/case-presentation";
import type { CaseFollowUpRound } from "../types/cases.types";

interface CaseFollowUpRoundDetailsProps {
  optionLabel: (code: string | null | undefined) => string | null;
  round: CaseFollowUpRound;
}

function RoundDetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
        {value || "ไม่ระบุ"}
      </dd>
    </div>
  );
}

function resolveVisitAttachmentUrl(path: string): string {
  // `FilesController` checks permission and then streams the file back itself,
  // so it decides the content type and disposition the browser sees. Keep the
  // storage key out of the public URL and let a fresh guarded request happen
  // after every reload.
  return resolveApiMediaUrl(`/api${path}`) ?? path;
}

export function VisitAttachments({
  emptyLabel,
  value,
}: {
  emptyLabel?: string;
  value: string | null | undefined;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const items = useMemo<AttachmentViewerItem[]>(() => {
    let paths: string[] = [];
    try {
      const parsed: unknown = JSON.parse(value ?? "");
      if (Array.isArray(parsed)) {
        paths = parsed.filter(
          (path): path is string =>
            typeof path === "string" && path.startsWith("/uploads/"),
        );
      }
    } catch {
      paths = [];
    }
    return paths.map((path, index) => {
      // `lastIndexOf` returns -1 for an extensionless key, and slicing on that
      // would tack the last character of the path onto the name.
      const dot = path.lastIndexOf(".");
      const extension = dot > path.lastIndexOf("/") ? path.slice(dot) : "";
      return {
        kind: attachmentKindOf(path),
        name: `ไฟล์แนบการติดตาม ${index + 1}${extension}`,
        url: resolveVisitAttachmentUrl(path),
      };
    });
  }, [value]);

  if (items.length === 0) {
    return emptyLabel ? (
      <p className="text-sm text-slate-500">{emptyLabel}</p>
    ) : null;
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-slate-700">ไฟล์แนบการติดตาม</h4>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item, index) => (
          <a
            aria-label={`เปิดดู${item.name}`}
            className={
              item.kind === "image"
                ? "block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                : "flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-sm font-semibold text-slate-700 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            }
            href={item.url}
            key={item.url}
            onClick={(event) => {
              // A plain click opens the in-page viewer; ctrl/cmd/middle clicks
              // and "open in new tab" keep the browser's own behaviour, which
              // now renders the file instead of downloading it.
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }
              event.preventDefault();
              setViewerIndex(index);
            }}
            rel="noreferrer"
            target="_blank"
          >
            {item.kind === "image" ? (
              <img
                alt={item.name}
                className="aspect-video w-full rounded-lg border border-slate-200 object-cover transition-opacity hover:opacity-90"
                loading="lazy"
                src={item.url}
              />
            ) : (
              <>
                <FileText className="size-7 text-primary" aria-hidden="true" />
                <span>ไฟล์แนบ {index + 1}</span>
              </>
            )}
          </a>
        ))}
      </div>
      <AttachmentViewer
        index={viewerIndex}
        items={items}
        onIndexChange={setViewerIndex}
      />
    </div>
  );
}

export function CaseFollowUpRoundDetails({
  optionLabel,
  round,
}: CaseFollowUpRoundDetailsProps) {
  if (!round.submitted_at) {
    return (
      <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
        รอบนี้ยังไม่ได้ส่งรายงาน
      </p>
    );
  }

  if (round.task_type === "ASSIST") {
    return (
      <>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <RoundDetailItem
            label="ผลการช่วยเหลือ"
            value={round.task_execution_outcome_label}
          />
          <RoundDetailItem
            label="วันที่ให้ความช่วยเหลือ"
            value={
              round.assisted_at ? formatThaiDateTime(round.assisted_at) : null
            }
          />
          <RoundDetailItem
            label="มาตรการช่วยเหลือ"
            value={formatOptionLabels(round.assistance_measures)}
          />
          <RoundDetailItem
            label="รายละเอียดการช่วยเหลือ"
            value={round.assistance_detail}
          />
        </dl>
        <VisitAttachments value={round.photo_paths} />
      </>
    );
  }

  return (
    <>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <RoundDetailItem
          label="ผลการติดตาม"
          value={round.task_execution_outcome_label}
        />
        {round.non_follow_up_reason_label ? (
          <RoundDetailItem
            label="สาเหตุที่ติดตามไม่สำเร็จ"
            value={round.non_follow_up_reason_label}
          />
        ) : null}
        <RoundDetailItem
          label="ประเภทปัญหาที่พบ"
          value={formatFollowUpProblemCategory({
            code: round.follow_up_problem_category_code,
            label: round.follow_up_problem_category_label,
            guidance: round.follow_up_problem_category_guidance,
          })}
        />
        <RoundDetailItem
          label="ประเภทการขาด"
          value={round.absence_reason_category_label}
        />
        <RoundDetailItem
          label="สาเหตุการขาด"
          value={round.absence_reason_label}
        />
        <RoundDetailItem
          label="ผลหลังการติดตาม"
          value={optionLabel(round.follow_up_decision)}
        />
        <RoundDetailItem
          label="สถานะของบิดา-มารดา"
          value={round.parental_status_label}
        />
        <RoundDetailItem
          label="ผู้ปกครอง"
          value={
            round.guardian_type_label && round.guardian_type_detail
              ? `${round.guardian_type_label} (${round.guardian_type_detail})`
              : round.guardian_type_label
          }
        />
        <RoundDetailItem
          label="สภาพแวดล้อมรอบที่พัก"
          value={formatOptionLabels(round.residence_environments)}
        />
        <RoundDetailItem
          label="รายละเอียดสภาพแวดล้อมรอบที่พัก"
          value={round.residence_environment_detail}
        />
        <RoundDetailItem
          label="ข้อสังเกตด้านความด้อยโอกาส"
          value={formatOptionLabels(round.observed_disadvantage_types)}
        />
        <RoundDetailItem
          label="ข้อสังเกตด้านความพิการ"
          value={formatOptionLabels(round.observed_disability_types)}
        />
        <RoundDetailItem
          label="รายละเอียดจากการเยี่ยมบ้าน"
          value={round.cause_detail}
        />
        <RoundDetailItem
          label="ที่อยู่ปัจจุบัน"
          value={
            round.address_changed
              ? round.updated_student_address ||
                "แจ้งเปลี่ยนที่อยู่ แต่ไม่มีรายละเอียด"
              : "ไม่เปลี่ยนจากข้อมูลในระบบ"
          }
        />
        <RoundDetailItem label="ข้อเสนอแนะ" value={round.recommendation} />
        {round.resolution_outcome ? (
          <RoundDetailItem
            label="ผลลัพธ์การติดตาม"
            value={optionLabel(round.resolution_outcome)}
          />
        ) : null}
        {round.visit_lat != null && round.visit_lng != null ? (
          <RoundDetailItem
            label="พิกัดที่บันทึก"
            value={`${round.visit_lat}, ${round.visit_lng}`}
          />
        ) : null}
        {round.address_changed ? (
          <RoundDetailItem
            label="ข้อมูลที่เสนอให้อัปเดต"
            value={
              round.updated_student_address ||
              (round.updated_lat != null && round.updated_lng != null
                ? `${round.updated_lat}, ${round.updated_lng}`
                : "มีการแก้ไขพิกัดบ้าน")
            }
          />
        ) : null}
      </dl>
      <VisitAttachments value={round.photo_paths} />
    </>
  );
}
