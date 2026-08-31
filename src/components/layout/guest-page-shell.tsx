import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";
import { AppBrand } from "./AppFrame";
import { HeaderProfileMenu } from "./HeaderProfileMenu";

const GUEST_PAGE_MAX_WIDTH_CLASS = "max-w-[1180px]";

interface GuestPageShellProps extends ComponentProps<"div"> {
  as?: "div" | "main";
  centered?: boolean;
  containerClassName?: string;
  contentClassName?: string;
  /** สังกัด for the link holder — their school. */
  profileAffiliation?: string | null;
  profileName?: string | null;
  /** The link holder's own photo; falls back to initials like the app header. */
  profilePhotoUrl?: string | null;
  /** ตำแหน่ง for the link holder; teachers reach every link as คุณครู. */
  profileRoleLabel?: string | null;
  showHeader?: boolean;
  showProfile?: boolean;
  /**
   * Where the brand leads. Null on surfaces with nowhere to go — a link that
   * has not been opened yet lands on the sign-in screen — and set to the link's
   * own home once there is one, so the logo behaves the way it does in the app.
   */
  brandTo?: string | null;
}

export function GuestPageShell({
  as: Root = "div",
  brandTo = null,
  centered = false,
  children,
  className,
  containerClassName,
  contentClassName,
  profileAffiliation,
  profileName,
  profilePhotoUrl,
  profileRoleLabel = "คุณครู",
  showHeader = true,
  showProfile = true,
  ...props
}: GuestPageShellProps) {
  return (
    <Root
      className={cn("min-h-dvh bg-white text-slate-900", className)}
      {...props}
    >
      {showHeader ? (
        <header className="h-16 border-b border-slate-200 bg-white">
          <div className="flex h-full w-full items-center justify-between gap-4 px-4 sm:px-6">
            {/* Inert until the link surface has a home of its own: whoever
                holds an unopened link has no account, so following the brand
                would only land them on the sign-in screen. */}
            <AppBrand
              className="max-w-xs sm:max-w-sm"
              label="ระบบติดตามผู้เรียน"
              to={brandTo}
            />
            {showProfile ? (
              // Same popover as the signed-in header, minus the two actions a
              // link cannot offer: there is no profile to edit and nothing to
              // sign out of.
              <HeaderProfileMenu
                affiliation={profileAffiliation}
                canEditProfile={false}
                canSignOut={false}
                displayName={profileName ?? "ผู้รับมอบหมาย"}
                photoUrl={profilePhotoUrl ?? null}
                roleLabel={profileRoleLabel}
              />
            ) : null}
          </div>
        </header>
      ) : null}
      <div
        className={cn(
          showHeader ? "min-h-[calc(100dvh-4rem)]" : "min-h-dvh",
          "w-full bg-white px-4 py-5 sm:px-6 sm:py-6",
          centered && "flex items-center justify-center",
          containerClassName,
        )}
      >
        <div
          className={cn(
            "mx-auto w-full",
            GUEST_PAGE_MAX_WIDTH_CLASS,
            contentClassName,
          )}
          data-page-container="guest"
        >
          {children}
        </div>
      </div>
    </Root>
  );
}
