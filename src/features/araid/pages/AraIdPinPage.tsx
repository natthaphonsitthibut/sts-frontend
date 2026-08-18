import { ChevronLeft, Delete } from "lucide-react";
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

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (
      error as { response?: { data?: { message?: string | string[] } } }
    ).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message[0] ?? "ไม่สามารถเข้าสู่ระบบได้";
    if (typeof message === "string") return message;
  }
  return "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง";
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
  const login = useAraIdLogin();
  const reauthenticateMutation = useAraIdReauthenticate();

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
      setPin("");
      setError(errorMessage(cause));
    }
  }

  function press(key: (typeof KEYS)[number]) {
    if (login.isPending || reauthenticateMutation.isPending) return;
    setError("");
    if (key === "delete") {
      setPin((current) => current.slice(0, -1));
      return;
    }
    if (!key || pin.length >= 8) return;
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

            <div className="mx-auto mt-8 grid grid-cols-3 gap-3 lg:mt-10 lg:gap-4">
              {KEYS.map((key, index) =>
                key ? (
                  <button
                    key={key}
                    type="button"
                    onClick={() => press(key)}
                    disabled={login.isPending}
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
            <p className="mt-4 min-h-6 text-xs text-danger" role="alert">
              {error}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
