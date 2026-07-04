type ThaIdMode = "disabled" | "mock";

function isPrivateDevHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function formatHostForUrl(hostname: string): string {
  return hostname.includes(":") ? `[${hostname}]` : hostname;
}

function resolveApiBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (configuredBaseUrl) {
    return configuredBaseUrl.trim();
  }

  if (typeof window === "undefined") {
    return "/";
  }

  const { protocol, hostname, port } = window.location;
  if (port !== "3000" && isPrivateDevHost(hostname)) {
    return `${protocol}//${formatHostForUrl(hostname)}:3000`;
  }

  return "/";
}

function resolveApiPrefix(): string {
  const configuredPrefix = import.meta.env.VITE_API_PREFIX as string | undefined;
  const prefix = configuredPrefix?.trim() || "/api";
  return prefix.startsWith("/") ? prefix : `/${prefix}`;
}

function resolveThaIdMode(): ThaIdMode {
  return import.meta.env.VITE_THAID_MODE === "mock" ? "mock" : "disabled";
}

export const appConfig = {
  apiBaseUrl: resolveApiBaseUrl(),
  apiPrefix: resolveApiPrefix(),
  googleMapsBrowserKey: import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY?.trim() || "",
  isDevelopment: import.meta.env.DEV,
  thaidMode: resolveThaIdMode(),
};
