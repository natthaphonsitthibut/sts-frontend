import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNlQuery } from "../hooks/useNlQuery";
import { NlQueryPage } from "./NlQueryPage";

vi.mock("../hooks/useNlQuery", () => ({ useNlQuery: vi.fn() }));

const mockedUseNlQuery = vi.mocked(useNlQuery);

function sessionState(overrides: Record<string, unknown> = {}) {
  return {
    ask: vi.fn(),
    turnsLog: [],
    loading: false,
    error: null,
    reset: vi.fn(),
    ...overrides,
  } as never;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/nl-query"]}>
      <NlQueryPage />
    </MemoryRouter>,
  );
}

describe("NlQueryPage", () => {
  beforeEach(() => {
    mockedUseNlQuery.mockReturnValue(sessionState());
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
});
