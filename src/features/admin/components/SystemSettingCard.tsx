import { useState } from "react";
import { Button, Card, Input } from "../../../components/base";
import type { SystemSetting } from "../types/admin.types";

interface SystemSettingCardProps {
  setting: SystemSetting;
  onSave: (key: string, value: string, description?: string | null) => void;
  isSaving: boolean;
}

export function SystemSettingCard({
  setting,
  onSave,
  isSaving,
}: SystemSettingCardProps) {
  const [value, setValue] = useState(setting.setting_value);
  const isDirty = value !== setting.setting_value;

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="min-h-14">
        <div className="font-bold text-slate-800">
          {setting.description || setting.setting_key}
        </div>
        <div className="mt-1 text-xs font-medium text-slate-400">
          {setting.setting_key}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          aria-label={setting.description || setting.setting_key}
          className="sm:flex-1"
          onChange={(event) => setValue(event.target.value)}
          value={value}
        />
        <Button
          className="shrink-0"
          disabled={!isDirty}
          isLoading={isSaving}
          loadingText="กำลังบันทึก"
          onClick={() => onSave(setting.setting_key, value, setting.description)}
        >
          บันทึก
        </Button>
      </div>
    </Card>
  );
}
