import { FileText } from "lucide-react";
import { resolveApiMediaUrl } from "../../../lib/media-url";
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
        {value || "-"}
      </dd>
    </div>
  );
}

function resolveVisitAttachmentUrl(path: string): string {
  // `FilesController` checks permission and then mints a short-lived signed
  // storage URL, just like the profile-photo routes. Keep the storage key out
  // of the public URL and let a fresh guarded request happen after every reload.
  return resolveApiMediaUrl(`/api${path}`) ?? path;
}

export function VisitAttachments({
  emptyLabel,
  value,
}: {
  emptyLabel?: string;
  value: string | null | undefined;
}) {
  if (!value) {
    return emptyLabel ? <p className="text-sm text-slate-500">{emptyLabel}</p> : null;
  }

  let paths: string[] = [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      paths = parsed.filter(
        (path): path is string => typeof path === "string" && path.startsWith("/uploads/"),
      );
    }
  } catch {
    paths = [];
  }

  if (paths.length === 0) {
    return emptyLabel ? <p className="text-sm text-slate-500">{emptyLabel}</p> : null;
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-slate-700">ไฟล์แนบการติดตาม</h4>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {paths.map((path, index) => {
          const attachmentUrl = resolveVisitAttachmentUrl(path);
          const isImage = /\.(?:jpe?g|png|webp)$/i.test(path);
          return (
            <a
              className={isImage ? undefined : "flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-sm font-semibold text-slate-700"}
              href={attachmentUrl}
              key={path}
              rel="noreferrer"
              target="_blank"
            >
              {isImage ? (
                <img
                  alt={`ไฟล์แนบการติดตาม ${index + 1}`}
                  className="aspect-video w-full rounded-lg border border-slate-200 object-cover"
                  loading="lazy"
                  src={attachmentUrl}
                />
              ) : (
                <>
                  <FileText className="size-7 text-primary" aria-hidden="true" />
                  <span>ไฟล์แนบ {index + 1}</span>
                </>
              )}
            </a>
          );
        })}
      </div>
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

  return (
    <>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <RoundDetailItem
          label="ผลประเมินหลังลงพื้นที่"
          value={formatFollowUpProblemCategory({
            code: round.follow_up_problem_category_code,
            label: round.follow_up_problem_category_label,
            guidance: round.follow_up_problem_category_guidance,
          })}
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
          label="รายละเอียดจากการเยี่ยมบ้าน"
          value={round.cause_detail}
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
