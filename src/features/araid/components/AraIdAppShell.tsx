import type { ReactNode } from "react";
import {
  AraIdBottomNavigation,
  AraIdDesktopNavigation,
} from "./AraIdBottomNavigation";
import { AraIdStatusBar } from "./AraIdStatusBar";

export function AraIdAppShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-araid-shell font-araid">
      <section className="min-h-dvh w-full lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        <AraIdDesktopNavigation />
        <div className="flex min-h-dvh min-w-0 flex-col overflow-hidden bg-araid-surface">
          <div className="bg-araid-brand text-white lg:hidden">
            <AraIdStatusBar />
          </div>
          <div className="araid-screen-enter min-h-0 flex-1 overflow-y-auto">
            {children}
          </div>
          <AraIdBottomNavigation />
        </div>
      </section>
    </main>
  );
}
