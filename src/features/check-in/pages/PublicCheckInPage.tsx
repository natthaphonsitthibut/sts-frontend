import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FormErrorAlert } from "../../../components/base";
import { appConfig } from "../../../config/env";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import {
  ErrorState,
  SkeletonCards,
} from "../../../components/layout/page-primitives";
import { formatClassLabel } from "../../../lib/room-presentation";
import { AraIdQrChallengeView } from "../../auth/components/AraIdQrChallengeView";
import { IdentityMethodChoice } from "../../auth/components/IdentityMethodChoice";
import { DevelopmentGoogleEmailForm } from "../../auth/components/DevelopmentGoogleEmailForm";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
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
  const [showDevelopmentGoogle, setShowDevelopmentGoogle] = useState(false);
  const handledApproval = useRef(false);
  const contextQuery = useQuery({
    queryKey: ["check-in", "public-context", Boolean(token), tokenRevision],
    queryFn: () => checkInService.getPublicContext(token),
    retry: false,
  });
  const googleMutation = useMutation({
    mutationFn: async (email?: string) => {
      if (!token) throw new Error("กรุณาเปิดจากลิงก์ห้องเรียน");
      if (email) {
        await checkInService.verifyDevelopmentGoogle(token, email);
        return null;
      }
      return await checkInService.startGoogle(token);
    },
    onSuccess: (authorizationUrl) => {
      if (authorizationUrl) {
        window.location.assign(authorizationUrl);
        return;
      }
      void contextQuery.refetch();
    },
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

  if (contextQuery.isLoading) {
    return (
      <GuestPageShell as="main" showProfile={false}>
        <SkeletonCards count={4} />
      </GuestPageShell>
    );
  }

  if (!context) {
    return (
      <GuestPageShell
        as="main"
        centered
        contentClassName="max-w-lg"
        showProfile={false}
      >
        <ErrorState
          description="ลิงก์อาจหมดอายุ ถูกปิด หรือถูกสร้างใหม่แล้ว กรุณาขอลิงก์ใหม่จากโรงเรียน"
          onRetry={() => void contextQuery.refetch()}
          title="ลิงก์นี้ใช้งานไม่ได้"
        />
      </GuestPageShell>
    );
  }

  if (context.authentication.status === "REQUIRED" && challenge) {
    return (
      <AraIdQrChallengeView
        expiresAt={challenge.expiresAt}
        hasStatusError={challengeStatus.isError}
        isInProgress={challengeStatus.data?.status === "IN_PROGRESS"}
        isRefreshing={araIdMutation.isPending}
        onBack={() => {
          setChallengeToken(null);
          araIdMutation.reset();
        }}
        onRefresh={() => {
          setChallengeToken(null);
          void araIdMutation.mutateAsync().catch(() => undefined);
        }}
        qrDataUrl={challenge.qrDataUrl}
        referenceCode={challenge.referenceCode}
        schoolName={context.school.name}
        verificationUrl={challenge.verificationUrl}
      />
    );
  }

  if (context.authentication.status === "REQUIRED") {
    return (
      <MagicAuthCard
        cardContentClassName="min-h-[23.625rem]"
        showProfile={false}
        subtitle={`${context.school.name} · ${formatClassLabel(
          context.classroom.gradeLabel,
          context.classroom.roomNumber,
        )}`}
        title="ยืนยันตัวตนเพื่อเข้าใช้งาน"
      >
        <div className="space-y-4">
          <FormErrorAlert
            error={error}
            fallback="ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่"
          />
          {showDevelopmentGoogle ? (
            <DevelopmentGoogleEmailForm
              isSubmitting={googleMutation.isPending}
              onBack={() => {
                googleMutation.reset();
                setShowDevelopmentGoogle(false);
              }}
              onSubmit={(email) => googleMutation.mutate(email)}
            />
          ) : (
            <IdentityMethodChoice
              araIdDescription="ยืนยันด้วย AraID และเลขประจำตัวที่ผูกกับข้อมูลครู"
              disabled={googleMutation.isPending || araIdMutation.isPending}
              emailDescription="ยืนยันด้วย Google และบัญชีของครู"
              emailLabel="Google"
              onChooseAraId={() => {
                void araIdMutation.mutateAsync().catch(() => undefined);
              }}
              onChooseEmail={() => {
                if (appConfig.isDevelopment) {
                  setShowDevelopmentGoogle(true);
                  return;
                }
                googleMutation.mutate(undefined);
              }}
            />
          )}
        </div>
      </MagicAuthCard>
    );
  }

  return (
    <GuestPageShell as="main" showProfile={false}>
      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        ยืนยันแล้ว: <strong>{context.authentication.displayName}</strong>
      </div>
      <CheckInWorkspace
        access="PUBLIC_LINK"
        classroomId={context.classroom.id}
      />
    </GuestPageShell>
  );
}
