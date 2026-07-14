import type {
  ExecutiveDataFreshness,
  ExecutiveReportingArea,
} from "../types/executive-reporting.types";

export type FreshnessState = "CURRENT" | "PARTIAL" | "MISSING";

export function getAreaLabel(area: ExecutiveReportingArea): string {
  if (area.level === "SCHOOL") return area.schoolName ?? "ไม่ระบุชื่อโรงเรียน";
  if (area.level === "DISTRICT") {
    return (
      [area.district, area.province].filter(Boolean).join(" · ") ||
      "ไม่ระบุพื้นที่"
    );
  }
  return area.province ?? "ไม่ระบุจังหวัด";
}

export function getFreshnessState(
  freshness: ExecutiveDataFreshness,
): FreshnessState {
  const timestamps = [
    freshness.riskProfileCalculatedAt,
    freshness.humanObservationAt,
    freshness.caseUpdatedAt,
  ];
  const availableCount = timestamps.filter(Boolean).length;
  if (availableCount === 0) return "MISSING";
  if (availableCount < timestamps.length) return "PARTIAL";
  return "CURRENT";
}

export function getLatestFreshnessTimestamp(
  freshness: ExecutiveDataFreshness,
): string | null {
  const timestamps = [
    freshness.riskProfileCalculatedAt,
    freshness.humanObservationAt,
    freshness.caseUpdatedAt,
  ].filter((value): value is string => Boolean(value));

  if (timestamps.length === 0) return null;
  return timestamps.reduce((latest, value) =>
    new Date(value).getTime() > new Date(latest).getTime() ? value : latest,
  );
}
