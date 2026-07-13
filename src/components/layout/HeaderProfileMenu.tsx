import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, UserCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar } from "../base";
import { authService } from "../../features/auth/api/auth.service";
import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";
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
  const clearSession = useAuthSessionStore((state) => state.clearSession);
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

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleLogout(): Promise<void> {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      // The local session must still be cleared when the server is unavailable.
    }
    clearSession();
    void navigate("/admin-access");
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-controls="header-profile-menu"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="เปิดเมนูบัญชีผู้ใช้"
        className="flex min-h-10 items-center gap-2 rounded-lg px-1.5 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark sm:px-2"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          setOpen(true);
          focusMenuEdge(event.key === "ArrowDown" ? "first" : "last");
        }}
      >
        <Avatar
          fallback={initials}
          className="size-9 bg-white font-semibold text-primary"
        />
        <span className="hidden max-w-[140px] truncate text-sm font-semibold text-white sm:block">
          {displayName}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn("hidden size-4 text-white/70 transition-transform sm:block", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div
          ref={menuRef}
          id="header-profile-menu"
          role="menu"
          aria-label="บัญชีผู้ใช้"
          className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 shadow-lg"
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
          {canEditProfile ? (
            <Link
              role="menuitem"
              className="flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setOpen(false)}
              to="/profile"
            >
              <UserCircle className="size-5 text-slate-500" aria-hidden="true" />
              โปรไฟล์ของฉัน
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
          >
            <LogOut className="size-5" aria-hidden="true" />
            {loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
