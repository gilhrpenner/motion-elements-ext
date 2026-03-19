import type {
  CaptureRecord,
  SessionRecord,
  SessionSummary,
  TextFragmentRecord,
} from '@/lib/protocol';
import {
  isCaptureRecord,
  toSessionItemSummary,
} from '@/lib/protocol';

const DATABASE_NAME = 'motion-element-capture';
const DATABASE_VERSION = 1;
const STORE_NAME = 'captures';

let databasePromise: Promise<IDBDatabase> | null = null;

type LegacyCaptureRecord = Omit<CaptureRecord, 'kind'> & { kind?: undefined };

export async function saveCapture(capture: CaptureRecord): Promise<void> {
  await saveSessionRecord(capture);
}

export async function saveTextFragment(fragment: TextFragmentRecord): Promise<void> {
  await saveSessionRecord(fragment);
}

async function saveSessionRecord(record: SessionRecord): Promise<void> {
  const records = await getSessionRecords();
  const nextSortOrder =
    records.reduce(
      (max, sessionRecord) =>
        Math.max(max, typeof sessionRecord.sortOrder === 'number' ? sessionRecord.sortOrder : -1),
      -1,
    ) + 1;
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).put({
    ...record,
    sortOrder: typeof record.sortOrder === 'number' ? record.sortOrder : nextSortOrder,
  });
  await waitForTransaction(transaction);
}

export async function getSessionRecords(): Promise<SessionRecord[]> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const request = transaction.objectStore(STORE_NAME).getAll();
  const records = await waitForRequest(request);
  await waitForTransaction(transaction);

  const normalizedRecords = records.map(normalizeSessionRecord);
  const needsSortOrderBackfill = normalizedRecords.some(
    (record) => typeof record.sortOrder !== 'number',
  );

  if (needsSortOrderBackfill) {
    return normalizedRecords
      .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))
      .map((record, index) => ({
        ...record,
        sortOrder: index,
      }));
  }

  return normalizedRecords.sort(
    (left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0),
  );
}

export async function getCaptureRecords(): Promise<CaptureRecord[]> {
  const records = await getSessionRecords();
  return records.filter(isCaptureRecord);
}

export async function getSessionSummary(): Promise<SessionSummary> {
  const records = await getSessionRecords();
  const captureCount = records.filter(isCaptureRecord).length;

  return {
    count: records.length,
    captureCount,
    textFragmentCount: records.length - captureCount,
    items: records.map(toSessionItemSummary),
  };
}

export async function clearCaptures(): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).clear();
  await waitForTransaction(transaction);
}

export async function deleteLatestSessionRecord(): Promise<SessionRecord | null> {
  const records = await getSessionRecords();
  const latestRecord = records
    .slice()
    .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))[0];
  if (!latestRecord) {
    return null;
  }

  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).delete(latestRecord.id);
  await waitForTransaction(transaction);

  return latestRecord;
}

export async function updateSessionRecordOrder(orderedIds: string[]): Promise<void> {
  const records = await getSessionRecords();
  const recordMap = new Map(records.map((record) => [record.id, record]));
  const reorderedRecords: SessionRecord[] = [];

  for (const id of orderedIds) {
    const record = recordMap.get(id);
    if (record) {
      reorderedRecords.push(record);
      recordMap.delete(id);
    }
  }

  reorderedRecords.push(...recordMap.values());

  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  reorderedRecords.forEach((record, index) => {
    store.put({
      ...record,
      sortOrder: index,
    });
  });

  await waitForTransaction(transaction);
}

function normalizeSessionRecord(
  record: SessionRecord | LegacyCaptureRecord,
): SessionRecord {
  if ('kind' in record && record.kind === 'text-fragment') {
    return record;
  }

  return {
    ...record,
    kind: 'capture',
  } as CaptureRecord;
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
