import JSZip from 'jszip';
import type { Browser } from 'wxt/browser';

import {
  EXPORT_FOLDER_NAME,
  type CaptureRecord,
  type ExtensionMessage,
  type ExtensionResponse,
  isCaptureRecord,
  type SelectionMode,
  type SessionRecord,
  SELECTOR_SCRIPT_PATH,
  type SelectionRect,
  type TextFragmentDraft,
  type TextFragmentRecord,
  fail,
  isExtensionMessage,
  ok,
  toSessionItemSummary,
} from '@/lib/protocol';
import {
  clearCaptures,
  deleteLatestSessionRecord,
  getCaptureRecords,
  getSessionRecords,
  getSessionSummary,
  saveCapture,
  saveTextFragment,
} from '@/lib/session-db';
import { getUnsupportedTabMessage, isScriptableUrl } from '@/lib/tab';

type MessageSender = Browser.runtime.MessageSender;
type SelectorControlMessage =
  | { type: 'START_SELECTION'; mode: SelectionMode }
  | { type: 'STOP_SELECTION' };
const activeModeByTab = new Map<number, SelectionMode>();

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
    case 'SAVE_TEXT_FRAGMENT':
      return saveMeasuredTextFragment(message.fragment);
    case 'GET_SESSION':
      return ok(await getSessionSummary());
    case 'GET_ACTIVE_MODE':
      return ok({ mode: activeModeByTab.get(message.tabId) ?? null });
    case 'UNDO_LAST_CAPTURE':
      return undoLastSessionRecord();
    case 'CLEAR_SESSION':
      await clearCaptures();
      return ok(await getSessionSummary());
    case 'EXPORT_SESSION':
      return exportSession();
    default:
      return fail('Unknown message type.');
  }
}

async function undoLastSessionRecord(): Promise<
  ExtensionResponse<{
    removedId: string;
    removedLabel: string;
    removedKind: SessionRecord['kind'];
    count: number;
  }>
> {
  const removedRecord = await deleteLatestSessionRecord();
  if (!removedRecord) {
    return fail('There are no session items to undo.');
  }

  const session = await getSessionSummary();
  return ok({
    removedId: removedRecord.id,
    removedLabel: removedRecord.elementLabel,
    removedKind: removedRecord.kind,
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

  activeModeByTab.set(tabId, mode);
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

  activeModeByTab.delete(tabId);
  return ok({ tabId });
}

async function captureElement(
  selection: SelectionRect,
  sender: MessageSender,
): Promise<ExtensionResponse<{ capture: ReturnType<typeof toSessionItemSummary> }>> {
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
      kind: 'capture',
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
    return ok({ capture: toSessionItemSummary(capture) });
  } catch (error) {
    return fail(normalizeError(error));
  }
}

async function saveMeasuredTextFragment(
  fragment: TextFragmentDraft,
): Promise<ExtensionResponse<{ fragment: ReturnType<typeof toSessionItemSummary> }>> {
  try {
    const record: TextFragmentRecord = {
      ...fragment,
      id: crypto.randomUUID(),
      capturedAt: new Date().toISOString(),
      kind: 'text-fragment',
    };

    await saveTextFragment(record);
    return ok({ fragment: toSessionItemSummary(record) });
  } catch (error) {
    return fail(normalizeError(error));
  }
}

async function exportSession(): Promise<
  ExtensionResponse<{ count: number; filename: string; downloadId: number | undefined }>
> {
  const records = await getSessionRecords();
  if (records.length === 0) {
    return fail('There are no session items to export yet.');
  }

  try {
    const zip = new JSZip();
    const captures = records.filter(isCaptureRecord);
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
    const imageFileMap = new Map(
      exportFiles.map(({ capture, imageFile }) => [capture.id, imageFile]),
    );
    const items = records.map((record) => {
      if (record.kind === 'capture') {
        const { imageBlob, ...captureMetadata } = record;

        return {
          ...captureMetadata,
          imageFile: imageFileMap.get(record.id),
        };
      }

      return record;
    });

    const manifest = {
      version: 1,
      generatedAt: new Date().toISOString(),
      llmGuide: buildLlmGuide(),
      items,
    };

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('LLM_GUIDE.md', buildLlmGuideMarkdown());
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

    return ok({ count: records.length, filename, downloadId });
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

function buildLlmGuide() {
  return {
    purpose:
      'This export package describes visual UI elements and measured text fragments so an LLM can recreate, animate, or augment the captured screen in tools like Remotion.',
    recommendedPrompt:
      'Treat each item as measured UI data from a real screen. Preserve absolute geometry first, then preserve typography and color. For `capture` items, use the screenshot asset as the visual source and position it using page coordinates. For `text-fragment` items, render the fragment text separately using the exported font and color properties, and place it using `pageX`, `pageY`, `width`, `height`, plus `fragmentRects` if you need per-line or per-character animation scaffolding. When the captured screen contains a prefix like `R$` that stays visible in the screenshot, animate only the exported fragment text rather than replacing the whole text node.',
    coordinateSystem: {
      page:
        '`pageX` and `pageY` are document coordinates measured from the top-left of the full page, not the viewport.',
      viewport:
        '`viewportX` and `viewportY` are measured in the visible browser viewport at capture time.',
      pageSize:
        '`documentWidth` and `documentHeight` describe the full page size so coordinates can be normalized or mapped into a video composition.',
    },
    fieldReference: {
      kind:
        '`capture` means an exported JPEG asset. `text-fragment` means a measured substring with no image asset.',
      elementLabel:
        'A short human-readable label derived from id, classes, or text. Useful as a hint, not as a stable selector.',
      widthHeight:
        '`width` and `height` describe the measured box of the item itself, not the full page.',
      fragmentRects:
        'For `text-fragment`, `fragmentRects` lists one rect per rendered line box. Use this when a fragment wraps onto multiple lines.',
      typography:
        '`fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `lineHeight`, `letterSpacing`, `color`, `textAlign`, `textTransform`, and `textDecoration` describe how the fragment looked on screen.',
      imageFile:
        'For `capture` items only, `imageFile` points to the JPEG inside the ZIP.',
    },
    usageTips: [
      'If you need percentage-based placement, divide `pageX` by `documentWidth` and `pageY` by `documentHeight`.',
      'If a text fragment contains only the changing numeric portion of a label, keep the static prefix in the base screenshot and animate only the fragment.',
      'Prefer exported typography over guessed styles when rebuilding text in Remotion.',
    ],
  };
}

function buildLlmGuideMarkdown(): string {
  return `# LLM Guide

Use this package as measured UI data from a real screen.

## How to read the export

- \`items\` contains every exported session item.
- \`kind: "capture"\` means the item has a matching JPEG asset referenced by \`imageFile\`.
- \`kind: "text-fragment"\` means the item is measured text metadata with no image asset.

## Coordinate model

- \`pageX\` and \`pageY\` are absolute page coordinates from the top-left of the full document.
- \`viewportX\` and \`viewportY\` are coordinates inside the visible browser viewport at capture time.
- \`documentWidth\` and \`documentHeight\` are the full page dimensions. Use them to normalize positions for video compositions.
- \`width\` and \`height\` are the item's own measured box, not the page size.

## Capture items

- Use \`imageFile\` as the visual asset.
- Place the image using page coordinates first.
- Keep the original page proportions using the exported document dimensions.

## Text fragment items

- \`fullText\` is the full text inside the clicked element.
- \`fragmentText\` is the exact substring the user wants to animate separately.
- \`fragmentStart\` and \`fragmentEnd\` are substring indices inside \`fullText\`.
- \`fragmentRects\` contains one rect per rendered line box.
- Typography props describe the on-screen appearance and should be used when rebuilding text in Remotion.

## Recommended LLM behavior

1. Recreate the base screen using capture items.
2. Render text-fragment items as separate text layers.
3. Keep static prefixes or surrounding UI in the screenshot layer when only the changing substring should animate.
4. Preserve typography and color before adding stylization.
`;
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
