import type { ExtensionMessage, ExtensionResponse, SelectionRect } from '@/lib/protocol';
import {
  getHideAfterCaptureSetting,
  getSuppressHoverStateSetting,
} from '@/lib/settings';

declare global {
  interface Window {
    __motionElementCaptureController__?: SelectorController;
  }
}

type SelectorController = ReturnType<typeof createSelectorController>;
type Tone = 'info' | 'success' | 'error';
type HideableElement = HTMLElement | SVGElement;

export default defineContentScript({
  registration: 'runtime',
  main() {
    const controller =
      window.__motionElementCaptureController__ ?? createSelectorController();

    window.__motionElementCaptureController__ = controller;
    controller.mount();
  },
});

function createSelectorController() {
  let active = false;
  let mounted = false;
  let capturing = false;
  let hoveredChain: Element[] = [];
  let selectedIndex = 0;
  let overlay: HTMLDivElement | null = null;
  let overlayLabel: HTMLDivElement | null = null;
  let toast: HTMLDivElement | null = null;
  let captureStyle: HTMLStyleElement | null = null;
  let lastPointer: { x: number; y: number } | null = null;
  const hiddenCaptureHistory: Array<{
    captureId: string;
    element: HideableElement;
    previousVisibility: string;
    previousPriority: string;
  }> = [];

  const onMessage = async (message: unknown): Promise<ExtensionResponse<{ active: boolean }> | undefined> => {
    if (!isSelectorControlMessage(message)) {
      return undefined;
    }

    switch (message.type) {
      case 'START_SELECTION':
        activate();
        return { ok: true, data: { active: true } };
      case 'STOP_SELECTION':
        deactivate();
        return { ok: true, data: { active: false } };
      default:
        return undefined;
    }
  };

  function mount() {
    if (mounted) {
      return;
    }

    ensureUi();
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', refreshOverlay, true);
    window.addEventListener('resize', refreshOverlay, true);
    browser.runtime.onMessage.addListener(onMessage);
    mounted = true;
  }

  function activate() {
    active = true;
    capturing = false;
    ensureUi();
    showToast('Selection mode is active. Hover, click to capture, use [ and ] to change depth, Cmd/Ctrl+Z to undo, Esc to stop.');
    if (lastPointer) {
      updateSelectionFromPoint(lastPointer.x, lastPointer.y);
      refreshOverlay();
    } else {
      hideOverlay();
    }
  }

  function deactivate() {
    active = false;
    capturing = false;
    hoveredChain = [];
    selectedIndex = 0;
    hideOverlay();
    hideToast();
  }

  function handleMouseMove(event: MouseEvent) {
    lastPointer = { x: event.clientX, y: event.clientY };
    if (!active || capturing) {
      return;
    }

    updateSelectionFromPoint(event.clientX, event.clientY);
  }

  function updateSelectionFromPoint(clientX: number, clientY: number) {
    const target = document.elementFromPoint(clientX, clientY);
    if (!(target instanceof Element) || isManagedNode(target)) {
      hideOverlay();
      return;
    }

    hoveredChain = buildAncestorChain(target);
    selectedIndex = 0;
    refreshOverlay();
  }

  async function handleClick(event: MouseEvent) {
    if (!active || capturing) {
      return;
    }

    const element = getSelectedElement();
    if (!element) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const selection = createSelectionRect(element);
    const validationError = validateSelection(selection);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    const suppressHoverState = await getSuppressHoverStateSetting();
    capturing = true;
    hideOverlay();
    hideToast();
    if (suppressHoverState) {
      setCaptureFreeze(true);
    }
    let shouldRecomputeSelection = false;

    try {
      await waitForPaint();
      const response = (await browser.runtime.sendMessage({
        type: 'CAPTURE_ELEMENT',
        selection,
      } satisfies ExtensionMessage)) as ExtensionResponse<{
        capture: { id: string; elementLabel: string };
      }>;

      if (!response?.ok) {
        showToast(response?.error ?? 'Capture failed.', 'error');
        return;
      }

      if (await getHideAfterCaptureSetting()) {
        hideCapturedElement(element, response.data.capture.id);
        shouldRecomputeSelection = true;
      }

      showToast(`Captured ${response.data.capture.elementLabel}.`, 'success');
    } catch (error) {
      showToast(normalizeError(error), 'error');
    } finally {
      setCaptureFreeze(false);
      capturing = false;
      if (shouldRecomputeSelection && lastPointer) {
        updateSelectionFromPoint(lastPointer.x, lastPointer.y);
      } else {
        refreshOverlay();
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!active || capturing) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      deactivate();
      return;
    }

    if (event.key === '[') {
      event.preventDefault();
      event.stopPropagation();
      selectParent();
      return;
    }

    if (isUndoShortcut(event)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void undoLastCapture();
      return;
    }

    if (event.key === ']') {
      event.preventDefault();
      event.stopPropagation();
      selectChild();
    }
  }

  function selectParent() {
    if (hoveredChain.length === 0) {
      return;
    }

    selectedIndex = Math.min(selectedIndex + 1, hoveredChain.length - 1);
    refreshOverlay();
  }

  function selectChild() {
    if (hoveredChain.length === 0) {
      return;
    }

    selectedIndex = Math.max(selectedIndex - 1, 0);
    refreshOverlay();
  }

  function refreshOverlay() {
    if (!active || capturing) {
      hideOverlay();
      return;
    }

    const element = getSelectedElement();
    if (!element || !element.isConnected) {
      hideOverlay();
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      hideOverlay();
      return;
    }

    ensureUi();
    if (!overlay || !overlayLabel) {
      return;
    }

    overlay.hidden = false;
    overlayLabel.hidden = false;
    overlay.style.left = `${rect.left}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    const label = `${element.tagName.toLowerCase()} · ${Math.round(rect.width)}×${Math.round(
      rect.height,
    )} · ${getElementLabel(element)}`;
    overlayLabel.textContent = label;

    const labelTop = rect.top > 36 ? rect.top - 32 : Math.min(rect.bottom + 8, window.innerHeight - 28);
    const labelLeft = clamp(rect.left, 8, Math.max(8, window.innerWidth - 240));
    overlayLabel.style.top = `${labelTop}px`;
    overlayLabel.style.left = `${labelLeft}px`;
  }

  function hideOverlay() {
    overlay?.setAttribute('hidden', 'true');
    overlayLabel?.setAttribute('hidden', 'true');
  }

  function hideToast() {
    toast?.setAttribute('hidden', 'true');
  }

  function showToast(message: string, tone: Tone = 'info') {
    ensureUi();
    if (!toast) {
      return;
    }

    toast.hidden = false;
    toast.textContent = message;
    toast.dataset.tone = tone;
  }

  function setCaptureFreeze(enabled: boolean) {
    ensureCaptureStyle();
    document.documentElement.toggleAttribute('data-motion-capture-freeze', enabled);
  }

  function ensureCaptureStyle() {
    if (captureStyle) {
      return;
    }

    captureStyle = document.createElement('style');
    captureStyle.id = '__motion-element-capture-freeze-style';
    captureStyle.textContent = `
      html[data-motion-capture-freeze] body,
      html[data-motion-capture-freeze] body * {
        pointer-events: none !important;
        transition: none !important;
        animation: none !important;
        caret-color: transparent !important;
      }
    `;
    document.documentElement.append(captureStyle);
  }

  async function undoLastCapture() {
    try {
      const response = (await browser.runtime.sendMessage({
        type: 'UNDO_LAST_CAPTURE',
      } satisfies ExtensionMessage)) as ExtensionResponse<{
        removedId: string;
        removedLabel: string;
        count: number;
      }>;

      if (!response?.ok) {
        showToast(response?.error ?? 'Undo failed.', 'error');
        return;
      }

      restoreHiddenCapture(response.data.removedId);

      if (lastPointer) {
        updateSelectionFromPoint(lastPointer.x, lastPointer.y);
      } else {
        refreshOverlay();
      }

      showToast(
        `Removed ${response.data.removedLabel}. ${response.data.count} capture${
          response.data.count === 1 ? '' : 's'
        } left.`,
        'success',
      );
    } catch (error) {
      showToast(normalizeError(error), 'error');
    }
  }

  function hideCapturedElement(element: Element, captureId: string) {
    const hideableElement = toHideableElement(element);
    if (!hideableElement) {
      return;
    }

    hiddenCaptureHistory.push({
      captureId,
      element: hideableElement,
      previousVisibility: hideableElement.style.getPropertyValue('visibility'),
      previousPriority: hideableElement.style.getPropertyPriority('visibility'),
    });
    hideableElement.style.setProperty('visibility', 'hidden', 'important');
  }

  function restoreHiddenCapture(captureId: string) {
    for (let index = hiddenCaptureHistory.length - 1; index >= 0; index -= 1) {
      const entry = hiddenCaptureHistory[index];
      if (entry.captureId !== captureId) {
        continue;
      }

      hiddenCaptureHistory.splice(index, 1);
      if (!entry.element.isConnected) {
        return;
      }

      if (entry.previousVisibility) {
        entry.element.style.setProperty(
          'visibility',
          entry.previousVisibility,
          entry.previousPriority,
        );
      } else {
        entry.element.style.removeProperty('visibility');
      }

      return;
    }
  }

  function ensureUi() {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = '__motion-element-capture-overlay';
      Object.assign(overlay.style, {
        position: 'fixed',
        zIndex: '2147483646',
        pointerEvents: 'none',
        border: '2px solid #0f172a',
        borderRadius: '10px',
        boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.12)',
        background: 'rgba(255, 255, 255, 0.1)',
        display: 'block',
      });
      overlay.hidden = true;
      document.documentElement.append(overlay);
    }

    if (!overlayLabel) {
      overlayLabel = document.createElement('div');
      overlayLabel.id = '__motion-element-capture-label';
      Object.assign(overlayLabel.style, {
        position: 'fixed',
        zIndex: '2147483647',
        pointerEvents: 'none',
        maxWidth: '240px',
        padding: '6px 10px',
        borderRadius: '999px',
        background: '#0f172a',
        color: '#f8fafc',
        font: '600 12px/1.2 "IBM Plex Sans", "Segoe UI", sans-serif',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.32)',
      });
      overlayLabel.hidden = true;
      document.documentElement.append(overlayLabel);
    }

    if (!toast) {
      toast = document.createElement('div');
      toast.id = '__motion-element-capture-toast';
      Object.assign(toast.style, {
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        zIndex: '2147483647',
        pointerEvents: 'none',
        maxWidth: '360px',
        padding: '10px 14px',
        borderRadius: '14px',
        background: 'rgba(15, 23, 42, 0.94)',
        color: '#f8fafc',
        font: '500 13px/1.35 "IBM Plex Sans", "Segoe UI", sans-serif',
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.35)',
      });
      toast.hidden = true;
      document.documentElement.append(toast);
    }
  }

  function getSelectedElement(): Element | null {
    return hoveredChain[selectedIndex] ?? null;
  }

  function isManagedNode(node: Element): boolean {
    return (
      node === overlay ||
      node === overlayLabel ||
      node === toast ||
      overlay?.contains(node) === true ||
      overlayLabel?.contains(node) === true ||
      toast?.contains(node) === true
    );
  }

  return { mount };
}

function buildAncestorChain(element: Element): Element[] {
  const chain: Element[] = [];
  let current: Element | null = element;

  while (current) {
    chain.push(current);
    current = current.parentElement;
  }

  return chain;
}

function createSelectionRect(element: Element): SelectionRect {
  const rect = element.getBoundingClientRect();
  const pageMetrics = getPageMetrics();

  return {
    tagName: element.tagName.toLowerCase(),
    elementLabel: getElementLabel(element),
    pageUrl: window.location.href,
    pageTitle: document.title,
    viewportX: rect.left,
    viewportY: rect.top,
    pageX: rect.left + window.scrollX,
    pageY: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    documentWidth: pageMetrics.documentWidth,
    documentHeight: pageMetrics.documentHeight,
    bodyWidth: pageMetrics.bodyWidth,
    bodyHeight: pageMetrics.bodyHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    devicePixelRatio: window.devicePixelRatio,
  };
}

function getPageMetrics() {
  const body = document.body;
  const root = document.documentElement;

  const bodyWidth = body
    ? Math.max(body.scrollWidth, body.offsetWidth, body.clientWidth)
    : root.clientWidth;
  const bodyHeight = body
    ? Math.max(body.scrollHeight, body.offsetHeight, body.clientHeight)
    : root.clientHeight;

  const documentWidth = Math.max(
    root.scrollWidth,
    root.offsetWidth,
    root.clientWidth,
    bodyWidth,
  );
  const documentHeight = Math.max(
    root.scrollHeight,
    root.offsetHeight,
    root.clientHeight,
    bodyHeight,
  );

  return {
    bodyWidth,
    bodyHeight,
    documentWidth,
    documentHeight,
  };
}

function getElementLabel(element: Element): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const classNames = Array.from(element.classList)
    .filter(Boolean)
    .slice(0, 2);
  if (classNames.length > 0) {
    return `.${classNames.join('.')}`;
  }

  const textSource =
    element instanceof HTMLElement
      ? element.innerText || element.textContent
      : element.textContent;
  const normalizedText = textSource?.replace(/\s+/g, ' ').trim();
  if (normalizedText) {
    return normalizedText.slice(0, 40);
  }

  return element.tagName.toLowerCase();
}

function validateSelection(selection: SelectionRect): string | null {
  if (selection.width <= 0 || selection.height <= 0) {
    return 'The selected element has no visible size.';
  }

  const fullyVisible =
    selection.viewportX >= 0 &&
    selection.viewportY >= 0 &&
    selection.viewportX + selection.width <= selection.viewportWidth &&
    selection.viewportY + selection.height <= selection.viewportHeight;

  if (!fullyVisible) {
    return 'Scroll until the highlighted element is fully visible, then capture again.';
  }

  return null;
}

function isSelectorControlMessage(
  message: unknown,
): message is Extract<ExtensionMessage, { type: 'START_SELECTION' | 'STOP_SELECTION' }> {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    (message.type === 'START_SELECTION' || message.type === 'STOP_SELECTION')
  );
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function isUndoShortcut(event: KeyboardEvent): boolean {
  return (
    event.key.toLowerCase() === 'z' &&
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey
  );
}

function toHideableElement(element: Element): HideableElement | null {
  if ('style' in element) {
    return element as HideableElement;
  }

  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected capture error occurred.';
}
