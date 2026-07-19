import { Eye, EyeOff } from "lucide-react";
import { Button } from "../base";

interface SensitiveValueToggleButtonProps {
  disabled?: boolean;
  isLoading?: boolean;
  isVisible: boolean;
  label: string;
  onClick: () => void;
}

export function SensitiveValueToggleButton({
  disabled,
  isLoading,
  isVisible,
  label,
  onClick,
}: SensitiveValueToggleButtonProps) {
  const actionLabel = `${isVisible ? "ซ่อน" : "แสดง"}${label}`;

  return (
    <Button
      aria-label={actionLabel}
      disabled={disabled}
      icon={isVisible ? EyeOff : Eye}
      isLoading={isLoading}
      loadingText={`กำลังแสดง${label}`}
      onClick={onClick}
      size="sm"
      type="button"
      variant="outline"
    >
      {actionLabel}
    </Button>
  );
}
