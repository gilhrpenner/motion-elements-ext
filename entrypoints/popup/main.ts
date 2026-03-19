import './style.css';

import type {
  CaptureSummary,
  ExtensionMessage,
  ExtensionResponse,
  SessionSummary,
  TextFragmentSummary,
} from '@/lib/protocol';
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
    <header class="header">
      <div class="header-icon">&#9670;</div>
      <div class="header-text">
        <h1 class="header-title">Motion Capture</h1>
        <p class="header-sub" id="tab-status">checking tab…</p>
      </div>
      <div class="status-dot" id="status-dot"></div>
    </header>

    <div class="stats-bar">
      <div class="stat">
        <p class="stat-value" id="capture-count">0</p>
        <p class="stat-label">Items</p>
      </div>
      <div class="stat">
        <p class="stat-value" id="session-status">—</p>
        <p class="stat-label">Status</p>
      </div>
    </div>

    <section class="mode-section">
      <p class="mode-label">Select Mode</p>
      <div class="mode-grid">
        <button class="mode-btn" data-mode="capture" id="start-selection" type="button">
          <span class="mode-icon">&#9673;</span>
          Capture
        </button>
        <button class="mode-btn" data-mode="hide" id="hide-selection" type="button">
          <span class="mode-icon">&#9675;</span>
          Hide
        </button>
        <button class="mode-btn" data-mode="blur" id="blur-selection" type="button">
          <span class="mode-icon">&#9678;</span>
          Blur
        </button>
        <button class="mode-btn" data-mode="text" id="text-selection" type="button">
          <span class="mode-icon">T</span>
          Text
        </button>
      </div>
    </section>

    <div class="action-bar">
      <button class="action-btn action-btn--stop" id="stop-selection" type="button">Stop</button>
      <button class="action-btn action-btn--viewport" id="capture-viewport" type="button">Viewport</button>
      <button class="action-btn action-btn--export" id="export-session" type="button">Export</button>
      <button class="action-btn action-btn--clear" id="clear-session" type="button">Clear</button>
    </div>

    <div class="toggles">
      <label class="toggle-row" for="hide-after-capture">
        <span>
          <strong>Hide after capture</strong>
          <small>Preserve layout space, hide the element visually.</small>
        </span>
        <div class="toggle-switch">
          <input id="hide-after-capture" type="checkbox" />
          <span class="slider"></span>
        </div>
      </label>
      <label class="toggle-row" for="suppress-hover-state">
        <span>
          <strong>Suppress hover</strong>
          <small>Remove hover effects before screenshot.</small>
        </span>
        <div class="toggle-switch">
          <input id="suppress-hover-state" type="checkbox" />
          <span class="slider"></span>
        </div>
      </label>
    </div>

    <div class="status-bar">
      <p class="status-message" id="status-message">Ready.</p>
    </div>

    <section class="captures-section">
      <div class="captures-header">
        <h2>Session Items</h2>
        <span class="hint" id="captures-hint">local storage</span>
      </div>
      <ul class="capture-list" id="capture-list"></ul>
      <p class="empty-state" id="empty-state">No items yet — select a mode above to start.</p>
    </section>

    <div class="kb-hints">
      <span class="kb-hint"><kbd>[</kbd><kbd>]</kbd> depth</span>
      <span class="kb-hint"><kbd>&#8984;</kbd><kbd>Z</kbd> undo</span>
      <span class="kb-hint">click to act</span>
    </div>
  </main>
`;

const captureCount = requiredElement<HTMLParagraphElement>('capture-count');
const tabStatus = requiredElement<HTMLParagraphElement>('tab-status');
const statusDot = requiredElement<HTMLDivElement>('status-dot');
const sessionStatus = requiredElement<HTMLParagraphElement>('session-status');
const statusMessage = requiredElement<HTMLParagraphElement>('status-message');
const captureList = requiredElement<HTMLUListElement>('capture-list');
const emptyState = requiredElement<HTMLParagraphElement>('empty-state');
const startButton = requiredElement<HTMLButtonElement>('start-selection');
const hideButton = requiredElement<HTMLButtonElement>('hide-selection');
const blurButton = requiredElement<HTMLButtonElement>('blur-selection');
const textButton = requiredElement<HTMLButtonElement>('text-selection');
const stopButton = requiredElement<HTMLButtonElement>('stop-selection');
const viewportButton = requiredElement<HTMLButtonElement>('capture-viewport');
const exportButton = requiredElement<HTMLButtonElement>('export-session');
const clearButton = requiredElement<HTMLButtonElement>('clear-session');
const hideAfterCaptureToggle = requiredElement<HTMLInputElement>('hide-after-capture');
const suppressHoverStateToggle =
  requiredElement<HTMLInputElement>('suppress-hover-state');

let currentTabId: number | null = null;
let tabIsScriptable = false;
let currentSessionCount = 0;
let activeMode: 'capture' | 'hide' | 'blur' | 'text' | null = null;

const modeButtons = {
  capture: startButton,
  hide: hideButton,
  blur: blurButton,
  text: textButton,
};

function setActiveMode(mode: 'capture' | 'hide' | 'blur' | 'text' | null) {
  activeMode = mode;
  for (const [key, btn] of Object.entries(modeButtons)) {
    btn.classList.toggle('mode-btn--active', key === mode);
  }
  stopButton.classList.toggle('action-btn--live', mode !== null);
  syncActionAvailability();
}

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

    setActiveMode('capture');
    setStatus('Capture mode active.');
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

    setActiveMode('hide');
    setStatus('Hide mode active.');
  });
});

blurButton.addEventListener('click', async () => {
  const tabId = currentTabId;
  if (tabId == null) {
    setStatus('No active browser tab is available.', true);
    return;
  }

  await withBusy(async () => {
    const response = await sendMessage<{ tabId: number }>({
      type: 'START_SELECTION',
      tabId,
      mode: 'blur',
    });

    if (!response.ok) {
      setStatus(response.error, true);
      return;
    }

    setActiveMode('blur');
    setStatus('Blur mode active.');
  });
});

textButton.addEventListener('click', async () => {
  const tabId = currentTabId;
  if (tabId == null) {
    setStatus('No active browser tab is available.', true);
    return;
  }

  await withBusy(async () => {
    const response = await sendMessage<{ tabId: number }>({
      type: 'START_SELECTION',
      tabId,
      mode: 'text',
    });

    if (!response.ok) {
      setStatus(response.error, true);
      return;
    }

    setActiveMode('text');
    setStatus('Text mode active.');
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

    setActiveMode(null);
    setStatus('Stopped.');
  });
});

viewportButton.addEventListener('click', async () => {
  const tabId = currentTabId;
  if (tabId == null) {
    setStatus('No active browser tab is available.', true);
    return;
  }

  await withBusy(async () => {
    const response = await sendMessage<{ capture: { elementLabel: string } }>({
      type: 'CAPTURE_VIEWPORT',
      tabId,
    });

    if (!response.ok) {
      setStatus(response.error, true);
      return;
    }

    setStatus('Captured visible viewport.');
    await refreshSession();
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

    setStatus(`Exported ${response.data.count} item(s) to ${response.data.filename}.`);
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

    tabStatus.textContent = tabIsScriptable ? 'scriptable tab' : 'unsupported tab';
    statusDot.dataset.tone = tabIsScriptable ? 'ready' : 'error';

    if (!tabIsScriptable) {
      setStatus(getUnsupportedTabMessage(tab?.url), true);
    } else {
      setStatus('Ready.');
    }

    if (tabIsScriptable && currentTabId != null) {
      const modeResponse = await sendMessage<{
        mode: 'capture' | 'hide' | 'blur' | 'text' | null;
      }>({
        type: 'GET_ACTIVE_MODE',
        tabId: currentTabId,
      });
      if (modeResponse.ok && modeResponse.data.mode) {
        setActiveMode(modeResponse.data.mode);
      }
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
  captureCount.textContent = `${session.count}`;
  sessionStatus.textContent =
    session.count > 0
      ? `${session.captureCount}c / ${session.textFragmentCount}t`
      : '—';
  syncActionAvailability();
  captureList.innerHTML = '';

  if (session.items.length === 0) {
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

  for (const item of session.items) {
    captureList.append(
      item.kind === 'capture'
        ? renderCapture(item, timeFormatter)
        : renderTextFragment(item, timeFormatter),
    );
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
        <p class="capture-tag"><span class="capture-tag-name">&lt;${escapeHtml(capture.tagName.toLowerCase())}&gt;</span></p>
        <p class="capture-label">${escapeHtml(capture.elementLabel)}</p>
      </div>
      <span class="capture-time">${timeFormatter.format(new Date(capture.capturedAt))}</span>
    </div>
    <div class="capture-details">
      <p class="capture-meta">${Math.round(capture.width)}×${Math.round(capture.height)}</p>
      <p class="capture-meta">@${Math.round(capture.viewportX)},${Math.round(capture.viewportY)}</p>
    </div>
    <p class="capture-url">${escapeHtml(capture.pageTitle || capture.pageUrl)}</p>
  `;

  return item;
}

function renderTextFragment(
  fragment: TextFragmentSummary,
  timeFormatter: Intl.DateTimeFormat,
): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'capture-item';
  item.innerHTML = `
    <div class="capture-top">
      <div>
        <p class="capture-tag"><span class="capture-tag-name capture-tag-name--text">text</span></p>
        <p class="capture-label">${escapeHtml(fragment.fragmentText)}</p>
      </div>
      <span class="capture-time">${timeFormatter.format(new Date(fragment.capturedAt))}</span>
    </div>
    <div class="capture-details">
      <p class="capture-meta">${Math.round(fragment.width)}×${Math.round(fragment.height)}</p>
      <p class="capture-meta">@${Math.round(fragment.viewportX)},${Math.round(fragment.viewportY)}</p>
    </div>
    <p class="capture-url">${escapeHtml(fragment.fontSize)} · ${escapeHtml(fragment.color)}</p>
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
  blurButton.disabled = busy || !tabIsScriptable;
  textButton.disabled = busy || !tabIsScriptable;
  stopButton.disabled = busy || !tabIsScriptable || activeMode === null;
  viewportButton.disabled = busy || !tabIsScriptable;
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
