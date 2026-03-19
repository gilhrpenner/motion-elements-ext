import JSZip from 'jszip';
import type { Browser } from 'wxt/browser';

import {
  EXPORT_FOLDER_NAME,
  type CaptureRecord,
  type ExtensionMessage,
  type ExtensionResponse,
  SELECTOR_SCRIPT_PATH,
  type SelectionRect,
  fail,
  isExtensionMessage,
  ok,
  toCaptureSummary,
} from '@/lib/protocol';
import {
  clearCaptures,
  getCaptureRecords,
  getSessionSummary,
  saveCapture,
} from '@/lib/session-db';
import { getUnsupportedTabMessage, isScriptableUrl } from '@/lib/tab';

type MessageSender = Browser.runtime.MessageSender;
type SelectorControlMessage = { type: 'START_SELECTION' | 'STOP_SELECTION' };

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, sender) => {
    if (!isExtensionMessage(message)) {
      return undefined;
    }

    return handleMessage(message, sender);
  });
});

async function handleMessage(
  message: ExtensionMessage,
  sender: MessageSender,
): Promise<ExtensionResponse<unknown>> {
  switch (message.type) {
    case 'START_SELECTION':
      return startSelection(message.tabId);
    case 'STOP_SELECTION':
      return stopSelection(message.tabId);
    case 'CAPTURE_ELEMENT':
      return captureElement(message.selection, sender);
    case 'GET_SESSION':
      return ok(await getSessionSummary());
    case 'CLEAR_SESSION':
      await clearCaptures();
      return ok(await getSessionSummary());
    case 'EXPORT_SESSION':
      return exportSession();
    default:
      return fail('Unknown message type.');
  }
}

async function startSelection(tabId: number): Promise<ExtensionResponse<{ tabId: number }>> {
  const tab = await browser.tabs.get(tabId);
  if (!isScriptableUrl(tab.url)) {
    return fail(getUnsupportedTabMessage(tab.url));
  }

  try {
    await sendToSelector(tabId, { type: 'START_SELECTION' });
  } catch (error) {
    if (!isMissingReceiverError(error)) {
      return fail(normalizeError(error));
    }

    try {
      await browser.scripting.executeScript({
        target: { tabId },
        files: [SELECTOR_SCRIPT_PATH],
      });
      await sendToSelector(tabId, { type: 'START_SELECTION' });
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
    const manifest = captures.map(({ imageBlob, ...capture }) => ({
      ...capture,
      imageFile: `${EXPORT_FOLDER_NAME}/${capture.id}.png`,
    }));

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    for (const capture of captures) {
      zip.file(
        `${EXPORT_FOLDER_NAME}/${capture.id}.png`,
        await capture.imageBlob.arrayBuffer(),
      );
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const filename = `motion-element-captures/session-${formatTimestampForFile(
      new Date(),
    )}.zip`;
    const url = URL.createObjectURL(zipBlob);

    try {
      const downloadId = await browser.downloads.download({
        url,
        filename,
        saveAs: true,
      });

      return ok({ count: captures.length, filename, downloadId });
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
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
