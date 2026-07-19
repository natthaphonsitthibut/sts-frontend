import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "../base";
import { cn } from "../../lib/utils";

interface CopyButtonProps {
  value: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
  label?: string;
}

type CopyState = "idle" | "loading" | "copied";

/**
 * The one copy button for the whole app — icon-only so its width never changes.
 * On click it spins briefly (like the other action buttons), then flips to a
 * check icon for clear feedback, while keeping the same shared button variant.
 */
export function CopyButton({
  value,
  size = "sm",
  variant = "outline",
  className,
  label,
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>("idle");
  const copied = state === "copied";
  const iconOnly = !label;

  function handleCopy(): void {
    setState("loading");
    void navigator.clipboard?.writeText(value);
    window.setTimeout(() => setState("copied"), 400);
    window.setTimeout(() => setState("idle"), 1800);
  }

  return (
    <Button
      aria-label={copied ? "คัดลอกแล้ว" : "คัดลอก"}
      className={cn(iconOnly && "px-2", className)}
      icon={copied ? Check : Copy}
      iconClassName={copied ? "text-success" : undefined}
      isLoading={state === "loading"}
      onClick={handleCopy}
      size={size}
      type="button"
      variant={variant}
    >
      {label}
    </Button>
  );
}
