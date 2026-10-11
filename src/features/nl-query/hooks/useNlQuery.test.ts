import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { askNlQuery, getNlConversation } from "../api/nl-query.service";
import type {
  ConversationDetail,
  NlQueryResponse,
} from "../types/nl-query.types";
import { useNlQuery } from "./useNlQuery";

vi.mock("../api/nl-query.service", () => ({
  askNlQuery: vi.fn(),
  getNlConversation: vi.fn(),
}));

const mockedAskNlQuery = vi.mocked(askNlQuery);
const mockedGetNlConversation = vi.mocked(getNlConversation);

function envelope(overrides: Partial<NlQueryResponse> = {}): NlQueryResponse {
  return {
    status: "ok",
    request_id: "req-1",
    question: "q",
    message: null,
    sql: "SELECT 1",
    columns: [],
    rows: [{ total: 1 }],
    row_count: 1,
    truncated: false,
    summary: null,
    visualization: null,
    retry_count: 0,
    elapsed_ms: 10,
    error: null,
    conversation_id: null,
    ...overrides,
  };
}

function detail(id: string): ConversationDetail {
  return {
    id,
    title: "t",
    created_at: "2026-10-10T00:00:00.000Z",
    updated_at: "2026-10-10T00:00:00.000Z",
    turns: [
      {
        seq: 1,
        question: "คำถามเก่า",
        envelope: envelope({ question: "คำถามเก่า" }),
      },
    ],
  };
}

describe("useNlQuery", () => {
  beforeEach(() => {
    mockedAskNlQuery.mockReset();
    mockedGetNlConversation.mockReset();
  });

  it("adopts the server's conversation id and sends it on the next ask", async () => {
    mockedAskNlQuery.mockResolvedValueOnce(envelope({ conversation_id: "c1" }));
    mockedAskNlQuery.mockResolvedValueOnce(envelope({ conversation_id: "c1" }));

    const { result } = renderHook(() => useNlQuery());
    expect(result.current.conversationId).toBeNull();

    await act(async () => {
      await result.current.ask("เด็กเสี่ยงมีเท่าไหร่");
    });
    expect(mockedAskNlQuery).toHaveBeenLastCalledWith({
      question: "เด็กเสี่ยงมีเท่าไหร่",
      preferredChartType: undefined,
      conversationId: undefined,
    });
    expect(result.current.conversationId).toBe("c1");

    await act(async () => {
      await result.current.ask("เสี่ยงสูงภาคเรียนนี้ครับ");
    });
    expect(mockedAskNlQuery).toHaveBeenLastCalledWith({
      question: "เสี่ยงสูงภาคเรียนนี้ครับ",
      preferredChartType: undefined,
      conversationId: "c1",
    });
    expect(result.current.turnsLog).toHaveLength(2);
  });

  it("keeps the previous conversation id when the server could not save the turn", async () => {
    mockedAskNlQuery.mockResolvedValueOnce(envelope({ conversation_id: "c1" }));
    mockedAskNlQuery.mockResolvedValueOnce(envelope({ conversation_id: null }));

    const { result } = renderHook(() => useNlQuery());
    await act(async () => {
      await result.current.ask("หนึ่ง");
    });
    await act(async () => {
      await result.current.ask("สอง");
    });

    expect(result.current.conversationId).toBe("c1");
  });

  it("surfaces a transport error without appending a turn", async () => {
    mockedAskNlQuery.mockRejectedValueOnce(new Error("network down"));
    mockedAskNlQuery.mockResolvedValueOnce(envelope());

    const { result } = renderHook(() => useNlQuery());

    await act(async () => {
      await result.current.ask("คำถามแรก");
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.turnsLog).toHaveLength(0);

    await act(async () => {
      await result.current.ask("คำถามที่สอง");
    });

    expect(mockedAskNlQuery).toHaveBeenLastCalledWith({
      question: "คำถามที่สอง",
      preferredChartType: undefined,
      conversationId: undefined,
    });
  });

  it("load() fills the chat from a stored conversation", async () => {
    mockedGetNlConversation.mockResolvedValue(detail("c9"));

    const { result } = renderHook(() => useNlQuery());

    let ok = false;
    await act(async () => {
      ok = await result.current.load("c9");
    });

    expect(ok).toBe(true);
    expect(mockedGetNlConversation).toHaveBeenCalledWith("c9");
    expect(result.current.conversationId).toBe("c9");
    expect(result.current.turnsLog.map((t) => t.question)).toEqual([
      "คำถามเก่า",
    ]);
    expect(result.current.loading).toBe(false);
  });

  it("load() failure sets error, returns false and leaves the chat untouched", async () => {
    mockedGetNlConversation.mockRejectedValue(new Error("404"));

    const { result } = renderHook(() => useNlQuery());

    let ok = true;
    await act(async () => {
      ok = await result.current.load("missing");
    });

    expect(ok).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.conversationId).toBeNull();
    expect(result.current.turnsLog).toHaveLength(0);
  });

  it("continues a loaded conversation by sending its id", async () => {
    mockedGetNlConversation.mockResolvedValue(detail("c9"));
    mockedAskNlQuery.mockResolvedValue(envelope({ conversation_id: "c9" }));

    const { result } = renderHook(() => useNlQuery());
    await act(async () => {
      await result.current.load("c9");
    });
    await act(async () => {
      await result.current.ask("ต่อ");
    });

    expect(mockedAskNlQuery).toHaveBeenCalledWith(
      expect.objectContaining({ question: "ต่อ", conversationId: "c9" }),
    );
    expect(result.current.turnsLog).toHaveLength(2);
  });

  it("discards a load() that resolves after reset() so the old chat cannot come back", async () => {
    let resolveLoad!: (value: ConversationDetail) => void;
    mockedGetNlConversation.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );

    const { result } = renderHook(() => useNlQuery());

    let pendingLoad!: Promise<boolean>;
    act(() => {
      pendingLoad = result.current.load("c9");
    });
    act(() => {
      result.current.reset();
    });

    await act(async () => {
      resolveLoad(detail("c9"));
      await pendingLoad;
    });

    expect(result.current.turnsLog).toHaveLength(0);
    expect(result.current.conversationId).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("reset() clears turns, conversation id and error", async () => {
    mockedAskNlQuery.mockResolvedValueOnce(envelope({ conversation_id: "c1" }));
    mockedAskNlQuery.mockRejectedValueOnce(new Error("network down"));

    const { result } = renderHook(() => useNlQuery());
    await act(async () => {
      await result.current.ask("หนึ่ง");
    });
    await act(async () => {
      await result.current.ask("สอง");
    });
    expect(result.current.error).not.toBeNull();
    expect(result.current.conversationId).toBe("c1");

    act(() => {
      result.current.reset();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.turnsLog).toHaveLength(0);
      expect(result.current.conversationId).toBeNull();
    });
  });

  it("discards a stale in-flight response after reset() so it cannot resurrect the old turn", async () => {
    let resolvePending!: (value: NlQueryResponse) => void;
    mockedAskNlQuery.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePending = resolve;
      }),
    );

    const { result } = renderHook(() => useNlQuery());

    let pendingAsk!: Promise<NlQueryResponse | null>;
    act(() => {
      pendingAsk = result.current.ask("คำถามที่กำลังค้าง");
    });

    act(() => {
      result.current.reset();
    });
    expect(result.current.turnsLog).toHaveLength(0);

    await act(async () => {
      resolvePending(envelope({ conversation_id: "c1" }));
      await pendingAsk;
    });

    expect(result.current.turnsLog).toHaveLength(0);
    expect(result.current.conversationId).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
