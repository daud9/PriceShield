import type { PriceObservation, PriceSource, TrackedProduct } from "../integrations/products/types";

export function latestObservation(p: TrackedProduct): PriceObservation {
  return p.history[p.history.length - 1];
}

/**
 * Adds a price observation only when the price differs from the latest one.
 * Currency is always the product's currency, so prices are never mixed.
 */
export function recordPrice(
  p: TrackedProduct,
  minor: bigint,
  at: string,
  source: PriceSource = "user_entered",
): { product: TrackedProduct; changed: boolean; previous: PriceObservation } {
  const previous = latestObservation(p);
  if (previous.minor === minor.toString()) {
    return { product: p, changed: false, previous };
  }
  const observation: PriceObservation = { minor: minor.toString(), currency: p.currency, at, source };
  return {
    product: { ...p, history: [...p.history, observation] },
    changed: true,
    previous,
  };
}
