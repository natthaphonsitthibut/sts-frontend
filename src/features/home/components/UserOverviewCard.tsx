import { Badge, Card } from "../../../components/base";
import { cn } from "../../../lib/utils";

interface UserOverviewCardProps {
  displayName: string;
  roleLabel: string;
  initials: string;
  affiliation: string;
  className?: string;
}

export function UserOverviewCard({
  displayName,
  roleLabel,
  initials,
  affiliation,
  className,
}: UserOverviewCardProps) {
  return (
    <Card className={cn("p-[30px]", className)}>
      <div className="flex items-center gap-6">
        <div className="flex size-[100px] shrink-0 items-center justify-center rounded-full bg-slate-200 text-4xl font-bold text-muted-foreground">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
            <Badge className="px-4 py-1.5 text-base">{roleLabel}</Badge>
          </div>
          <p className="text-sm text-slate-600">สังกัด: {affiliation}</p>
        </div>
      </div>
    </Card>
  );
}
