import { fireEvent, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getNlConversation } from "../api/nl-query.service";
import { NlQueryPage } from "./NlQueryPage";

// Real useNlQuery hook on purpose: the "new chat does nothing" bug is an
// interaction between the hook's state reset and the URL-driven load effect,
// which a mocked hook cannot reproduce.
vi.mock("../api/nl-query.service", () => ({
  askNlQuery: vi.fn(),
  getNlConversation: vi.fn(),
}));
vi.mock("../components/ConversationSidebar", () => ({
  ConversationSidebar: ({ onNew }: { onNew: () => void }) => (
    <button onClick={onNew}>sidebar-new</button>
  ),
}));

const mockedGet = vi.mocked(getNlConversation);

function LocationDisplay() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/nl-query/:conversationId?" element={<NlQueryPage />} />
        </Routes>
        <LocationDisplay />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const detail = {
  id: "abc",
  title: "t",
  created_at: "",
  updated_at: "",
  turns: [
    {
      seq: 1,
      question: "คำถามเก่า",
      envelope: { status: "ok", answer_type: "result", rows: [] },
    },
  ],
} as never;

describe("NlQueryPage new chat (real hook)", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedGet.mockResolvedValue(detail);
  });

  it("sidebar + button leaves the open conversation and does not reload it", async () => {
    const view = renderAt("/nl-query/abc");
    await waitFor(() => expect(view.getByText("คำถามเก่า")).toBeTruthy());
    expect(mockedGet).toHaveBeenCalledTimes(1);

    fireEvent.click(view.getByText("sidebar-new"));

    await waitFor(() =>
      expect(view.getByTestId("location").textContent).toBe("/nl-query"),
    );
    // give any (buggy) re-load effect a chance to fire
    await new Promise((r) => setTimeout(r, 30));
    expect(view.getByTestId("location").textContent).toBe("/nl-query");
    expect(view.queryByText("คำถามเก่า")).toBeNull();
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it("after a new chat, opening a conversation from the sidebar still loads it", async () => {
    mockedGet.mockImplementation((id: string) =>
      Promise.resolve({ ...(detail as object), id } as never),
    );
    const view = renderAt("/nl-query/abc");
    await waitFor(() => expect(view.getByText("คำถามเก่า")).toBeTruthy());
    fireEvent.click(view.getByText("sidebar-new"));
    await waitFor(() =>
      expect(view.getByTestId("location").textContent).toBe("/nl-query"),
    );

    // a later deep link / sidebar selection must not be swallowed by the guard
    view.unmount();
    const again = renderAt("/nl-query/xyz");
    await waitFor(() => expect(again.getByText("คำถามเก่า")).toBeTruthy());
    expect(mockedGet).toHaveBeenLastCalledWith("xyz");
  });
});
