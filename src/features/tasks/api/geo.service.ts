import { apiClient } from "../../../lib/api-client";

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string | null;
  locationType: string | null;
  placeId: string | null;
  provider: "google";
}

async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const response = await apiClient.get<GeocodeResult | null>("/geo/geocode", {
    params: { address, language: "th" },
  });
  return response.data;
}

export const geoService = {
  geocodeAddress,
};
