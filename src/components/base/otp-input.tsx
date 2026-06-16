import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "../../lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Segmented one-time-code input: `length` single-digit boxes with auto-advance,
 * backspace-to-previous, paste-fills-all, and `autocomplete="one-time-code"`.
 * Controlled via the joined string so callers keep using a plain `value`.
 */
export function OtpInput({ value, onChange, length = 6, disabled, autoFocus }: OtpInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  function commit(nextDigits: string[]): void {
    onChange(nextDigits.join("").slice(0, length));
  }

  function handleChange(index: number, raw: string): void {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = digits.slice();
    next[index] = digit;
    commit(next);
    if (digit && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>): void {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) {
      return;
    }
    onChange(pasted);
    inputs.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div className="flex justify-center gap-2" role="group" aria-label="รหัส OTP">
      {digits.map((digit, index) => (
        <input
          key={`otp-${index}`}
          ref={(element) => {
            inputs.current[index] = element;
          }}
          aria-label={`รหัส OTP หลักที่ ${index + 1}`}
          autoComplete="one-time-code"
          autoFocus={autoFocus && index === 0}
          className={cn(
            "size-12 rounded-lg border border-slate-300 text-center text-xl font-bold text-slate-900",
            "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30",
            "disabled:bg-slate-100 disabled:text-slate-400",
          )}
          disabled={disabled}
          inputMode="numeric"
          maxLength={1}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          value={digit}
        />
      ))}
    </div>
  );
}
