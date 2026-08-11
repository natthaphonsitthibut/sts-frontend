import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AraIdStatusBar } from "./AraIdStatusBar";

interface AraIdTopBarProps {
  title: string;
  backTo: string;
}

export function AraIdTopBar({ title, backTo }: AraIdTopBarProps) {
  const navigate = useNavigate();

  return (
    <header className="bg-araid-brand-mid text-white">
      <AraIdStatusBar />
      <div className="relative flex h-14 items-center justify-center px-14">
        <button
          type="button"
          aria-label="ย้อนกลับ"
          onClick={() => void navigate(backTo)}
          className="absolute left-3 grid size-10 place-items-center rounded-full bg-araid-brand-deep/70 text-white transition-colors duration-150 hover:bg-araid-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:bg-araid-brand-deep motion-reduce:transition-none"
        >
          <ChevronLeft aria-hidden="true" className="size-6" strokeWidth={2.5} />
        </button>
        <h1 className="text-base font-bold leading-tight">{title}</h1>
      </div>
    </header>
  );
}
