import { describe, expect, it } from "vitest";
import type { TrackedProduct } from "../integrations/products/types";
import { alertsForChange } from "./alerts";
import { recordPrice } from "./priceHistory";

const TODAY = "2026-10-15";

// Price $700, target $600, savings $200, $5 per day, deadline 100 days away.
const product: TrackedProduct = {
  id: "p1",
  name: "Bike",
  url: "https://example.com/bike",
  currency: "USD",
  targetMinor: "60000",
  savedMinor: "20000",
  contributionMinor: "500",
  frequency: "daily",
  targetDate: "2027-01-23",
  deliveryMinor: "0",
  otherMinor: "0",
  history: [{ minor: "70000", currency: "USD", at: TODAY, source: "user_entered" }],
  trackingMode: "manual",
  createdAt: TODAY,
};

describe("price history", () => {
  it("does not add an observation when the price is unchanged", () => {
    const r = recordPrice(product, 70000n, TODAY);
    expect(r.changed).toBe(false);
    expect(r.product.history).toHaveLength(1);
  });

  it("appends a changed price and keeps the previous one", () => {
    const r = recordPrice(product, 65000n, TODAY);
    expect(r.changed).toBe(true);
    expect(r.product.history).toHaveLength(2);
    expect(r.previous.minor).toBe("70000");
    expect(r.product.history[1].currency).toBe("USD");
  });
});

describe("alerts", () => {
  it("reports a price decrease and a target opportunity", () => {
    const r = recordPrice(product, 59000n, TODAY);
    const kinds = alertsForChange(r.previous, r.product, TODAY).map((a) => a.kind);
    expect(kinds).toContain("price_down");
    expect(kinds).toContain("target_reached");
  });

  it("reports a price increase", () => {
    const r = recordPrice(product, 80000n, TODAY);
    const kinds = alertsForChange(r.previous, r.product, TODAY).map((a) => a.kind);
    expect(kinds).toContain("price_up");
    expect(kinds).not.toContain("target_reached");
  });

  it("flags a deadline that a price increase makes unrealistic", () => {
    const tight: TrackedProduct = { ...product, contributionMinor: "100", targetDate: "2026-11-30" };
    const r = recordPrice(tight, 90000n, TODAY);
    const kinds = alertsForChange(r.previous, r.product, TODAY).map((a) => a.kind);
    expect(kinds).toContain("deadline_unrealistic");
  });
});
