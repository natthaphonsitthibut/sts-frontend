import { HeartHandshake } from "lucide-react";
import { Card } from "../../../components/base";

interface ResolvedHelpCardProps {
  resolved: number;
}

export function ResolvedHelpCard({ resolved }: ResolvedHelpCardProps) {
  return (
    <Card className="flex h-full flex-col justify-between p-10">
      <div className="text-center text-base font-bold text-slate-900">
        ช่วยเหลือสำเร็จ (ปิดเคส)
      </div>
      <div className="flex flex-col items-center justify-center py-6">
        <HeartHandshake
          className="mb-4 size-24 text-slate-900 opacity-90"
          aria-hidden="true"
        />
        <div className="text-[3.5rem] font-bold leading-none text-slate-900">
          {resolved.toLocaleString()}
        </div>
      </div>
    </Card>
  );
}
