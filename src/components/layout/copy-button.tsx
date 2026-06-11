import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "../base";

interface CopyButtonProps {
  value: string;
  label?: string;
  copiedLabel?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
}

/**
 * The one copy button for the whole app — copies `value` and shows a "คัดลอกแล้ว"
 * confirmation (check icon) for a moment so the user gets clear feedback.
 */
export function CopyButton({
  value,
  label = "คัดลอก",
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
      variant={copied ? "secondary" : variant}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}
