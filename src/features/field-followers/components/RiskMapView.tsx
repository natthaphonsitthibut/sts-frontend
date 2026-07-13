import { useEffect, useRef, useState } from "react";
import { Crosshair, LoaderCircle, MapPin } from "lucide-react";
import { appConfig } from "../../../config/env";
import { cn } from "../../../lib/utils";
import {
  loadGoogleMaps,
  type GoogleInfoWindowInstance,
  type GoogleMapInstance,
  type GoogleMarkerInstance,
} from "../../tasks/lib/google-maps-loader";

export interface RiskMapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  riskTierLabel: string;
  /** Geocoded from the registered address, not a confirmed home-visit pin —
   * rendered as a distinct amber dot instead of the default red marker. */
  isApproximate?: boolean;
}

export interface RiskMapViewProps {
  pins: RiskMapPin[];
  className?: string;
  emptyMessage?: string;
}

const THAILAND_CENTER = { lat: 13.7563, lng: 100.5018 };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * View-only multi-pin map for the field-monitor risk map — deliberately a
 * separate component from VisitMapPreview/LocationMapPicker, which are
 * single-marker and used by editable home-visit flows elsewhere.
 */
export function RiskMapView({
  pins,
  className,
  emptyMessage = "เลือกเด็กเสี่ยงจากรายการเพื่อดูตำแหน่งบ้านบนแผนที่",
}: RiskMapViewProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const markersRef = useRef<GoogleMarkerInstance[]>([]);
  const infoWindowRef = useRef<GoogleInfoWindowInstance | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    appConfig.googleMapsBrowserKey ? "loading" : "error",
  );

  function clearMarkers(google: { maps: { event: { clearInstanceListeners: (i: object) => void } } }) {
    markersRef.current.forEach((marker) => {
      google.maps.event.clearInstanceListeners(marker);
      marker.setMap(null);
    });
    markersRef.current = [];
  }

  useEffect(() => {
    return () => {
      if (window.google) {
        clearMarkers(window.google);
        if (mapRef.current) {
          window.google.maps.event.clearInstanceListeners(mapRef.current);
        }
      }
      mapRef.current = null;
      infoWindowRef.current = null;
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

        const map =
          mapRef.current ??
          new google.maps.Map(mapElementRef.current, {
            center: THAILAND_CENTER,
            zoom: 6,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
        mapRef.current = map;
        infoWindowRef.current ??= new google.maps.InfoWindow();

        clearMarkers(google);

        if (pins.length === 0) {
          map.setCenter(THAILAND_CENTER);
          map.setZoom(6);
          setLoadState("ready");
          return;
        }

        const bounds = new google.maps.LatLngBounds();
        pins.forEach((pin) => {
          const position = { lat: pin.lat, lng: pin.lng };
          const marker = new google.maps.Marker({
            map,
            position,
            title: pin.label,
            icon: pin.isApproximate
              ? {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: "#f59e0b",
                  fillOpacity: 0.9,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                }
              : undefined,
          });
          marker.addListener("click", () => {
            const note = pin.isApproximate
              ? '<div style="font-size:12px;color:var(--color-warning-700);margin-top:2px">พิกัดโดยประมาณจากที่อยู่ทะเบียน — ยังไม่ยืนยัน</div>'
              : "";
            infoWindowRef.current?.setContent(
              `<div style="font-weight:700;margin-bottom:2px">${escapeHtml(pin.label)}</div><div style="font-size:12px;color:#475569">${escapeHtml(pin.riskTierLabel)}</div>${note}`,
            );
            infoWindowRef.current?.open({ map, anchor: marker });
          });
          markersRef.current.push(marker);
          bounds.extend(position);
        });

        if (pins.length === 1) {
          map.setCenter({ lat: pins[0].lat, lng: pins[0].lng });
          map.setZoom(16);
        } else {
          map.fitBounds(bounds);
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
  }, [pins]);

  const showMap = appConfig.googleMapsBrowserKey && loadState !== "error";

  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white p-4", className)}>
      <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        {showMap ? (
          <>
            <div className="absolute inset-0" data-sts-map-surface ref={mapElementRef} />
            {loadState === "loading" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <LoaderCircle className="size-8 animate-spin text-primary" aria-hidden="true" />
              </div>
            ) : null}
            {pins.length === 0 && loadState === "ready" ? (
              <div className="absolute left-4 right-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 shadow">
                <MapPin className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                {emptyMessage}
              </div>
            ) : null}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white px-6 text-center">
            <Crosshair className="size-9 text-slate-400" aria-hidden="true" />
            <div className="text-sm font-bold text-slate-700">
              {appConfig.googleMapsBrowserKey ? "โหลดแผนที่ไม่สำเร็จ" : "ยังไม่ได้ตั้งค่า Google Maps"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
