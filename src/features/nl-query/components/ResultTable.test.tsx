import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultTable } from "./ResultTable";

describe("ResultTable", () => {
  it("sorts numeric values while keeping null at the end", () => {
    const view = render(
      <ResultTable
        columns={[
          { name: "count", type: "int", numeric: true, semantic_type: "count" },
        ]}
        rows={[{ count: 9 }, { count: null }, { count: 2 }]}
      />,
    );

    fireEvent.click(view.getByRole("button", { name: /count/i }));
    expect(
      Array.from(view.container.querySelectorAll("tbody td")).map(
        (cell) => cell.textContent,
      ),
    ).toEqual(["2", "9", "—"]);

    fireEvent.click(view.getByRole("button", { name: /count/i }));
    expect(
      Array.from(view.container.querySelectorAll("tbody td")).map(
        (cell) => cell.textContent,
      ),
    ).toEqual(["9", "2", "—"]);
  });
});
