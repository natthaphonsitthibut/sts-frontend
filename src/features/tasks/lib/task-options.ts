// Single source of truth for the case-dashboard filter dropdown AND the stat cards,
// so the two never drift apart. `tone` drives the SummaryMetrics card color.
export const VISIT_CAUSE_CATEGORY_OPTIONS = [
  { value: "ECONOMIC", label: "ปัญหาทางเศรษฐกิจ" },
  { value: "FAMILY", label: "ปัญหาครอบครัว" },
  { value: "HEALTH", label: "ปัญหาสุขภาพ" },
  { value: "MIGRATION", label: "ย้ายถิ่นฐาน" },
  { value: "DISABILITY", label: "ความพิการ" },
  { value: "BEHAVIOR", label: "ปัญหาพฤติกรรม" },
  { value: "OTHER", label: "อื่นๆ" },
] as const;
