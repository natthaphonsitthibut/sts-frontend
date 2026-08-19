import { ChevronLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import splashIllustration from "../assets/araid-splash-illustration.png";
import { AraIdPrimaryButton } from "../components/AraIdPrimaryButton";
import { AraIdSplashBackground } from "../components/AraIdSplashBackground";
import { AraIdStatusBar } from "../components/AraIdStatusBar";
import { AraIdWordmark } from "../components/AraIdWordmark";
import type { AraIdChallengeScope } from "../types/araid.types";

function formatIdentityNumber(value: string): string {
  const groups = [
    value.slice(0, 1),
    value.slice(1, 5),
    value.slice(5, 10),
    value.slice(10, 12),
    value.slice(12, 13),
  ];
  return groups.filter(Boolean).join("-");
}

export function AraIdLoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [identityNumber, setIdentityNumber] = useState("");
  const [error, setError] = useState("");
  const routeState = location.state as {
    challengeToken?: string;
    returnTo?: string;
    scope?: AraIdChallengeScope;
    verificationIntent?:
      | "LINE_LINK"
      | "LINE_LINK_QR"
      | "TEACHER_ACCESS"
      | "TEACHER_ACCESS_QR";
  } | null;
  const verifiesTeacherAccess =
    routeState?.verificationIntent === "TEACHER_ACCESS";
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
  const backTo = verifiesTeacherAccess
    ? "/teacher-access"
    : verifiesTeacherAccessQr || verifiesLineLink || verifiesLineLinkQr
      ? routeState.returnTo!
      : "/araid";
  // /araid/authorize has no hash to recover the challenge from once we've
  // navigated away from it client-side, unlike the LINE QR flow, which keeps
  // its challenge token in returnTo's hash — hand it back explicitly.
  const backState = verifiesTeacherAccessQr
    ? { challengeToken: routeState?.challengeToken, scope: routeState?.scope }
    : undefined;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{13}$/.test(identityNumber)) {
      setError("กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลัก");
      return;
    }
    void navigate("/araid/pin", {
      state: {
        identityNumber,
        ...(verifiesTeacherAccess ||
        verifiesTeacherAccessQr ||
        verifiesLineLink ||
        verifiesLineLinkQr
          ? {
              challengeToken: routeState?.challengeToken,
              returnTo: routeState?.returnTo,
              // The QR carries the flow it belongs to only in its hash, which
              // this detour drops — hand it on so the PIN step can give it back.
              scope: routeState?.scope,
              verificationIntent: routeState?.verificationIntent,
            }
          : {}),
      },
    });
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-araid-brand font-araid lg:grid lg:grid-cols-[minmax(26rem,0.9fr)_minmax(34rem,1.1fr)] lg:bg-white">
      <aside className="relative hidden min-h-dvh overflow-hidden bg-araid-brand text-white lg:flex lg:items-center lg:justify-center">
        <AraIdSplashBackground />
        <div className="araid-brand-enter relative z-10 flex w-full max-w-[34rem] flex-col items-center px-10 py-12 text-center">
          <AraIdWordmark className="text-5xl" />
          <img
            src={splashIllustration}
            alt=""
            className="mt-8 w-[min(82%,27rem)] object-contain"
          />
          <p className="mt-4 text-base font-semibold leading-6 text-white">
            ยืนยันตัวตนอย่างปลอดภัย
            <br />
            และเข้าถึงข้อมูลของคุณผ่าน AraID
          </p>
        </div>
      </aside>

      <section className="relative z-10 flex min-h-dvh flex-col lg:bg-white">
        <header className="text-white lg:text-araid-brand-deep">
          <AraIdStatusBar />
          <div className="relative flex h-14 items-center justify-center px-14 sm:h-16 lg:h-20 lg:justify-start lg:px-8 xl:px-12">
            <button
              type="button"
              aria-label="ย้อนกลับ"
              onClick={() =>
                void navigate(
                  backTo,
                  backState ? { state: backState } : undefined,
                )
              }
              className="absolute left-3 grid size-11 place-items-center rounded-full bg-araid-brand-deep/70 text-white transition-colors duration-150 hover:bg-araid-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:bg-araid-brand-deep motion-reduce:transition-none sm:left-5 lg:static lg:mr-auto lg:bg-transparent lg:text-araid-brand-deep lg:hover:bg-araid-surface-icon lg:focus-visible:outline-araid-brand"
            >
              <ChevronLeft
                aria-hidden="true"
                className="size-6"
                strokeWidth={2.4}
              />
            </button>
            <AraIdWordmark className="text-xl drop-shadow-none lg:hidden" />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 md:items-center md:justify-center md:px-8 md:pb-12 lg:px-12 lg:pb-20 xl:px-20">
          <div className="araid-screen-enter flex w-full flex-1 flex-col rounded-t-[1.25rem] bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 text-slate-800 sm:px-8 md:max-w-[34rem] md:flex-none md:rounded-2xl md:px-14 md:py-12 md:shadow-araid-login lg:max-w-[31rem] lg:rounded-none lg:p-0 lg:shadow-none">
            <form
              onSubmit={submit}
              className="flex min-h-0 w-full flex-1 flex-col md:flex-none"
            >
              <div className="text-center lg:text-left">
                <h1 className="text-xl font-bold leading-7 text-araid-brand-deep md:text-2xl">
                  เข้าสู่ระบบ AraID
                </h1>
                <p className="mt-1.5 text-sm leading-5 text-araid-text-muted">
                  กรอกเลขประจำตัวประชาชนเพื่อดำเนินการต่อ
                </p>
              </div>

              <label
                htmlFor="araid-identity-number"
                className="mt-9 block text-sm font-semibold text-slate-900 md:mt-10"
              >
                เลขประจำตัวประชาชน 13 หลัก
              </label>
              <input
                id="araid-identity-number"
                value={formatIdentityNumber(identityNumber)}
                onChange={(event) => {
                  setIdentityNumber(
                    event.target.value.replace(/\D/g, "").slice(0, 13),
                  );
                  setError("");
                }}
                inputMode="numeric"
                autoComplete="username"
                placeholder="x-xxxx-xxxxx-xx-x"
                aria-describedby="araid-login-message"
                aria-invalid={Boolean(error)}
                className="mt-2 h-14 w-full rounded-xl border border-araid-border-strong bg-white px-4 text-center text-lg font-medium tracking-[0.06em] text-araid-brand-deep outline-none transition-[border-color,box-shadow] duration-150 placeholder:tracking-normal placeholder:text-araid-text-muted hover:border-araid-brand/55 focus:border-araid-action focus:ring-2 focus:ring-araid-action/15 motion-reduce:transition-none"
              />
              <p
                id="araid-login-message"
                className={`mt-2 min-h-5 text-xs ${error ? "text-danger" : "text-araid-text-muted"}`}
                role={error ? "alert" : undefined}
              >
                {error || "กรอกเฉพาะตัวเลข ระบบจะจัดรูปแบบให้อัตโนมัติ"}
              </p>

              <AraIdPrimaryButton
                className="mt-auto md:mt-9"
                type="submit"
                disabled={identityNumber.length !== 13}
                showArrow
              >
                ถัดไป
              </AraIdPrimaryButton>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
