import { PhoneCall } from "lucide-react";
import {
  Avatar,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  IconButton,
} from "../../../components/base";
import { getGuardianRelationLabel } from "../lib/guardian-relation-presentation";
import type { StudentDetail } from "../types/students.types";
import { HomeLocationDialog } from "./HomeLocationDialog";

interface StudentProfileDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  student: StudentDetail;
}

function studentFullName(student: StudentDetail): string {
  return (
    [student.FirstName_Onec, student.MiddleName_Onec, student.LastName_Onec]
      .filter(Boolean)
      .join(" ") || "นักเรียน"
  );
}

export function StudentContactDialog({
  onOpenChange,
  open,
  student,
}: StudentProfileDialogProps) {
  const studentPhone = student.contact?.phone?.trim() || "";
  const contacts = [
    ...(studentPhone
      ? [
          {
            key: "student",
            fullName: studentFullName(student),
            phone: studentPhone,
            relationLabel: "นักเรียน",
          },
        ]
      : []),
    ...(student.guardians ?? [])
      .filter((guardian) => Boolean(guardian.phone?.trim()))
      .map((guardian) => ({
        key: guardian.id,
        fullName:
          [guardian.first_name, guardian.last_name].filter(Boolean).join(" ") ||
          guardian.full_name ||
          getGuardianRelationLabel(guardian.relation, guardian.relation_note),
        phone: guardian.phone!.trim(),
        relationLabel: `${getGuardianRelationLabel(guardian.relation, guardian.relation_note)}${
          guardian.is_primary ? " · ผู้ติดต่อหลัก" : ""
        }`,
      })),
  ];

  return (
    <ContactChannelsDialog
      contacts={contacts}
      onOpenChange={onOpenChange}
      open={open}
    />
  );
}

export interface ContactChannel {
  key: string;
  fullName: string;
  phone: string;
  relationLabel: string;
}

interface ContactChannelsDialogProps {
  contacts: ContactChannel[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/**
 * The student-and-guardian phone list with a call button per row — one dialog
 * for the student profile and the follow-up forms, so a phone button looks and
 * behaves the same wherever it appears.
 */
export function ContactChannelsDialog({
  contacts,
  onOpenChange,
  open,
}: ContactChannelsDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle icon={PhoneCall}>
            ช่องทางติดต่อนักเรียนและผู้ปกครอง
          </DialogTitle>
        </DialogHeader>
        {contacts.length > 0 ? (
          <ul className="space-y-3">
            {contacts.map((contact) => {
              const phoneHref = `tel:${contact.phone.replace(/[^\d+]/g, "")}`;
              return (
                <li
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                  key={contact.key}
                >
                  <Avatar
                    className="bg-primary-soft font-semibold text-primary"
                    fallback={contact.fullName}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {contact.fullName}
                      </span>
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                        {contact.relationLabel}
                      </span>
                    </div>
                    <div className="mt-1 text-sm tabular-nums text-slate-600">
                      {contact.phone}
                    </div>
                  </div>
                  <IconButton
                    aria-label={`โทร ${contact.fullName} ${contact.phone}`}
                    icon={PhoneCall}
                    onClick={() => {
                      window.location.href = phoneHref;
                    }}
                    title={`โทร ${contact.phone}`}
                    variant="contact"
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center">
            <PhoneCall
              className="mb-2 size-8 text-slate-400"
              aria-hidden="true"
            />
            <div className="text-sm font-semibold text-slate-700">
              ยังไม่มีเบอร์ติดต่อ
            </div>
            <p className="mt-1 text-xs text-slate-500">
              ไม่พบเบอร์ของนักเรียนหรือผู้ปกครองในข้อมูลปัจจุบัน
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function StudentLocationDialog({
  onOpenChange,
  open,
  student,
}: StudentProfileDialogProps) {
  return (
    <HomeLocationDialog
      location={{
        address: typeof student.address === "string" ? student.address : null,
        province: student.ProvinceNameThai_Onec,
        district: student.DistrictNameThai_Onec,
        subDistrict: student.SubDistrictNameThai_Onec,
        postalCode: student.PostalCode_Onec,
        lat: student.resolved_home_lat,
        lng: student.resolved_home_lng,
        isApproximate: student.is_approximate_home_location,
      }}
      name={studentFullName(student)}
      onOpenChange={onOpenChange}
      open={open}
    />
  );
}
