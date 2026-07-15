import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Map as MapIcon, X } from "lucide-react";
import { Alert, AlertDescription, Badge, IconButton } from "../../../components/base";
import { PageShell, PageToolbar } from "../../../components/layout/page-primitives";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { getApiErrorMessage } from "../../../lib/api-error";
import { normalizeCoordinates } from "../../../lib/coordinates";
import { RiskChildPicker, type RiskChildOption } from "../components/RiskChildPicker";
import { RiskMapView, type RiskMapPin } from "../components/RiskMapView";
import { useFieldMonitorMap } from "../hooks/useFieldFollowers";
import { FIELD_MONITOR_MAP_MAX_STUDENTS } from "../types/field-monitor-map.types";
import { getRiskTierLabel } from "../../students/lib/student-presentation";

const MAX_SELECTED = FIELD_MONITOR_MAP_MAX_STUDENTS;

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

  const mapPins = mapQuery.data?.data ?? [];

  const pins: RiskMapPin[] = mapPins.flatMap<RiskMapPin>((pin) => {
    const coordinates = pin.has_coordinates
      ? normalizeCoordinates(pin.lat, pin.lng)
      : null;
    return coordinates
      ? [{
          id: pin.student_uuid,
          lat: coordinates.lat,
          lng: coordinates.lng,
          label: pin.student_name,
          riskTierLabel: getRiskTierLabel(pin.risk_tier),
          isApproximate: pin.is_approximate,
        }]
      : [];
  });

  const approximateCount = mapPins.filter((pin) => pin.is_approximate).length;
  const stillMissingCount = mapPins.filter((pin) => !pin.has_coordinates).length;

  return (
    <PageShell>
      <PageToolbar
        description="เลือกเด็กเสี่ยงเองทีละคน/ชุด (สูงสุด 50 คน) เพื่อดูตำแหน่งบ้านบนแผนที่ — ไม่มีโหมดแสดงทั้งหมด"
        footerActions={<RefreshButton onRefresh={() => mapQuery.refetch()} />}
        icon={MapIcon}
        title="แผนที่เด็กเสี่ยง"
      />

      <div className="space-y-5">
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

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-extrabold text-slate-900">รายชื่อที่เลือก</h3>
          {displayList.length > 0 ? (
            <ul className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
              {displayList.map((student) => (
                <li
                  className="flex h-fit items-center gap-2 rounded-full bg-slate-50 py-1 pl-3 pr-1"
                  key={student.id}
                >
                  <span className="max-w-[220px] truncate text-sm font-medium text-slate-800">
                    {student.name}
                  </span>
                  <IconButton
                    aria-label={`เอา ${student.name} ออก`}
                    icon={X}
                    onClick={() => handleRemove(student.id)}
                    size="sm"
                    variant="ghost"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">ยังไม่ได้เลือกเด็กเสี่ยง</p>
          )}
        </div>

        <div className="space-y-3">
          {mapQuery.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {getApiErrorMessage(mapQuery.error, "โหลดตำแหน่งบ้านไม่สำเร็จ")}
              </AlertDescription>
            </Alert>
          ) : null}
          {approximateCount > 0 ? (
            <Alert variant="warning">
              <AlertDescription>
                {approximateCount} คนใช้พิกัดโดยประมาณจากที่อยู่ทะเบียน (หมุดสีเหลือง) —
                ยังไม่ใช่พิกัดที่ยืนยันจากการเยี่ยมบ้านจริง
              </AlertDescription>
            </Alert>
          ) : null}
          {stillMissingCount > 0 ? (
            <Alert variant="warning">
              <AlertDescription>
                {stillMissingCount} คนที่เลือกยังไม่มีพิกัดบ้านหรือที่อยู่ในระบบ จึงไม่ขึ้นหมุด
              </AlertDescription>
            </Alert>
          ) : null}
          <RiskMapView pins={pins} />
        </div>
      </div>
    </PageShell>
  );
}
