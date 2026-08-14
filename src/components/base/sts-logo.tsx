import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export type StsLogoProps = Omit<ComponentProps<"img">, "src">;

export function StsLogo({ alt = "", className, ...props }: StsLogoProps) {
  return (
    <img
      alt={alt}
      className={cn("object-contain", className)}
      draggable={false}
      src="/branding/sts-logo-mark.png"
      {...props}
    />
  );
}
