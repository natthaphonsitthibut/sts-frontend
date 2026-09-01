import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadTextFile } from "./download";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("downloadTextFile", () => {
  it("downloads the generated content with the requested filename and MIME type", () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(
      () => "blob:nl-query-export",
    );
    const revokeObjectURL = vi.fn<(url: string) => void>();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
    let downloadedFilename = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedFilename = this.download;
    });

    downloadTextFile(
      "school,count\nA,2",
      "nl-query.csv",
      "text/csv;charset=utf-8",
    );

    const blob = createObjectURL.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe("text/csv;charset=utf-8");
    expect(downloadedFilename).toBe("nl-query.csv");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:nl-query-export");
  });
});
