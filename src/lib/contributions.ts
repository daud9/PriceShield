import type { Contribution, TrackedProduct } from "../integrations/products/types";
import { tryParseMoney, type Money } from "./money";

export const NIM_CURRENCY = "NIM" as const;

// Nimiq user-friendly address: "NQ" + 2 check digits + 32 characters, usually written in groups of 4.
const NIM_ADDRESS = /^NQ\d{2}[0-9A-Z]{32}$/;

export function normalizeNimAddress(raw: string): string | null {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  return NIM_ADDRESS.test(compact) ? compact : null;
}

/** Parses an amount in NIM. The result's minor units are Luna. */
export function parseNimAmount(raw: string): Money | string {
  return tryParseMoney(raw, NIM_CURRENCY);
}

export function verifiedMinor(p: TrackedProduct): bigint {
  return (p.contributions ?? [])
    .filter((c) => c.status === "verified")
    .reduce((sum, c) => sum + BigInt(c.minor), 0n);
}

export function submittedMinor(p: TrackedProduct): bigint {
  return (p.contributions ?? [])
    .filter((c) => c.status === "submitted")
    .reduce((sum, c) => sum + BigInt(c.minor), 0n);
}

export function addContribution(p: TrackedProduct, c: Contribution): TrackedProduct {
  return { ...p, contributions: [...(p.contributions ?? []), c] };
}
