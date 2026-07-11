export type CoordinateValue = number | string | null | undefined;

export interface Coordinates {
  lat: number;
  lng: number;
}

export function normalizeCoordinate(value: CoordinateValue): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function normalizeCoordinates(
  lat: CoordinateValue,
  lng: CoordinateValue,
): Coordinates | null {
  const parsedLat = normalizeCoordinate(lat);
  const parsedLng = normalizeCoordinate(lng);
  return parsedLat !== null && parsedLng !== null
    ? { lat: parsedLat, lng: parsedLng }
    : null;
}
