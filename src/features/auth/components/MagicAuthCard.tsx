import type { ReactNode } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Card, CardContent, IconButton } from "../../../components/base";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import { cn } from "../../../lib/utils";

interface MagicAuthCardProps {
  title: string;
  subtitle?: string;
  showProfile?: boolean;
  backLabel?: string;
  onBack?: () => void;
  children: ReactNode;
  cardContentClassName?: string;
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
  showProfile = true,
  backLabel = "ย้อนกลับ",
  onBack,
  children,
  cardContentClassName,
}: MagicAuthCardProps) {
  return (
    <GuestPageShell centered contentClassName="max-w-[460px]" showProfile={showProfile}>
      <Card className="rounded-lg">
        <CardContent className={cn("relative p-6", cardContentClassName)}>
          {onBack ? (
            <IconButton
              aria-label={backLabel}
              className="absolute left-4 top-4"
              icon={ArrowLeft}
              onClick={onBack}
              size="md"
              title={backLabel}
              variant="outline"
            />
          ) : null}
          <div className="mb-5 text-center">
            <ShieldCheck
              className="mx-auto mb-3 size-10 text-primary"
              aria-hidden="true"
            />
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            {subtitle ? (
              <p className="text-sm text-slate-500">{subtitle}</p>
            ) : null}
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              เพื่อความปลอดภัยของข้อมูลนักเรียน ระบบต้องยืนยันตัวตนของคุณก่อนเข้าถึงลิงก์นี้
            </p>
          </div>
          {children}
        </CardContent>
      </Card>
    </GuestPageShell>
  );
}
