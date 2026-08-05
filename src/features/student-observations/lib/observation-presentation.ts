import type { BadgeProps } from "../../../components/base";
import type { ObservationConcernLevel } from "../types/student-observation.types";

export const observationConcernOptions: Array<{
  value: "ALL" | ObservationConcernLevel;
  label: string;
}> = [
  { value: "ALL", label: "ทุกระดับข้อสังเกต" },
  { value: "NOTE", label: "บันทึกทั่วไป" },
  { value: "WATCH", label: "ควรเฝ้าดู" },
  { value: "CONCERN", label: "น่ากังวล" },
];

export function getObservationConcernPresentation(
  level: ObservationConcernLevel,
): { label: string; variant: BadgeProps["variant"] } {
  if (level === "CONCERN") return { label: "น่ากังวล", variant: "destructive" };
  if (level === "WATCH") return { label: "ควรเฝ้าดู", variant: "warning" };
  return { label: "บันทึกทั่วไป", variant: "secondary" };
}

export function getHomeVisitUrgencyPresentation(urgency: "NORMAL" | "URGENT") {
  return urgency === "URGENT"
    ? { label: "เร่งด่วน", variant: "destructive" as const }
    : { label: "ปกติ", variant: "secondary" as const };
}
