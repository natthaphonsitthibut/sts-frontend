import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "../../../components/base";

interface CopyButtonProps {
  value: string;
  label?: string;
  copiedLabel?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
}

export function CopyButton({
  value,
  label = "คัดลอกลิงก์",
  copiedLabel = "คัดลอกแล้ว",
  size = "sm",
  variant = "outline",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. non-secure context) — silently ignore.
    }
  }

  return (
    <Button
      className={className}
      icon={copied ? Check : Copy}
      onClick={handleCopy}
      size={size}
      type="button"
      variant={variant}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}
