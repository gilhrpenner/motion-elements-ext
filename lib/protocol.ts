export const SELECTOR_SCRIPT_PATH = '/content-scripts/content.js';
export const EXPORT_FOLDER_NAME = 'images';
export type SelectionMode = 'capture' | 'hide' | 'blur' | 'text' | 'edit';

export interface TextFragmentRect {
  viewportX: number;
  viewportY: number;
  pageX: number;
  pageY: number;
  width: number;
  height: number;
}

export interface SelectionRect {
  tagName: string;
  elementLabel: string;
  pageUrl: string;
  pageTitle: string;
  viewportX: number;
  viewportY: number;
  pageX: number;
  pageY: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  documentWidth: number;
  documentHeight: number;
  bodyWidth: number;
  bodyHeight: number;
  scrollX: number;
  scrollY: number;
  devicePixelRatio: number;
}

export interface ViewportCaptureDraft {
  pageUrl: string;
  pageTitle: string;
  viewportWidth: number;
  viewportHeight: number;
  documentWidth: number;
  documentHeight: number;
  bodyWidth: number;
  bodyHeight: number;
  scrollX: number;
  scrollY: number;
  devicePixelRatio: number;
}

export interface BaseSessionRecord {
  id: string;
  capturedAt: string;
  kind: 'capture' | 'text-fragment';
  sortOrder?: number;
  pageUrl: string;
  pageTitle: string;
  tagName: string;
  elementLabel: string;
  viewportX: number;
  viewportY: number;
  pageX: number;
  pageY: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  documentWidth: number;
  documentHeight: number;
  bodyWidth: number;
  bodyHeight: number;
  scrollX: number;
  scrollY: number;
  devicePixelRatio: number;
}

export interface CaptureRecord extends BaseSessionRecord {
  kind: 'capture';
  imageBlob: Blob;
}

export interface TextFragmentRecord extends BaseSessionRecord {
  kind: 'text-fragment';
  fullText: string;
  fragmentText: string;
  fragmentStart: number;
  fragmentEnd: number;
  fragmentRects: TextFragmentRect[];
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  lineHeight: string;
  letterSpacing: string;
  color: string;
  textAlign: string;
  textTransform: string;
  textDecoration: string;
}

export interface TextFragmentDraft extends Omit<TextFragmentRecord, 'id' | 'capturedAt'> {}

export type SessionRecord = CaptureRecord | TextFragmentRecord;
export type CaptureSummary = Omit<CaptureRecord, 'imageBlob'>;
export type TextFragmentSummary = TextFragmentRecord;
export type SessionItemSummary = CaptureSummary | TextFragmentSummary;

export interface SessionSummary {
  count: number;
  captureCount: number;
  textFragmentCount: number;
  items: SessionItemSummary[];
}

export type ExtensionMessage =
  | { type: 'START_SELECTION'; tabId: number; mode: SelectionMode }
  | { type: 'STOP_SELECTION'; tabId: number }
  | { type: 'CAPTURE_ELEMENT'; selection: SelectionRect }
  | { type: 'CAPTURE_VIEWPORT'; tabId: number }
  | { type: 'SAVE_TEXT_FRAGMENT'; fragment: TextFragmentDraft }
  | { type: 'GET_SESSION' }
  | { type: 'GET_ACTIVE_MODE'; tabId: number }
  | { type: 'UNDO_LAST_CAPTURE' }
  | { type: 'CLEAR_SESSION' }
  | { type: 'EXPORT_SESSION' };

export type ExtensionResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok<T>(data: T): ExtensionResponse<T> {
  return { ok: true, data };
}

export function fail(error: string): ExtensionResponse<never> {
  return { ok: false, error };
}

export function toCaptureSummary(record: CaptureRecord): CaptureSummary {
  const { imageBlob, ...summary } = record;
  return summary;
}

export function toSessionItemSummary(record: SessionRecord): SessionItemSummary {
  if (record.kind === 'capture') {
    return toCaptureSummary(record);
  }

  return record;
}

export function isCaptureRecord(record: SessionRecord): record is CaptureRecord {
  return record.kind === 'capture';
}

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof value.type === 'string'
  );
}
