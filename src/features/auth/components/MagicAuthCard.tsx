import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "../../../components/base";

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
export function MagicAuthCard({ title, subtitle, children }: MagicAuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <Card className="w-full max-w-[460px] rounded-lg">
        <CardContent className="p-6">
          <div className="mb-5 text-center">
            <ShieldCheck className="mx-auto mb-3 size-10 text-primary" aria-hidden="true" />
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
