import { useEffect, useState } from "react";
import { BatteryFull, Signal, Wifi } from "lucide-react";

interface AraIdStatusBarProps {
  tone?: "brand" | "light";
}

function readClock(): string {
  return new Date().toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * The mock phone chrome the AraID app is framed in on a desktop browser.
 *
 * A real handset draws its own status bar right above this one, so the frame is
 * hidden on coarse-pointer devices — duplicating the clock there looks broken
 * and steals a row of height from an already short viewport.
 */
export function AraIdStatusBar({ tone = "brand" }: AraIdStatusBarProps) {
  const toneClass = tone === "brand" ? "text-white" : "text-araid-brand-deep";
  const [clock, setClock] = useState(readClock);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(readClock()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`flex h-7 items-center justify-between px-4 text-xs font-semibold sm:hidden pointer-coarse:hidden ${toneClass}`}
    >
      <span className="tabular-nums">{clock}</span>
      <span className="flex items-center gap-1">
        <Signal className="size-3.5" fill="currentColor" strokeWidth={1.8} />
        <Wifi className="size-3.5" strokeWidth={2.2} />
        <BatteryFull className="size-4" fill="currentColor" strokeWidth={1.6} />
      </span>
    </div>
  );
}
