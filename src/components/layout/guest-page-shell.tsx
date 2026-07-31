import type { ComponentProps } from "react";
import { Avatar, SchoolIcon } from "../base";
import { cn } from "../../lib/utils";
import { getNameInitials } from "../../lib/person-name";
import { PAGE_MAX_WIDTH_CLASS } from "./page-primitives";

interface GuestPageShellProps extends ComponentProps<"div"> {
  as?: "div" | "main";
  centered?: boolean;
  containerClassName?: string;
  contentClassName?: string;
  profileName?: string | null;
}

export function GuestPageShell({
  as: Root = "div",
  centered = false,
  children,
  className,
  containerClassName,
  contentClassName,
  profileName,
  ...props
}: GuestPageShellProps) {
  const profileInitials = profileName ? getNameInitials(profileName) : undefined;

  return (
    <Root
      className={cn(
        "min-h-screen bg-white text-slate-900",
        className,
      )}
      {...props}
    >
      <header className="h-14 border-b border-slate-200 bg-white">
        <div className="flex h-full w-full items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <SchoolIcon className="size-6 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate text-sm font-bold text-primary sm:text-base">
              ระบบติดตามผู้เรียน
            </span>
          </div>
          <Avatar
            aria-label={profileName ? `ผู้รับมอบหมาย: ${profileName}` : "ผู้รับมอบหมาย"}
            className="size-9 bg-brand-soft font-semibold text-primary"
            fallback={profileInitials}
          />
        </div>
      </header>
      <div
        className={cn(
          "min-h-[calc(100vh-3.5rem)] w-full bg-white px-4 py-5 sm:px-6 sm:py-6",
          centered && "flex items-center justify-center",
          containerClassName,
        )}
      >
        <div
          className={cn("mx-auto w-full", PAGE_MAX_WIDTH_CLASS, contentClassName)}
          data-page-container="guest"
        >
          {children}
        </div>
      </div>
    </Root>
  );
}
