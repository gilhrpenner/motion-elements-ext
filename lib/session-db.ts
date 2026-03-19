import type { CaptureRecord, SessionSummary } from '@/lib/protocol';
import { toCaptureSummary } from '@/lib/protocol';

const DATABASE_NAME = 'motion-element-capture';
const DATABASE_VERSION = 1;
const STORE_NAME = 'captures';

let databasePromise: Promise<IDBDatabase> | null = null;

export async function saveCapture(capture: CaptureRecord): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).put(capture);
  await waitForTransaction(transaction);
}

export async function getCaptureRecords(): Promise<CaptureRecord[]> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const request = transaction.objectStore(STORE_NAME).getAll();
  const captures = await waitForRequest(request);
  await waitForTransaction(transaction);
  return captures.sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
}

export async function getSessionSummary(): Promise<SessionSummary> {
  const captures = await getCaptureRecords();
  return {
    count: captures.length,
    captures: captures.map(toCaptureSummary),
  };
}

export async function clearCaptures(): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).clear();
  await waitForTransaction(transaction);
}

export async function deleteLatestCapture(): Promise<CaptureRecord | null> {
  const captures = await getCaptureRecords();
  const latestCapture = captures[0];
  if (!latestCapture) {
    return null;
  }

  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).delete(latestCapture.id);
  await waitForTransaction(transaction);

  return latestCapture;
}

function openDatabase(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
    });
  }

  return databasePromise;
}

function waitForRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
  });
}
