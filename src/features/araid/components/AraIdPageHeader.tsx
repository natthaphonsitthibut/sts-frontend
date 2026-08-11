import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useAraIdCopy } from "../hooks/useAraIdCopy";

interface AraIdPageHeaderProps {
  title: string;
  backTo: string;
}

export function AraIdPageHeader({ title, backTo }: AraIdPageHeaderProps) {
  const { copy } = useAraIdCopy();

  return (
    <header className="flex min-h-12 items-center gap-3 md:min-h-14">
      <Link
        to={backTo}
        aria-label={copy.common.back}
        className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-araid-brand-deep shadow-araid-subtle transition-colors duration-150 hover:bg-araid-surface-icon focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-araid-brand active:bg-araid-shell motion-reduce:transition-none"
      >
        <ChevronLeft aria-hidden="true" className="size-6" strokeWidth={2.3} />
      </Link>
      <h1 className="min-w-0 flex-1 pr-11 text-center text-lg font-bold text-araid-brand-deep md:text-xl lg:pr-0 lg:text-left">
        {title}
      </h1>
    </header>
  );
}
