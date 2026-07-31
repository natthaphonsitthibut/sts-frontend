import type { StudentGuardianRelation } from "../types/students.types";

/**
 * Single source for how a guardian relation code reads in Thai. The API returns
 * the raw code (FATHER/MOTHER/GUARDIAN) on student pages and on the guest
 * home-visit form alike, so every surface renders it from here instead of
 * keeping its own copy of the wording.
 */
export const GUARDIAN_RELATION_LABELS: Record<StudentGuardianRelation, string> = {
  FATHER: "บิดา",
  MOTHER: "มารดา",
  GUARDIAN: "ผู้ปกครอง",
};

export function getGuardianRelationLabel(
  relation: string | null | undefined,
  relationNote?: string | null,
): string {
  const label =
    relation && relation in GUARDIAN_RELATION_LABELS
      ? GUARDIAN_RELATION_LABELS[relation as StudentGuardianRelation]
      : GUARDIAN_RELATION_LABELS.GUARDIAN;

  const note = relationNote?.trim();
  if (label === GUARDIAN_RELATION_LABELS.GUARDIAN && note) {
    return `${label} (${note})`;
  }
  return label;
}
