import { ArrowLeft, Clock3, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { IconButton } from "../../../components/base";
import { LinkSharePanel } from "../../../components/layout/link-share-dialog";
import { cn } from "../../../lib/utils";
import { AraIdWordmark } from "../../araid/components/AraIdWordmark";

interface AraIdQrChallengeViewProps {
  expiresAt: string;
  hasStatusError?: boolean;
  isInProgress?: boolean;
  isRefreshing?: boolean;
  onBack: () => void;
  onRefresh: () => void;
  qrDataUrl: string;
  referenceCode: string;
  schoolName?: string;
  verificationUrl: string;
}

function remainingTime(expiresAt: string): number {
  return Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1_000),
  );
}

export function AraIdQrChallengeView({
  expiresAt,
  hasStatusError = false,
  isInProgress = false,
  isRefreshing = false,
  onBack,
  onRefresh,
  qrDataUrl,
  referenceCode,
  schoolName,
  verificationUrl,
}: AraIdQrChallengeViewProps) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    remainingTime(expiresAt),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = remainingTime(expiresAt);
      setSecondsLeft(next);
      if (next === 0) window.clearInterval(timer);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const expired = secondsLeft === 0;
  const needsRefresh = (expired && !isInProgress) || hasStatusError;
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <main className="relative min-h-dvh overflow-hidden bg-white px-4 py-8 sm:px-6 lg:py-12">
      <div className="pointer-events-none absolute left-[5%] top-[0.5%] h-[99%] w-[90%] bg-araid-qr-surface [clip-path:polygon(0_0,50%_0,100%_27%,88%_100%,34%_100%)]" />

      <div className="relative mx-auto flex w-full max-w-xl flex-col items-center gap-5">
        <section className="araid-screen-enter relative w-full max-w-[25rem] overflow-hidden rounded-lg bg-araid-qr-panel text-white shadow-xl">
          <IconButton
            aria-label="ย้อนกลับไปเลือกวิธียืนยัน"
            className="absolute left-4 top-4 z-20"
            icon={ArrowLeft}
            onClick={onBack}
            title="ย้อนกลับ"
            variant="outline"
          />
          <div className="px-6 pb-7 pt-5 text-center">
            <h1 className="text-2xl font-bold leading-tight">เข้าสู่ระบบ</h1>
            <div className="mt-0.5 text-xs font-semibold">
              ด้วย <AraIdWordmark className="inline text-xs" />
            </div>
            <p className="mx-auto mt-4 max-w-xs text-lg font-semibold leading-6">
              ระบบติดตามผู้เรียน
              {schoolName ? (
                <>
                  <br />
                  {schoolName}
                </>
              ) : null}
            </p>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold">
              <Clock3 aria-hidden="true" className="size-4" />
              {isInProgress
                ? "กำลังยืนยันตัวตน…"
                : `หมดเวลาใน : ${minutes}:${seconds}`}
            </p>

            <div className="relative mx-auto mt-4 w-fit bg-white p-3">
              <img
                alt="QR สำหรับยืนยันด้วย AraID"
                className={cn(
                  "size-[min(68vw,18rem)] max-h-72 max-w-72 transition-opacity",
                  (needsRefresh || isInProgress) && "opacity-25",
                )}
                src={qrDataUrl}
              />
              {!needsRefresh && !isInProgress ? (
                <span className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded bg-white px-2 py-1 shadow-sm">
                  <AraIdWordmark className="text-sm text-araid-brand-deep drop-shadow-none" />
                </span>
              ) : needsRefresh ? (
                <button
                  aria-label="สร้าง QR และลิงก์ใหม่"
                  className="group absolute inset-0 m-auto grid size-20 place-items-center rounded-full bg-araid-qr-panel text-white shadow-lg transition hover:scale-105 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-araid-qr-panel disabled:cursor-wait disabled:opacity-70 motion-reduce:transform-none"
                  disabled={isRefreshing}
                  onClick={onRefresh}
                  title="สร้าง QR และลิงก์ใหม่"
                  type="button"
                >
                  <RefreshCw
                    aria-hidden="true"
                    className={cn(
                      "size-8",
                      isRefreshing && "animate-spin motion-reduce:animate-none",
                    )}
                  />
                </button>
              ) : (
                <span className="absolute inset-0 m-auto grid size-20 place-items-center rounded-full bg-araid-qr-panel text-white shadow-lg">
                  <RefreshCw
                    aria-hidden="true"
                    className="size-8 animate-spin motion-reduce:animate-none"
                  />
                </span>
              )}
            </div>
          </div>
          <div className="border-t border-white/70 px-5 py-2 text-right text-xs">
            หมายเลขอ้างอิง : {referenceCode}
          </div>
          <p className="px-6 py-5 text-center text-xs font-medium leading-5">
            คิวอาร์โค้ดนี้ใช้ยืนยันตัวตนทางดิจิทัล ออกให้โดย
            <br />
            ระบบ AraID
          </p>
        </section>

        <section className="w-full max-w-[25rem] rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <LinkSharePanel
            disabled={needsRefresh || isInProgress || isRefreshing}
            link={verificationUrl}
          />
        </section>
      </div>
    </main>
  );
}
