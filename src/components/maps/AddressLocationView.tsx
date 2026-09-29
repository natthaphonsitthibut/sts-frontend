import type { CoordinateValue } from "../../lib/coordinates";
import { LocationMapPicker } from "./LocationMapPicker";

export interface AddressLocationViewProps {
  /** The full address, shown as the heading when there is one. */
  address: string | null | undefined;
  /** Shown as the heading when the address is empty. */
  fallbackTitle: string;
  /** The address broken into labelled parts under the map. */
  parts: Array<[label: string, value: string | null | undefined]>;
  lat: CoordinateValue;
  lng: CoordinateValue;
  markerLabel: string;
  emptyDescription: string;
}

function toDisplay(value: string | null | undefined): string {
  return value?.trim() || "-";
}

/**
 * An address and its pin, read-only — the one body every "ที่อยู่และแผนที่"
 * dialog renders (student home, case, follow-up form, user address), so an
 * address looks the same wherever it is opened.
 */
export function AddressLocationView({
  address,
  emptyDescription,
  fallbackTitle,
  lat,
  lng,
  markerLabel,
  parts,
}: AddressLocationViewProps) {
  const heading = address?.trim() || "";
  const hasMapCoordinates =
    lat !== null && lat !== undefined && lng !== null && lng !== undefined;
  return (
    <LocationMapPicker
      address={heading || undefined}
      className="border-0 p-0"
      details={
        <dl className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {parts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium text-slate-500">{label}</dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {toDisplay(value)}
              </dd>
            </div>
          ))}
        </dl>
      }
      emptyDescription={emptyDescription}
      emptyTitle={hasMapCoordinates ? "มีพิกัด" : "ยังไม่มีพิกัด"}
      lat={lat}
      lng={lng}
      mapClassName="min-h-[50vh] sm:min-h-[60vh]"
      markerLabel={markerLabel}
      title={heading || fallbackTitle}
    />
  );
}
