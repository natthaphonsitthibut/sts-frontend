import { describe, expect, it } from "vitest";
import {
  readBooleanSearchParam,
  readIsoDateSearchParam,
  readOptionalPositiveIntegerSearchParam,
  readPositiveIntegerSearchParam,
  readSortSearchParam,
} from "./useSyncedSearchParams";

function params(search: string): URLSearchParams {
  return new URLSearchParams(search);
}

describe("URL filter readers", () => {
  it("keeps positive integers and falls back on anything the API would reject", () => {
    expect(readPositiveIntegerSearchParam(params("page=3"), "page", 1)).toBe(3);
    for (const value of ["-1", "0", "1.5", "abc", "", "1e3.5"]) {
      expect(
        readPositiveIntegerSearchParam(params(`page=${value}`), "page", 1),
      ).toBe(1);
    }
    expect(readPositiveIntegerSearchParam(params(""), "page", 1)).toBe(1);
  });

  it("returns undefined for optional integers that are out of contract", () => {
    expect(
      readOptionalPositiveIntegerSearchParam(
        params("academicYear=2569"),
        "academicYear",
      ),
    ).toBe(2569);
    for (const value of ["-3", "0", "2569.5", "ปี"]) {
      expect(
        readOptionalPositiveIntegerSearchParam(
          params(`academicYear=${value}`),
          "academicYear",
        ),
      ).toBeUndefined();
    }
  });

  it("accepts only real calendar dates", () => {
    expect(readIsoDateSearchParam(params("date=2024-02-29"), "date")).toBe(
      "2024-02-29",
    );
    for (const value of [
      "2026-02-30",
      "2026-13-01",
      "2026-2-3",
      "2026-02-28T00:00:00Z",
    ]) {
      expect(
        readIsoDateSearchParam(params(`date=${value}`), "date", "fallback"),
      ).toBe("fallback");
    }
  });

  it("accepts only allowed sort keys and directions", () => {
    expect(
      readSortSearchParam(params("sort=name:asc"), "sort", ["name"]),
    ).toEqual({
      key: "name",
      direction: "asc",
    });
    expect(
      readSortSearchParam(params("sort=name:sideways"), "sort", ["name"]),
    ).toBeUndefined();
    expect(
      readSortSearchParam(params("sort=secret:asc"), "sort", ["name"]),
    ).toBeUndefined();
  });

  it("reads booleans strictly", () => {
    expect(readBooleanSearchParam(params("flag=true"), "flag", false)).toBe(
      true,
    );
    expect(readBooleanSearchParam(params("flag=false"), "flag", true)).toBe(
      false,
    );
    expect(readBooleanSearchParam(params("flag=yes"), "flag", true)).toBe(true);
  });
});
