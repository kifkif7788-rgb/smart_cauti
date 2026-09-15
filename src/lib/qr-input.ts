/** Browser-safe QR parser. Plain bed codes use the authenticated manual-entry route. */
export function qrInputPath(raw: string): string | null {
  const value = raw.trim();
  const code = value.toUpperCase();
  if (/^[A-Z]{2}-B(?:0[1-9]|[1-9][0-9])$/.test(code)) {
    return `/assess/${code}`;
  }

  try {
    // Extract only a known local path, never navigate to the QR's external host.
    const url = value.startsWith('/') && !value.startsWith('//')
      ? new URL(value, 'https://qr.invalid')
      : new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!/^\/s\/[A-Z]{2}-B(?:0[1-9]|[1-9][0-9])$/.test(url.pathname)) return null;
    // Keep the signed entry path even when k is missing or invalid: the server rejects it.
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}
