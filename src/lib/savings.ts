import type { TrackedProduct } from "../integrations/products/types";
import { latestObservation } from "./priceHistory";

/** Locks the product's current recorded price as the savings target. Never changes on its own. */
export function lockPrice(p: TrackedProduct, at: string): TrackedProduct {
  const latest = latestObservation(p);
  return {
    ...p,
    priceLock: { minor: latest.minor, currency: p.currency, createdAt: at },
    savingsTarget: "locked",
  };
}

/** Removes the lock and makes the savings plan follow the live recorded price again. */
export function unlockPrice(p: TrackedProduct): TrackedProduct {
  return { ...p, priceLock: undefined, savingsTarget: "live" };
}
