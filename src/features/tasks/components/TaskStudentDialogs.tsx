import { HomeLocationDialog } from "../../students/components/HomeLocationDialog";
import { ContactChannelsDialog } from "../../students/components/StudentProfileDialogs";
import { getGuardianRelationLabel } from "../../students/lib/guardian-relation-presentation";
import type { TaskAccessTask } from "../types/task.types";

interface TaskStudentDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  task: TaskAccessTask;
}

/**
 * The phone button on a follow-up form's student card — the same contact
 * dialog the student profile opens, fed from the task's contact channels.
 */
export function TaskStudentContactsDialog({
  onOpenChange,
  open,
  task,
}: TaskStudentDialogProps) {
  const contacts = (task.contact_channels ?? [])
    .filter((contact) => Boolean(contact.phone?.trim()))
    .map((contact, index) => {
      const isStudent = contact.contact_kind === "STUDENT";
      const relationLabel = isStudent
        ? "นักเรียน"
        : getGuardianRelationLabel(
            contact.relation ?? null,
            contact.relation_note ?? null,
          );
      return {
        key: `${contact.contact_kind}-${index}`,
        fullName:
          contact.full_name?.trim() ||
          (isStudent ? task.student_name || "นักเรียน" : relationLabel),
        phone: contact.phone!.trim(),
        relationLabel: `${relationLabel}${
          contact.is_primary && !isStudent ? " · ผู้ติดต่อหลัก" : ""
        }`,
      };
    });

  return (
    <ContactChannelsDialog
      contacts={contacts}
      onOpenChange={onOpenChange}
      open={open}
    />
  );
}

/**
 * The map button on a follow-up form's student card — the same home dialog the
 * case page and the student profile open.
 */
export function TaskStudentHomeDialog({
  onOpenChange,
  open,
  task,
}: TaskStudentDialogProps) {
  return (
    <HomeLocationDialog
      location={{
        address: task.student_address || task.address_line,
        province: task.address_province,
        district: task.address_district,
        subDistrict: task.address_sub_district,
        postalCode: task.postal_code,
        lat: task.student_lat,
        lng: task.student_lng,
        isApproximate: undefined,
      }}
      name={task.student_name || "นักเรียน"}
      onOpenChange={onOpenChange}
      open={open}
    />
  );
}
