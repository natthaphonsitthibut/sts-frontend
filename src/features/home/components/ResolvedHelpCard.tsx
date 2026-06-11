import { HeartHandshake } from "lucide-react";
import { Card } from "../../../components/base";

interface ResolvedHelpCardProps {
  resolved: number;
}

export function ResolvedHelpCard({ resolved }: ResolvedHelpCardProps) {
  return (
    <Card className="flex h-full flex-col justify-between p-5">
      <div className="text-center text-sm font-bold text-slate-900">
        ช่วยเหลือสำเร็จ (ปิดเคส)
      </div>
      <div className="flex flex-col items-center justify-center py-4">
        <HeartHandshake
          className="mb-3 size-12 text-slate-900 opacity-90"
          aria-hidden="true"
        />
        <div className="text-3xl font-bold leading-none text-slate-900">
          {resolved.toLocaleString()}
        </div>
      </div>
    </Card>
  );
}
