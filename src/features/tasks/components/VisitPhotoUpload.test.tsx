import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VisitPhotoUpload } from "./VisitPhotoUpload";

describe("VisitPhotoUpload", () => {
  it("accepts ten attachments and explains the limit before selection", () => {
    const onChange = vi.fn();
    const { container } = render(
      <VisitPhotoUpload files={[]} onChange={onChange} />,
    );
    expect(screen.getByText(/สูงสุด 10 ไฟล์ ไฟล์ละไม่เกิน 5MB/)).toBeTruthy();

    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    const files = Array.from(
      { length: 10 },
      (_, index) =>
        new File(["photo"], `photo-${index}.png`, { type: "image/png" }),
    );
    fireEvent.change(input!, { target: { files } });

    expect(onChange).toHaveBeenCalledWith(files);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("rejects an eleventh attachment and keeps the first ten", () => {
    const onChange = vi.fn();
    const { container } = render(
      <VisitPhotoUpload files={[]} onChange={onChange} />,
    );
    const files = Array.from(
      { length: 11 },
      (_, index) =>
        new File(["photo"], `photo-${index}.png`, { type: "image/png" }),
    );
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files },
    });

    expect(onChange).toHaveBeenCalledWith(files.slice(0, 10));
    expect(screen.getByRole("alert").textContent).toBe(
      "แนบไฟล์ได้สูงสุด 10 ไฟล์",
    );
  });
});
