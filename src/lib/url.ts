// Product links are untrusted input. Only public https:// links are accepted.
// javascript:, data:, http:, and private or local hosts are rejected.

export type UrlCheck = { ok: true; url: string } | { ok: false; error: string };

const PRIVATE_HOST =
  /^(localhost|.*\.local|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3}|0\.0\.0\.0|\[.*\])$/i;

export function validateProductUrl(raw: string): UrlCheck {
  const text = raw.trim();
  if (!text) return { ok: false, error: "Paste a link to the product." };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, error: "That is not a valid web address." };
  }
  if (url.protocol !== "https:") {
    return { ok: false, error: "Only https:// product links are supported." };
  }
  if (url.username || url.password) {
    return { ok: false, error: "Links containing login details are not accepted." };
  }
  if (PRIVATE_HOST.test(url.hostname)) {
    return { ok: false, error: "That address is not a public website." };
  }
  return { ok: true, url: url.toString() };
}
