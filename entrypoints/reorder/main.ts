import './style.css';

import type { CaptureRecord, SessionRecord, TextFragmentRecord } from '@/lib/protocol';
import { isCaptureRecord } from '@/lib/protocol';
import { getSessionRecords, updateSessionRecordOrder } from '@/lib/session-db';

interface ReorderViewItem {
  record: SessionRecord;
  previewUrl?: string;
}

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Reorder app root not found.');
}

app.innerHTML = `
  <main class="shell">
    <header class="header">
      <div>
        <p class="eyebrow">Session Order</p>
        <h1>Reorder animation flow</h1>
        <p class="subhead">Drag items, use the move buttons, or open a capture in a new tab. Changes save immediately and affect export order plus screenshot numbering.</p>
      </div>
      <div class="header-actions">
        <button class="ghost-btn" id="refresh-session" type="button">Refresh</button>
      </div>
    </header>
    <section class="status-bar">
      <p id="status-message">Loading session…</p>
    </section>
    <section class="list-shell">
      <ul class="reorder-list" id="reorder-list"></ul>
      <p class="empty-state" id="empty-state" hidden>No items in the current session.</p>
    </section>
  </main>
`;

const reorderList = requiredElement<HTMLUListElement>('reorder-list');
const emptyState = requiredElement<HTMLParagraphElement>('empty-state');
const statusMessage = requiredElement<HTMLParagraphElement>('status-message');
const refreshButton = requiredElement<HTMLButtonElement>('refresh-session');

let items: ReorderViewItem[] = [];
let draggedId: string | null = null;

refreshButton.addEventListener('click', () => {
  void loadSession('Session refreshed.');
});

window.addEventListener('beforeunload', () => {
  for (const item of items) {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
  }
});

void loadSession();

async function loadSession(successMessage?: string) {
  setStatus('Loading session…');
  const records = await getSessionRecords();
  revokePreviewUrls();
  items = records.map((record) => ({
    record,
    previewUrl: isCaptureRecord(record) ? URL.createObjectURL(record.imageBlob) : undefined,
  }));
  render();
  setStatus(successMessage ?? `Loaded ${items.length} item${items.length === 1 ? '' : 's'}.`);
}

function render() {
  reorderList.innerHTML = '';
  emptyState.hidden = items.length !== 0;

  if (items.length === 0) {
    return;
  }

  items.forEach((item, index) => {
    reorderList.append(renderItem(item, index));
  });
}

function renderItem(item: ReorderViewItem, index: number): HTMLLIElement {
  const row = document.createElement('li');
  row.className = 'reorder-item';
  row.draggable = true;
  row.dataset.id = item.record.id;

  row.addEventListener('dragstart', () => {
    draggedId = item.record.id;
    row.classList.add('reorder-item--dragging');
  });

  row.addEventListener('dragend', () => {
    draggedId = null;
    row.classList.remove('reorder-item--dragging');
  });

  row.addEventListener('dragover', (event) => {
    event.preventDefault();
    row.classList.add('reorder-item--drop-target');
  });

  row.addEventListener('dragleave', () => {
    row.classList.remove('reorder-item--drop-target');
  });

  row.addEventListener('drop', (event) => {
    event.preventDefault();
    row.classList.remove('reorder-item--drop-target');
    if (!draggedId || draggedId === item.record.id) {
      return;
    }

    void reorderById(draggedId, item.record.id);
  });

  const preview = isCaptureRecord(item.record)
    ? renderCapturePreview(item.record, item.previewUrl)
    : renderTextPreview(item.record);

  row.innerHTML = `
    <div class="reorder-rank">${String(index + 1).padStart(3, '0')}</div>
    <div class="reorder-body">
      <div class="reorder-meta">
        <div>
          <p class="reorder-kind">${item.record.kind === 'capture' ? 'capture' : 'text fragment'}</p>
          <h2 class="reorder-title">${escapeHtml(item.record.elementLabel)}</h2>
          <p class="reorder-subtitle">${escapeHtml(item.record.pageTitle || item.record.pageUrl)}</p>
        </div>
        <div class="reorder-controls">
          <button class="icon-btn" data-action="up" type="button" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button class="icon-btn" data-action="down" type="button" ${index === items.length - 1 ? 'disabled' : ''}>↓</button>
          ${
            isCaptureRecord(item.record)
              ? '<button class="ghost-btn ghost-btn--small" data-action="open" type="button">Open image</button>'
              : ''
          }
        </div>
      </div>
    </div>
  `;

  const body = row.querySelector<HTMLDivElement>('.reorder-body');
  if (body) {
    body.prepend(preview);
  }

  row.querySelector('[data-action="up"]')?.addEventListener('click', () => {
    void moveItem(index, index - 1);
  });
  row.querySelector('[data-action="down"]')?.addEventListener('click', () => {
    void moveItem(index, index + 1);
  });
  row.querySelector('[data-action="open"]')?.addEventListener('click', () => {
    if (item.previewUrl) {
      window.open(item.previewUrl, '_blank', 'noopener,noreferrer');
    }
  });

  return row;
}

function renderCapturePreview(record: CaptureRecord, previewUrl?: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'preview preview--image';
  wrapper.innerHTML = `
    <img alt="${escapeHtml(record.elementLabel)}" />
    <p class="preview-meta">${Math.round(record.width)}×${Math.round(record.height)} · @${Math.round(record.pageX)},${Math.round(record.pageY)}</p>
  `;

  const image = wrapper.querySelector<HTMLImageElement>('img');
  if (image && previewUrl) {
    image.src = previewUrl;
  }

  return wrapper;
}

function renderTextPreview(record: TextFragmentRecord): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'preview preview--text';
  wrapper.innerHTML = `
    <div class="preview-text-fragment">${escapeHtml(record.fragmentText)}</div>
    <p class="preview-meta">${escapeHtml(record.fontSize)} · ${escapeHtml(record.color)}</p>
  `;
  return wrapper;
}

async function moveItem(fromIndex: number, toIndex: number) {
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) {
    return;
  }

  const nextItems = items.slice();
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  await persistOrder(nextItems, `Moved item to position ${toIndex + 1}.`);
}

async function reorderById(sourceId: string, targetId: string) {
  const sourceIndex = items.findIndex((item) => item.record.id === sourceId);
  const targetIndex = items.findIndex((item) => item.record.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return;
  }

  const nextItems = items.slice();
  const [moved] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(targetIndex, 0, moved);
  await persistOrder(nextItems, `Moved item to position ${targetIndex + 1}.`);
}

async function persistOrder(nextItems: ReorderViewItem[], successMessage: string) {
  items = nextItems;
  render();
  await updateSessionRecordOrder(items.map((item) => item.record.id));
  setStatus(successMessage);
}

function revokePreviewUrls() {
  for (const item of items) {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
  }
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing reorder element #${id}`);
  }

  return element as T;
}

function setStatus(message: string) {
  statusMessage.textContent = message;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
