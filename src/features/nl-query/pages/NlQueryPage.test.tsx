import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNlQuery } from "../hooks/useNlQuery";
import { NlQueryPage } from "./NlQueryPage";

vi.mock("../hooks/useNlQuery", () => ({ useNlQuery: vi.fn() }));

const mockedUseNlQuery = vi.mocked(useNlQuery);

function mutationState(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    error: null,
    isError: false,
    isPending: false,
    mutate: vi.fn(),
    ...overrides,
  } as never;
}

describe("NlQueryPage", () => {
  beforeEach(() => {
    mockedUseNlQuery.mockReturnValue(mutationState());
  });

  it("trims and submits a Thai question", async () => {
    const mutate = vi.fn();
    mockedUseNlQuery.mockReturnValue(mutationState({ mutate }));
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
      expect(mutate).toHaveBeenCalledWith({
        question: "นักเรียนทั้งหมดมีกี่คน",
      }),
    );
  });

  it("shows a business error from an HTTP 200 envelope", () => {
    mockedUseNlQuery.mockReturnValue(
      mutationState({
        data: {
          status: "error",
          error: { code: "EXEC_FAILED", message: "คำถามไม่ปลอดภัย" },
        },
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
});
