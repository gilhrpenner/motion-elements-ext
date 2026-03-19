import './style.css';

import type { CaptureSummary, ExtensionMessage, ExtensionResponse, SessionSummary } from '@/lib/protocol';
import {
  getHideAfterCaptureSetting,
  getSuppressHoverStateSetting,
  setHideAfterCaptureSetting,
  setSuppressHoverStateSetting,
} from '@/lib/settings';
import { getUnsupportedTabMessage, isScriptableUrl } from '@/lib/tab';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Popup root not found.');
}

app.innerHTML = `
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Motion Element Capture</p>
      <h1>Capture the exact UI fragments you want to animate.</h1>
      <p class="subhead">
        Start capture mode or hide mode, hover any visible element, press <kbd>[</kbd> or <kbd>]</kbd> to change depth, click to act, or use <kbd>⌘/Ctrl</kbd> + <kbd>Z</kbd> to undo the last hide or capture.
      </p>
      <div class="hero-row">
        <div>
          <p class="metric-label">Session</p>
          <p class="metric-value" id="capture-count">0 captures</p>
        </div>
        <div class="status-pill" id="tab-status">Checking tab…</div>
      </div>
    </section>

    <section class="panel">
      <div class="actions">
        <button class="primary" id="start-selection" type="button">Start Capture</button>
        <button class="secondary" id="hide-selection" type="button">Hide Element</button>
      </div>
      <div class="actions">
        <button class="secondary" id="stop-selection" type="button">Stop</button>
        <button class="secondary" id="export-session" type="button">Export ZIP</button>
      </div>
      <div class="actions">
        <button class="ghost" id="clear-session" type="button">Clear Session</button>
      </div>
      <label class="toggle-row" for="hide-after-capture">
        <span>
          <strong>Hide after capture</strong>
          <small>Keep the layout space but hide the captured element on the page.</small>
        </span>
        <input id="hide-after-capture" type="checkbox" />
      </label>
      <label class="toggle-row" for="suppress-hover-state">
        <span>
          <strong>Suppress hover state</strong>
          <small>Temporarily remove hover-driven effects before the screenshot is taken.</small>
        </span>
        <input id="suppress-hover-state" type="checkbox" />
      </label>
      <p class="status-message" id="status-message">Ready.</p>
    </section>

    <section class="panel">
      <div class="section-head">
        <h2>Captured Elements</h2>
        <span class="hint">Persisted locally until you clear or export them.</span>
      </div>
      <ul class="capture-list" id="capture-list"></ul>
      <p class="empty-state" id="empty-state">No captures yet. Start selection mode on your app, hover an element, and click it.</p>
    </section>
  </main>
`;

const captureCount = requiredElement<HTMLParagraphElement>('capture-count');
const tabStatus = requiredElement<HTMLDivElement>('tab-status');
const statusMessage = requiredElement<HTMLParagraphElement>('status-message');
const captureList = requiredElement<HTMLUListElement>('capture-list');
const emptyState = requiredElement<HTMLParagraphElement>('empty-state');
const startButton = requiredElement<HTMLButtonElement>('start-selection');
const hideButton = requiredElement<HTMLButtonElement>('hide-selection');
const stopButton = requiredElement<HTMLButtonElement>('stop-selection');
const exportButton = requiredElement<HTMLButtonElement>('export-session');
const clearButton = requiredElement<HTMLButtonElement>('clear-session');
const hideAfterCaptureToggle = requiredElement<HTMLInputElement>('hide-after-capture');
const suppressHoverStateToggle =
  requiredElement<HTMLInputElement>('suppress-hover-state');

let currentTabId: number | null = null;
let tabIsScriptable = false;
let currentSessionCount = 0;

startButton.addEventListener('click', async () => {
  const tabId = currentTabId;
  if (tabId == null) {
    setStatus('No active browser tab is available.', true);
    return;
  }

  await withBusy(async () => {
    const response = await sendMessage<{ tabId: number }>({
      type: 'START_SELECTION',
      tabId,
      mode: 'capture',
    });

    if (!response.ok) {
      setStatus(response.error, true);
      return;
    }

    setStatus('Selection mode started on the current page.');
  });
});

hideButton.addEventListener('click', async () => {
  const tabId = currentTabId;
  if (tabId == null) {
    setStatus('No active browser tab is available.', true);
    return;
  }

  await withBusy(async () => {
    const response = await sendMessage<{ tabId: number }>({
      type: 'START_SELECTION',
      tabId,
      mode: 'hide',
    });

    if (!response.ok) {
      setStatus(response.error, true);
      return;
    }

    setStatus('Hide mode started on the current page.');
  });
});

stopButton.addEventListener('click', async () => {
  const tabId = currentTabId;
  if (tabId == null) {
    setStatus('No active browser tab is available.', true);
    return;
  }

  await withBusy(async () => {
    const response = await sendMessage<{ tabId: number }>({
      type: 'STOP_SELECTION',
      tabId,
    });

    if (!response.ok) {
      setStatus(response.error, true);
      return;
    }

    setStatus('Selection mode stopped.');
  });
});

exportButton.addEventListener('click', async () => {
  await withBusy(async () => {
    const response = await sendMessage<{ count: number; filename: string }>({
      type: 'EXPORT_SESSION',
    });

    if (!response.ok) {
      setStatus(response.error, true);
      return;
    }

    setStatus(`Exported ${response.data.count} capture(s) to ${response.data.filename}.`);
    await refreshSession();
  });
});

clearButton.addEventListener('click', async () => {
  await withBusy(async () => {
    const response = await sendMessage<SessionSummary>({
      type: 'CLEAR_SESSION',
    });

    if (!response.ok) {
      setStatus(response.error, true);
      return;
    }

    renderSession(response.data);
    setStatus('Session cleared.');
  });
});

hideAfterCaptureToggle.addEventListener('change', async () => {
  try {
    await setHideAfterCaptureSetting(hideAfterCaptureToggle.checked);
    setStatus(
      hideAfterCaptureToggle.checked
        ? 'Hide after capture is enabled.'
        : 'Hide after capture is disabled.',
    );
  } catch (error) {
    hideAfterCaptureToggle.checked = !hideAfterCaptureToggle.checked;
    setStatus(normalizeError(error), true);
  }
});

suppressHoverStateToggle.addEventListener('change', async () => {
  try {
    await setSuppressHoverStateSetting(suppressHoverStateToggle.checked);
    setStatus(
      suppressHoverStateToggle.checked
        ? 'Hover suppression is enabled.'
        : 'Hover suppression is disabled.',
    );
  } catch (error) {
    suppressHoverStateToggle.checked = !suppressHoverStateToggle.checked;
    setStatus(normalizeError(error), true);
  }
});

void initialize();

async function initialize() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    currentTabId = tab?.id ?? null;
    tabIsScriptable = isScriptableUrl(tab?.url);
    hideAfterCaptureToggle.checked = await getHideAfterCaptureSetting();
    suppressHoverStateToggle.checked = await getSuppressHoverStateSetting();

    tabStatus.textContent = tabIsScriptable ? 'Scriptable tab' : 'Unsupported tab';
    tabStatus.dataset.tone = tabIsScriptable ? 'ready' : 'error';

    if (!tabIsScriptable) {
      setStatus(getUnsupportedTabMessage(tab?.url), true);
    } else {
      setStatus('Ready.');
    }

    syncActionAvailability();
    await refreshSession();
  } catch (error) {
    setStatus(normalizeError(error), true);
    syncActionAvailability();
  }
}

async function refreshSession() {
  const response = await sendMessage<SessionSummary>({ type: 'GET_SESSION' });
  if (!response.ok) {
    setStatus(response.error, true);
    return;
  }

  renderSession(response.data);
}

function renderSession(session: SessionSummary) {
  currentSessionCount = session.count;
  captureCount.textContent = `${session.count} capture${session.count === 1 ? '' : 's'}`;
  syncActionAvailability();
  captureList.innerHTML = '';

  if (session.captures.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  const timeFormatter = new Intl.DateTimeFormat([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    month: 'short',
    day: 'numeric',
  });

  for (const capture of session.captures) {
    captureList.append(renderCapture(capture, timeFormatter));
  }
}

function renderCapture(
  capture: CaptureSummary,
  timeFormatter: Intl.DateTimeFormat,
): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'capture-item';
  item.innerHTML = `
    <div class="capture-top">
      <div>
        <p class="capture-title">${escapeHtml(capture.tagName)}</p>
        <p class="capture-label">${escapeHtml(capture.elementLabel)}</p>
      </div>
      <span class="capture-time">${timeFormatter.format(new Date(capture.capturedAt))}</span>
    </div>
    <p class="capture-meta">${Math.round(capture.width)}×${Math.round(capture.height)} px</p>
    <p class="capture-meta">Page ${Math.round(capture.pageX)}, ${Math.round(capture.pageY)} · Viewport ${Math.round(capture.viewportX)}, ${Math.round(capture.viewportY)}</p>
    <p class="capture-meta capture-url">${escapeHtml(capture.pageTitle || capture.pageUrl)}</p>
  `;

  return item;
}

async function withBusy(work: () => Promise<void>) {
  setBusy(true);
  try {
    await work();
  } finally {
    setBusy(false);
  }
}

function setBusy(busy: boolean) {
  syncActionAvailability(busy);
}

function syncActionAvailability(busy = false) {
  startButton.disabled = busy || !tabIsScriptable;
  hideButton.disabled = busy || !tabIsScriptable;
  stopButton.disabled = busy || !tabIsScriptable;
  exportButton.disabled = busy || currentSessionCount === 0;
  clearButton.disabled = busy || currentSessionCount === 0;
}

function setStatus(message: string, isError = false) {
  statusMessage.textContent = message;
  statusMessage.dataset.tone = isError ? 'error' : 'info';
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing popup element #${id}`);
  }

  return element as T;
}

async function sendMessage<T>(message: ExtensionMessage): Promise<ExtensionResponse<T>> {
  return browser.runtime.sendMessage(message) as Promise<ExtensionResponse<T>>;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected popup error occurred.';
}
