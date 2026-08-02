const DATABASE_NAME = "sts-visit-report-drafts";
const STORE_NAME = "drafts";
const DATABASE_VERSION = 1;

export interface VisitReportDraft<TValues extends object> {
  version: 1;
  token: string;
  updatedAt: string;
  formValues: TValues;
  latitude: string;
  longitude: string;
  files: File[];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "token" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("ไม่สามารถเปิดพื้นที่ฉบับร่างได้"));
  });
}

async function runRequest<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = action(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("ไม่สามารถจัดการฉบับร่างได้"));
    });
  } finally {
    database.close();
  }
}

export async function loadVisitReportDraft<TValues extends object>(
  token: string,
): Promise<VisitReportDraft<TValues> | null> {
  const draft = await runRequest<VisitReportDraft<TValues> | undefined>("readonly", (store) =>
    store.get(token),
  );
  return draft?.version === 1 ? draft : null;
}

export async function saveVisitReportDraft<TValues extends object>(
  draft: Omit<VisitReportDraft<TValues>, "version" | "updatedAt">,
): Promise<string> {
  const updatedAt = new Date().toISOString();
  await runRequest<IDBValidKey>("readwrite", (store) =>
    store.put({ ...draft, version: 1, updatedAt }),
  );
  return updatedAt;
}

export async function deleteVisitReportDraft(token: string): Promise<void> {
  await runRequest<undefined>("readwrite", (store) => store.delete(token));
}
