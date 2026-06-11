import { CalendarDays, RefreshCw } from "lucide-react";
import { Button, Input } from "../../../components/base";

interface AttendanceDateHeaderProps {
  date: string;
  onDateChange: (date: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  completedCount: number;
  totalCount: number;
}

export function AttendanceDateHeader({
  date,
  onDateChange,
  onRefresh,
  isRefreshing,
  completedCount,
  totalCount,
}: AttendanceDateHeaderProps) {
  return (
    <div className="mb-8 rounded-lg bg-white p-6 shadow-[0_10px_25px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">เช็คชื่อรายชั้นเรียน</h1>
          <p className="mt-1 text-sm text-slate-500">
            เช็คชื่อแล้ว {completedCount} จาก {totalCount} ชั้นเรียน
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <CalendarDays
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <Input
              aria-label="เลือกวันที่"
              className="pl-10"
              onChange={(event) => onDateChange(event.target.value)}
              type="date"
              value={date}
            />
          </div>

          <Button
            icon={RefreshCw}
            isLoading={isRefreshing}
            loadingIconMotion="refresh"
            loadingText="กำลังโหลด"
            onClick={onRefresh}
            variant="outline"
          >
            รีเฟรช
          </Button>
        </div>
      </div>
    </div>
  );
}
