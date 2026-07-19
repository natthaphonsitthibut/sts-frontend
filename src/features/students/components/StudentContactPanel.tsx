import { Phone, Users } from "lucide-react";
import { Badge, Card } from "../../../components/base";
import type {
  StudentDetail,
  StudentGuardian,
  StudentGuardianRelation,
} from "../types/students.types";

const RELATION_LABELS: Record<StudentGuardianRelation, string> = {
  FATHER: "บิดา",
  MOTHER: "มารดา",
  GUARDIAN: "ผู้ปกครอง",
};

function toDisplay(value: string | null | undefined): string {
  return value?.trim() ? value : "-";
}

function relationLabel(guardian: StudentGuardian): string {
  if (guardian.relation === "GUARDIAN" && guardian.relation_note) {
    return `${RELATION_LABELS.GUARDIAN} (${guardian.relation_note})`;
  }
  return RELATION_LABELS[guardian.relation];
}

function ChannelList({
  email,
  line_id,
  phone,
}: {
  email: string | null;
  line_id: string | null;
  phone: string | null;
}) {
  return (
    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
      <div>
        <dt className="text-xs font-medium text-slate-500">เบอร์โทร</dt>
        <dd className="mt-1 font-semibold text-slate-800">
          {phone?.trim() ? (
            <a className="hover:text-primary hover:underline" href={`tel:${phone}`}>
              {phone}
            </a>
          ) : (
            "-"
          )}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-slate-500">อีเมล</dt>
        <dd className="mt-1 break-all font-semibold text-slate-800">
          {toDisplay(email)}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-slate-500">LINE ID</dt>
        <dd className="mt-1 break-all font-semibold text-slate-800">
          {toDisplay(line_id)}
        </dd>
      </div>
    </dl>
  );
}

export function StudentContactPanel({ student }: { student: StudentDetail }) {
  const contact = student.contact ?? null;
  const guardians = student.guardians ?? [];

  return (
    <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
          <Phone className="size-4 text-primary" aria-hidden="true" />
          ช่องทางติดต่อนักเรียน
        </h2>
        {contact ? (
          <ChannelList email={contact.email} line_id={contact.line_id} phone={contact.phone} />
        ) : (
          <p className="text-sm text-slate-500">
            ยังไม่มีช่องทางติดต่อนักเรียน เพิ่มได้จากหน้าแก้ไขข้อมูลนักเรียน
          </p>
        )}
      </Card>
      <Card className="p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
          <Users className="size-4 text-primary" aria-hidden="true" />
          ข้อมูลผู้ปกครอง
        </h2>
        {guardians.length === 0 ? (
          <p className="text-sm text-slate-500">
            ยังไม่มีข้อมูลผู้ปกครอง เพิ่มได้จากหน้าแก้ไขข้อมูลนักเรียน
          </p>
        ) : (
          <ul className="space-y-4">
            {guardians.map((guardian) => (
              <li
                key={guardian.id}
                className="rounded-lg border border-slate-100 p-3"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">
                    {[guardian.first_name, guardian.last_name]
                      .filter(Boolean)
                      .join(" ") || guardian.full_name}
                  </span>
                  <Badge variant="secondary">{relationLabel(guardian)}</Badge>
                  {guardian.is_primary ? <Badge>ผู้ติดต่อหลัก</Badge> : null}
                </div>
                <ChannelList
                  email={guardian.email}
                  line_id={guardian.line_id}
                  phone={guardian.phone}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
