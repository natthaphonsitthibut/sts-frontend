import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ExternalLink,
  IdCard,
  LogIn,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button, FormErrorAlert, StsLogo } from "../../../components/base";
import { formatClassLabel } from "../../../lib/room-presentation";
import { CheckInWorkspace } from "../components/CheckInWorkspace";
import { checkInService } from "../api/check-in.service";

let publicContextRevision = 0;

function initialToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return fragment.get("token")?.trim() || undefined;
}

export function PublicCheckInPage() {
  const [token, setToken] = useState(initialToken);
  const [tokenRevision, setTokenRevision] = useState(
    () => ++publicContextRevision,
  );
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const handledApproval = useRef(false);
  const contextQuery = useQuery({
    queryKey: ["check-in", "public-context", Boolean(token), tokenRevision],
    queryFn: () => checkInService.getPublicContext(token),
    retry: false,
  });
  const googleMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("กรุณาเปิดจากลิงก์ห้องเรียน");
      return await checkInService.startGoogle(token);
    },
    onSuccess: (authorizationUrl) => window.location.assign(authorizationUrl),
  });
  const araIdMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("กรุณาเปิดจากลิงก์ห้องเรียน");
      return await checkInService.createAraIdChallenge(token);
    },
    onSuccess: (challenge) => {
      handledApproval.current = false;
      setChallengeToken(challenge.challengeToken);
    },
  });
  const challenge = araIdMutation.data;
  const challengeStatus = useQuery({
    queryKey: ["check-in", "araid-challenge", challengeToken],
    queryFn: () => checkInService.pollAraIdChallenge(challengeToken!),
    enabled: Boolean(challengeToken),
    refetchInterval: (query) =>
      query.state.status === "error" ||
      query.state.data?.status === "APPROVED" ||
      (challenge?.expiresAt
        ? Date.now() >= new Date(challenge.expiresAt).getTime()
        : false)
        ? false
        : 2_000,
    retry: false,
  });
  const refetchContext = contextQuery.refetch;

  useEffect(() => {
    handledApproval.current = false;
  }, [challengeToken]);

  useEffect(() => {
    const refreshIncomingToken = () => {
      setToken(initialToken());
      setTokenRevision(++publicContextRevision);
    };
    window.addEventListener("hashchange", refreshIncomingToken);
    window.addEventListener("popstate", refreshIncomingToken);
    return () => {
      window.removeEventListener("hashchange", refreshIncomingToken);
      window.removeEventListener("popstate", refreshIncomingToken);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
  }, [token]);

  useEffect(() => {
    if (challengeStatus.data?.status !== "APPROVED" || handledApproval.current)
      return;
    handledApproval.current = true;
    setChallengeToken(null);
    void refetchContext();
  }, [challengeStatus.data?.status, refetchContext]);

  const error =
    contextQuery.error ??
    googleMutation.error ??
    araIdMutation.error ??
    challengeStatus.error;
  const context = contextQuery.error ? undefined : contextQuery.data;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StsLogo className="size-11" />
            <div>
              <p className="text-sm font-bold text-primary">STS</p>
              <h1 className="text-xl font-extrabold text-slate-950">
                เช็กชื่อห้องเรียน
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <ShieldCheck
              className="size-4 text-emerald-600"
              aria-hidden="true"
            />
            ยืนยันตัวตนครูของโรงเรียนก่อนใช้งาน
          </div>
        </header>

        <FormErrorAlert
          className="mb-4"
          error={error}
          fallback="เปิดลิงก์ห้องเรียนไม่สำเร็จ"
        />

        {contextQuery.isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
            กำลังตรวจสอบลิงก์ห้องเรียน…
          </div>
        ) : !context ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              ลิงก์นี้ใช้งานไม่ได้
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              ลิงก์อาจหมดอายุ ถูกปิด หรือถูกเปลี่ยนแล้ว
              กรุณาขอลิงก์ใหม่จากโรงเรียน
            </p>
            <Button
              className="mt-5"
              icon={RefreshCw}
              onClick={() => {
                void contextQuery.refetch();
              }}
              variant="outline"
            >
              ลองอีกครั้ง
            </Button>
          </div>
        ) : context.authentication.status === "REQUIRED" ? (
          <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
            <div className="mb-6 text-center">
              <p className="text-sm font-semibold text-slate-500">
                {context.school.name}
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-slate-950">
                {formatClassLabel(
                  context.classroom.gradeLabel,
                  context.classroom.roomNumber,
                )}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                ครูที่มีสถานะใช้งานในโรงเรียนนี้ทุกคนสามารถยืนยันตัวตนและเช็กชื่อได้
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                fullWidth
                icon={LogIn}
                isLoading={googleMutation.isPending}
                onClick={() => {
                  void googleMutation.mutateAsync().catch(() => undefined);
                }}
              >
                ยืนยันด้วย Google
              </Button>
              <Button
                fullWidth
                icon={IdCard}
                isLoading={araIdMutation.isPending}
                onClick={() => {
                  void araIdMutation.mutateAsync().catch(() => undefined);
                }}
                variant="outline"
              >
                ยืนยันด้วย AraID
              </Button>
            </div>
            {challenge ? (
              <div className="mt-6 rounded-xl border border-primary/20 bg-primary-soft p-4 text-center">
                <img
                  alt="QR สำหรับยืนยันตัวตนด้วย AraID"
                  className="mx-auto size-52 rounded-lg bg-white p-2"
                  src={challenge.qrDataUrl}
                />
                <p className="mt-3 text-sm font-bold text-slate-900">
                  รหัสอ้างอิง {challenge.referenceCode}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {challengeStatus.data?.status === "IN_PROGRESS"
                    ? "กำลังยืนยันตัวตนใน AraID…"
                    : "สแกน QR หรือเปิด AraID แล้วหน้านี้จะเข้าสู่ห้องอัตโนมัติ"}
                </p>
                <Button
                  className="mt-3"
                  icon={ExternalLink}
                  onClick={() =>
                    window.open(
                      challenge.verificationUrl,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  variant="outline"
                >
                  เปิด AraID
                </Button>
              </div>
            ) : null}
          </section>
        ) : (
          <>
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              ยืนยันแล้ว: <strong>{context.authentication.displayName}</strong>
            </div>
            <CheckInWorkspace
              access="PUBLIC_LINK"
              classroomId={context.classroom.id}
            />
          </>
        )}
      </div>
    </main>
  );
}
