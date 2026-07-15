import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Crosshair, LoaderCircle, MapPin, Search } from "lucide-react";
import { Badge, Button, Input } from "../../../components/base";
import { appConfig } from "../../../config/env";
import { normalizeCoordinate, type CoordinateValue } from "../../../lib/coordinates";
import { cn } from "../../../lib/utils";
import {
  loadGoogleMaps,
  type GoogleMapInstance,
  type GoogleMarkerInstance,
} from "../lib/google-maps-loader";

export interface VisitMapPreviewProps {
  title: string;
  lat?: CoordinateValue;
  lng?: CoordinateValue;
  address?: string | null;
  markerLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  details?: ReactNode;
  editable?: boolean;
  onCoordinateChange?: (coordinates: { lat: number; lng: number }) => void;
  onGeocode?: (address: string) => Promise<boolean>;
  isGeocoding?: boolean;
  geocodeError?: ReactNode;
  coordinateFields?: ReactNode;
}

const THAILAND_CENTER = { lat: 13.7563, lng: 100.5018 };

type SmokeInspectableMapElement = HTMLDivElement & {
  __stsGoogleMap?: GoogleMapInstance;
  __stsGoogleMarker?: GoogleMarkerInstance | null;
};

function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

export function VisitMapPreview({
  title,
  lat,
  lng,
  address,
  markerLabel = "พิกัด",
  emptyTitle = "ยังไม่มีพิกัด",
  emptyDescription = "ระบบจะแสดงหมุดเมื่อมีการบันทึกตำแหน่ง",
  className,
  details,
  editable = false,
  onCoordinateChange,
  onGeocode,
  isGeocoding = false,
  geocodeError,
  coordinateFields,
}: VisitMapPreviewProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const searchInputId = useId();
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const markerRef = useRef<GoogleMarkerInstance | null>(null);
  const onCoordinateChangeRef = useRef(onCoordinateChange);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    appConfig.googleMapsBrowserKey ? "loading" : "error",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const parsedLat = normalizeCoordinate(lat);
  const parsedLng = normalizeCoordinate(lng);
  const hasCoordinates = parsedLat !== null && parsedLng !== null;
  useEffect(() => {
    onCoordinateChangeRef.current = onCoordinateChange;
  }, [onCoordinateChange]);

  useEffect(() => {
    const mapElement = mapElementRef.current;
    return () => {
      if (markerRef.current) {
        window.google?.maps.event.clearInstanceListeners(markerRef.current);
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (appConfig.isDevelopment && mapElement) {
        const smokeElement = mapElement as SmokeInspectableMapElement;
        delete smokeElement.__stsGoogleMap;
        delete smokeElement.__stsGoogleMarker;
      }
      if (mapRef.current) {
        window.google?.maps.event.clearInstanceListeners(mapRef.current);
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!appConfig.googleMapsBrowserKey || !mapElementRef.current) {
      return;
    }

    let cancelled = false;
    void loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapElementRef.current) return;

        const center = hasCoordinates
          ? { lat: parsedLat, lng: parsedLng }
          : THAILAND_CENTER;
        const zoom = hasCoordinates ? 16 : 6;
        const map =
          mapRef.current ??
          new google.maps.Map(mapElementRef.current, {
            center,
            zoom,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
        mapRef.current = map;
        if (appConfig.isDevelopment) {
          (mapElementRef.current as SmokeInspectableMapElement).__stsGoogleMap = map;
        }
        map.setCenter(center);
        map.setZoom(zoom);
        google.maps.event.clearInstanceListeners(map);

        if (hasCoordinates) {
          const marker =
            markerRef.current ??
            new google.maps.Marker({
              draggable: editable,
              map,
              position: center,
              title: markerLabel,
          });
          markerRef.current = marker;
          if (appConfig.isDevelopment) {
            (mapElementRef.current as SmokeInspectableMapElement).__stsGoogleMarker = marker;
          }
          marker.setMap(map);
          marker.setDraggable(editable);
          marker.setPosition(center);
          google.maps.event.clearInstanceListeners(marker);
          if (editable && onCoordinateChangeRef.current) {
            marker.addListener("dragend", (event) => {
              const next = event.latLng ?? marker.getPosition();
              if (next) {
                onCoordinateChangeRef.current?.({ lat: next.lat(), lng: next.lng() });
              }
            });
          }
        } else if (markerRef.current) {
          google.maps.event.clearInstanceListeners(markerRef.current);
          markerRef.current.setMap(null);
          markerRef.current = null;
          if (appConfig.isDevelopment) {
            (mapElementRef.current as SmokeInspectableMapElement).__stsGoogleMarker = null;
          }
        }

        if (editable && onCoordinateChangeRef.current) {
          map.addListener("click", (event) => {
            if (event.latLng) {
              onCoordinateChangeRef.current?.({
                lat: event.latLng.lat(),
                lng: event.latLng.lng(),
              });
            }
          });
        }

        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setLoadState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    editable,
    hasCoordinates,
    markerLabel,
    parsedLat,
    parsedLng,
  ]);

  const showMap = appConfig.googleMapsBrowserKey && loadState !== "error";

  async function geocode(searchAddress: string): Promise<void> {
    const trimmed = searchAddress.trim();
    if (trimmed.length < 3) {
      setSearchError("กรุณากรอกที่อยู่หรือสถานที่อย่างน้อย 3 ตัวอักษร");
      return;
    }

    setSearchError(null);
    try {
      const found = await onGeocode?.(trimmed);
      if (found === false) {
        setSearchError("ไม่พบตำแหน่งจากคำค้นนี้ กรุณาลองระบุพื้นที่ให้ละเอียดขึ้น");
      }
    } catch {
      // The page-level mutation renders its existing API-safe error message.
    }
  }

  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white p-4", className)}>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MapPin className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
          </div>
          {address ? (
            <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-600">
              {address}
            </p>
          ) : null}
        </div>
        {hasCoordinates ? (
          <Badge className="shrink-0" variant="success">
            {markerLabel}
          </Badge>
        ) : (
          <Badge variant="secondary">{emptyTitle}</Badge>
        )}
      </div>

      {details ? <div className="mb-3">{details}</div> : null}

      {editable && onGeocode ? (
        <div className="mb-3 space-y-2">
          <div className="flex flex-col gap-2 lg:flex-row">
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor={searchInputId}>
                ค้นหาที่อยู่หรือสถานที่บนแผนที่
              </label>
              <div className="flex gap-2">
                <Input
                  autoComplete="off"
                  id={searchInputId}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void geocode(searchQuery);
                    }
                  }}
                  placeholder="ค้นหาที่อยู่หรือสถานที่"
                  value={searchQuery}
                />
                <Button
                  aria-label="ค้นหาตำแหน่งบนแผนที่"
                  disabled={isGeocoding}
                  icon={Search}
                  isLoading={isGeocoding}
                  loadingText="กำลังค้นหา"
                  onClick={() => void geocode(searchQuery)}
                  type="button"
                >
                  ค้นหา
                </Button>
              </div>
            </div>
            <Button
              className="shrink-0"
              disabled={!address?.trim() || isGeocoding}
              onClick={() => void geocode(address ?? "")}
              type="button"
              variant="outline"
            >
              ใช้ที่อยู่ที่กรอกไว้
            </Button>
          </div>
          <p className="text-xs font-medium text-slate-600">
            ผลค้นหาเป็นตำแหน่งโดยประมาณ — ลากหมุดปรับให้ตรงจุดจริง
          </p>
          {searchError ? (
            <p aria-live="polite" className="text-sm font-medium text-red-600">
              {searchError}
            </p>
          ) : null}
          {geocodeError}
        </div>
      ) : null}

      <div className="relative min-h-72 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        {showMap ? (
          <>
            <div className="absolute inset-0" data-sts-map-surface ref={mapElementRef} />
            {loadState === "loading" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <LoaderCircle className="size-8 animate-spin text-primary" aria-hidden="true" />
              </div>
            ) : null}
            {!hasCoordinates && loadState === "ready" ? (
              <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center gap-2 rounded-md bg-slate-900/85 px-3 py-2 text-xs font-semibold text-white">
                <Crosshair className="size-4 shrink-0" aria-hidden="true" />
                <span>{emptyDescription}</span>
              </div>
            ) : null}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white px-6 text-center">
            <Crosshair className="size-9 text-slate-500" aria-hidden="true" />
            <div className="text-sm font-bold text-slate-700">
              {appConfig.googleMapsBrowserKey ? "โหลดแผนที่ไม่สำเร็จ" : "ยังไม่ได้ตั้งค่า Google Maps"}
            </div>
            <div className="max-w-sm text-xs font-medium text-slate-500">
              {appConfig.googleMapsBrowserKey
                ? "ตรวจสอบการตั้งค่าแผนที่และสิทธิ์การใช้งาน"
                : "ตั้งค่า VITE_GOOGLE_MAPS_BROWSER_KEY เพื่อเปิดแผนที่จริงในระบบ"}
            </div>
          </div>
        )}
      </div>

      {coordinateFields ?? (hasCoordinates ? (
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <div className="text-xs font-bold text-slate-500">Latitude</div>
            <div className="font-mono font-semibold text-slate-900">
              {formatCoordinate(parsedLat)}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <div className="text-xs font-bold text-slate-500">Longitude</div>
            <div className="font-mono font-semibold text-slate-900">
              {formatCoordinate(parsedLng)}
            </div>
          </div>
        </div>
      ) : null)}
    </div>
  );
}
