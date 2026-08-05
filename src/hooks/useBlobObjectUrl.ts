import { useEffect, useState } from "react";

/** Creates a browser object URL for a cached Blob and always revokes it. */
export function useBlobObjectUrl(blob: Blob | null | undefined): string | null {
  const [resolved, setResolved] = useState<{ blob: Blob; url: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (!blob) {
      void Promise.resolve().then(() => {
        if (active) setResolved(null);
      });
      return () => {
        active = false;
      };
    }

    const nextUrl = URL.createObjectURL(blob);
    void Promise.resolve().then(() => {
      if (active) setResolved({ blob, url: nextUrl });
    });

    return () => {
      active = false;
      URL.revokeObjectURL(nextUrl);
    };
  }, [blob]);

  return blob && resolved?.blob === blob ? resolved.url : null;
}
