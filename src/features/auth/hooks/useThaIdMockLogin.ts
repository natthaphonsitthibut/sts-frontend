import { AxiosError } from "axios";
import { useMutation } from "@tanstack/react-query";
import { authService } from "../api/auth.service";
import { useAuthSessionStore } from "../store/auth-session.store";
import type { ThaIdMockLoginPayload } from "../schemas/login.schema";
import { usePostLoginRedirect } from "./usePostLoginRedirect";

function getThaIdErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return "ไม่สามารถเข้าสู่ระบบด้วย ThaID mock ได้";
}

export function useThaIdMockLogin() {
  const saveSession = useAuthSessionStore((state) => state.saveSession);
  const redirectAfterLogin = usePostLoginRedirect();

  return useMutation({
    mutationFn: (payload: ThaIdMockLoginPayload) =>
      authService.loginWithMockThaId(payload),
    onSuccess: (user) => {
      saveSession(user, { target: "local", hasAdminAccess: true });
      redirectAfterLogin(user);
    },
  });
}

export function getThaIdMutationErrorMessage(error: unknown): string {
  return getThaIdErrorMessage(error);
}
