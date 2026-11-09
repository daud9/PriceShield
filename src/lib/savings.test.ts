import { describe, expect, it } from "vitest";
import type { TrackedProduct } from "../integrations/products/types";
import { planInput } from "./alerts";
import { fiatToNim, nimToFiat } from "./converter";
import { money } from "./money";
import { recordPrice } from "./priceHistory";
import { lockPrice, unlockPrice } from "./savings";
import { isStale } from "./rates";

const TODAY = "2026-11-09";

// Laptop at GBP 1,200.00 (120000 minor units).
const laptop: TrackedProduct = {
  id: "l1",
  name: "Laptop",
  url: "https://example.com/laptop",
  currency: "GBP",
  targetMinor: "120000",
  savedMinor: "0",
  contributionMinor: "1000",
  frequency: "weekly",
  targetDate: "2027-06-01",
  deliveryMinor: "0",
  otherMinor: "0",
  history: [{ minor: "120000", currency: "GBP", at: TODAY, source: "user_entered" }],
  trackingMode: "manual",
  createdAt: TODAY,
};

describe("manual converter", () => {
  it("converts GBP 1,200.00 to NIM at a rate of GBP 125.00 per NIM", () => {
    // 1200 / 125 = 9.6 NIM = 960000 Luna
    expect(fiatToNim(money(120000n, "GBP"), 12500n).minor).toBe(960000n);
  });

  it("converts NIM back to fiat with the same rate", () => {
    expect(nimToFiat(money(960000n, "NIM"), 12500n, "GBP").minor).toBe(120000n);
  });

  it("refuses a zero rate instead of dividing by zero", () => {
    expect(() => fiatToNim(money(120000n, "GBP"), 0n)).toThrow();
  });
});

describe("rate staleness", () => {
  it("flags rates older than seven days", () => {
    expect(isStale("2026-11-01", TODAY)).toBe(true);
    expect(isStale("2026-11-05", TODAY)).toBe(false);
  });
});

describe("Price Lock", () => {
  it("keeps the locked fiat target when the recorded price rises", () => {
    const locked = lockPrice(laptop, TODAY);
    expect(locked.priceLock?.minor).toBe("120000");
    expect(locked.savingsTarget).toBe("locked");

    const risen = recordPrice(locked, 135000n, "2026-11-20").product;
    expect(risen.history[risen.history.length - 1].minor).toBe("135000");
    expect(planInput(risen, TODAY).price.minor).toBe(120000n);
  });

  it("follows the live price again after unlocking", () => {
    const risen = recordPrice(lockPrice(laptop, TODAY), 135000n, "2026-11-20").product;
    const unlocked = unlockPrice(risen);
    expect(unlocked.savingsTarget).toBe("live");
    expect(planInput(unlocked, TODAY).price.minor).toBe(135000n);
  });

  it("does not change the recorded price history when locking", () => {
    const locked = lockPrice(laptop, TODAY);
    expect(locked.history).toEqual(laptop.history);
  });
});
