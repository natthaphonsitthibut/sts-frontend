import { apiClient } from "../../../lib/api-client";
import type { PiiRevealReasonOption } from "../types/privacy.types";

interface RevealOptionsEnvelope {
  data?: PiiRevealReasonOption[];
}

async function getRevealReasonOptions(): Promise<PiiRevealReasonOption[]> {
  const response = await apiClient.get<RevealOptionsEnvelope>(
    "/pii/reveal-options",
  );
  return response.data?.data ?? [];
}

export const privacyService = { getRevealReasonOptions };
