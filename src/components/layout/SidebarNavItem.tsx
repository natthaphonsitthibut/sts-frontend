import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import type { MenuItem } from "../../features/auth/lib/permissions";
import { LayoutIcon } from "./LayoutIcon";

interface SidebarNavItemProps {
  item: MenuItem;
  onNavigate?: () => void;
}

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return cn(
    "flex min-h-11 items-center gap-3 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary",
    isActive && "border-r-4 border-primary bg-surface-sky text-primary",
  );
}

export function SidebarNavItem({ item, onNavigate }: SidebarNavItemProps) {
  const location = useLocation();
  const hasActiveChild = Boolean(
    item.children?.some((child) => child.route === location.pathname),
  );
  // Start expanded when the current route lives inside this group; the user can
  // then toggle it freely.
  const [open, setOpen] = useState(hasActiveChild);

  if (item.children) {
    return (
      <div>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm font-semibold transition-colors hover:bg-slate-50",
            open ? "text-primary" : "text-slate-700",
          )}
        >
          <LayoutIcon
            className={cn("size-5 shrink-0", open ? "text-primary" : "text-slate-400")}
            iconName={item.iconName}
          />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          <ChevronDown
            className={cn("size-4 text-slate-400 transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        </button>
        <div
          aria-hidden={!open}
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className={cn("bg-slate-50 py-1", !open && "invisible")}>
              {item.children.map((child) => (
                <NavLink
                  className={navLinkClassName}
                  key={child.id}
                  onClick={onNavigate}
                  to={child.route || "#"}
                  tabIndex={open ? undefined : -1}
                >
                  <LayoutIcon className="ml-3 size-4 shrink-0" iconName={child.iconName} />
                  <span className="truncate">{child.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <NavLink
      className={navLinkClassName}
      end={item.route === "/"}
      onClick={onNavigate}
      to={item.route || "#"}
    >
      <LayoutIcon className="size-5 shrink-0" iconName={item.iconName} />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}
