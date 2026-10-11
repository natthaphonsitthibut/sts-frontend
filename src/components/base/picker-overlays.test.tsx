import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DatePicker } from "./date-picker";
import { TimePicker } from "./time-picker";
import { MultiSelect } from "./multi-select";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { Select } from "./select";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function modal(child: React.ReactNode) {
  return render(
    <Dialog open>
      <DialogContent>
        <DialogTitle>ทดสอบตัวเลือก</DialogTitle>
        {child}
      </DialogContent>
    </Dialog>,
  );
}

describe("pickers in scrolling dialogs", () => {
  it.each([
    { top: 190, bottom: 230, edge: "bottom", offset: "174px", height: "178px" },
    { top: 130, bottom: 170, edge: "top", offset: "174px", height: "178px" },
  ] as const)(
    "clamps Select in a short viewport near $edge",
    ({ top, bottom, edge, offset, height }) => {
      vi.stubGlobal("innerHeight", 360);
      vi.stubGlobal("innerWidth", 640);
      const onChange = vi.fn();
      modal(
        <Select
          aria-label="ตัวเลือกจอเตี้ย"
          value="0"
          onChange={(event) => onChange(event.target.value)}
        >
          {Array.from({ length: 24 }, (_, hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </Select>,
      );
      const trigger = screen.getByRole("button", { name: "ตัวเลือกจอเตี้ย" });
      vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
        top,
        bottom,
        left: 610,
        right: 710,
        width: 100,
        height: 40,
        x: 610,
        y: top,
        toJSON: () => ({}),
      });
      fireEvent.click(trigger);
      const list = screen.getByRole("listbox");
      expect(list.style.maxHeight).toBe(height);
      expect(list.style[edge]).toBe(offset);
      expect(list.style.left).toBe("532px");
      fireEvent.scroll(list);
      expect(screen.getByRole("listbox")).toBe(list);
      fireEvent.mouseDown(screen.getByRole("option", { name: "23" }));
      expect(onChange).toHaveBeenCalledWith("23");
      expect(screen.queryByRole("listbox")).toBeNull();
    },
  );

  it("selects a calendar date outside the clipped dialog and ignores calendar scrolling", () => {
    const onChange = vi.fn();
    const { container } = modal(
      <DatePicker
        ariaLabel="วันเริ่ม"
        value="2026-10-01"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "วันเริ่ม" }));
    const calendar = screen.getByRole("dialog", { name: "เลือกวันที่" });
    expect(
      container.querySelector('[aria-modal="true"]')?.contains(calendar),
    ).toBe(false);
    const modalContent = container.querySelector('[aria-modal="true"]');
    expect(modalContent?.getAttribute("aria-owns")).toContain(
      calendar.parentElement?.id,
    );
    const lastCalendarControl = screen.getByRole("button", { name: "วันนี้" });
    lastCalendarControl.focus();
    fireEvent.keyDown(lastCalendarControl, { key: "Tab" });
    expect(container.contains(document.activeElement)).toBe(true);
    expect(calendar.contains(document.activeElement)).toBe(false);
    fireEvent.scroll(calendar);
    expect(screen.getByRole("dialog", { name: "เลือกวันที่" })).toBe(calendar);
    const day = screen.getByRole("button", { name: "2026-10-12" });
    fireEvent.mouseDown(day);
    fireEvent.click(day);
    expect(onChange).toHaveBeenCalledWith("2026-10-12");
    expect(screen.queryByRole("dialog", { name: "เลือกวันที่" })).toBeNull();
  });

  it("keeps the time panel open while selecting a nested portaled hour", () => {
    const onChange = vi.fn();
    const { container } = modal(
      <TimePicker ariaLabel="เวลาเริ่ม" value="08:30" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "เวลาเริ่ม" }));
    const panel = screen.getByRole("dialog", { name: "เลือกเวลา" });
    expect(
      container.querySelector('[aria-modal="true"]')?.contains(panel),
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "ชั่วโมง" }));
    const option = screen.getByRole("option", { name: "09" });
    fireEvent.mouseDown(option);
    fireEvent.click(option);
    expect(onChange).toHaveBeenCalledWith("09:30");
    expect(screen.getByRole("dialog", { name: "เลือกเวลา" })).toBe(panel);
  });

  it("selects a portaled multi-select option without outside dismissal", () => {
    const onChange = vi.fn();
    const { container } = modal(
      <MultiSelect
        ariaLabel="คุณครู"
        placeholder="เลือกคุณครู"
        options={[{ value: "t1", label: "ครูหนึ่ง" }]}
        value={[]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: "คุณครู" }));
    const list = screen.getByRole("listbox");
    expect(container.querySelector('[aria-modal="true"]')?.contains(list)).toBe(
      false,
    );
    const option = screen.getByRole("option", { name: "ครูหนึ่ง" });
    fireEvent.mouseDown(option);
    fireEvent.click(option);
    expect(onChange).toHaveBeenCalledWith(["t1"]);
    expect(screen.getByRole("listbox")).toBe(list);
  });
});
