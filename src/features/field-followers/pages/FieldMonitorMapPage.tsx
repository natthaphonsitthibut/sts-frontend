import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Map as MapIcon, X } from "lucide-react";
import { Alert, AlertDescription, Badge, Button } from "../../../components/base";
import { PageShell, PageToolbar } from "../../../components/layout/page-primitives";
import { getApiErrorMessage } from "../../../lib/api-error";
import { RiskChildPicker, type RiskChildOption } from "../components/RiskChildPicker";
import { RiskMapView, type RiskMapPin } from "../components/RiskMapView";
import { useFieldMonitorMap } from "../hooks/useFieldFollowers";
import { FIELD_MONITOR_MAP_MAX_STUDENTS } from "../types/field-monitor-map.types";

const MAX_SELECTED = FIELD_MONITOR_MAP_MAX_STUDENTS;

const RISK_TIER_LABELS: Record<string, string> = {
  HIGH: "เสี่ยงสูง",
  MEDIUM: "เสี่ยงกลาง",
  LOW: "เสี่ยงต่ำ",
  WATCH: "เฝ้าระวัง",
  NORMAL: "ปกติ",
};

function parseInitialSelection(raw: string | null): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_SELECTED);
}

export function FieldMonitorMapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(parseInitialSelection(searchParams.get("studentUuids"))),
  );
  // Names for ids picked via the checkbox list this session — a deep-link
  // entry only carries bare ids, so those fall back to the map API response
  // (see displayList below) instead of living in this cache.
  const [knownOptions, setKnownOptions] = useState<Map<string, RiskChildOption>>(
    () => new Map(),
  );

  const mapQuery = useFieldMonitorMap(Array.from(selectedIds));

  // Keep the URL in sync so refresh/back preserves the selection and the
  // "ดูบนแผนที่" deep link from a list page is just this same query string.
  useEffect(() => {
    if (selectedIds.size === 0) {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ studentUuids: Array.from(selectedIds).join(",") }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  const displayList = useMemo(() => {
    return Array.from(selectedIds).map((id) => {
      const known = knownOptions.get(id);
      if (known) return known;
      const resolved = mapQuery.data?.data.find((pin) => pin.student_uuid === id);
      return {
        id,
        name: resolved?.student_name ?? id,
        school: resolved?.school_name ?? "",
      };
    });
  }, [selectedIds, knownOptions, mapQuery.data]);

  function handleToggle(student: RiskChildOption, checked: boolean): void {
    if (checked) {
      setSelectedIds((current) => {
        if (current.size >= MAX_SELECTED) return current;
        return new Set(current).add(student.id);
      });
      setKnownOptions((current) => new Map(current).set(student.id, student));
    } else {
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(student.id);
        return next;
      });
    }
  }

  function handleRemove(id: string): void {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  const pins: RiskMapPin[] = (mapQuery.data?.data ?? [])
    .filter((pin) => pin.has_coordinates && pin.lat !== null && pin.lng !== null)
    .map((pin) => ({
      id: pin.student_uuid,
      lat: pin.lat as number,
      lng: pin.lng as number,
      label: pin.student_name,
      riskTierLabel: RISK_TIER_LABELS[pin.risk_tier] ?? pin.risk_tier,
    }));

  const missingCoordinatesCount = (mapQuery.data?.data ?? []).filter(
    (pin) => !pin.has_coordinates,
  ).length;

  return (
    <PageShell>
      <PageToolbar
        description="เลือกเด็กเสี่ยงเองทีละคน/ชุด (สูงสุด 50 คน) เพื่อดูตำแหน่งบ้านบนแผนที่ — ไม่มีโหมดแสดงทั้งหมด"
        icon={MapIcon}
        title="แผนที่เด็กเสี่ยง"
      />

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">เลือกเด็กเสี่ยง</h3>
              <Badge variant={selectedIds.size >= MAX_SELECTED ? "warning" : "secondary"}>
                {selectedIds.size}/{MAX_SELECTED}
              </Badge>
            </div>
            <RiskChildPicker
              maxSelected={MAX_SELECTED}
              onToggle={handleToggle}
              selectedIds={selectedIds}
            />
          </div>

          {displayList.length > 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-extrabold text-slate-900">รายชื่อที่เลือก</h3>
              <ul className="space-y-2">
                {displayList.map((student) => (
                  <li
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
                    key={student.id}
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                      {student.name}
                    </span>
                    <Button
                      aria-label={`เอา ${student.name} ออก`}
                      icon={X}
                      onClick={() => handleRemove(student.id)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      เอาออก
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          {mapQuery.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {getApiErrorMessage(mapQuery.error, "โหลดตำแหน่งบ้านไม่สำเร็จ")}
              </AlertDescription>
            </Alert>
          ) : null}
          {missingCoordinatesCount > 0 ? (
            <Alert variant="warning">
              <AlertDescription>
                {missingCoordinatesCount} คนที่เลือกยังไม่มีพิกัดบ้านในระบบ จึงไม่ขึ้นหมุด
              </AlertDescription>
            </Alert>
          ) : null}
          <RiskMapView pins={pins} />
        </div>
      </div>
    </PageShell>
  );
}
