import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { authService } from "../api/auth.service";
import type { AraIdLoginChallenge } from "../types/auth.types";

/**
 * Owns the AraID login challenge for the whole login page.
 *
 * The state lives above the login card on purpose: approving a QR is its own
 * full screen, not a panel that grows under the password form, so the page swaps
 * between the two. Refreshing an expired QR has to work from that screen, which
 * means the mutation cannot live inside the button that is no longer mounted.
 */
export function useAraIdLoginChallenge() {
  const [challenge, setChallenge] = useState<AraIdLoginChallenge | null>(null);
  const createChallenge = useMutation({
    mutationFn: authService.createAraIdLoginChallenge,
    onSuccess: setChallenge,
  });

  return {
    challenge,
    error: createChallenge.error,
    isPending: createChallenge.isPending,
    request: () => createChallenge.mutate(),
    reset: () => {
      createChallenge.reset();
      setChallenge(null);
    },
  };
}
