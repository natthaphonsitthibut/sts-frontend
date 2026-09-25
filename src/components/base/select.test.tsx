import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Select } from "./select";

describe("Select", () => {
  it("returns focus to the trigger when Tab leaves the portaled list", () => {
    render(
      <Select aria-label="ระดับชั้น" defaultValue="" id="grade">
        <option value="">ทุกชั้น</option>
        <option value="ม.1">ม.1</option>
      </Select>,
    );
    const trigger = screen.getByRole("button", { name: "ระดับชั้น" });

    act(() => {
      fireEvent.click(trigger);
    });
    const option = screen.getByRole("option", { name: "ม.1" });
    option.focus();
    act(() => {
      fireEvent.keyDown(option, { key: "Tab" });
    });

    expect(document.activeElement).toBe(trigger);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
