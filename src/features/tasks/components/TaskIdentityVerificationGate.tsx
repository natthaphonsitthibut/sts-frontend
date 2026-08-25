import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription } from "../../../components/base";
import { appConfig } from "../../../config/env";
import { DevelopmentGoogleEmailForm } from "../../auth/components/DevelopmentGoogleEmailForm";
import { IdentityMethodChoice } from "../../auth/components/IdentityMethodChoice";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { taskService } from "../api/task.service";
import type { TaskAraIdChallenge } from "../types/task.types";
import { TASK_GOOGLE_PENDING_KEY } from "../lib/task-google-login";
import { TaskAraIdChallengePanel } from "./TaskAraIdChallengePanel";

interface TaskIdentityVerificationGateProps {
  token: string;
  onVerified: (sessionToken: string) => void;
}

export function TaskIdentityVerificationGate({
  token,
  onVerified,
}: TaskIdentityVerificationGateProps) {
  const writeMagicToken = useAuthSessionStore((state) => state.writeMagicToken);
  const [araIdChallenge, setAraIdChallenge] =
    useState<TaskAraIdChallenge | null>(null);
  const [showDevelopmentGoogle, setShowDevelopmentGoogle] = useState(false);

  const createAraIdChallenge = useMutation({
    mutationFn: () => taskService.createTaskAraIdChallenge(token),
    meta: { suppressSuccessToast: true },
  });
  const startGoogle = useMutation({
    mutationFn: async (
      email?: string,
    ): Promise<
      | { kind: "session"; sessionToken: string }
      | { kind: "redirect"; authorizationUrl: string }
    > =>
      email
        ? {
            kind: "session",
            sessionToken: await taskService.verifyDevelopmentTaskGoogle(
              token,
              email,
            ),
          }
        : {
            kind: "redirect",
            authorizationUrl: await taskService.startTaskGoogle(token),
          },
    meta: { suppressSuccessToast: true },
    onSuccess: (result) => {
      if (result.kind === "session") {
        acceptSession(result.sessionToken);
        return;
      }
      window.sessionStorage.setItem(
        TASK_GOOGLE_PENDING_KEY,
        JSON.stringify({
          token,
          returnTo: `${window.location.pathname}${window.location.search}`,
        }),
      );
      window.location.assign(result.authorizationUrl);
    },
  });

  function acceptSession(sessionToken: string): void {
    writeMagicToken(token, sessionToken, "local");
    onVerified(sessionToken);
  }

  if (araIdChallenge) {
    return (
      <TaskAraIdChallengePanel
        challenge={araIdChallenge}
        isRefreshing={createAraIdChallenge.isPending}
        onApproved={acceptSession}
        onBack={() => setAraIdChallenge(null)}
        onExpired={() => {
          void createAraIdChallenge
            .mutateAsync()
            .then(setAraIdChallenge)
            .catch(() => undefined);
        }}
      />
    );
  }

  return (
    <MagicAuthCard
      cardContentClassName="min-h-[23.625rem]"
      showProfile={false}
      subtitle="ครูที่เปิดใช้งานในโรงเรียนนี้สามารถยืนยันได้"
      title="ยืนยันตัวตนเพื่อเข้าใช้งาน"
    >
      <div className="space-y-4">
        {createAraIdChallenge.error || startGoogle.error ? (
          <Alert variant="destructive">
            <AlertDescription>
              ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่
            </AlertDescription>
          </Alert>
        ) : null}
        {showDevelopmentGoogle ? (
          <DevelopmentGoogleEmailForm
            isSubmitting={startGoogle.isPending}
            onBack={() => {
              startGoogle.reset();
              setShowDevelopmentGoogle(false);
            }}
            onSubmit={(email) => startGoogle.mutate(email)}
          />
        ) : (
          <IdentityMethodChoice
            araIdDescription="ยืนยันด้วย AraID ของครูในโรงเรียน"
            disabled={createAraIdChallenge.isPending || startGoogle.isPending}
            emailDescription="ยืนยันด้วยบัญชี Google ที่ตรงกับอีเมลครูในโรงเรียน"
            emailLabel="Google"
            onChooseAraId={() => {
              void createAraIdChallenge
                .mutateAsync()
                .then(setAraIdChallenge)
                .catch(() => undefined);
            }}
            onChooseEmail={() => {
              if (appConfig.isDevelopment) {
                setShowDevelopmentGoogle(true);
                return;
              }
              startGoogle.mutate(undefined);
            }}
          />
        )}
      </div>
    </MagicAuthCard>
  );
}
