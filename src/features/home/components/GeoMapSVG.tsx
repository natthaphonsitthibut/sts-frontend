import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MapPinned, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Button, Card, IconButton } from "../../../components/base";
import { cn } from "../../../lib/utils";
import type {
  HomeDashboardFilters,
  HomeDashboardRiskAreaDimension,
  HomeDashboardRiskAreaRanking,
} from "../types/home-dashboard.types";

type Position = [number, number];

type GeoGeometry =
  | { type: "Polygon"; coordinates: Position[][] }
  | { type: "MultiPolygon"; coordinates: Position[][][] };

interface AdministrativeFeature {
  type: "Feature";
  properties: {
    code: string;
    name: string;
    parentCode?: string;
  };
  geometry: GeoGeometry;
}

interface FeatureCollection {
  type: "FeatureCollection";
  features: AdministrativeFeature[];
}

interface LoadedMap {
  dimension: Exclude<HomeDashboardRiskAreaDimension, "SCHOOL">;
  features: AdministrativeFeature[];
}

interface MapLoadState {
  key: string;
  map?: LoadedMap;
  isError: boolean;
}

interface GeoMapSVGProps {
  backLabel?: string;
  disabled?: boolean;
  filters: HomeDashboardFilters;
  onBack?: () => void;
  onSelect?: (filter: Partial<HomeDashboardFilters>) => void;
  ranking?: HomeDashboardRiskAreaRanking;
}

interface HoveredArea {
  code: string;
  surfaceWidth: number;
  x: number;
  y: number;
}

interface MapViewState {
  key: string;
  panX: number;
  panY: number;
  scale: number;
}

interface DragState {
  originPanX: number;
  originPanY: number;
  pointerId: number;
  startX: number;
  startY: number;
}

const MAP_WIDTH = 760;
const MAP_HEIGHT = 620;
const MAP_PADDING = 22;
const NUMBER_FORMATTER = new Intl.NumberFormat("th-TH");
const MAP_ASSET_BASE = `${import.meta.env.BASE_URL.replace(/\/?$/, "/")}maps/thailand-administrative`;

const RISK_MAP_COLORS = {
  none: "var(--color-risk-map-none)",
  low: "var(--color-risk-map-low)",
  medium: "var(--color-risk-map-medium)",
  high: "var(--color-risk-map-high)",
  critical: "var(--color-risk-map-critical)",
} as const;

function normalizeAreaName(value: string): string {
  return value.trim().replace(/^(จังหวัด|อำเภอ|เขต|ตำบล|แขวง)/, "");
}

async function fetchCollection(
  path: string,
  signal: AbortSignal,
): Promise<FeatureCollection> {
  const response = await fetch(`${MAP_ASSET_BASE}/${path}`, { signal });
  if (!response.ok)
    throw new Error(`Map asset ${path} returned ${response.status}`);
  return (await response.json()) as FeatureCollection;
}

function findFeatureByName(
  features: AdministrativeFeature[],
  name: string | undefined,
): AdministrativeFeature | undefined {
  if (!name) return undefined;
  const normalized = normalizeAreaName(name);
  return features.find(
    (feature) => normalizeAreaName(feature.properties.name) === normalized,
  );
}

async function loadMap(
  filters: Pick<HomeDashboardFilters, "province" | "district">,
  signal: AbortSignal,
): Promise<LoadedMap> {
  const provinces = await fetchCollection("provinces.geojson", signal);
  if (!filters.province)
    return { dimension: "PROVINCE", features: provinces.features };

  const province = findFeatureByName(provinces.features, filters.province);
  if (!province) throw new Error(`Unknown province ${filters.province}`);
  const districts = await fetchCollection(
    `districts/${province.properties.code}.geojson`,
    signal,
  );
  if (!filters.district)
    return { dimension: "DISTRICT", features: districts.features };

  const district = findFeatureByName(districts.features, filters.district);
  if (!district) throw new Error(`Unknown district ${filters.district}`);
  const subDistricts = await fetchCollection(
    `subdistricts/${province.properties.code}.geojson`,
    signal,
  );
  return {
    dimension: "SUB_DISTRICT",
    features: subDistricts.features.filter(
      (feature) => feature.properties.parentCode === district.properties.code,
    ),
  };
}

function geometryPositions(geometry: GeoGeometry): Position[] {
  return geometry.type === "Polygon"
    ? geometry.coordinates.flat()
    : geometry.coordinates.flat(2);
}

function createProjector(features: AdministrativeFeature[]) {
  const positions = features.flatMap((feature) =>
    geometryPositions(feature.geometry),
  );
  const longitudes = positions.map(([longitude]) => longitude);
  const latitudes = positions.map(([, latitude]) => latitude);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const longitudeSpan = Math.max(maxLongitude - minLongitude, 0.0001);
  const latitudeSpan = Math.max(maxLatitude - minLatitude, 0.0001);
  const scale = Math.min(
    (MAP_WIDTH - MAP_PADDING * 2) / longitudeSpan,
    (MAP_HEIGHT - MAP_PADDING * 2) / latitudeSpan,
  );
  const renderedWidth = longitudeSpan * scale;
  const renderedHeight = latitudeSpan * scale;
  const offsetX = (MAP_WIDTH - renderedWidth) / 2;
  const offsetY = (MAP_HEIGHT - renderedHeight) / 2;

  return ([longitude, latitude]: Position): Position => [
    offsetX + (longitude - minLongitude) * scale,
    offsetY + (maxLatitude - latitude) * scale,
  ];
}

function ringPath(
  ring: Position[],
  project: (position: Position) => Position,
): string {
  return ring
    .map((position, index) => {
      const [x, y] = project(position);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ")
    .concat(" Z");
}

function geometryPath(
  geometry: GeoGeometry,
  project: (position: Position) => Position,
): string {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons
    .flatMap((polygon) => polygon.map((ring) => ringPath(ring, project)))
    .join(" ");
}

function fillForCount(count: number, maximum: number): string {
  if (count <= 0) return RISK_MAP_COLORS.none;
  const ratio = count / Math.max(maximum, 1);
  if (ratio <= 0.25) return RISK_MAP_COLORS.low;
  if (ratio <= 0.5) return RISK_MAP_COLORS.medium;
  if (ratio <= 0.75) return RISK_MAP_COLORS.high;
  return RISK_MAP_COLORS.critical;
}

function createLegend(
  maximum: number,
): Array<{ color: string; label: string }> {
  const items: Array<{ color: string; label: string }> = [
    {
      color: RISK_MAP_COLORS.none,
      label: "ไม่มีนักเรียนเสี่ยง (0 คน)",
    },
  ];
  if (maximum <= 0) return items;
  const lowEnd = Math.floor(maximum * 0.25);
  const mediumEnd = Math.floor(maximum * 0.5);
  const highEnd = Math.floor(maximum * 0.75);
  const ranges = [
    { color: RISK_MAP_COLORS.low, end: lowEnd, label: "น้อย", start: 1 },
    {
      color: RISK_MAP_COLORS.medium,
      end: mediumEnd,
      label: "ปานกลาง",
      start: lowEnd + 1,
    },
    {
      color: RISK_MAP_COLORS.high,
      end: highEnd,
      label: "สูง",
      start: mediumEnd + 1,
    },
    {
      color: RISK_MAP_COLORS.critical,
      end: maximum,
      label: "สูงมาก",
      start: highEnd + 1,
    },
  ];
  for (const range of ranges) {
    if (range.start > range.end) continue;
    const countLabel =
      range.label === "สูงมาก"
        ? `${NUMBER_FORMATTER.format(range.start)} คนขึ้นไป`
        : range.start === range.end
          ? `${NUMBER_FORMATTER.format(range.start)} คน`
          : `${NUMBER_FORMATTER.format(range.start)}–${NUMBER_FORMATTER.format(range.end)} คน`;
    items.push({ color: range.color, label: `${range.label} ${countLabel}` });
  }
  return items;
}

function targetFilter(
  dimension: LoadedMap["dimension"],
  name: string,
): Partial<HomeDashboardFilters> {
  if (dimension === "PROVINCE") return { province: name };
  if (dimension === "DISTRICT") return { district: name };
  return { subDistrict: name };
}

function mapHeading(dimension: LoadedMap["dimension"] | undefined): string {
  if (dimension === "DISTRICT") return "แผนที่นักเรียนเสี่ยงรายอำเภอ/เขต";
  if (dimension === "SUB_DISTRICT") return "แผนที่นักเรียนเสี่ยงรายตำบล/แขวง";
  return "แผนที่นักเรียนเสี่ยงรายจังหวัด";
}

function fullAreaLabel(
  dimension: LoadedMap["dimension"],
  name: string,
  province: string | undefined,
): string {
  if (dimension === "PROVINCE")
    return name === "กรุงเทพมหานคร" ? name : `จังหวัด ${name}`;
  if (dimension === "DISTRICT") {
    return province === "กรุงเทพมหานคร" ? `เขต ${name}` : `อำเภอ ${name}`;
  }
  return province === "กรุงเทพมหานคร" ? `แขวง ${name}` : `ตำบล ${name}`;
}

export default function GeoMapSVG({
  backLabel,
  disabled = false,
  filters,
  onBack,
  onSelect,
  ranking,
}: GeoMapSVGProps) {
  const mapKey = `${filters.province ?? "TH"}:${filters.district ?? "ALL"}`;
  const [loadState, setLoadState] = useState<MapLoadState>({
    key: "",
    isError: false,
  });
  const [hoveredArea, setHoveredArea] = useState<HoveredArea>();
  const [viewState, setViewState] = useState<MapViewState>({
    key: "",
    panX: 0,
    panY: 0,
    scale: 1,
  });
  const [isDragging, setIsDragging] = useState(false);
  const mapSurfaceRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | undefined>(undefined);
  const hasDraggedRef = useRef(false);
  const activeView =
    viewState.key === mapKey
      ? viewState
      : { key: mapKey, panX: 0, panY: 0, scale: 1 };
  const zoomScale = activeView.scale;
  const loadedMap = loadState.key === mapKey ? loadState.map : undefined;
  const isLoading = loadState.key !== mapKey;
  const isError = loadState.key === mapKey && loadState.isError;
  const province = filters.province;
  const district = filters.district;

  useEffect(() => {
    const controller = new AbortController();
    const requestKey = `${province ?? "TH"}:${district ?? "ALL"}`;
    void loadMap({ province, district }, controller.signal)
      .then((nextMap) => {
        setLoadState({ key: requestKey, map: nextMap, isError: false });
        setHoveredArea(undefined);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setLoadState({ key: requestKey, isError: true });
      });
    return () => controller.abort();
  }, [district, province]);

  useEffect(() => {
    const surface = mapSurfaceRef.current;
    if (!surface) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const delta = event.deltaY < 0 ? 0.3 : -0.3;
      setViewState((current) => {
        const currentView =
          current.key === mapKey
            ? current
            : { key: mapKey, panX: 0, panY: 0, scale: 1 };
        const scale = Math.min(4, Math.max(1, currentView.scale + delta));
        return {
          ...currentView,
          panX: scale === 1 ? 0 : currentView.panX,
          panY: scale === 1 ? 0 : currentView.panY,
          scale,
        };
      });
    };
    surface.addEventListener("wheel", handleWheel, {
      capture: true,
      passive: false,
    });
    return () => surface.removeEventListener("wheel", handleWheel, true);
  }, [mapKey]);

  const countsByCode = useMemo(() => {
    if (!loadedMap || ranking?.dimension !== loadedMap.dimension)
      return new Map<string, number>();
    return new Map(
      ranking.items.flatMap((item) =>
        item.areaCode ? ([[item.areaCode, item.count]] as const) : [],
      ),
    );
  }, [loadedMap, ranking]);
  const maximum = Math.max(...countsByCode.values(), 0);
  const legend = useMemo(() => createLegend(maximum), [maximum]);
  const project = useMemo(
    () =>
      loadedMap?.features.length
        ? createProjector(loadedMap.features)
        : undefined,
    [loadedMap],
  );
  const hovered = loadedMap?.features.find(
    (feature) => feature.properties.code === hoveredArea?.code,
  );
  const selectedName =
    loadedMap?.dimension === "PROVINCE"
      ? filters.province
      : loadedMap?.dimension === "DISTRICT"
        ? filters.district
        : filters.subDistrict;
  const canSelect = Boolean(onSelect && !disabled && !filters.subDistrict);

  function changeZoom(delta: number): void {
    setViewState((current) => {
      const currentView =
        current.key === mapKey
          ? current
          : { key: mapKey, panX: 0, panY: 0, scale: 1 };
      const scale = Math.min(4, Math.max(1, currentView.scale + delta));
      return {
        ...currentView,
        panX: scale === 1 ? 0 : currentView.panX,
        panY: scale === 1 ? 0 : currentView.panY,
        scale,
      };
    });
  }

  function finishDragging(event: React.PointerEvent<SVGSVGElement>): void {
    if (!dragStateRef.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = undefined;
    setIsDragging(false);
  }

  return (
    <Card
      className="overflow-hidden p-4 sm:p-6"
      data-administrative-map={loadedMap?.dimension}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-primary">
              <MapPinned aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {mapHeading(loadedMap?.dimension)}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                แสดงขอบเขตครบทุกพื้นที่ รวมพื้นที่ที่ไม่มีนักเรียนเสี่ยง
                {filters.subDistrict
                  ? " โดยไม่แสดงพิกัดโรงเรียน"
                  : " กดพื้นที่เพื่อดูระดับถัดไป"}
              </p>
            </div>
          </div>
          {onBack && backLabel ? (
            <Button
              className="shrink-0 self-start"
              data-administrative-map-back
              icon={ArrowLeft}
              onClick={onBack}
              size="sm"
              variant="outline"
            >
              {backLabel}
            </Button>
          ) : null}
        </div>
        <div className="flex max-w-sm flex-wrap gap-x-3 gap-y-1.5 text-xs text-slate-600">
          {legend.map((item) => (
            <span className="inline-flex items-center gap-1.5" key={item.label}>
              <span
                aria-hidden="true"
                className="size-2.5 rounded-sm border border-black/10"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
        <p className="text-xs leading-5 text-slate-500">
          สีเทาหมายถึงพื้นที่ที่ไม่มีนักเรียนเสี่ยง
          ส่วนพื้นที่ที่มีนักเรียนเสี่ยงแบ่งช่วงจำนวนคน 4
          ระดับจากค่าสูงสุดในขอบเขตที่กำลังดู
        </p>
      </div>

      <div
        className="relative mt-4 min-h-[28rem] rounded-lg border border-slate-200 bg-slate-50 p-2 sm:p-4"
        data-home-risk-map-surface
        ref={mapSurfaceRef}
      >
        {!isLoading && !isError ? (
          <div className="absolute right-3 top-3 z-10 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <IconButton
              aria-label="ซูมออก"
              disabled={zoomScale <= 1}
              icon={ZoomOut}
              onClick={() => changeZoom(-0.5)}
              size="sm"
              variant="ghost"
            />
            <IconButton
              aria-label="รีเซ็ตขนาดแผนที่"
              disabled={zoomScale <= 1}
              icon={RotateCcw}
              onClick={() => {
                hasDraggedRef.current = false;
                setViewState({ key: mapKey, panX: 0, panY: 0, scale: 1 });
              }}
              size="sm"
              variant="ghost"
            />
            <IconButton
              aria-label="ซูมเข้า"
              disabled={zoomScale >= 4}
              icon={ZoomIn}
              onClick={() => changeZoom(0.5)}
              size="sm"
              variant="ghost"
            />
          </div>
        ) : null}
        {isLoading ? (
          <div
            aria-label="กำลังโหลดขอบเขตแผนที่"
            className="flex min-h-[28rem] items-center justify-center text-sm text-slate-500"
            role="status"
          >
            กำลังโหลดขอบเขตแผนที่…
          </div>
        ) : isError || !loadedMap || !project ? (
          <div
            className="flex min-h-[28rem] items-center justify-center text-sm text-danger-700"
            role="alert"
          >
            โหลดขอบเขตแผนที่ไม่สำเร็จ
          </div>
        ) : (
          <svg
            aria-label={mapHeading(loadedMap.dimension)}
            className={cn(
              "mx-auto block h-auto max-h-[38rem] w-full select-none",
              zoomScale > 1 ? "touch-none" : "touch-pan-y",
              zoomScale > 1 && (isDragging ? "cursor-grabbing" : "cursor-grab"),
            )}
            onPointerCancel={finishDragging}
            onPointerDown={(event) => {
              if (zoomScale <= 1 || event.button !== 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              dragStateRef.current = {
                originPanX: activeView.panX,
                originPanY: activeView.panY,
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
              };
              hasDraggedRef.current = false;
              setHoveredArea(undefined);
              setIsDragging(true);
            }}
            onPointerMove={(event) => {
              const drag = dragStateRef.current;
              if (!drag || drag.pointerId !== event.pointerId) return;
              const renderedWidth = Math.max(
                event.currentTarget.getBoundingClientRect().width,
                1,
              );
              const viewBoxRatio = MAP_WIDTH / renderedWidth;
              const deltaX = (event.clientX - drag.startX) * viewBoxRatio;
              const deltaY = (event.clientY - drag.startY) * viewBoxRatio;
              if (Math.abs(deltaX) + Math.abs(deltaY) > 3)
                hasDraggedRef.current = true;
              const maxPanX = (MAP_WIDTH * (zoomScale - 1)) / 2;
              const maxPanY = (MAP_HEIGHT * (zoomScale - 1)) / 2;
              setViewState({
                key: mapKey,
                panX: Math.min(
                  maxPanX,
                  Math.max(-maxPanX, drag.originPanX + deltaX),
                ),
                panY: Math.min(
                  maxPanY,
                  Math.max(-maxPanY, drag.originPanY + deltaY),
                ),
                scale: zoomScale,
              });
            }}
            onPointerUp={finishDragging}
            role="group"
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          >
            <g
              className="risk-map-viewport motion-reduce:transition-none"
              style={{
                transform: `translate(${MAP_WIDTH / 2 + activeView.panX}px, ${MAP_HEIGHT / 2 + activeView.panY}px) scale(${zoomScale}) translate(${-MAP_WIDTH / 2}px, ${-MAP_HEIGHT / 2}px)`,
                transformOrigin: "0 0",
                transition: isDragging ? "none" : "transform 180ms ease-out",
              }}
            >
              {loadedMap.features.map((feature) => {
                const { code, name } = feature.properties;
                const count = countsByCode.get(code) ?? 0;
                const selected = selectedName
                  ? normalizeAreaName(selectedName) === normalizeAreaName(name)
                  : false;
                const label = `${name} นักเรียนเสี่ยง ${NUMBER_FORMATTER.format(count)} คน`;
                return (
                  <path
                    aria-label={label}
                    className={cn(
                      "transition-colors duration-150 motion-reduce:transition-none",
                      canSelect &&
                        "cursor-pointer hover:brightness-95 focus:outline-none",
                    )}
                    d={geometryPath(feature.geometry, project)}
                    data-area-code={code}
                    data-area-count={count}
                    data-area-name={name}
                    fill={fillForCount(count, maximum)}
                    fillRule="evenodd"
                    key={code}
                    onBlur={() => setHoveredArea(undefined)}
                    onClick={() => {
                      if (hasDraggedRef.current) {
                        hasDraggedRef.current = false;
                        return;
                      }
                      if (canSelect)
                        onSelect?.(targetFilter(loadedMap.dimension, name));
                    }}
                    onFocus={(event) => {
                      const surfaceRect =
                        mapSurfaceRef.current?.getBoundingClientRect();
                      const areaRect =
                        event.currentTarget.getBoundingClientRect();
                      if (!surfaceRect) return;
                      setHoveredArea({
                        code,
                        surfaceWidth: surfaceRect.width,
                        x:
                          areaRect.left + areaRect.width / 2 - surfaceRect.left,
                        y: areaRect.top + areaRect.height / 2 - surfaceRect.top,
                      });
                    }}
                    onKeyDown={(event) => {
                      if (
                        canSelect &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault();
                        onSelect?.(targetFilter(loadedMap.dimension, name));
                      }
                    }}
                    onMouseLeave={() => setHoveredArea(undefined)}
                    onPointerMove={(event) => {
                      const surfaceRect =
                        mapSurfaceRef.current?.getBoundingClientRect();
                      if (!surfaceRect) return;
                      setHoveredArea({
                        code,
                        surfaceWidth: surfaceRect.width,
                        x: event.clientX - surfaceRect.left,
                        y: event.clientY - surfaceRect.top,
                      });
                    }}
                    role={canSelect ? "button" : "img"}
                    stroke={selected ? "var(--color-ink)" : "white"}
                    strokeLinejoin="round"
                    strokeWidth={selected ? 2.5 : 0.8}
                    tabIndex={canSelect ? 0 : undefined}
                  />
                );
              })}
            </g>
          </svg>
        )}
        {hovered && hoveredArea && loadedMap ? (
          <div
            className="pointer-events-none absolute z-10 max-w-64 -translate-y-full rounded-md bg-slate-950 px-3 py-2 text-sm text-white shadow-lg"
            role="tooltip"
            style={{
              left: Math.max(
                8,
                Math.min(hoveredArea.x + 12, hoveredArea.surfaceWidth - 180),
              ),
              top: Math.max(hoveredArea.y - 8, 56),
            }}
          >
            <div className="font-semibold">
              {fullAreaLabel(
                loadedMap.dimension,
                hovered.properties.name,
                filters.province,
              )}
            </div>
            <div className="mt-0.5 text-white/80">
              นักเรียนเสี่ยง{" "}
              {NUMBER_FORMATTER.format(
                countsByCode.get(hovered.properties.code) ?? 0,
              )}{" "}
              คน
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 min-h-5 text-sm text-slate-500" role="status">
        {loadedMap?.features.length
          ? `แสดง ${NUMBER_FORMATTER.format(loadedMap.features.length)} พื้นที่`
          : " "}
      </div>
    </Card>
  );
}
