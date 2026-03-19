export const SELECTOR_SCRIPT_PATH = '/content-scripts/content.js';
export const EXPORT_FOLDER_NAME = 'images';

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

export interface CaptureRecord {
  id: string;
  capturedAt: string;
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
  imageBlob: Blob;
}

export type CaptureSummary = Omit<CaptureRecord, 'imageBlob'>;

export interface SessionSummary {
  count: number;
  captures: CaptureSummary[];
}

export type ExtensionMessage =
  | { type: 'START_SELECTION'; tabId: number }
  | { type: 'STOP_SELECTION'; tabId: number }
  | { type: 'CAPTURE_ELEMENT'; selection: SelectionRect }
  | { type: 'GET_SESSION' }
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

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof value.type === 'string'
  );
}
