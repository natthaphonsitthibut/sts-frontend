import { HelpStatusCard } from "./HelpStatusCard";

interface HelpStatusPanelProps {
  waiting: number;
  inProgress: number;
}

export function HelpStatusPanel({ waiting, inProgress }: HelpStatusPanelProps) {
  return (
    <div className="flex h-full flex-col gap-6">
      <HelpStatusCard
        className="flex-1"
        title="รอการช่วยเหลือ"
        value={waiting}
      />
      <HelpStatusCard
        className="flex-1"
        title="กำลังดำเนินการช่วยเหลือ"
        value={inProgress}
      />
    </div>
  );
}
