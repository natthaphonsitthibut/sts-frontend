import { appConfig } from "../../../config/env";
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

function resolveUploadUrl(path: string): string {
  const configuredBaseUrl = appConfig.apiBaseUrl.trim();
  if (!configuredBaseUrl || configuredBaseUrl === "/") return path;

  try {
    const baseUrl = configuredBaseUrl.startsWith("http")
      ? configuredBaseUrl
      : window.location.origin;
    return new URL(path, baseUrl).toString();
  } catch {
    return path;
  }
}

function VisitPhotos({ value }: { value: string | null | undefined }) {
  if (!value) return null;

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

  if (paths.length === 0) return null;

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-slate-700">รูปประกอบการติดตาม</h4>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {paths.map((path, index) => {
          const photoUrl = resolveUploadUrl(path);
          return (
            <a href={photoUrl} key={path} rel="noreferrer" target="_blank">
              <img
                alt={`รูปประกอบการติดตาม ${index + 1}`}
                className="aspect-video w-full rounded-lg border border-slate-200 object-cover"
                loading="lazy"
                src={photoUrl}
              />
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
        <RoundDetailItem label="ประเภทสาเหตุ" value={round.cause_category} />
        <RoundDetailItem
          label="ผลหลังการติดตาม"
          value={optionLabel(round.follow_up_decision)}
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
      <VisitPhotos value={round.photo_paths} />
    </>
  );
}
