import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadVisitReportDraft,
  saveVisitReportDraft,
} from "./visit-report-draft";

afterEach(() => vi.unstubAllGlobals());

function storageFixture(
  formValues: object,
  abortWrite = false,
  initialDatabaseVersion = 3,
  recordVersion = 3,
) {
  let draft: unknown = {
    version: recordVersion,
    key: "00",
    formValues,
    latitude: "13.7",
    longitude: "100.5",
    files: [new File(["evidence"], "evidence.txt")],
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
  const deleteObjectStore = vi.fn(() => {
    draft = undefined;
  });
  let databaseVersion = initialDatabaseVersion;
  const database = {
    get version() {
      return databaseVersion;
    },
    objectStoreNames: { contains: () => true },
    deleteObjectStore,
    createObjectStore: vi.fn(),
    close: vi.fn(),
    transaction: () => {
      const transaction = {
        oncomplete: null,
        onabort: null,
        onerror: null,
        error: new Error("write aborted"),
        objectStore: () => ({
          get: () => request(draft),
          put: (value: unknown) => {
            draft = value;
            return request("00", abortWrite);
          },
          delete: () => request(undefined),
        }),
      } as unknown as IDBTransaction;
      function request(result: unknown, abort = false): IDBRequest {
        const req = { result } as IDBRequest;
        queueMicrotask(() => {
          req.onsuccess?.(new Event("success"));
          if (abort) transaction.onabort?.(new Event("abort"));
          else transaction.oncomplete?.(new Event("complete"));
        });
        return req;
      }
      return transaction;
    },
  } as unknown as IDBDatabase;
  const open = vi.fn((_name: string, requestedVersion?: number) => {
    const req = { result: database } as IDBOpenDBRequest;
    queueMicrotask(() => {
      const oldVersion = databaseVersion;
      if (requestedVersion && requestedVersion < oldVersion) {
        Object.defineProperty(req, "error", {
          value: new DOMException("old version", "VersionError"),
        });
        req.onerror?.(new Event("error"));
        return;
      }
      if (requestedVersion && requestedVersion > oldVersion) {
        databaseVersion = requestedVersion;
        req.onupgradeneeded?.({ oldVersion } as IDBVersionChangeEvent);
      }
      req.onsuccess?.(new Event("success"));
    });
    return req;
  });
  vi.stubGlobal("indexedDB", { open });
  vi.stubGlobal("crypto", {
    subtle: { digest: async () => new Uint8Array([0]).buffer },
  });
  return { deleteObjectStore, open };
}

describe("visit report draft upgrade", () => {
  it.each([
    ["FATHER_AND_MOTHER", ["FATHER", "MOTHER"]],
    ["OTHER", ["OTHER"]],
    ["", []],
  ])(
    "preserves a version 3 draft and converts %s guardians",
    async (guardianTypeCode, expected) => {
      const fixture = storageFixture({
        guardianTypeCode,
        guardianTypeDetail: "guardian",
        contactChannelCode: "OTHER",
        causeDetail: "unfinished report",
      });
      const draft =
        await loadVisitReportDraft<Record<string, unknown>>("fixture");
      expect(fixture.deleteObjectStore).not.toHaveBeenCalled();
      expect(draft?.version).toBe(4);
      expect(draft?.formValues).toMatchObject({
        guardianTypeCodes: expected,
        guardianTypeDetail: "guardian",
        contactChannelDetail: "",
        causeDetail: "unfinished report",
      });
      expect(draft?.formValues).not.toHaveProperty("guardianTypeCode");
      expect(draft?.latitude).toBe("13.7");
      expect(draft?.files[0].name).toBe("evidence.txt");
    },
  );

  it("preserves assistance drafts without adding visit-only answers", async () => {
    storageFixture({
      assistanceMeasureCodes: ["MEASURE"],
      resultDetail: "unfinished assistance",
    });
    const draft =
      await loadVisitReportDraft<Record<string, unknown>>("fixture");
    expect(draft?.formValues).toEqual({
      assistanceMeasureCodes: ["MEASURE"],
      resultDetail: "unfinished assistance",
    });
    expect(draft?.version).toBe(4);
  });

  it.each([1, 2])(
    "cleans the obsolete version %s store before saving a new hashed record",
    async (databaseVersion) => {
      const fixture = storageFixture(
        { causeDetail: "obsolete" },
        false,
        databaseVersion,
      );
      await saveVisitReportDraft({
        token: "fixture",
        formValues: { causeDetail: "new" },
        latitude: "",
        longitude: "",
        files: [],
      });
      expect(fixture.deleteObjectStore).toHaveBeenCalledOnce();
      expect(fixture.open).toHaveBeenNthCalledWith(
        1,
        "sts-visit-report-drafts",
      );
      expect(fixture.open).toHaveBeenNthCalledWith(
        2,
        "sts-visit-report-drafts",
        3,
      );
      const draft =
        await loadVisitReportDraft<Record<string, unknown>>("fixture");
      expect(draft?.formValues).toEqual({ causeDetail: "new" });
    },
  );

  it("opens an existing physical v4 database without downgrading or clearing it", async () => {
    const fixture = storageFixture(
      { guardianTypeCodes: ["MOTHER"], contactChannelDetail: "saved detail" },
      false,
      4,
      4,
    );
    const draft =
      await loadVisitReportDraft<Record<string, unknown>>("fixture");
    expect(fixture.open).toHaveBeenCalledExactlyOnceWith(
      "sts-visit-report-drafts",
    );
    expect(fixture.deleteObjectStore).not.toHaveBeenCalled();
    expect(draft?.formValues).toEqual({
      guardianTypeCodes: ["MOTHER"],
      contactChannelDetail: "saved detail",
    });
  });

  it("reports a failed save if IndexedDB aborts after the put request succeeds", async () => {
    storageFixture({}, true);
    await expect(
      saveVisitReportDraft({
        token: "fixture",
        formValues: {},
        latitude: "",
        longitude: "",
        files: [],
      }),
    ).rejects.toThrow("write aborted");
  });
});
