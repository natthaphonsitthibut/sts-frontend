import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import splashIllustration from "../assets/araid-splash-illustration.png";
import { AraIdSplashBackground } from "../components/AraIdSplashBackground";
import { AraIdWordmark } from "../components/AraIdWordmark";
import { useAraIdSession } from "../hooks/useAraId";

export function AraIdSplashPage() {
  const navigate = useNavigate();
  const session = useAraIdSession();
  const isSignedIn = Boolean(session.data);

  function start(): void {
    if (session.isPending) return;
    void navigate(
      isSignedIn ? "/araid/pin" : "/araid/login",
      isSignedIn ? { state: { reauthenticate: true } } : undefined,
    );
  }

  return (
    <main className="flex min-h-dvh justify-center overflow-hidden bg-araid-brand-deep">
      <section
        aria-labelledby="araid-splash-title"
        className="araid-screen-enter relative min-h-dvh w-full overflow-hidden bg-araid-brand font-araid text-white"
      >
        <AraIdSplashBackground />

        <h1
          id="araid-splash-title"
          className="absolute inset-x-0 top-[17.5%] z-10 text-center sm:top-[11%]"
        >
          <AraIdWordmark className="text-3xl sm:text-4xl" />
        </h1>

        <img
          src={splashIllustration}
          alt="ภาพประกอบการยืนยันตัวตนดิจิทัลผ่าน AraID"
          className="absolute left-1/2 top-[31%] z-10 w-[66%] max-w-[32rem] -translate-x-1/2 object-contain sm:top-[24%] lg:max-w-[30rem]"
        />

        <p className="absolute inset-x-[8%] bottom-[20.5%] z-10 text-center text-sm font-semibold leading-[1.45] text-white drop-shadow-araid-wordmark sm:bottom-[15%] sm:text-base">
          มิติใหม่ของการยืนยันตัวตนทางดิจิทัล
          <br />
          โดยกรมการปกครอง กระทรวงมหาดไทย
        </p>

        <button
          type="button"
          aria-busy={session.isPending}
          disabled={session.isPending}
          onClick={start}
          className="absolute inset-x-[6.5%] bottom-[5.8%] z-10 flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10  px-6 py-2.5 text-sm font-semibold text-white araid-splash-action transition-[filter,transform] duration-150 ease-out hover:brightness-105 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none sm:inset-x-1/2 sm:bottom-[5%] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:text-base"
        >
          <span>
            {session.isPending
              ? "กำลังตรวจสอบ…"
              : isSignedIn
                ? "ยืนยัน PIN"
                : "เริ่มต้น"}
          </span>
          <ChevronRight
            aria-hidden="true"
            className="size-5"
            strokeWidth={2.2}
          />
        </button>
      </section>
    </main>
  );
}
