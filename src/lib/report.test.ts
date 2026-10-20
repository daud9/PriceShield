import { describe, expect, it } from "vitest";
import type { TrackedProduct } from "../integrations/products/types";
import { buildReport } from "./report";

const TODAY = "2026-10-15";

// $700 price, $200 saved, $600 target, $5 per day, deadline 100 days away.
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

describe("buildReport", () => {
  it("contains the stored figures and the calculated remaining amount", () => {
    const text = buildReport(product, TODAY);
    expect(text).toContain("Recorded price: USD 700.00");
    expect(text).toContain("Target price: USD 600.00");
    expect(text).toContain("Savings (user-reported): USD 200.00");
    expect(text).toContain("Remaining to save: USD 500.00");
    expect(text).toContain("Estimated ready by: 2027-01-23");
    expect(text).toContain("Deadline achievable: yes");
  });

  it("states the tracking method and savings source honestly", () => {
    const text = buildReport(product, TODAY);
    expect(text).toContain("manual price tracking");
    expect(text).toContain("No verified contributions are recorded");
  });
});
