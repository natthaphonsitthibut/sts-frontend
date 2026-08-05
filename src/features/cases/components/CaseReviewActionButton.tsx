import { SquarePen } from "lucide-react";
import type { ButtonProps } from "../../../components/base";
import { Button } from "../../../components/base";
import { cn } from "../../../lib/utils";

type CaseReviewActionButtonProps = Omit<ButtonProps, "icon" | "variant">;

export function CaseReviewActionButton({
  children = "ดำเนินการ",
  className,
  size = "sm",
  ...props
}: CaseReviewActionButtonProps) {
  return (
    <Button
      className={cn("min-w-[140px]", className)}
      icon={SquarePen}
      size={size}
      variant="outline"
      {...props}
    >
      {children}
    </Button>
  );
}
