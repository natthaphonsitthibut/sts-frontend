import { Eraser } from "lucide-react";
import { Button } from "../base";

interface ClearFiltersButtonProps {
  onClear: () => void;
}

/** Shared reset action for list and dashboard filters; never use a refresh icon. */
export function ClearFiltersButton({ onClear }: ClearFiltersButtonProps) {
  return (
    <Button icon={Eraser} onClick={onClear} variant="outline">
      ล้างตัวกรอง
    </Button>
  );
}
