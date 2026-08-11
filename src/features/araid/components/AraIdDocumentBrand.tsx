import { useEffect } from "react";
import { Outlet } from "react-router-dom";

const ARAID_FAVICON = "/branding/araid-favicon-64.png?v=20260811";

export function AraIdDocumentBrand() {
  useEffect(() => {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    const previousTitle = document.title;
    const previousFavicon = favicon?.href;
    const previousType = favicon?.type;
    const previousSizes = favicon?.sizes.value;

    document.title = "AraID";
    if (favicon) {
      favicon.href = ARAID_FAVICON;
      favicon.type = "image/png";
      favicon.sizes.value = "64x64";
    }

    return () => {
      document.title = previousTitle;
      if (favicon && previousFavicon) {
        favicon.href = previousFavicon;
        favicon.type = previousType ?? "image/png";
        favicon.sizes.value = previousSizes ?? "64x64";
      }
    };
  }, []);

  return <Outlet />;
}
