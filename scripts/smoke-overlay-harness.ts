/** Browser-only fixture; not imported by the production application. */
import { createElement as e, useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "../src/components/base/dialog";
import { TimePicker } from "../src/components/base/time-picker";
import { MultiSelect } from "../src/components/base/multi-select";
import { Combobox } from "../src/components/base/combobox";
import { DropdownMenu } from "../src/components/base/dropdown-menu";

declare global {
  interface Window {
    __overlayRoot?: Root;
    __overlayHost?: HTMLElement;
    __timeChoice?: string;
    __multiChoice?: string[];
    __comboChoice?: string;
    __menuChoice?: number;
  }
}

function OverlayProbe() {
  const [time, setTime] = useState("08:30");
  const [multi, setMulti] = useState<string[]>([]);
  const [combo, setCombo] = useState("");
  useEffect(() => {
    window.__timeChoice = time;
  }, [time]);
  useEffect(() => {
    window.__multiChoice = multi;
  }, [multi]);
  useEffect(() => {
    window.__comboChoice = combo;
  }, [combo]);
  return e(
    Dialog,
    { open: true },
    e(
      DialogContent,
      null,
      e(DialogTitle, null, "ทดสอบแผงตัวเลือก"),
      e(
        "div",
        { className: "ml-auto w-20" },
        e(TimePicker, {
          ariaLabel: "เวลาทดสอบ",
          value: time,
          onChange: setTime,
        }),
      ),
      e(MultiSelect, {
        ariaLabel: "เลือกหลายค่าทดสอบ",
        placeholder: "เลือกค่า",
        options: [{ value: "fixture", label: "ค่าทดสอบ" }],
        value: multi,
        onChange: setMulti,
      }),
      e(Combobox, {
        ariaLabel: "ค้นหาทดสอบ",
        options: [{ value: "fixture", label: "ค่าค้นหาทดสอบ" }],
        value: combo,
        onChange: setCombo,
      }),
      e(DropdownMenu, {
        ariaLabel: "เมนูทดสอบ",
        trigger: (props) =>
          e("button", { ...props, type: "button" }, "เปิดเมนูทดสอบ"),
        items: Array.from({ length: 12 }, (_, index) => ({
          id: String(index),
          label: "คำสั่งทดสอบ " + index,
          onSelect: () => {
            window.__menuChoice = index;
          },
        })),
      }),
    ),
  );
}

export function mountOverlayProbe(): void {
  const host = document.createElement("div");
  document.body.append(host);
  window.__overlayHost = host;
  window.__overlayRoot = createRoot(host);
  window.__overlayRoot.render(e(OverlayProbe));
}
