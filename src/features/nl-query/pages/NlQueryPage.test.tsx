import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNlQuery } from "../hooks/useNlQuery";
import { NlQueryPage } from "./NlQueryPage";

vi.mock("../hooks/useNlQuery", () => ({ useNlQuery: vi.fn() }));
vi.mock("../components/ConversationSidebar", () => ({
  ConversationSidebar: () => <div data-testid="sidebar" />,
}));

const mockedUseNlQuery = vi.mocked(useNlQuery);

function sessionState(overrides: Record<string, unknown> = {}) {
  return {
    ask: vi.fn(),
    load: vi.fn().mockResolvedValue(true),
    turnsLog: [],
    conversationId: null,
    loading: false,
    error: null,
    reset: vi.fn(),
    ...overrides,
  } as never;
}

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderPage(path = "/nl-query") {
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

describe("NlQueryPage", () => {
  beforeEach(() => {
    mockedUseNlQuery.mockReturnValue(sessionState());
  });

  it("measures and sets a height on the chat card via its ref", () => {
    const view = renderPage();
    const chatLog = view.getByTestId("nlq-chat-log");
    const card = chatLog.parentElement;
    expect(card?.style.height).not.toBe("");
  });

  it("shows example-question chips when the conversation is empty", () => {
    const view = renderPage();
    expect(view.getByText("จำนวนนักเรียนปัจจุบันแยกตามโรงเรียน")).toBeTruthy();
  });

  it("shows the question immediately while waiting for the answer", async () => {
    let resolveAsk!: (value: null) => void;
    const ask = vi.fn(
      () =>
        new Promise<null>((resolve) => {
          resolveAsk = resolve;
        }),
    );
    mockedUseNlQuery.mockReturnValue(sessionState({ ask }));
    const view = renderPage();

    fireEvent.change(view.getByRole("textbox", { name: "คำถาม" }), {
      target: { value: "นักเรียนทั้งหมดมีกี่คน" },
    });
    fireEvent.click(view.getByRole("button", { name: "ถามข้อมูล" }));

    const chatLog = within(view.getByTestId("nlq-chat-log"));
    await waitFor(() =>
      expect(chatLog.getByText("นักเรียนทั้งหมดมีกี่คน")).toBeTruthy(),
    );
    expect(chatLog.getByText("กำลังค้นหา…")).toBeTruthy();

    resolveAsk(null);
    await waitFor(() => expect(chatLog.queryByText("กำลังค้นหา…")).toBeNull());
  });

  it("restores the typed question into the input when the request fails", async () => {
    const ask = vi.fn().mockResolvedValue(null);
    mockedUseNlQuery.mockReturnValue(sessionState({ ask }));
    const view = renderPage();

    const input = view.getByRole("textbox", { name: "คำถาม" });
    fireEvent.change(input, { target: { value: "คำถามที่จะล้มเหลว" } });
    fireEvent.click(view.getByRole("button", { name: "ถามข้อมูล" }));

    await waitFor(() => expect(ask).toHaveBeenCalled());
    await waitFor(() =>
      expect((input as HTMLInputElement).value).toBe("คำถามที่จะล้มเหลว"),
    );
  });

  it("trims and submits a Thai question", async () => {
    const ask = vi.fn();
    mockedUseNlQuery.mockReturnValue(sessionState({ ask }));
    const view = renderPage();

    fireEvent.change(view.getByRole("textbox", { name: "คำถาม" }), {
      target: { value: "  นักเรียนทั้งหมดมีกี่คน  " },
    });
    fireEvent.click(view.getByRole("button", { name: "ถามข้อมูล" }));

    await waitFor(() =>
      expect(ask).toHaveBeenCalledWith("นักเรียนทั้งหมดมีกี่คน"),
    );
  });

  it("shows a business error from an HTTP 200 envelope", () => {
    mockedUseNlQuery.mockReturnValue(
      sessionState({
        turnsLog: [
          {
            question: "นักเรียนทั้งหมดกี่คน",
            envelope: {
              status: "error",
              error: { code: "EXEC_FAILED", message: "คำถามไม่ปลอดภัย" },
            },
          },
        ],
      }),
    );
    const view = renderPage();

    expect(view.getByText("คำถามไม่ปลอดภัย")).toBeTruthy();
    expect(
      view.queryByText("บริการไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง"),
    ).toBeNull();
  });

  it("renders a clarification card with the agent's message", () => {
    mockedUseNlQuery.mockReturnValue(
      sessionState({
        turnsLog: [
          {
            question: "เด็กเสี่ยงมีเท่าไหร่",
            envelope: {
              status: "ok",
              answer_type: "clarification",
              message: "อยากทราบตามระดับความเสี่ยงใดครับ",
              rows: null,
            },
          },
        ],
      }),
    );
    const view = renderPage();

    expect(view.getByText("อยากทราบตามระดับความเสี่ยงใดครับ")).toBeTruthy();
    expect(view.queryByText("ไม่พบข้อมูล (ผลลัพธ์ว่าง)")).toBeNull();
  });

  it("renders a refusal card with the agent's message", () => {
    mockedUseNlQuery.mockReturnValue(
      sessionState({
        turnsLog: [
          {
            question: "ขอเบอร์ผู้ปกครอง",
            envelope: {
              status: "ok",
              answer_type: "refusal",
              message: "ข้อมูลส่วนบุคคลไม่สามารถให้ได้",
              rows: null,
            },
          },
        ],
      }),
    );
    const view = renderPage();

    expect(view.getByText("ข้อมูลส่วนบุคคลไม่สามารถให้ได้")).toBeTruthy();
    expect(view.queryByText("ไม่พบข้อมูล (ผลลัพธ์ว่าง)")).toBeNull();
  });

  it("renders every prior turn's question alongside its answer", () => {
    mockedUseNlQuery.mockReturnValue(
      sessionState({
        turnsLog: [
          {
            question: "เด็กเสี่ยงมีเท่าไหร่",
            envelope: {
              status: "ok",
              answer_type: "clarification",
              message: "ช่วงเวลาใดครับ",
              rows: null,
            },
          },
          {
            question: "เสี่ยงสูงภาคเรียนนี้ครับ",
            envelope: {
              status: "ok",
              answer_type: "refusal",
              message: "ขอไม่ตอบคำถามนี้ครับ",
              rows: null,
            },
          },
        ],
      }),
    );
    const view = renderPage();

    expect(view.getByText("เด็กเสี่ยงมีเท่าไหร่")).toBeTruthy();
    expect(view.getByText("ช่วงเวลาใดครับ")).toBeTruthy();
    expect(view.getByText("เสี่ยงสูงภาคเรียนนี้ครับ")).toBeTruthy();
    expect(view.getByText("ขอไม่ตอบคำถามนี้ครับ")).toBeTruthy();
  });

  it("renders a result turn's message as chat text below the table", () => {
    mockedUseNlQuery.mockReturnValue(
      sessionState({
        turnsLog: [
          {
            question: "จังหวัดไหนมีนักเรียนเสี่ยงสูงสุด",
            envelope: {
              status: "ok",
              answer_type: "result",
              message:
                "จังหวัด ก. มีนักเรียนเสี่ยงสูงสุด 120 คน ส่วนใหญ่ขาดเรียนต่อเนื่อง",
              rows: [{ province: "ก.", n: 120 }],
              row_count: 1,
              columns: [
                {
                  name: "province",
                  type: "str",
                  numeric: false,
                  semantic_type: "name",
                },
                {
                  name: "n",
                  type: "int",
                  numeric: true,
                  semantic_type: "count",
                },
              ],
              summary: null,
            },
          },
        ],
      }),
    );
    const view = renderPage();

    const message = view.getByText(
      "จังหวัด ก. มีนักเรียนเสี่ยงสูงสุด 120 คน ส่วนใหญ่ขาดเรียนต่อเนื่อง",
    );
    // ตาราง/กราฟต้องมาก่อนข้อความ (สลับลำดับตามที่ผู้ใช้ขอ)
    const summary = view.getByText("1 แถว");
    expect(
      summary.compareDocumentPosition(message) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows the reset button only once a turn exists and calls reset() on click", () => {
    const reset = vi.fn();
    mockedUseNlQuery.mockReturnValue(sessionState({ reset }));
    const noTurns = renderPage();
    expect(noTurns.queryByText("เริ่มบทสนทนาใหม่")).toBeNull();
    noTurns.unmount();

    mockedUseNlQuery.mockReturnValue(
      sessionState({
        reset,
        turnsLog: [
          {
            question: "q",
            envelope: { status: "ok", answer_type: "result", rows: [] },
          },
        ],
      }),
    );
    const withTurn = renderPage();
    const button = withTurn.getByText("เริ่มบทสนทนาใหม่");
    fireEvent.click(button);
    expect(reset).toHaveBeenCalled();
  });

  it("opens the conversation named in the URL once", async () => {
    const load = vi.fn().mockResolvedValue(true);
    mockedUseNlQuery.mockReturnValue(sessionState({ load }));
    renderPage("/nl-query/abc");

    await waitFor(() => expect(load).toHaveBeenCalledWith("abc"));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not reload a conversation the hook already has open", () => {
    const load = vi.fn();
    mockedUseNlQuery.mockReturnValue(
      sessionState({ load, conversationId: "abc" }),
    );
    renderPage("/nl-query/abc");

    expect(load).not.toHaveBeenCalled();
  });

  it("falls back to /nl-query when the conversation cannot be loaded", async () => {
    const load = vi.fn().mockResolvedValue(false);
    mockedUseNlQuery.mockReturnValue(sessionState({ load }));
    const view = renderPage("/nl-query/not-mine");

    await waitFor(() =>
      expect(view.getByTestId("location").textContent).toBe("/nl-query"),
    );
  });

  it("puts a brand-new conversation's id in the URL without reloading it", async () => {
    const load = vi.fn();
    mockedUseNlQuery.mockReturnValue(
      sessionState({ load, conversationId: "new1" }),
    );
    const view = renderPage("/nl-query");

    await waitFor(() =>
      expect(view.getByTestId("location").textContent).toBe("/nl-query/new1"),
    );
    expect(load).not.toHaveBeenCalled();
  });

  it("starting a new chat resets the session and leaves the conversation URL", async () => {
    const reset = vi.fn();
    mockedUseNlQuery.mockReturnValue(
      sessionState({
        reset,
        turnsLog: [
          {
            question: "q",
            envelope: { status: "ok", answer_type: "result", rows: [] },
          },
        ],
      }),
    );
    const view = renderPage("/nl-query/abc");

    fireEvent.click(view.getByText("เริ่มบทสนทนาใหม่"));

    expect(reset).toHaveBeenCalled();
    await waitFor(() =>
      expect(view.getByTestId("location").textContent).toBe("/nl-query"),
    );
  });

  it("explains a missing conversation instead of the generic outage message", () => {
    const error = Object.assign(new Error("not found"), {
      isAxiosError: true,
      response: { status: 404 },
    });
    mockedUseNlQuery.mockReturnValue(sessionState({ error }));
    const view = renderPage("/nl-query");

    expect(view.queryByText("ไม่พบบทสนทนานี้")).toBeTruthy();
  });
});
