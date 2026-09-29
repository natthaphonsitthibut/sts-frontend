import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuditLogDetailBlock } from "./AuditLogDetailBlock";
import type { AuditLogEntry } from "../types/audit-log.types";

const entry: AuditLogEntry = {
  id: "42",
  domain: "tasks",
  action: "TASK_CREATE",
  actionLabel: "สร้างงาน",
  actorLabel: "ผู้ดูแลระบบ",
  targetLabel: "นักเรียนตัวอย่าง",
  createdAt: "2026-09-30T01:00:00.000Z",
  details: [{ label: "โรงเรียน", value: "โรงเรียนตัวอย่าง" }],
};

describe("AuditLogDetailBlock", () => {
  it("shows the event and its details once in one block", () => {
    render(<AuditLogDetailBlock entry={entry} />);
    expect(screen.getByText("ผู้ดูแลระบบ")).toBeTruthy();
    expect(screen.getByText("โรงเรียนตัวอย่าง")).toBeTruthy();
    expect(screen.getAllByText("โรงเรียนตัวอย่าง")).toHaveLength(1);
  });
});
