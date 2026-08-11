import { cn } from "../../../lib/utils";

interface AraIdWordmarkProps {
  className?: string;
}

export function AraIdWordmark({ className }: AraIdWordmarkProps) {
  return (
    <span
      aria-label="AraID"
      className={cn(
        "inline-flex items-baseline font-sans text-4xl font-bold leading-none tracking-[-0.025em] text-white drop-shadow-araid-wordmark",
        className,
      )}
    >
      <span aria-hidden="true">Ara</span>
      <span aria-hidden="true" className="text-araid-accent">
        ID
      </span>
    </span>
  );
}
