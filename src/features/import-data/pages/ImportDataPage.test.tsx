import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import {
  lastRequestTo,
  restoreApiStub,
  stubApiRequests,
  type RecordedRequest,
} from "../../../test/api-stub";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { ImportDataPage } from "./ImportDataPage";

const QUARANTINE_URL = "/imports/quarantine";
const KNOWN_REASON = "IDENTIFIER_CONFLICT";

const FIXTURES = {
  [QUARANTINE_URL]: {
    items: [],
    meta: { page: 1, limit: 20, totalCount: 0 },
  },
  "/imports/quarantine-lookups": {
    reasons: [{ code: KNOWN_REASON, label: "เลขประจำตัวประชาชนซ้ำ" }],
    resolutionStates: [],
    statuses: [{ code: "PENDING", label: "รอตรวจสอบ" }],
  },
  "/imports/catalog": { targets: [] },
};

function renderImportPageAt(url: string): RecordedRequest[] {
  const requests = stubApiRequests(FIXTURES);
  useAuthSessionStore.setState({
    user: {
      id: "test-actor",
      username: "test-actor",
      roles: ["admin"],
      permissions: [],
    },
  } as never);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <ImportDataPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return requests;
}

afterEach(() => {
  restoreApiStub();
});

describe("import quarantine URL filters", () => {
  it("never forwards a reason code the API does not know", async () => {
    const requests = renderImportPageAt(
      "/import-data/quarantine?quarantineReason=NOT_A_REASON&quarantinePage=0&quarantineLimit=999",
    );

    await waitFor(() =>
      expect(lastRequestTo(requests, QUARANTINE_URL)).toBeDefined(),
    );
    await waitFor(() =>
      expect(
        lastRequestTo(requests, "/imports/quarantine-lookups"),
      ).toBeDefined(),
    );
    const request = lastRequestTo(requests, QUARANTINE_URL);
    expect(request?.params.reasonCode).toBeUndefined();
    expect(request?.params.page).toBe(1);
    expect(request?.params.limit).toBe(20);
    expect(
      requests.some(
        (recorded) =>
          recorded.url === QUARANTINE_URL &&
          recorded.params.reasonCode === "NOT_A_REASON",
      ),
    ).toBe(false);
  });

  it("keeps a reason code the lookups confirm", async () => {
    const requests = renderImportPageAt(
      `/import-data/quarantine?quarantineReason=${KNOWN_REASON}`,
    );

    await waitFor(() =>
      expect(lastRequestTo(requests, QUARANTINE_URL)?.params.reasonCode).toBe(
        KNOWN_REASON,
      ),
    );
  });
});
