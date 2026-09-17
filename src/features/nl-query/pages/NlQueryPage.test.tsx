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

describe("NlQueryPage", () => {
  beforeEach(() => {
    mockedUseNlQuery.mockReturnValue(sessionState());
  });

  it("trims and submits a Thai question", async () => {
    const ask = vi.fn();
    mockedUseNlQuery.mockReturnValue(sessionState({ ask }));
    const view = render(
      <MemoryRouter initialEntries={["/nl-query"]}>
        <NlQueryPage />
      </MemoryRouter>,
    );

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
            question: "คำถามไม่ปลอดภัย",
            envelope: {
              status: "error",
              error: { code: "EXEC_FAILED", message: "คำถามไม่ปลอดภัย" },
            },
          },
        ],
      }),
    );
    const view = render(
      <MemoryRouter initialEntries={["/nl-query"]}>
        <NlQueryPage />
      </MemoryRouter>,
    );

    expect(view.getByText("คำถามไม่ปลอดภัย")).toBeTruthy();
    expect(
      view.queryByText("บริการไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง"),
    ).toBeNull();
  });

  it("shows the agent's clarifying question instead of an empty-result card", () => {
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
    const view = render(
      <MemoryRouter initialEntries={["/nl-query"]}>
        <NlQueryPage />
      </MemoryRouter>,
    );

    expect(view.getByText("อยากทราบตามระดับความเสี่ยงใดครับ")).toBeTruthy();
    expect(view.queryByText("ไม่พบข้อมูล (ผลลัพธ์ว่าง)")).toBeNull();
  });

  it("shows the agent's refusal message instead of an empty-result card", () => {
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
    const view = render(
      <MemoryRouter initialEntries={["/nl-query"]}>
        <NlQueryPage />
      </MemoryRouter>,
    );

    expect(view.getByText("ข้อมูลส่วนบุคคลไม่สามารถให้ได้")).toBeTruthy();
    expect(view.queryByText("ไม่พบข้อมูล (ผลลัพธ์ว่าง)")).toBeNull();
  });
});
