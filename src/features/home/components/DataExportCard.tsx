import { useState } from "react";
import { FileOutput } from "lucide-react";
import { Button, Card, Checkbox, Select } from "../../../components/base";

const EXPORT_TYPE_OPTIONS = ["ประเภทไฟล์", "PDF", "Excel", "CSV"] as const;

const EXPORT_ITEMS = [
  "เลือกทั้งหมด",
  "รายงานสถานการณ์นักเรียน",
  "ข้อมูลนักเรียน",
  "ผลการให้ความช่วยเหลือเด็ก",
] as const;

// Export actions are intentionally UI-only for now; selection state stays local.
export function DataExportCard() {
  const [exportType, setExportType] = useState<string>(EXPORT_TYPE_OPTIONS[0]);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(
    {},
  );

  function toggleItem(item: string): void {
    setSelectedItems((current) => ({ ...current, [item]: !current[item] }));
  }

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="mb-3 text-sm font-bold text-slate-900">
        นำออกข้อมูล (Data Export)
      </div>

      <Select
        aria-label="ประเภทไฟล์ที่ต้องการส่งออก"
        className="mb-3"
        value={exportType}
        onChange={(event) => setExportType(event.target.value)}
      >
        {EXPORT_TYPE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>

      <ul className="mb-3 space-y-2">
        {EXPORT_ITEMS.map((item) => (
          <li key={item}>
            <Checkbox
              checked={Boolean(selectedItems[item])}
              className="w-full rounded-lg bg-slate-100 px-3 py-2.5 text-sm"
              label={item}
              onChange={() => toggleItem(item)}
            />
          </li>
        ))}
      </ul>

      <Button className="mt-auto font-bold" fullWidth size="lg">
        <span className="flex w-full items-center justify-between">
          <span>ส่งออกข้อมูล</span>
          <FileOutput className="size-5" aria-hidden="true" />
        </span>
      </Button>
    </Card>
  );
}
