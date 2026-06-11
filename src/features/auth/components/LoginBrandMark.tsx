import { GraduationCap } from "lucide-react";

export function LoginBrandMark() {
  return (
    <div className="relative z-10 -mb-10 flex justify-center">
      <div className="flex size-[140px] items-center justify-center rounded-[40px] bg-white shadow-[0_20px_40px_rgba(0,0,0,0.05)] max-sm:size-[120px] max-sm:rounded-[30px]">
        <GraduationCap className="size-16 text-primary max-sm:size-14" aria-hidden="true" />
      </div>
    </div>
  );
}
