import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
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

describe("MultiSelect", () => {
  const few = [
    { value: "a", label: "ชุมชนแออัด" },
    { value: "b", label: "ใกล้แหล่งมั่วสุม" },
  ];
  const many = Array.from({ length: 12 }, (_, index) => ({
    value: `t${index}`,
    label: `ครูคนที่ ${index + 1}`,
  }));

  function stubCompactScreen(): void {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(max-width: 639px)",
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  }

  it("handles desktop Escape on body without dismissing the parent dialog", async () => {
    const onParentClose = vi.fn();
    render(
      <Dialog open onOpenChange={onParentClose}>
        <DialogContent>
          <DialogTitle>parent</DialogTitle>
          <MultiSelect
            ariaLabel="body escape"
            placeholder="เลือก"
            options={few}
            value={[]}
            onChange={vi.fn()}
          />
        </DialogContent>
      </Dialog>,
    );
    const trigger = screen.getByRole("combobox", { name: "body escape" });
    trigger.focus();
    fireEvent.click(trigger);
    const option = screen.getByRole("option", { name: "ชุมชนแออัด" });
    option.focus();
    option.blur();
    expect(document.activeElement).toBe(document.body);
    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(onParentClose).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });

  it("returns pointer selection to the searchable desktop input", () => {
    render(
      <MultiSelect
        ariaLabel="pointer search"
        placeholder="เลือก"
        options={many}
        value={[]}
        onChange={vi.fn()}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "pointer search" });
    fireEvent.click(trigger);
    const option = screen.getByRole("option", { name: "ครูคนที่ 1" });
    option.focus();
    fireEvent.click(option, { detail: 1 });
    expect(document.activeElement).toBe(trigger);
  });

  it("dismisses the desktop picker when focus moves to the next form field", async () => {
    render(
      <>
        <MultiSelect
          ariaLabel="desktop tab"
          placeholder="เลือก"
          options={few}
          value={[]}
          onChange={vi.fn()}
        />
        <input aria-label="next field" />
      </>,
    );
    fireEvent.click(screen.getByRole("combobox", { name: "desktop tab" }));
    const next = screen.getByRole("textbox", { name: "next field" });
    next.focus();
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(document.activeElement).toBe(next);
  });

  it("keeps the selected searchable option focused for the next keyboard pick", () => {
    function Fixture() {
      const [value, setValue] = useState<string[]>([]);
      return (
        <MultiSelect
          ariaLabel="keyboard picks"
          placeholder="เลือก"
          options={many}
          value={value}
          onChange={setValue}
        />
      );
    }
    render(<Fixture />);
    fireEvent.click(screen.getByRole("combobox", { name: "keyboard picks" }));
    const first = screen.getByRole("option", { name: "ครูคนที่ 1" });
    first.focus();
    // Native buttons dispatch click with detail=0 for Enter/Space activation.
    fireEvent.click(first, { detail: 0 });
    expect(document.activeElement).toBe(first);
    expect(first.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(first, { key: "ArrowDown" });
    const next = screen.getByRole("option", { name: "ครูคนที่ 2" });
    expect(document.activeElement).toBe(next);
    fireEvent.click(next, { detail: 0 });
    expect(next.getAttribute("aria-selected")).toBe("true");
    expect(first.getAttribute("aria-selected")).toBe("true");
  });

  it("keeps focus on an enabled sheet control after clearing the last pick", async () => {
    stubCompactScreen();
    function Fixture() {
      const [value, setValue] = useState(["a"]);
      return (
        <MultiSelect
          ariaLabel="ล้างบนมือถือ"
          placeholder="เลือก"
          options={few}
          value={value}
          onChange={setValue}
        />
      );
    }
    render(<Fixture />);
    fireEvent.click(screen.getByRole("combobox", { name: "ล้างบนมือถือ" }));
    const clear = screen.getByRole("button", { name: "ล้าง" });
    await waitFor(() =>
      expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(
        true,
      ),
    );
    clear.focus();
    fireEvent.click(clear);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "เสร็จ" }),
    );
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("moves focus into the sheet, traps both Tab directions and restores it on Escape", async () => {
    stubCompactScreen();
    render(
      <>
        <MultiSelect
          ariaLabel="ตัวเลือกมือถือ"
          placeholder="เลือก"
          options={few}
          value={[]}
          onChange={vi.fn()}
        />
        <button>พื้นหลัง</button>
      </>,
    );
    const field = screen.getByRole("combobox", { name: "ตัวเลือกมือถือ" });
    field.focus();
    fireEvent.click(field);
    const sheet = screen.getByRole("dialog", { name: "ตัวเลือกมือถือ" });
    await waitFor(() =>
      expect(sheet.contains(document.activeElement)).toBe(true),
    );
    const closeButton = screen.getByRole("button", { name: "ปิด" });
    const done = screen.getByRole("button", { name: "เสร็จ" });
    done.focus();
    fireEvent.keyDown(done, { key: "Tab" });
    expect(document.activeElement).toBe(closeButton);
    fireEvent.keyDown(closeButton, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(done);
    screen.getByRole("button", { name: "พื้นหลัง" }).focus();
    expect(sheet.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(field);
  });

  it("closes only the nested sheet on Escape and keeps its parent's focus region", async () => {
    stubCompactScreen();
    const onParentClose = vi.fn();
    render(
      <Dialog open onOpenChange={onParentClose}>
        <DialogContent>
          <DialogTitle>ฟอร์มหลัก</DialogTitle>
          <MultiSelect
            ariaLabel="ตัวเลือกซ้อน"
            placeholder="เลือก"
            options={few}
            value={[]}
            onChange={vi.fn()}
          />
          <button>บันทึกฟอร์มหลัก</button>
        </DialogContent>
      </Dialog>,
    );
    const field = screen.getByRole("combobox", { name: "ตัวเลือกซ้อน" });
    field.focus();
    fireEvent.click(field);
    const sheet = screen.getByRole("dialog", { name: "ตัวเลือกซ้อน" });
    await waitFor(() =>
      expect(sheet.contains(document.activeElement)).toBe(true),
    );
    const done = screen.getByRole("button", { name: "เสร็จ" });
    done.focus();
    fireEvent.keyDown(done, { key: "Tab" });
    expect(sheet.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "ตัวเลือกซ้อน" })).toBeNull();
    expect(onParentClose).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(field);
    fireEvent.keyDown(field, { key: "Escape" });
    expect(onParentClose).toHaveBeenCalledWith(false);
  });

  it("keeps focus in the top sibling dialog without competing focus listeners", async () => {
    const onFirstClose = vi.fn();
    const onLastClose = vi.fn();
    render(
      <>
        <Dialog open onOpenChange={onFirstClose}>
          <DialogContent>
            <button>First dialog</button>
          </DialogContent>
        </Dialog>
        <Dialog open onOpenChange={onLastClose}>
          <DialogContent>
            <button>Last dialog</button>
          </DialogContent>
        </Dialog>
      </>,
    );
    const last = screen.getByRole("button", { name: "Last dialog" });
    await waitFor(() => expect(document.activeElement).toBe(last));
    screen.getByRole("button", { name: "First dialog" }).focus();
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(last, { key: "Escape" });
    expect(onLastClose).toHaveBeenCalledWith(false);
    expect(onFirstClose).not.toHaveBeenCalled();
  });

  it.each([
    { name: "ล้าง", options: few },
    { name: "เสร็จ", options: few },
    { name: "ล้าง", options: many },
    { name: "เสร็จ", options: many },
  ])(
    "keeps the parent open on Escape from desktop $name with $options.length choices",
    async ({ name, options }) => {
      const onParentClose = vi.fn();
      render(
        <Dialog open onOpenChange={onParentClose}>
          <DialogContent>
            <DialogTitle>ฟอร์มหลัก</DialogTitle>
            <MultiSelect
              ariaLabel="ตัวเลือกเดสก์ท็อป"
              placeholder="เลือก"
              options={options}
              value={[options[0].value]}
              onChange={vi.fn()}
            />
          </DialogContent>
        </Dialog>,
      );
      const field = screen.getByRole("combobox", {
        name: "ตัวเลือกเดสก์ท็อป",
      });
      await waitFor(() =>
        expect(
          screen.getByRole("dialog").contains(document.activeElement),
        ).toBe(true),
      );
      field.focus();
      fireEvent.click(field);
      const footerButton = screen.getByRole("button", { name });
      footerButton.focus();
      fireEvent.keyDown(footerButton, { key: "Escape" });
      expect(screen.queryByRole("listbox")).toBeNull();
      expect(onParentClose).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(field);
    },
  );

  it.each([
    { options: few, action: "clear" },
    { options: many, action: "clear" },
    { options: few, action: "remove" },
    { options: many, action: "remove" },
  ])(
    "keeps the parent open on Escape after $action with $options.length choices",
    async ({ options, action }) => {
      const onParentClose = vi.fn();
      function Form() {
        const [value, setValue] = useState([options[0].value]);
        return (
          <Dialog open onOpenChange={onParentClose}>
            <DialogContent>
              <MultiSelect
                ariaLabel="ล้างตัวเลือกเดสก์ท็อป"
                placeholder="เลือก"
                options={options}
                value={value}
                onChange={setValue}
              />
            </DialogContent>
          </Dialog>
        );
      }
      render(<Form />);
      const field = screen.getByRole("combobox");
      await waitFor(() =>
        expect(
          screen.getByRole("dialog").contains(document.activeElement),
        ).toBe(true),
      );
      field.focus();
      fireEvent.click(field);
      const button = screen.getByRole("button", {
        name: action === "clear" ? "ล้าง" : `นำ ${options[0].label} ออก`,
      });
      button.focus();
      fireEvent.click(button);
      expect(screen.queryByRole("button", { name: "ล้าง" })).toBeNull();
      fireEvent.keyDown(document.activeElement!, { key: "Escape" });
      expect(onParentClose).not.toHaveBeenCalled();
      expect(screen.queryByRole("listbox")).toBeNull();
      expect(document.activeElement).toBe(field);
    },
  );

  it("says how many are picked and closes on เสร็จ", () => {
    const onChange = vi.fn();
    render(
      <MultiSelect
        ariaLabel="สภาพแวดล้อม"
        placeholder="ไม่ระบุ"
        options={few}
        value={["a"]}
        onChange={onChange}
      />,
    );
    const field = screen.getByRole("combobox", { name: "สภาพแวดล้อม" });
    // A short fixed list is tapped, not typed into.
    expect(field).toHaveProperty("readOnly", true);
    fireEvent.click(field);
    expect(screen.getByText("เลือกแล้ว 1 รายการ")).toBeTruthy();
    fireEvent.click(screen.getByRole("option", { name: "ใกล้แหล่งมั่วสุม" }));
    expect(onChange).toHaveBeenCalledWith(["a", "b"]);
    fireEvent.click(screen.getByRole("button", { name: "ล้าง" }));
    expect(onChange).toHaveBeenCalledWith([]);
    fireEvent.click(screen.getByRole("button", { name: "เสร็จ" }));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("keeps typing to search for a long list", () => {
    render(
      <MultiSelect
        ariaLabel="คุณครู"
        placeholder="เลือกคุณครู"
        options={many}
        value={[]}
        onChange={vi.fn()}
      />,
    );
    const field = screen.getByRole("combobox", { name: "คุณครู" });
    expect(field).toHaveProperty("readOnly", false);
    fireEvent.change(field, { target: { value: "คนที่ 12" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByText("เลือกได้หลายรายการ")).toBeTruthy();
  });

  it("opens a sheet with its own search on a narrow screen", () => {
    stubCompactScreen();
    const onChange = vi.fn();
    render(
      <MultiSelect
        ariaLabel="คุณครู"
        placeholder="เลือกคุณครู"
        options={many}
        value={[]}
        onChange={onChange}
      />,
    );
    const field = screen.getByRole("combobox", { name: "คุณครู" });
    // The field never raises the keyboard; searching happens in the sheet.
    expect(field).toHaveProperty("readOnly", true);
    fireEvent.click(field);
    const sheet = screen.getByRole("dialog", { name: "คุณครู" });
    fireEvent.change(screen.getByRole("textbox", { name: "ค้นหาคุณครู" }), {
      target: { value: "คนที่ 3" },
    });
    fireEvent.click(screen.getByRole("option", { name: "ครูคนที่ 3" }));
    expect(onChange).toHaveBeenCalledWith(["t2"]);
    expect(screen.getByRole("dialog", { name: "คุณครู" })).toBe(sheet);
    fireEvent.click(screen.getByRole("button", { name: "เสร็จ" }));
    expect(screen.queryByRole("dialog", { name: "คุณครู" })).toBeNull();
  });

  it("leaves out the sheet search for a short list", () => {
    stubCompactScreen();
    render(
      <MultiSelect
        ariaLabel="สภาพแวดล้อม"
        placeholder="ไม่ระบุ"
        options={few}
        value={[]}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: "สภาพแวดล้อม" }));
    expect(screen.getByRole("dialog", { name: "สภาพแวดล้อม" })).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
