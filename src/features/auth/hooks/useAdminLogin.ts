import { AxiosError } from "axios";
import { useMutation } from "@tanstack/react-query";
import { authService } from "../api/auth.service";
import { useAuthSessionStore } from "../store/auth-session.store";
import type { AdminLoginPayload } from "../schemas/login.schema";
import { usePostLoginRedirect } from "./usePostLoginRedirect";

function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export function useAdminLogin() {
  const saveSession = useAuthSessionStore((state) => state.saveSession);
  const redirectAfterLogin = usePostLoginRedirect();

  return useMutation({
    mutationFn: (payload: AdminLoginPayload) => authService.login(payload),
    onSuccess: (user) => {
      saveSession(user, { target: "local", hasAdminAccess: true });
      redirectAfterLogin(user);
    },
    throwOnError: false,
    meta: {
      getErrorMessage: (error: unknown) =>
        getAuthErrorMessage(error, "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง"),
    },
  });
}

export function getLoginMutationErrorMessage(error: unknown): string {
  return getAuthErrorMessage(error, "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");
}
