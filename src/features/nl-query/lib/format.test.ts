import { describe, expect, it } from "vitest";
import { formatValue, toCSV, toMarkdown } from "./format";

describe("NL query result formatting", () => {
  it("formats identifiers without thousands separators and percentages with a suffix", () => {
    expect(formatValue(10010002, "id")).toBe("10010002");
    expect(formatValue(72.34, "percent")).toBe("72.3%");
    expect(formatValue(null, "number")).toBe("—");
  });

  it("exports columns in the contract order and escapes values", () => {
    const rows = [{ note: 'a,"b"', school_id: 101 }];
    const columns = [
      {
        name: "school_id",
        type: "int",
        numeric: true,
        semantic_type: "id" as const,
      },
      {
        name: "note",
        type: "str",
        numeric: false,
        semantic_type: "text" as const,
      },
    ];

    expect(toCSV(rows, columns)).toBe('school_id,note\n101,"a,""b"""');
    expect(toMarkdown([{ note: "a|b", school_id: 101 }], columns)).toContain(
      "| 101 | a\\|b |",
    );
  });
});
