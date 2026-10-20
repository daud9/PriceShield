import { describe, expect, it } from "vitest";
import type { TrackedProduct } from "../integrations/products/types";
import { planInput } from "./alerts";

const TODAY = "2026-10-15";

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
  alternatives: [{ id: "a1", name: "Cheaper bike", minor: "55000" }],
};

describe("active alternative", () => {
  it("uses the recorded price when no alternative is active", () => {
    const input = planInput(product, TODAY);
    expect(input.price.minor).toBe(70000n);
    expect(input.productName).toBe("Bike");
  });

  it("uses the active alternative price and name without touching recorded history", () => {
    const active = { ...product, activeAlternativeId: "a1" };
    const input = planInput(active, TODAY);
    expect(input.price.minor).toBe(55000n);
    expect(input.productName).toBe("Cheaper bike");
    expect(active.history[0].minor).toBe("70000");
  });
});
