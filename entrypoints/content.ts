import type {
  ExtensionMessage,
  ExtensionResponse,
  SelectionMode,
  SelectionRect,
} from '@/lib/protocol';
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
interface TextFragmentDialogResult {
  fragmentText: string | null;
}
const BLUR_FILTER_VALUE = 'blur(8px)';

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
  let selectionMode: SelectionMode = 'capture';
  let mounted = false;
  let capturing = false;
  let hoveredChain: Element[] = [];
  let selectedIndex = 0;
  let overlay: HTMLDivElement | null = null;
  let overlayLabel: HTMLDivElement | null = null;
  let toast: HTMLDivElement | null = null;
  let captureStyle: HTMLStyleElement | null = null;
  let modalStyle: HTMLStyleElement | null = null;
  let lastPointer: { x: number; y: number } | null = null;
  const hiddenActionHistory: Array<{
    actionId: string;
    source: 'capture' | 'hide' | 'blur';
    label: string;
    element: HideableElement;
    previousVisibility: string;
    previousPriority: string;
    previousFilter: string;
    previousFilterPriority: string;
  }> = [];

  const onMessage = async (message: unknown): Promise<ExtensionResponse<{ active: boolean }> | undefined> => {
    if (!isSelectorControlMessage(message)) {
      return undefined;
    }

    switch (message.type) {
      case 'START_SELECTION':
        activate(message.mode);
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

  function activate(mode: SelectionMode) {
    active = true;
    selectionMode = mode;
    capturing = false;
    ensureUi();
    showToast(getSelectionModeMessage(mode));
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
    capturing = true;
    hideOverlay();
    hideToast();
    let shouldRecomputeSelection = false;

    try {
      if (selectionMode === 'hide') {
        const hidden = applyLocalStyleAction(
          element,
          crypto.randomUUID(),
          'hide',
          getElementLabel(element),
        );
        if (!hidden) {
          showToast('This element cannot be hidden safely.', 'error');
          return;
        }

        shouldRecomputeSelection = true;
        showToast(`Hidden ${getElementLabel(element)}.`, 'success');
      } else if (selectionMode === 'blur') {
        const blurred = applyLocalStyleAction(
          element,
          crypto.randomUUID(),
          'blur',
          getElementLabel(element),
        );
        if (!blurred) {
          showToast('This element cannot be blurred safely.', 'error');
          return;
        }

        shouldRecomputeSelection = true;
        showToast(`Blurred ${getElementLabel(element)}.`, 'success');
      } else if (selectionMode === 'text') {
        const measuredFragment = await measureTextFragment(element);
        if (!measuredFragment) {
          return;
        }

        const response = (await browser.runtime.sendMessage({
          type: 'SAVE_TEXT_FRAGMENT',
          fragment: measuredFragment,
        } satisfies ExtensionMessage)) as ExtensionResponse<{
          fragment: { fragmentText: string };
        }>;

        if (!response?.ok) {
          showToast(response?.error ?? 'Text fragment save failed.', 'error');
          return;
        }

        showToast(`Saved text fragment ${response.data.fragment.fragmentText}.`, 'success');
      } else {
        const validationError = validateSelection(selection);
        if (validationError) {
          showToast(validationError, 'error');
          return;
        }

        const suppressHoverState = await getSuppressHoverStateSetting();
        if (suppressHoverState) {
          setCaptureFreeze(true);
        }

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
          applyLocalStyleAction(
            element,
            response.data.capture.id,
            'capture',
            response.data.capture.elementLabel,
          );
          shouldRecomputeSelection = true;
        }

        showToast(`Captured ${response.data.capture.elementLabel}.`, 'success');
      }
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
    const latestHiddenAction = hiddenActionHistory[hiddenActionHistory.length - 1];
    if (
      latestHiddenAction?.source === 'hide' ||
      latestHiddenAction?.source === 'blur'
    ) {
      restoreHiddenAction(latestHiddenAction.actionId);

      if (lastPointer) {
        updateSelectionFromPoint(lastPointer.x, lastPointer.y);
      } else {
        refreshOverlay();
      }

      showToast(`Restored ${latestHiddenAction.label}.`, 'success');
      return;
    }

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

      restoreHiddenAction(response.data.removedId);

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

  function applyLocalStyleAction(
    element: Element,
    actionId: string,
    source: 'capture' | 'hide' | 'blur',
    label: string,
  ) {
    const hideableElement = toHideableElement(element);
    if (!hideableElement) {
      return false;
    }

    hiddenActionHistory.push({
      actionId,
      source,
      label,
      element: hideableElement,
      previousVisibility: hideableElement.style.getPropertyValue('visibility'),
      previousPriority: hideableElement.style.getPropertyPriority('visibility'),
      previousFilter: hideableElement.style.getPropertyValue('filter'),
      previousFilterPriority: hideableElement.style.getPropertyPriority('filter'),
    });

    if (source === 'blur') {
      hideableElement.style.setProperty('filter', BLUR_FILTER_VALUE, 'important');
    } else {
      hideableElement.style.setProperty('visibility', 'hidden', 'important');
    }

    return true;
  }

  function restoreHiddenAction(actionId: string) {
    for (let index = hiddenActionHistory.length - 1; index >= 0; index -= 1) {
      const entry = hiddenActionHistory[index];
      if (entry.actionId !== actionId) {
        continue;
      }

      hiddenActionHistory.splice(index, 1);
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

      if (entry.previousFilter) {
        entry.element.style.setProperty(
          'filter',
          entry.previousFilter,
          entry.previousFilterPriority,
        );
      } else {
        entry.element.style.removeProperty('filter');
      }

      return;
    }
  }

  async function measureTextFragment(element: Element) {
    const segments = collectTextSegments(element);
    if (segments.length === 0) {
      showToast('No selectable text was found in this element.', 'error');
      return null;
    }

    const fullText = segments.map((segment) => segment.text).join('');
    const defaultFragment = getPreferredTextFragment(fullText);
    const dialogResult = await openTextFragmentDialog({
      fullText,
      defaultFragment,
    });

    if (dialogResult.fragmentText == null) {
      showToast('Text fragment capture cancelled.', 'info');
      return null;
    }

    const fragmentText = dialogResult.fragmentText.trim();
    if (!fragmentText) {
      showToast('Enter a non-empty text fragment.', 'error');
      return null;
    }

    const fragmentStart = fullText.indexOf(fragmentText);
    if (fragmentStart === -1) {
      showToast('That exact fragment was not found in the clicked element.', 'error');
      return null;
    }

    const fragmentEnd = fragmentStart + fragmentText.length;
    const range = createTextRangeFromIndices(segments, fragmentStart, fragmentEnd);
    const rect = range.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      showToast('The selected text fragment has no measurable size.', 'error');
      return null;
    }

    const styleSource = getTextStyleSource(range, element);
    const styles = getComputedStyle(styleSource);
    const pageMetrics = getPageMetrics();
    const fragmentRects = Array.from(range.getClientRects()).map((clientRect) => ({
      viewportX: clientRect.left,
      viewportY: clientRect.top,
      pageX: clientRect.left + window.scrollX,
      pageY: clientRect.top + window.scrollY,
      width: clientRect.width,
      height: clientRect.height,
    }));

    return {
      kind: 'text-fragment' as const,
      pageUrl: window.location.href,
      pageTitle: document.title,
      tagName: element.tagName.toLowerCase(),
      elementLabel: getElementLabel(element),
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
      fullText,
      fragmentText,
      fragmentStart,
      fragmentEnd,
      fragmentRects,
      fontFamily: styles.fontFamily,
      fontSize: styles.fontSize,
      fontWeight: styles.fontWeight,
      fontStyle: styles.fontStyle,
      lineHeight: styles.lineHeight,
      letterSpacing: styles.letterSpacing,
      color: styles.color,
      textAlign: styles.textAlign,
      textTransform: styles.textTransform,
      textDecoration: styles.textDecoration,
    };
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

  async function openTextFragmentDialog({
    fullText,
    defaultFragment,
  }: {
    fullText: string;
    defaultFragment: string;
  }): Promise<TextFragmentDialogResult> {
    ensureModalStyle();

    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.id = '__motion-element-capture-text-modal';
      Object.assign(backdrop.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483647',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(2, 6, 23, 0.6)',
        backdropFilter: 'blur(8px)',
      });

      const modal = document.createElement('div');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      Object.assign(modal.style, {
        width: 'min(520px, 100%)',
        maxHeight: 'min(80vh, 720px)',
        overflow: 'auto',
        borderRadius: '18px',
        background: '#0f172a',
        color: '#e2e8f0',
        border: '1px solid rgba(148, 163, 184, 0.22)',
        boxShadow: '0 30px 80px rgba(2, 6, 23, 0.45)',
        fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
      });

      modal.innerHTML = `
        <div class="motion-text-modal__header">
          <div>
            <p class="motion-text-modal__eyebrow">Text Fragment</p>
            <h2 class="motion-text-modal__title">Measure the exact text you want to animate</h2>
          </div>
          <button class="motion-text-modal__close" type="button" data-role="cancel" aria-label="Close">×</button>
        </div>
        <div class="motion-text-modal__body">
          <label class="motion-text-modal__field">
            <span class="motion-text-modal__label">Detected full text</span>
            <textarea class="motion-text-modal__textarea" data-role="full-text" readonly></textarea>
          </label>
          <label class="motion-text-modal__field">
            <span class="motion-text-modal__label">Fragment to export</span>
            <input class="motion-text-modal__input" data-role="fragment-input" type="text" />
            <span class="motion-text-modal__hint">Use the exact visible substring, for example <code>2.144,57</code>.</span>
          </label>
          <details class="motion-text-modal__help" open>
            <summary>Help</summary>
            <div class="motion-text-modal__help-copy">
              <p><strong>Detected full text</strong> is the raw text found inside the element you clicked. It helps you confirm the fragment exists.</p>
              <p><strong>Fragment to export</strong> should be only the characters you want to animate in Remotion. If you want to keep <code>R$</code> on the screenshot, enter only the numeric part.</p>
              <p><strong>What gets saved</strong>: exact fragment bounds, per-line rects, page coordinates, and typography styles such as font family, size, weight, line height, letter spacing, and color.</p>
            </div>
          </details>
        </div>
        <div class="motion-text-modal__footer">
          <button class="motion-text-modal__button motion-text-modal__button--secondary" type="button" data-role="cancel">Cancel</button>
          <button class="motion-text-modal__button motion-text-modal__button--primary" type="button" data-role="save">Save fragment</button>
        </div>
      `;

      const fullTextArea = modal.querySelector<HTMLTextAreaElement>('[data-role="full-text"]');
      const fragmentInput = modal.querySelector<HTMLInputElement>('[data-role="fragment-input"]');
      const saveButton = modal.querySelector<HTMLButtonElement>('[data-role="save"]');
      const cancelButtons = modal.querySelectorAll<HTMLElement>('[data-role="cancel"]');

      if (!fullTextArea || !fragmentInput || !saveButton) {
        resolve({ fragmentText: null });
        return;
      }

      fullTextArea.value = fullText;
      fragmentInput.value = defaultFragment;

      const cleanup = () => {
        backdrop.remove();
        document.removeEventListener('keydown', onKeyDown, true);
      };

      const finish = (fragmentText: string | null) => {
        cleanup();
        resolve({ fragmentText });
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          finish(null);
        }
      };

      saveButton.addEventListener('click', () => finish(fragmentInput.value));
      for (const button of cancelButtons) {
        button.addEventListener('click', () => finish(null));
      }
      backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) {
          finish(null);
        }
      });

      document.addEventListener('keydown', onKeyDown, true);
      backdrop.append(modal);
      document.documentElement.append(backdrop);
      fragmentInput.focus();
      fragmentInput.select();
    });
  }

  function ensureModalStyle() {
    if (modalStyle) {
      return;
    }

    modalStyle = document.createElement('style');
    modalStyle.id = '__motion-element-capture-modal-style';
    modalStyle.textContent = `
      #__motion-element-capture-text-modal .motion-text-modal__header,
      #__motion-element-capture-text-modal .motion-text-modal__footer,
      #__motion-element-capture-text-modal .motion-text-modal__body {
        padding: 18px 20px;
      }

      #__motion-element-capture-text-modal .motion-text-modal__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.18);
      }

      #__motion-element-capture-text-modal .motion-text-modal__eyebrow {
        margin: 0 0 4px;
        color: #86efac;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      #__motion-element-capture-text-modal .motion-text-modal__title {
        margin: 0;
        font-size: 20px;
        line-height: 1.15;
      }

      #__motion-element-capture-text-modal .motion-text-modal__close {
        border: 0;
        background: transparent;
        color: #94a3b8;
        font-size: 28px;
        line-height: 1;
        cursor: pointer;
      }

      #__motion-element-capture-text-modal .motion-text-modal__body {
        display: grid;
        gap: 16px;
      }

      #__motion-element-capture-text-modal .motion-text-modal__field {
        display: grid;
        gap: 8px;
      }

      #__motion-element-capture-text-modal .motion-text-modal__label {
        font-size: 13px;
        font-weight: 700;
      }

      #__motion-element-capture-text-modal .motion-text-modal__textarea,
      #__motion-element-capture-text-modal .motion-text-modal__input {
        width: 100%;
        border-radius: 12px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        background: rgba(15, 23, 42, 0.75);
        color: #f8fafc;
        padding: 12px 14px;
        font: 500 14px/1.4 "IBM Plex Sans", "Segoe UI", sans-serif;
      }

      #__motion-element-capture-text-modal .motion-text-modal__textarea {
        min-height: 88px;
        resize: vertical;
      }

      #__motion-element-capture-text-modal .motion-text-modal__hint {
        color: #94a3b8;
        font-size: 12px;
      }

      #__motion-element-capture-text-modal .motion-text-modal__help {
        border-radius: 14px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        background: rgba(15, 23, 42, 0.55);
        padding: 12px 14px;
      }

      #__motion-element-capture-text-modal .motion-text-modal__help summary {
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
      }

      #__motion-element-capture-text-modal .motion-text-modal__help-copy {
        margin-top: 10px;
        display: grid;
        gap: 10px;
        color: #cbd5e1;
        font-size: 13px;
        line-height: 1.45;
      }

      #__motion-element-capture-text-modal .motion-text-modal__help-copy p {
        margin: 0;
      }

      #__motion-element-capture-text-modal .motion-text-modal__footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        border-top: 1px solid rgba(148, 163, 184, 0.18);
      }

      #__motion-element-capture-text-modal .motion-text-modal__button {
        border: 0;
        border-radius: 999px;
        padding: 10px 14px;
        font: 700 13px/1 "IBM Plex Sans", "Segoe UI", sans-serif;
        cursor: pointer;
      }

      #__motion-element-capture-text-modal .motion-text-modal__button--secondary {
        background: rgba(148, 163, 184, 0.12);
        color: #e2e8f0;
      }

      #__motion-element-capture-text-modal .motion-text-modal__button--primary {
        background: #22c55e;
        color: #052e16;
      }
    `;
    document.documentElement.append(modalStyle);
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

interface TextSegment {
  node: Text;
  text: string;
  start: number;
  end: number;
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

function collectTextSegments(element: Element): TextSegment[] {
  const segments: TextSegment[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let currentStart = 0;
  let node = walker.nextNode();

  while (node) {
    if (node instanceof Text) {
      const text = node.textContent ?? '';
      if (text.trim().length > 0) {
        segments.push({
          node,
          text,
          start: currentStart,
          end: currentStart + text.length,
        });
        currentStart += text.length;
      }
    }

    node = walker.nextNode();
  }

  return segments;
}

function getPreferredTextFragment(fullText: string): string {
  const numericMatch = fullText.match(/\d[\d.,]*/);
  if (numericMatch?.[0]) {
    return numericMatch[0];
  }

  return fullText.trim();
}

function createTextRangeFromIndices(
  segments: TextSegment[],
  start: number,
  end: number,
): Range {
  const range = document.createRange();
  const startPosition = resolveTextPosition(segments, start);
  const endPosition = resolveTextPosition(segments, end);

  range.setStart(startPosition.node, startPosition.offset);
  range.setEnd(endPosition.node, endPosition.offset);

  return range;
}

function resolveTextPosition(segments: TextSegment[], index: number) {
  for (const segment of segments) {
    if (index <= segment.end) {
      return {
        node: segment.node,
        offset: clamp(index - segment.start, 0, segment.text.length),
      };
    }
  }

  const lastSegment = segments[segments.length - 1];
  return {
    node: lastSegment.node,
    offset: lastSegment.text.length,
  };
}

function getTextStyleSource(range: Range, fallback: Element): Element {
  if (range.startContainer instanceof Element) {
    return range.startContainer;
  }

  return range.startContainer.parentElement ?? fallback;
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
): message is { type: 'START_SELECTION'; mode: SelectionMode } | { type: 'STOP_SELECTION' } {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    ((message.type === 'START_SELECTION' &&
      'mode' in message &&
      (message.mode === 'capture' ||
        message.mode === 'hide' ||
        message.mode === 'blur' ||
        message.mode === 'text')) ||
      message.type === 'STOP_SELECTION')
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

function getSelectionModeMessage(mode: SelectionMode): string {
  if (mode === 'hide') {
    return 'Hide mode is active. Hover, click to hide, use [ and ] to change depth, Cmd/Ctrl+Z to undo, Esc to stop.';
  }

  if (mode === 'blur') {
    return 'Blur mode is active. Hover, click to blur, use [ and ] to change depth, Cmd/Ctrl+Z to undo, Esc to stop.';
  }

  if (mode === 'text') {
    return 'Text mode is active. Hover a text element, click it, enter the exact fragment to measure, then export the saved text metadata for Remotion.';
  }

  return 'Selection mode is active. Hover, click to capture, use [ and ] to change depth, Cmd/Ctrl+Z to undo, Esc to stop.';
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
