import { BatteryFull, Signal, Wifi } from "lucide-react";

interface AraIdStatusBarProps {
  tone?: "brand" | "light";
}

export function AraIdStatusBar({ tone = "brand" }: AraIdStatusBarProps) {
  const toneClass = tone === "brand" ? "text-white" : "text-araid-brand-deep";

  return (
    <div
      aria-hidden="true"
      className={`flex h-7 items-center justify-between px-4 text-xs font-semibold sm:hidden ${toneClass}`}
    >
      <span className="tabular-nums">9:41</span>
      <span className="flex items-center gap-1">
        <Signal className="size-3.5" fill="currentColor" strokeWidth={1.8} />
        <Wifi className="size-3.5" strokeWidth={2.2} />
        <BatteryFull className="size-4" fill="currentColor" strokeWidth={1.6} />
      </span>
    </div>
  );
}
