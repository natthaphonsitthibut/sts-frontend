import { FileText, Home, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAraIdCopy } from "../hooks/useAraIdCopy";

function useNavigationItems() {
  const { copy } = useAraIdCopy();
  return {
    ariaLabel: copy.nav.aria,
    items: [
      { to: "/araid/home", label: copy.nav.home, icon: Home },
      { to: "/araid/documents", label: copy.nav.documents, icon: FileText },
      { to: "/araid/settings", label: copy.nav.settings, icon: Settings },
    ],
  };
}

export function AraIdBottomNavigation() {
  const { ariaLabel, items } = useNavigationItems();

  return (
    <nav
      aria-label={ariaLabel}
      className="relative z-20 grid h-[4.5rem] shrink-0 grid-cols-3 border-t border-araid-border bg-white px-2 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-1.5 shadow-araid-navigation sm:h-[4.75rem] sm:pb-2 lg:hidden"
    >
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex min-h-11 flex-col items-center justify-center gap-0.5 text-araid-nav font-medium transition-colors duration-150 sm:text-xs ${isActive ? "text-araid-brand" : "text-slate-600 hover:text-araid-brand"}`
          }
        >
          <Icon className="size-[1.35rem] sm:size-6" strokeWidth={1.9} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
      <span
        aria-hidden="true"
        className="absolute bottom-1 left-1/2 hidden h-1 w-24 -translate-x-1/2 rounded-full bg-slate-300 max-sm:block"
      />
    </nav>
  );
}

export function AraIdDesktopNavigation() {
  const { ariaLabel, items } = useNavigationItems();

  return (
    <aside className="hidden min-h-dvh flex-col bg-araid-brand-deep px-4 py-6 text-white lg:flex">
      <img src="/branding/araid-logo.png" alt="โลโก้ AraID" className="mx-auto size-32 rounded-xl object-cover" />
      <nav aria-label={ariaLabel} className="mt-8 space-y-2">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none ${isActive ? "bg-white text-araid-brand-deep" : "text-white/85 hover:bg-white/10 hover:text-white"}`
            }
          >
            <Icon aria-hidden="true" className="size-5" strokeWidth={1.9} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
