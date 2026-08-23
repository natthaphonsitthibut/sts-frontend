import { ChevronLeft, Delete, Loader2, RotateCcw } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../../lib/utils";
import { AraIdWordmark } from "../components/AraIdWordmark";
import { useAraIdLogin, useAraIdReauthenticate } from "../hooks/useAraId";
import type { AraIdChallengeScope } from "../types/araid.types";

const KEYS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "",
  "0",
  "delete",
] as const;

interface AraIdPinFailure {
  message: string;
  /** A rejected PIN must be retyped; a failed round trip must not be — the PIN
   *  was never judged, so wiping it just makes the user redo 8 taps. */
  clearPin: boolean;
}

function describeFailure(error: unknown): AraIdPinFailure {
  const failed = (error ?? {}) as {
    response?: { status?: number; data?: { message?: string | string[] } };
  };
  const response = failed.response;

  // No response at all: the request timed out (the client aborts at 20s) or the
  // network dropped. On free-tier hosting the very first request also pays the
  // cold-start wake-up. None of that means the PIN was wrong.
  if (!response) {
    return {
      message: "ระบบตอบช้ากว่าปกติ ยังไม่ได้ตรวจสอบ PIN — กดลองอีกครั้งได้เลย",
      clearPin: false,
    };
  }
  const status = response.status ?? 0;
  if (status === 429) {
    return {
      message: "ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองอีกครั้ง",
      clearPin: false,
    };
  }
  if (status >= 500) {
    return {
      message: "ระบบไม่พร้อมใช้งานชั่วคราว กรุณาลองอีกครั้ง",
      clearPin: false,
    };
  }

  const message = response.data?.message;
  if (Array.isArray(message)) {
    return { message: message[0] ?? "ไม่สามารถเข้าสู่ระบบได้", clearPin: true };
  }
  if (typeof message === "string") return { message, clearPin: true };
  return {
    message: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
    clearPin: true,
  };
}

export function AraIdPinPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as {
    challengeToken?: string;
    identityNumber?: string;
    returnTo?: string;
    scope?: AraIdChallengeScope;
    verificationIntent?:
      | "LINE_LINK"
      | "LINE_LINK_QR"
      | "TEACHER_ACCESS"
      | "TEACHER_ACCESS_QR";
    reauthenticate?: boolean;
  } | null;
  const identityNumber = routeState?.identityNumber;
  const reauthenticate = Boolean(routeState?.reauthenticate);
  const verifiesTeacherAccess =
    routeState?.verificationIntent === "TEACHER_ACCESS" &&
    routeState.returnTo === "/teacher-access";
  const verifiesTeacherAccessQr =
    routeState?.verificationIntent === "TEACHER_ACCESS_QR" &&
    routeState.returnTo === "/araid/authorize" &&
    Boolean(routeState.challengeToken);
  const verifiesLineLink =
    routeState?.verificationIntent === "LINE_LINK" &&
    /^\/line-link#token=[a-f0-9]{64}$/i.test(routeState.returnTo ?? "");
  const verifiesLineLinkQr =
    routeState?.verificationIntent === "LINE_LINK_QR" &&
    /^\/line-link\/araid-authorize#challenge=[A-Za-z0-9_-]{32,128}$/.test(
      routeState.returnTo ?? "",
    ) &&
    Boolean(routeState.challengeToken);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [retryable, setRetryable] = useState(false);
  const login = useAraIdLogin();
  const reauthenticateMutation = useAraIdReauthenticate();
  const isSubmitting = login.isPending || reauthenticateMutation.isPending;

  if (
    !reauthenticate &&
    (!identityNumber || !/^\d{13}$/.test(identityNumber))
  ) {
    return <Navigate to="/araid/login" replace />;
  }
  const validIdentityNumber = identityNumber ?? "";

  async function submit(nextPin: string) {
    try {
      if (reauthenticate) {
        await reauthenticateMutation.mutateAsync(nextPin);
      } else {
        await login.mutateAsync({
          identityNumber: validIdentityNumber,
          pin: nextPin,
        });
      }
      void navigate(
        verifiesTeacherAccess
          ? "/teacher-access"
          : verifiesTeacherAccessQr
            ? "/araid/authorize"
            : verifiesLineLink
              ? routeState.returnTo!
              : verifiesLineLinkQr
                ? routeState.returnTo!
                : "/araid/home",
        {
          replace: true,
          state: verifiesTeacherAccess
            ? { araIdVerificationComplete: true }
            : verifiesTeacherAccessQr
              ? {
                  challengeToken: routeState?.challengeToken,
                  // Without the scope the authorize screen falls back to
                  // teacher-access and looks the challenge up under the wrong key.
                  scope: routeState?.scope,
                  araIdPinVerified: true,
                }
              : verifiesLineLink
                ? { araIdVerificationComplete: true }
                : verifiesLineLinkQr
                  ? { challengeToken: routeState.challengeToken }
                  : undefined,
        },
      );
    } catch (cause) {
      const failure = describeFailure(cause);
      if (failure.clearPin) setPin("");
      setError(failure.message);
      setRetryable(!failure.clearPin);
    }
  }

  function clearFailure(): void {
    setError("");
    setRetryable(false);
  }

  function press(key: (typeof KEYS)[number]) {
    if (isSubmitting) return;
    if (key === "delete") {
      clearFailure();
      setPin((current) => current.slice(0, -1));
      return;
    }
    // A full PIN swallows further digits — don't drop the retry affordance with it.
    if (!key || pin.length >= 8) return;
    clearFailure();
    const next = `${pin}${key}`;
    setPin(next);
    if (next.length === 8) window.setTimeout(() => void submit(next), 120);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      press(event.key as (typeof KEYS)[number]);
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      press("delete");
    }
  }

  function returnToIdentityInput(): void {
    void navigate("/araid/login", {
      replace: true,
      state: {
        challengeToken: routeState?.challengeToken,
        returnTo: routeState?.returnTo,
        scope: routeState?.scope,
        verificationIntent: routeState?.verificationIntent,
      },
    });
  }

  return (
    <main
      autoFocus
      className="min-h-dvh bg-white font-araid text-araid-brand-deep outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <section className="relative mx-auto flex min-h-dvh w-full max-w-[31rem] flex-col items-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(3.75rem,env(safe-area-inset-top))] text-center sm:px-10">
        <button
          aria-label="ย้อนกลับไปกรอกเลขประจำตัว"
          className="absolute left-3 top-4 grid size-11 place-items-center rounded-full text-araid-brand-deep transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-araid-brand active:bg-slate-200 motion-reduce:transition-none sm:left-5 sm:top-5"
          onClick={returnToIdentityInput}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="size-6" />
        </button>
        <div className="araid-screen-enter flex flex-col items-center">
          <AraIdWordmark className="text-base text-araid-brand-mid drop-shadow-none lg:text-[clamp(1.5rem,2vw,2rem)]" />

          <div className="mt-3 flex w-full flex-col items-center lg:mt-4">
            <h1 className="text-sm font-semibold leading-tight text-araid-brand-deep lg:text-[clamp(1.25rem,1.5vw,1.5rem)]">
              {reauthenticate
                ? "ยืนยัน PIN เพื่อดำเนินการต่อ"
                : "ยืนยันรหัสผ่าน"}
            </h1>
            <p className="mt-1 text-[0.6875rem] font-normal text-slate-500 lg:mt-1.5 lg:text-sm">
              กรุณากรอก PIN AraID 8 หลัก
            </p>

            <div
              className="mx-auto mt-6 flex gap-2 lg:mt-8 lg:gap-3"
              aria-label={`กรอกแล้ว ${pin.length} หลัก`}
            >
              {Array.from({ length: 8 }, (_, index) => (
                <span
                  key={index}
                  className="grid size-3.5 place-items-center rounded-[0.2rem] bg-araid-surface-icon lg:size-[clamp(1.25rem,1.5vw,1.375rem)] lg:rounded-[0.3rem]"
                >
                  {index < pin.length ? (
                    <span className="size-2 rounded-full bg-araid-brand-mid lg:size-3" />
                  ) : null}
                </span>
              ))}
            </div>

            <p
              aria-live="polite"
              className="mt-3 flex min-h-5 items-center justify-center gap-1.5 text-xs font-medium text-araid-brand-mid lg:text-sm"
              role="status"
            >
              {isSubmitting ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  กำลังตรวจสอบ…
                </>
              ) : null}
            </p>

            <div className="mx-auto mt-5 grid grid-cols-3 gap-3 lg:mt-7 lg:gap-4">
              {KEYS.map((key, index) =>
                key ? (
                  <button
                    key={key}
                    type="button"
                    onClick={() => press(key)}
                    disabled={isSubmitting}
                    aria-label={key === "delete" ? "ลบตัวเลข" : `เลข ${key}`}
                    className={cn(
                      "grid size-[3.25rem] place-items-center rounded-[0.7rem] text-base font-normal transition-colors disabled:opacity-40 lg:size-[clamp(4.75rem,6vw,5.75rem)] lg:rounded-2xl lg:text-[clamp(1.25rem,1.5vw,1.5rem)]",
                      key === "delete"
                        ? "border border-transparent bg-transparent text-araid-brand-deep hover:bg-araid-surface active:bg-araid-shell"
                        : "border border-araid-brand/40 bg-white text-slate-600 hover:bg-araid-surface active:bg-araid-shell",
                    )}
                  >
                    {key === "delete" ? (
                      <Delete
                        className="size-[1.35rem] fill-araid-brand-deep text-white lg:size-[clamp(2rem,2.4vw,2.375rem)]"
                        strokeWidth={2.5}
                      />
                    ) : (
                      key
                    )}
                  </button>
                ) : (
                  <span key={`empty-${index}`} />
                ),
              )}
            </div>
            <div className="mt-4 flex min-h-[3.25rem] w-full flex-col items-center gap-2.5">
              {error ? (
                <p
                  className="w-full rounded-lg bg-danger-100 px-3 py-2 text-xs font-medium leading-5 text-danger-700 lg:text-sm"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              {retryable && pin.length === 8 ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void submit(pin)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-araid-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-araid-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-araid-brand disabled:opacity-40"
                >
                  <RotateCcw aria-hidden="true" className="size-4" />
                  ลองอีกครั้ง
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
