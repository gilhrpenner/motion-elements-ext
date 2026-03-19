export const HIDE_AFTER_CAPTURE_KEY = 'hideAfterCapture';
export const SUPPRESS_HOVER_STATE_KEY = 'suppressHoverState';

export async function getHideAfterCaptureSetting(): Promise<boolean> {
  const result = (await browser.storage.local.get(
    HIDE_AFTER_CAPTURE_KEY,
  )) as Record<string, unknown>;
  const value = result[HIDE_AFTER_CAPTURE_KEY];

  if (typeof value === 'boolean') {
    return value;
  }

  await browser.storage.local.set({ [HIDE_AFTER_CAPTURE_KEY]: true });
  return true;
}

export async function setHideAfterCaptureSetting(enabled: boolean): Promise<void> {
  await browser.storage.local.set({ [HIDE_AFTER_CAPTURE_KEY]: enabled });
}

export async function getSuppressHoverStateSetting(): Promise<boolean> {
  const result = (await browser.storage.local.get(
    SUPPRESS_HOVER_STATE_KEY,
  )) as Record<string, unknown>;
  const value = result[SUPPRESS_HOVER_STATE_KEY];

  if (typeof value === 'boolean') {
    return value;
  }

  await browser.storage.local.set({ [SUPPRESS_HOVER_STATE_KEY]: true });
  return true;
}

export async function setSuppressHoverStateSetting(enabled: boolean): Promise<void> {
  await browser.storage.local.set({ [SUPPRESS_HOVER_STATE_KEY]: enabled });
}
