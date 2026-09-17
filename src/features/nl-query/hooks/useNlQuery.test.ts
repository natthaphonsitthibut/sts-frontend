import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { askNlQuery } from "../api/nl-query.service";
import type { QueryEnvelope } from "../types/nl-query.types";
import { useNlQuery } from "./useNlQuery";

vi.mock("../api/nl-query.service", () => ({ askNlQuery: vi.fn() }));

const mockedAskNlQuery = vi.mocked(askNlQuery);

function envelope(overrides: Partial<QueryEnvelope> = {}): QueryEnvelope {
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
    ...overrides,
  };
}

describe("useNlQuery", () => {
  beforeEach(() => {
    mockedAskNlQuery.mockReset();
  });

  it("accumulates history across turns and resends it on the next ask", async () => {
    mockedAskNlQuery.mockResolvedValueOnce(
      envelope({
        answer_type: "clarification",
        message: "ช่วงเวลาใดครับ",
        sql: null,
        rows: null,
        row_count: 0,
      }),
    );
    mockedAskNlQuery.mockResolvedValueOnce(
      envelope({ answer_type: "result", sql: "SELECT 2", row_count: 5 }),
    );

    const { result } = renderHook(() => useNlQuery());

    await act(async () => {
      await result.current.ask("เด็กเสี่ยงมีเท่าไหร่");
    });
    await act(async () => {
      await result.current.ask("เสี่ยงสูงภาคเรียนนี้ครับ");
    });

    expect(mockedAskNlQuery).toHaveBeenLastCalledWith({
      question: "เสี่ยงสูงภาคเรียนนี้ครับ",
      preferredChartType: undefined,
      history: [
        {
          question: "เด็กเสี่ยงมีเท่าไหร่",
          answerType: "clarification",
          sql: null,
          rowCount: 0,
        },
      ],
    });
    expect(result.current.turnsLog).toHaveLength(2);
  });

  it("stores sql:null for clarification/refusal turns and keeps sql for result turns", async () => {
    mockedAskNlQuery.mockResolvedValueOnce(
      envelope({
        answer_type: "refusal",
        message: "ปฏิเสธ",
        sql: null,
        rows: null,
        row_count: 0,
      }),
    );
    mockedAskNlQuery.mockResolvedValueOnce(envelope({ answer_type: "result" }));

    const { result } = renderHook(() => useNlQuery());

    await act(async () => {
      await result.current.ask("ขอเบอร์ผู้ปกครอง");
    });
    await act(async () => {
      await result.current.ask("ต่อ");
    });

    expect(mockedAskNlQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        history: [
          {
            question: "ขอเบอร์ผู้ปกครอง",
            answerType: "refusal",
            sql: null,
            rowCount: 0,
          },
        ],
      }),
    );
  });

  it("surfaces a transport error without appending a turn to history", async () => {
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

    expect(mockedAskNlQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ history: [] }),
    );
  });

  it("reset() clears turns, turnsLog, and error", async () => {
    mockedAskNlQuery.mockRejectedValueOnce(new Error("network down"));

    const { result } = renderHook(() => useNlQuery());

    await act(async () => {
      await result.current.ask("คำถาม");
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.turnsLog).toHaveLength(0);
    });
  });

  it("discards a stale in-flight response after reset() so it cannot resurrect the old turn", async () => {
    let resolvePending!: (value: QueryEnvelope) => void;
    mockedAskNlQuery.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePending = resolve;
      }),
    );

    const { result } = renderHook(() => useNlQuery());

    let pendingAsk!: Promise<QueryEnvelope | null>;
    act(() => {
      pendingAsk = result.current.ask("คำถามที่กำลังค้าง");
    });

    act(() => {
      result.current.reset();
    });
    expect(result.current.turnsLog).toHaveLength(0);

    await act(async () => {
      resolvePending(envelope());
      await pendingAsk;
    });

    expect(result.current.turnsLog).toHaveLength(0);
    expect(result.current.loading).toBe(false);
  });
});
