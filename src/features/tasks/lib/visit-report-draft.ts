const DATABASE_NAME = "sts-visit-report-drafts";
const STORE_NAME = "drafts";
const DATABASE_VERSION = 3;
const MAX_DRAFT_AGE_MS = 24 * 60 * 60 * 1000;

export interface VisitReportDraft<TValues extends object> {
  version: 3;
  key: string;
  updatedAt: string;
  expiresAt: string;
  formValues: TValues;
  latitude: string;
  longitude: string;
  files: File[];
}

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
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      // Recreate the store when the form contract changes. This also keeps the
      // v1 raw-token cleanup and prevents stale answers from older flows.
      if (request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.deleteObjectStore(STORE_NAME);
      }
      request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("ไม่สามารถเปิดพื้นที่ฉบับร่างได้"));
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
      request.onsuccess = () => resolve(request.result);
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
  const draft = await runRequest<VisitReportDraft<TValues> | undefined>(
    "readonly",
    (store) => store.get(key),
  );
  if (!draft || draft.version !== 3) return null;
  if (new Date(draft.expiresAt).getTime() <= Date.now()) {
    await runRequest<undefined>("readwrite", (store) => store.delete(key));
    return null;
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
      version: 3,
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
