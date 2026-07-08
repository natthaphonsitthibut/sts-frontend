import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "../../../components/base";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";

interface MagicAuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Shared full-screen auth gate for magic-link pages — one centred card with the
 * shield mark, title and subtitle. Every link entry that needs identity
 * verification (login / attendance / visit) renders through this so they look
 * identical.
 */
export function MagicAuthCard({
  title,
  subtitle,
  children,
}: MagicAuthCardProps) {
  return (
    <GuestPageShell centered maxWidthClassName="max-w-[460px]">
      <Card className="rounded-lg">
        <CardContent className="p-6">
          <div className="mb-5 text-center">
            <ShieldCheck
              className="mx-auto mb-3 size-10 text-primary"
              aria-hidden="true"
            />
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            {subtitle ? (
              <p className="text-sm text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          {children}
        </CardContent>
      </Card>
    </GuestPageShell>
  );
}
