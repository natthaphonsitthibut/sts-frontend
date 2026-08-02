import type { ReactNode } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Lock, SearchX } from "lucide-react";
import { buttonVariants, Card, CardContent } from "../../../components/base";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import { GuestReceiptCard } from "../../../components/layout/guest-receipt-card";

type StatusTone = "success" | "warning" | "danger" | "neutral";

interface StatusPageProps {
  code?: string;
  message: string;
  note?: ReactNode;
  primaryLabel?: string;
  primaryTo?: string;
  title: string;
  tone: StatusTone;
}

const toneIcon = {
  danger: AlertTriangle,
  neutral: SearchX,
  success: CheckCircle2,
  warning: Lock,
} satisfies Record<StatusTone, typeof CheckCircle2>;

const toneClass = {
  danger: "text-danger-700 bg-danger-100",
  neutral: "text-slate-700 bg-slate-100",
  success: "text-success-700 bg-success-100",
  warning: "text-warning-700 bg-warning-100",
} satisfies Record<StatusTone, string>;

export function StatusPage({
  code,
  message,
  note,
  primaryLabel = "กลับหน้าหลัก",
  primaryTo = "/",
  title,
  tone,
}: StatusPageProps) {
  const Icon = toneIcon[tone];

  return (
    <GuestPageShell centered contentClassName="max-w-[520px]">
      <Card className="rounded-lg">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <div className={`mb-4 rounded-full p-4 ${toneClass[tone]}`}>
            <Icon className="size-10" aria-hidden="true" />
          </div>
          {code ? (
            <div className="mb-2 text-sm font-bold text-slate-500">{code}</div>
          ) : null}
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
          {note ? (
            <div className="mt-4 text-sm text-slate-500">{note}</div>
          ) : null}
          <Link
            className={buttonVariants({ className: "mt-6" })}
            to={primaryTo}
          >
            {primaryLabel}
          </Link>
        </CardContent>
      </Card>
    </GuestPageShell>
  );
}

export function SuccessPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isVisitReport = searchParams.get("type") === "visit";
  // The submitting page hands over the form heading it already rendered; the
  // link is COMPLETED by now, so re-reading the task would no longer return it.
  const formTitle =
    typeof (location.state as { formTitle?: unknown } | null)?.formTitle === "string"
      ? (location.state as { formTitle: string }).formTitle
      : "";

  if (isVisitReport) {
    return (
      <GuestPageShell contentClassName="max-w-[656px]">
        <GuestReceiptCard
          message="ส่งผลการติดตามเพื่อรอผู้รับผิดชอบตรวจสอบแล้ว"
          title={formTitle || "แบบฟอร์มการติดตามนักเรียน"}
        />
      </GuestPageShell>
    );
  }

  return (
    <StatusPage
      message="ข้อมูลของคุณถูกบันทึกเรียบร้อยแล้ว"
      note="ลิงก์นี้ใช้งานเสร็จสมบูรณ์แล้ว"
      title="บันทึกสำเร็จ"
      tone="success"
    />
  );
}

export function CompletedPage() {
  return (
    <GuestPageShell centered contentClassName="max-w-[520px]">
      <Card className="rounded-lg">
        <CardContent className="flex min-h-56 items-center justify-center p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900">
            ลิงก์นี้ถูกบันทึกเรียบร้อยแล้ว
          </h1>
        </CardContent>
      </Card>
    </GuestPageShell>
  );
}

export function ExpiredPage() {
  return (
    <StatusPage
      message="ลิงก์นี้ใช้งานไม่ได้อีกแล้ว เนื่องจากเกินระยะเวลาที่กำหนด"
      note="กรุณาติดต่อผู้ส่งลิงก์เพื่อขอรับลิงก์ใหม่"
      title="ลิงก์หมดอายุแล้ว"
      tone="warning"
    />
  );
}

export function LockedPage() {
  return (
    <StatusPage
      message="ลิงก์นี้ถูกปิดโดยผู้ดูแลระบบ ไม่สามารถเข้าใช้งานได้ในขณะนี้"
      note="กรุณาติดต่อผู้ส่งลิงก์เพื่อสอบถามข้อมูลเพิ่มเติม"
      title="ลิงก์ถูกปิดการใช้งาน"
      tone="warning"
    />
  );
}

export function ForbiddenPage() {
  return (
    <StatusPage
      code="403"
      message="คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้ หากต้องการเข้าใช้งาน กรุณาติดต่อผู้ดูแลระบบ"
      title="ไม่มีสิทธิ์เข้าถึง"
      tone="danger"
    />
  );
}

export function NotFoundPage() {
  return (
    <StatusPage
      code="404"
      message="หน้าที่คุณค้นหาอาจถูกลบ ย้าย หรือไม่พร้อมใช้งานในเส้นทางนี้แล้ว"
      title="ไม่พบหน้านี้"
      tone="neutral"
    />
  );
}
