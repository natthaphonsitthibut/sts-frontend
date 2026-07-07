import { appConfig } from "../../../config/env";

export interface GoogleLatLng {
  lat: () => number;
  lng: () => number;
}

export interface GoogleMapMouseEvent {
  latLng?: GoogleLatLng | null;
}

export interface GoogleMapsApi {
  maps: {
    Map: new (
      element: HTMLElement,
      options: {
        center: { lat: number; lng: number };
        zoom: number;
        mapTypeControl?: boolean;
        streetViewControl?: boolean;
        fullscreenControl?: boolean;
      },
    ) => GoogleMapInstance;
    Marker: new (options: {
      map: GoogleMapInstance;
      position: { lat: number; lng: number };
      draggable?: boolean;
      title?: string;
    }) => GoogleMarkerInstance;
    LatLngBounds: new () => GoogleLatLngBoundsInstance;
    InfoWindow: new (options?: { content?: string }) => GoogleInfoWindowInstance;
    event: {
      clearInstanceListeners: (instance: object) => void;
    };
  };
}

export interface GoogleMapInstance {
  setCenter: (position: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  fitBounds: (bounds: GoogleLatLngBoundsInstance) => void;
  addListener: (
    eventName: string,
    handler: (event: GoogleMapMouseEvent) => void,
  ) => { remove: () => void };
}

export interface GoogleMarkerInstance {
  setMap: (map: GoogleMapInstance | null) => void;
  setDraggable: (draggable: boolean) => void;
  setPosition: (position: { lat: number; lng: number }) => void;
  getPosition: () => GoogleLatLng | null;
  addListener: (
    eventName: string,
    handler: (event: GoogleMapMouseEvent) => void,
  ) => { remove: () => void };
}

export interface GoogleLatLngBoundsInstance {
  extend: (position: { lat: number; lng: number }) => void;
  isEmpty: () => boolean;
}

export interface GoogleInfoWindowInstance {
  open: (options: { map: GoogleMapInstance; anchor: GoogleMarkerInstance }) => void;
  close: () => void;
  setContent: (content: string) => void;
}

declare global {
  interface Window {
    google?: GoogleMapsApi;
    __stsGoogleMapsReady?: () => void;
  }
}

let loadPromise: Promise<GoogleMapsApi> | null = null;

export function loadGoogleMaps(): Promise<GoogleMapsApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps is only available in the browser"));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (!appConfig.googleMapsBrowserKey) {
    return Promise.reject(new Error("Google Maps browser key is not configured"));
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    window.__stsGoogleMapsReady = () => {
      if (window.google?.maps) {
        resolve(window.google);
      } else {
        reject(new Error("Google Maps failed to initialize"));
      }
    };

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: appConfig.googleMapsBrowserKey,
      callback: "__stsGoogleMapsReady",
      language: "th",
      region: "TH",
      loading: "async",
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Google Maps script failed to load"));
    document.head.appendChild(script);
  });

  return loadPromise;
}
