import { useState } from "react";
import { Alert, Button, Card, Input, Select } from "../../../components/base";
import type { SystemSetting } from "../types/admin.types";

interface SystemSettingCardProps {
  setting: SystemSetting;
  onSave: (key: string, value: string) => void;
  isSaving: boolean;
  errorMessage?: string | null;
}

function SettingValueInput({
  setting,
  value,
  onChange,
}: {
  setting: SystemSetting;
  value: string;
  onChange: (value: string) => void;
}) {
  const ariaLabel = setting.description || setting.setting_key;

  if (setting.value_type === "enum") {
    return (
      <Select
        aria-label={ariaLabel}
        className="sm:flex-1"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {(setting.enum_options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    );
  }

  if (setting.value_type === "time") {
    return (
      <Input
        aria-label={ariaLabel}
        className="sm:flex-1"
        onChange={(event) => onChange(event.target.value)}
        type="time"
        value={value}
      />
    );
  }

  if (setting.value_type === "integer") {
    return (
      <Input
        aria-label={ariaLabel}
        className="sm:flex-1"
        max={setting.max ?? undefined}
        min={setting.min ?? undefined}
        onChange={(event) => onChange(event.target.value)}
        type="number"
        value={value}
      />
    );
  }

  return (
    <Input
      aria-label={ariaLabel}
      className="sm:flex-1"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    />
  );
}

export function SystemSettingCard({
  setting,
  onSave,
  isSaving,
  errorMessage,
}: SystemSettingCardProps) {
  const [value, setValue] = useState(setting.setting_value);
  const isDirty = value !== setting.setting_value;
  const isEditable = setting.editable !== false;

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
      {isEditable ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <SettingValueInput onChange={setValue} setting={setting} value={value} />
          <Button
            className="shrink-0"
            disabled={!isDirty}
            isLoading={isSaving}
            loadingText="กำลังบันทึก"
            onClick={() => onSave(setting.setting_key, value)}
          >
            บันทึก
          </Button>
        </div>
      ) : (
        <div className="mt-4 text-sm text-slate-500">
          {setting.setting_value}
          <div className="mt-1 text-xs text-slate-400">
            รายการนี้ไม่รองรับการแก้ไขผ่านหน้าจอ
          </div>
        </div>
      )}
      {errorMessage ? (
        <Alert className="mt-3" variant="destructive">
          {errorMessage}
        </Alert>
      ) : null}
    </Card>
  );
}
