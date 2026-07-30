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
  displayName: string;
  initials: string;
}

export function HeaderProfileMenu({
  canEditProfile,
  displayName,
  initials,
}: HeaderProfileMenuProps) {
  const navigate = useNavigate();
  const user = useAuthSessionStore((state) => state.user);
  const clearSession = useAuthSessionStore((state) => state.clearSession);
  const primaryRole = user?.roles?.[0];
  const roleLabel = primaryRole ? ROLE_LABELS[primaryRole] || primaryRole : "-";
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
        {/* The button's own hover/active background would sit fully behind
            the avatar (both are size-10, matching the bell/menu buttons), so
            the color feedback lives on the avatar itself instead — same
            bg-brand-soft → bg-brand-active transition the bell uses. */}
        <Avatar
          fallback={initials}
          className={cn(
            "size-10 font-semibold text-primary transition-colors",
            open ? "bg-brand-active" : "bg-brand-soft group-hover:bg-brand-active",
          )}
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
          <div className="flex items-start gap-3 px-3 py-2.5">
            <Avatar
              fallback={initials}
              className="size-12 bg-brand-soft font-semibold text-primary"
            />
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="truncate text-sm font-semibold text-slate-900">{displayName}</div>
              {user?.affiliation ? (
                <div className="truncate text-xs text-slate-500">สังกัด: {user.affiliation}</div>
              ) : null}
              <div className="truncate text-xs text-slate-500">ตำแหน่ง: {roleLabel}</div>
            </div>
          </div>
          <div className="my-1 border-t border-slate-100" />
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
        </div>
      ) : null}
    </div>
  );
}
