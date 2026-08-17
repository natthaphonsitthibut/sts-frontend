import { useRef, useState } from "react";
import { LogOut, Pencil } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar } from "../base";
import { authService } from "../../features/auth/api/auth.service";
import { ROLE_LABELS } from "../../features/auth/lib/permissions";
import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";
import { useDismissable } from "../../hooks/useDismissable";
import { cn } from "../../lib/utils";

interface HeaderProfileMenuProps {
  canEditProfile: boolean;
  /** A guest link has nothing to sign out of — it ends when the link ends. */
  canSignOut?: boolean;
  displayName: string;
  /** Overrides the signed-in account's สังกัด; a link passes its school. */
  affiliation?: string | null;
  /** Overrides the signed-in account's ตำแหน่ง; a link passes คุณครู. */
  roleLabel?: string | null;
  /** Already-resolved photo URL; the shared letter fallback shows without one. */
  photoUrl?: string | null;
}

/**
 * The header identity popover, used by the signed-in shell and by every guest
 * link. A link shows who it belongs to and nothing to act on, but it is the same
 * component so the trigger, hover, focus ring and panel never drift apart.
 */
export function HeaderProfileMenu({
  canEditProfile,
  canSignOut = true,
  displayName,
  affiliation,
  roleLabel,
  photoUrl,
}: HeaderProfileMenuProps) {
  const navigate = useNavigate();
  const user = useAuthSessionStore((state) => state.user);
  const clearSession = useAuthSessionStore((state) => state.clearSession);
  const primaryRole = user?.roles?.[0];
  const resolvedRoleLabel =
    roleLabel ?? (primaryRole ? ROLE_LABELS[primaryRole] || primaryRole : "-");
  const resolvedAffiliation = affiliation ?? user?.affiliation ?? null;
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function getMenuItems(): HTMLElement[] {
    return Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [],
    );
  }

  function focusMenuEdge(edge: "first" | "last"): void {
    requestAnimationFrame(() => {
      const items = getMenuItems();
      items[edge === "first" ? 0 : items.length - 1]?.focus();
    });
  }

  useDismissable(open, rootRef, (reason) => {
    setOpen(false);
    // Escape means the keyboard user is still "at" the trigger — put focus back
    // there; an outside press moves focus wherever the user pressed instead.
    if (reason === "escape") triggerRef.current?.focus();
  });

  async function handleLogout(): Promise<void> {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      // The local session must still be cleared when the server is unavailable.
    }
    clearSession();
    void navigate("/login");
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-controls="header-profile-menu"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`เปิดเมนูบัญชีผู้ใช้: ${displayName}`}
        className="group flex size-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          setOpen(true);
          focusMenuEdge(event.key === "ArrowDown" ? "first" : "last");
        }}
      >
        {/* The avatar carries the same identity treatment as everywhere else
            (photo, else the deterministic gradient behind one initial), so the
            hover/open feedback is a ring rather than a background swap — a
            gradient or photo would hide a background change entirely. */}
        <Avatar
          className={cn(
            "size-10 transition-shadow",
            open ? "ring-2 ring-primary" : "group-hover:ring-2 group-hover:ring-primary/30",
          )}
          gradientName={displayName}
          imageAlt={displayName}
          imageUrl={photoUrl ?? null}
        />
      </button>

      {open ? (
        <div
          ref={menuRef}
          id="header-profile-menu"
          role="menu"
          aria-label="บัญชีผู้ใช้"
          className="absolute right-0 top-full z-50 mt-2 w-max min-w-60 max-w-72 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 shadow-lg"
          onKeyDown={(event) => {
            if (event.key === "Tab") {
              setOpen(false);
              return;
            }
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;

            event.preventDefault();
            const items = getMenuItems();
            if (items.length === 0) return;
            if (event.key === "Home" || event.key === "End") {
              items[event.key === "Home" ? 0 : items.length - 1]?.focus();
              return;
            }

            const currentIndex = items.indexOf(document.activeElement as HTMLElement);
            const direction = event.key === "ArrowDown" ? 1 : -1;
            const nextIndex = (currentIndex + direction + items.length) % items.length;
            items[nextIndex]?.focus();
          }}
        >
          {/* The photo sits centred against the three identity lines, not pinned
              to the first one. */}
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Avatar
              className="size-12"
              gradientName={displayName}
              imageAlt={displayName}
              imageUrl={photoUrl ?? null}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-900">{displayName}</div>
              {resolvedAffiliation ? (
                <div className="truncate text-xs text-slate-500">
                  สังกัด: {resolvedAffiliation}
                </div>
              ) : null}
              <div className="truncate text-xs text-slate-500">
                ตำแหน่ง: {resolvedRoleLabel}
              </div>
            </div>
          </div>
          {canEditProfile || canSignOut ? (
            <div className="my-1 border-t border-slate-100" />
          ) : null}
          {canEditProfile ? (
            <Link
              role="menuitem"
              className="flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setOpen(false)}
              to="/profile"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Pencil className="size-3.5" aria-hidden="true" />
              </span>
              แก้ไขข้อมูลส่วนตัว
            </Link>
          ) : null}
          {canSignOut ? (
            <button
              type="button"
              role="menuitem"
              className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loggingOut}
              onClick={() => void handleLogout()}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-danger-100 text-danger">
                <LogOut className="size-3.5" aria-hidden="true" />
              </span>
              {loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
