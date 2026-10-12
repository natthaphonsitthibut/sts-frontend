const DATABASE_NAME = "sts-visit-report-drafts";
const STORE_NAME = "drafts";
const DATABASE_VERSION = 3;
const MAX_DRAFT_AGE_MS = 24 * 60 * 60 * 1000;

export interface VisitReportDraft<TValues extends object> {
  version: 4;
  key: string;
  updatedAt: string;
  expiresAt: string;
  formValues: TValues;
  latitude: string;
  longitude: string;
  files: File[];
}

type PreviousVisitReportDraft<TValues extends object> = Omit<
  VisitReportDraft<TValues>,
  "version"
> & {
  version: 3;
};

interface SaveVisitReportDraftInput<TValues extends object> {
  token: string;
  taskExpiresAt?: string | null;
  formValues: TValues;
  latitude: string;
  longitude: string;
  files: File[];
}

async function draftKey(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function resolveExpiry(taskExpiresAt?: string | null): string {
  const maximum = Date.now() + MAX_DRAFT_AGE_MS;
  const taskExpiry = taskExpiresAt
    ? new Date(taskExpiresAt).getTime()
    : Number.NaN;
  return new Date(
    Number.isFinite(taskExpiry) ? Math.min(maximum, taskExpiry) : maximum,
  ).toISOString();
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Record v4 needs no store changes. Open the current version so old v3
    // tabs can still save, and already-upgraded v4 stores remain readable.
    const attach = (request: IDBOpenDBRequest): void => {
      request.onupgradeneeded = (event) => {
        // Only v1/v2 need raw-token/obsolete-flow cleanup.
        if ((event as IDBVersionChangeEvent).oldVersion >= 3) return;
        if (request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.deleteObjectStore(STORE_NAME);
        }
        request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
      };
      request.onsuccess = () => {
        if (request.result.version < DATABASE_VERSION) {
          request.result.close();
          attach(indexedDB.open(DATABASE_NAME, DATABASE_VERSION));
        } else resolve(request.result);
      };
      request.onerror = () =>
        reject(request.error ?? new Error("ไม่สามารถเปิดพื้นที่ฉบับร่างได้"));
    };
    attach(indexedDB.open(DATABASE_NAME));
  });
}

async function runRequest<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = action(transaction.objectStore(STORE_NAME));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("ไม่สามารถจัดการฉบับร่างได้"));
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("ไม่สามารถจัดการฉบับร่างได้"));
      request.onerror = () =>
        reject(request.error ?? new Error("ไม่สามารถจัดการฉบับร่างได้"));
    });
  } finally {
    database.close();
  }
}

export async function loadVisitReportDraft<TValues extends object>(
  token: string,
): Promise<VisitReportDraft<TValues> | null> {
  const key = await draftKey(token);
  const draft = await runRequest<
    VisitReportDraft<TValues> | PreviousVisitReportDraft<TValues> | undefined
  >("readonly", (store) => store.get(key));
  if (!draft || (draft.version !== 4 && draft.version !== 3)) return null;
  if (new Date(draft.expiresAt).getTime() <= Date.now()) {
    await runRequest<undefined>("readwrite", (store) => store.delete(key));
    return null;
  }
  if (draft.version === 3) {
    const { guardianTypeCode, ...previousValues } =
      draft.formValues as TValues & { guardianTypeCode?: string | null };
    const formValues = {
      ...previousValues,
      ...(Object.prototype.hasOwnProperty.call(
        draft.formValues,
        "guardianTypeCode",
      )
        ? {
            guardianTypeCodes:
              guardianTypeCode === "FATHER_AND_MOTHER"
                ? ["FATHER", "MOTHER"]
                : guardianTypeCode
                  ? [guardianTypeCode]
                  : [],
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(
        draft.formValues,
        "contactChannelCode",
      )
        ? { contactChannelDetail: "" }
        : {}),
    } as TValues;
    const upgraded: VisitReportDraft<TValues> = {
      ...draft,
      version: 4,
      formValues,
    };
    // Reading a draft must not overwrite a newer save from another tab.
    return upgraded;
  }
  return draft;
}

export async function saveVisitReportDraft<TValues extends object>(
  input: SaveVisitReportDraftInput<TValues>,
): Promise<string> {
  const updatedAt = new Date().toISOString();
  const { token, taskExpiresAt, ...draft } = input;
  const key = await draftKey(token);
  await runRequest<IDBValidKey>("readwrite", (store) =>
    store.put({
      ...draft,
      version: 4,
      key,
      updatedAt,
      expiresAt: resolveExpiry(taskExpiresAt),
    }),
  );
  return updatedAt;
}

export async function deleteVisitReportDraft(token: string): Promise<void> {
  const key = await draftKey(token);
  await runRequest<undefined>("readwrite", (store) => store.delete(key));
}
