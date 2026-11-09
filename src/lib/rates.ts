import { daysBetween } from "./engine";

// Rates are entered by the user. They are not live market data.
export interface ManualRate {
  rateMinor: string; // fiat minor units for 1 NIM, e.g. "12500" means 125.00 per NIM
  updatedAt: string; // YYYY-MM-DD, the date the user entered it
}

export type RateBook = Record<string, ManualRate>;

const KEY = "priceshield.rates.v1";
const STALE_DAYS = 7;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRate(v: unknown): v is ManualRate {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.rateMinor === "string" &&
    /^\d+$/.test(r.rateMinor) &&
    BigInt(r.rateMinor) > 0n &&
    typeof r.updatedAt === "string" &&
    DATE.test(r.updatedAt)
  );
}

export function loadRates(): RateBook {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const book: RateBook = {};
    for (const [cur, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isRate(value)) book[cur] = value;
    }
    return book;
  } catch {
    return {};
  }
}

export function saveRates(book: RateBook): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(book));
    return true;
  } catch {
    return false;
  }
}

export function isStale(updatedAt: string, today: string): boolean {
  return daysBetween(updatedAt, today) > STALE_DAYS;
}
