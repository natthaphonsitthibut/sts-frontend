import { Card } from "../../../components/base";
import { cn } from "../../../lib/utils";

interface HelpStatusCardProps {
  title: string;
  value: number;
  unit?: string;
  className?: string;
}

export function HelpStatusCard({
  title,
  value,
  unit = "เคส",
  className,
}: HelpStatusCardProps) {
  return (
    <Card className={cn("flex flex-col justify-between gap-3 p-5", className)}>
      <div className="text-sm font-bold text-slate-900">{title}</div>
      <div className="flex items-end justify-between">
        <div className="text-3xl font-bold text-slate-900">
          {value.toLocaleString()}
        </div>
        <div className="pb-1 text-base font-bold text-slate-500">{unit}</div>
      </div>
    </Card>
  );
}
