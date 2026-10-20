import type { TrackedProduct } from "../integrations/products/types";
import { validateProductUrl } from "./url";

// Browser-local storage only. Data stays on this device and browser.
// It does not sync across devices and is not a secure backup.
const KEY = "priceshield.products.v1";
const FREQUENCIES = ["daily", "weekly", "monthly"];
const STRING_FIELDS = [
  "id", "name", "url", "currency", "targetMinor", "savedMinor",
  "contributionMinor", "deliveryMinor", "otherMinor", "targetDate", "createdAt",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isTrackedProduct(v: any): v is TrackedProduct {
  if (!v || typeof v !== "object") return false;
  if (!STRING_FIELDS.every((k) => typeof v[k] === "string")) return false;
  if (!FREQUENCIES.includes(v.frequency)) return false;
  if (!validateProductUrl(v.url).ok) return false;
  return (
    Array.isArray(v.history) &&
    v.history.length > 0 &&
    v.history.every(
      (h: { minor?: unknown; currency?: unknown; at?: unknown }) =>
        typeof h?.minor === "string" && typeof h?.currency === "string" && typeof h?.at === "string",
    )
  );
}

/** Returns valid products only. Corrupted entries are dropped instead of crashing the app. */
export function loadProducts(): TrackedProduct[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isTrackedProduct) : [];
  } catch {
    return [];
  }
}

export function saveProducts(products: TrackedProduct[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(products));
    return true;
  } catch {
    return false;
  }
}
