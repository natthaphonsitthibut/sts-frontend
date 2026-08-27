import { apiClient } from "../../../lib/api-client";
import type { StudentReadSource } from "../../students/api/students.service";
import type { PiiRevealReasonOption } from "../types/privacy.types";

interface RevealOptionsEnvelope {
  data?: PiiRevealReasonOption[];
}

async function getRevealReasonOptions(
  source: StudentReadSource = "INTERNAL",
): Promise<PiiRevealReasonOption[]> {
  const response = await apiClient.get<RevealOptionsEnvelope>(
    // A classroom link cannot call the staff catalog route; its own namespace
    // serves the same list to a caller holding a link session.
    source === "INTERNAL"
      ? "/pii/reveal-options"
      : "/classroom/pii/reveal-options",
  );
  return response.data?.data ?? [];
}

export const privacyService = { getRevealReasonOptions };
