export function isScriptableUrl(url?: string | null): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getUnsupportedTabMessage(url?: string | null): string {
  if (!url) {
    return 'This tab cannot be inspected. Open an HTTP or HTTPS page and try again.';
  }

  return `This extension only supports normal HTTP and HTTPS pages in v1. The current tab is ${url}.`;
}
