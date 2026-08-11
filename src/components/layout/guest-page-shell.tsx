import type { ComponentProps } from "react";
import { Avatar } from "../base";
import { cn } from "../../lib/utils";
import { AppBrand } from "./AppFrame";

const GUEST_PAGE_MAX_WIDTH_CLASS = "max-w-[1180px]";

interface GuestPageShellProps extends ComponentProps<"div"> {
  as?: "div" | "main";
  centered?: boolean;
  containerClassName?: string;
  contentClassName?: string;
  profileName?: string | null;
  showHeader?: boolean;
  showProfile?: boolean;
}

export function GuestPageShell({
  as: Root = "div",
  centered = false,
  children,
  className,
  containerClassName,
  contentClassName,
  profileName,
  showHeader = true,
  showProfile = true,
  ...props
}: GuestPageShellProps) {
  return (
    <Root
      className={cn(
        "min-h-screen bg-white text-slate-900",
        className,
      )}
      {...props}
    >
      {showHeader ? (
        <header className="h-16 border-b border-slate-200 bg-white">
          <div className="flex h-full w-full items-center justify-between gap-4 px-4 sm:px-6">
            <AppBrand className="max-w-xs sm:max-w-sm" label="ระบบติดตามผู้เรียน" />
            {showProfile ? (
              <Avatar
                aria-label={profileName ? `ผู้รับมอบหมาย: ${profileName}` : "ผู้รับมอบหมาย"}
                className="size-10"
                gradientName={profileName ?? undefined}
              />
            ) : null}
          </div>
        </header>
      ) : null}
      <div
        className={cn(
          showHeader ? "min-h-[calc(100vh-4rem)]" : "min-h-screen",
          "w-full bg-white px-4 py-5 sm:px-6 sm:py-6",
          centered && "flex items-center justify-center",
          containerClassName,
        )}
      >
        <div
          className={cn("mx-auto w-full", GUEST_PAGE_MAX_WIDTH_CLASS, contentClassName)}
          data-page-container="guest"
        >
          {children}
        </div>
      </div>
    </Root>
  );
}
