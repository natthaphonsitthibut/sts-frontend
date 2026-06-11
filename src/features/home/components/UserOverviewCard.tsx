import { Badge, Card } from "../../../components/base";

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
    <Card className={className}>
      <div className="flex min-h-24 items-center gap-4 p-5">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xl font-bold text-muted-foreground">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{displayName}</h1>
            <Badge>{roleLabel}</Badge>
          </div>
          <p className="text-sm text-slate-600">สังกัด: {affiliation}</p>
        </div>
      </div>
    </Card>
  );
}
