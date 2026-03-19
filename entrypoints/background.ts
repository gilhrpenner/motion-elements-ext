import JSZip from 'jszip';
import type { Browser } from 'wxt/browser';

import {
  EXPORT_FOLDER_NAME,
  type CaptureRecord,
  type ExtensionMessage,
  type ExtensionResponse,
  type SelectionMode,
  SELECTOR_SCRIPT_PATH,
  type SelectionRect,
  fail,
  isExtensionMessage,
  ok,
  toCaptureSummary,
} from '@/lib/protocol';
import {
  clearCaptures,
  deleteLatestCapture,
  getCaptureRecords,
  getSessionSummary,
  saveCapture,
} from '@/lib/session-db';
import { getUnsupportedTabMessage, isScriptableUrl } from '@/lib/tab';

type MessageSender = Browser.runtime.MessageSender;
type SelectorControlMessage =
  | { type: 'START_SELECTION'; mode: SelectionMode }
  | { type: 'STOP_SELECTION' };

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!isExtensionMessage(message)) {
      return false;
    }

    void handleMessage(message, sender)
      .then(sendResponse)
      .catch((error) => {
        console.error('Background message handler failed.', {
          type: message.type,
          error,
        });
        sendResponse(fail(normalizeError(error)));
      });

    return true;
  });
});

async function handleMessage(
  message: ExtensionMessage,
  sender: MessageSender,
): Promise<ExtensionResponse<unknown>> {
  switch (message.type) {
    case 'START_SELECTION':
      return startSelection(message.tabId, message.mode);
    case 'STOP_SELECTION':
      return stopSelection(message.tabId);
    case 'CAPTURE_ELEMENT':
      return captureElement(message.selection, sender);
    case 'GET_SESSION':
      return ok(await getSessionSummary());
    case 'UNDO_LAST_CAPTURE':
      return undoLastCapture();
    case 'CLEAR_SESSION':
      await clearCaptures();
      return ok(await getSessionSummary());
    case 'EXPORT_SESSION':
      return exportSession();
    default:
      return fail('Unknown message type.');
  }
}

async function undoLastCapture(): Promise<
  ExtensionResponse<{ removedId: string; removedLabel: string; count: number }>
> {
  const removedCapture = await deleteLatestCapture();
  if (!removedCapture) {
    return fail('There are no captures to undo.');
  }

  const session = await getSessionSummary();
  return ok({
    removedId: removedCapture.id,
    removedLabel: removedCapture.elementLabel,
    count: session.count,
  });
}

async function startSelection(
  tabId: number,
  mode: SelectionMode,
): Promise<ExtensionResponse<{ tabId: number }>> {
  const tab = await browser.tabs.get(tabId);
  if (!isScriptableUrl(tab.url)) {
    return fail(getUnsupportedTabMessage(tab.url));
  }

  try {
    await sendToSelector(tabId, { type: 'START_SELECTION', mode });
  } catch (error) {
    if (!isMissingReceiverError(error)) {
      return fail(normalizeError(error));
    }

    try {
      await browser.scripting.executeScript({
        target: { tabId },
        files: [SELECTOR_SCRIPT_PATH],
      });
      await sendToSelector(tabId, { type: 'START_SELECTION', mode });
    } catch (injectionError) {
      return fail(normalizeInjectionError(injectionError, tab.url));
    }
  }

  return ok({ tabId });
}

async function stopSelection(tabId: number): Promise<ExtensionResponse<{ tabId: number }>> {
  try {
    await sendToSelector(tabId, { type: 'STOP_SELECTION' });
  } catch (error) {
    if (!isMissingReceiverError(error)) {
      return fail(normalizeError(error));
    }
  }

  return ok({ tabId });
}

async function captureElement(
  selection: SelectionRect,
  sender: MessageSender,
): Promise<ExtensionResponse<{ capture: ReturnType<typeof toCaptureSummary> }>> {
  const tabId = sender.tab?.id;
  const windowId = sender.tab?.windowId;

  if (tabId == null || windowId == null) {
    return fail('Capture failed because the active tab context is missing.');
  }

  const tab = await browser.tabs.get(tabId);
  if (!isScriptableUrl(tab.url)) {
    return fail(getUnsupportedTabMessage(tab.url));
  }

  const visibilityError = validateSelection(selection);
  if (visibilityError) {
    return fail(visibilityError);
  }

  try {
    const screenshotDataUrl = await browser.tabs.captureVisibleTab(windowId, {
      format: 'png',
    });

    const imageBlob = await cropCapturedImage(screenshotDataUrl, selection);
    const capture: CaptureRecord = {
      id: crypto.randomUUID(),
      capturedAt: new Date().toISOString(),
      pageUrl: selection.pageUrl,
      pageTitle: selection.pageTitle,
      tagName: selection.tagName,
      elementLabel: selection.elementLabel,
      viewportX: selection.viewportX,
      viewportY: selection.viewportY,
      pageX: selection.pageX,
      pageY: selection.pageY,
      width: selection.width,
      height: selection.height,
      viewportWidth: selection.viewportWidth,
      viewportHeight: selection.viewportHeight,
      documentWidth: selection.documentWidth,
      documentHeight: selection.documentHeight,
      bodyWidth: selection.bodyWidth,
      bodyHeight: selection.bodyHeight,
      scrollX: selection.scrollX,
      scrollY: selection.scrollY,
      devicePixelRatio: selection.devicePixelRatio,
      imageBlob,
    };

    await saveCapture(capture);
    return ok({ capture: toCaptureSummary(capture) });
  } catch (error) {
    return fail(normalizeError(error));
  }
}

async function exportSession(): Promise<
  ExtensionResponse<{ count: number; filename: string; downloadId: number | undefined }>
> {
  const captures = await getCaptureRecords();
  if (captures.length === 0) {
    return fail('There are no captures to export yet.');
  }

  try {
    const zip = new JSZip();
    const exportFiles = await Promise.all(
      captures.map(async (capture, index) => {
        const imageFile = `${EXPORT_FOLDER_NAME}/${buildExportImageFilename(
          capture,
          index,
        )}`;

        return {
          capture,
          imageFile,
          imageBytes: await convertBlobToJpegBytes(capture.imageBlob),
        };
      }),
    );
    const manifest = exportFiles.map(({ capture, imageFile }) => {
      const { imageBlob, ...captureMetadata } = capture;

      return {
        ...captureMetadata,
        imageFile,
      };
    });

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    for (const file of exportFiles) {
      zip.file(file.imageFile, file.imageBytes);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const filename = `motion-element-captures/session-${formatTimestampForFile(
      new Date(),
    )}.zip`;
    const downloadUrl = await createDownloadUrl(zipBlob);
    const downloadId = await browser.downloads.download({
      url: downloadUrl,
      filename,
      saveAs: true,
    });

    return ok({ count: captures.length, filename, downloadId });
  } catch (error) {
    return fail(normalizeError(error));
  }
}

async function cropCapturedImage(
  screenshotDataUrl: string,
  selection: SelectionRect,
): Promise<Blob> {
  const sourceBlob = await dataUrlToBlob(screenshotDataUrl);
  const bitmap = await createImageBitmap(sourceBlob);

  try {
    const scaleX = bitmap.width / selection.viewportWidth;
    const scaleY = bitmap.height / selection.viewportHeight;

    const left = clamp(Math.round(selection.viewportX * scaleX), 0, bitmap.width - 1);
    const top = clamp(Math.round(selection.viewportY * scaleY), 0, bitmap.height - 1);
    const right = clamp(
      Math.round((selection.viewportX + selection.width) * scaleX),
      left + 1,
      bitmap.width,
    );
    const bottom = clamp(
      Math.round((selection.viewportY + selection.height) * scaleY),
      top + 1,
      bitmap.height,
    );

    const width = right - left;
    const height = bottom - top;
    if (width <= 0 || height <= 0) {
      throw new Error('The selected area produced an empty crop.');
    }

    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('2D canvas is unavailable in the extension background.');
    }

    context.drawImage(bitmap, left, top, width, height, 0, 0, width, height);
    return canvas.convertToBlob({ type: 'image/png' });
  } finally {
    bitmap.close();
  }
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

async function convertBlobToJpegBytes(blob: Blob): Promise<ArrayBuffer> {
  const bitmap = await createImageBitmap(blob);

  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('2D canvas is unavailable in the extension background.');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, bitmap.width, bitmap.height);
    context.drawImage(bitmap, 0, 0);

    const jpegBlob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: 0.92,
    });

    return jpegBlob.arrayBuffer();
  } finally {
    bitmap.close();
  }
}

function buildExportImageFilename(capture: CaptureRecord, index: number): string {
  const count = String(index + 1).padStart(3, '0');
  const x = Math.round(capture.pageX);
  const y = Math.round(capture.pageY);
  const pageWidth = Math.round(capture.documentWidth);
  const pageHeight = Math.round(capture.documentHeight);

  return `${count}_${x}-${y}_${pageWidth}_${pageHeight}.jpg`;
}

async function createDownloadUrl(blob: Blob): Promise<string> {
  if (typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(blob);
  }

  return blobToDataUrl(blob);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return `data:${blob.type};base64,${btoa(binary)}`;
}

function validateSelection(selection: SelectionRect): string | null {
  if (selection.width <= 0 || selection.height <= 0) {
    return 'The selected element has no visible size to capture.';
  }

  if (selection.viewportWidth <= 0 || selection.viewportHeight <= 0) {
    return 'The viewport size is invalid. Reload the page and try again.';
  }

  const fullyVisible =
    selection.viewportX >= 0 &&
    selection.viewportY >= 0 &&
    selection.viewportX + selection.width <= selection.viewportWidth &&
    selection.viewportY + selection.height <= selection.viewportHeight;

  if (!fullyVisible) {
    return 'Only fully visible elements can be captured in v1. Scroll until the element is fully in view and try again.';
  }

  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatTimestampForFile(value: Date): string {
  return value.toISOString().replace(/[:.]/g, '-');
}

function normalizeInjectionError(error: unknown, url?: string | null): string {
  if (!isScriptableUrl(url)) {
    return getUnsupportedTabMessage(url);
  }

  return normalizeError(error);
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected extension error occurred.';
}

function isMissingReceiverError(error: unknown): boolean {
  return normalizeError(error).includes('Receiving end does not exist');
}

function sendToSelector(
  tabId: number,
  message: SelectorControlMessage,
) {
  return browser.tabs.sendMessage(tabId, message);
}
