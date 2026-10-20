import { describe, expect, it } from "vitest";
import { compareAlternatives, evaluatePlan, PlanInput, simulatePriceChange, standardPriceShocks } from "./engine";
import { formatMoney, MoneyError, parseMoney } from "./money";

const USD = (s: string) => parseMoney(s, "USD");
const TODAY = "2026-10-15";

// 100 days after TODAY
const TARGET_100 = "2027-01-23";

function base(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    productName: "Bike",
    price: USD("700"),
    reportedSavings: USD("200"),
    deliveryCost: USD("0"),
    otherCosts: USD("0"),
    contribution: USD("5"),
    frequency: "daily",
    targetDate: TARGET_100,
    today: TODAY,
    ...overrides,
  };
}

function ok(input: PlanInput) {
  const out = evaluatePlan(input);
  if (!out.ok) throw new Error(out.errors.join(" | "));
  return out.result;
}

describe("money", () => {
  it("parses decimals into minor units without floating point", () => {
    expect(parseMoney("0.1", "USD").minor).toBe(10n);
    expect(parseMoney("699.99", "USD").minor).toBe(69999n);
    expect(parseMoney("1,200.5", "USD").minor).toBe(120050n);
  });

  it("rejects invalid input and excess decimals", () => {
    expect(() => parseMoney("abc", "USD")).toThrow(MoneyError);
    expect(() => parseMoney("-5", "USD")).toThrow(MoneyError);
    expect(() => parseMoney("1.001", "USD")).toThrow(MoneyError);
    expect(() => parseMoney("1.5", "JPY")).toThrow(MoneyError);
  });

  it("formats with currency and grouping", () => {
    expect(formatMoney(USD("1234.5"))).toBe("USD 1,234.50");
  });
});

describe("readiness engine", () => {
  it("matches the brief example: $700 price, $200 saved, 100 days, $5/day", () => {
    const r = ok(base());
    expect(r.remaining.minor).toBe(50000n);            // $500
    expect(r.requiredDaily?.minor).toBe(500n);         // $5.00
    expect(r.achievable).toBe(true);
    expect(r.status).toBe("on_track");
    expect(r.shortfall.minor).toBe(0n);
  });

  it("recalculates immediately when the price rises to $800", () => {
    const r = ok(base({ price: USD("800") }));
    expect(r.remaining.minor).toBe(60000n);            // $600
    expect(r.requiredDaily?.minor).toBe(600n);         // $6.00
  });

  it("includes delivery and other costs in total cost", () => {
    const r = ok(base({ deliveryCost: USD("20"), otherCosts: USD("80") }));
    expect(r.totalCost.minor).toBe(80000n);            // $800
    expect(r.remaining.minor).toBe(60000n);
  });

  it("reports shortfall and suggestions when the goal is unreachable", () => {
    const r = ok(base({ contribution: USD("2") }));
    expect(r.achievable).toBe(false);
    expect(r.status).toBe("behind");
    expect(r.shortfall.minor).toBe(30000n);           // 500 - 2*100 = 300
    expect(r.suggestions.some((s) => s.includes("Increase contributions"))).toBe(true);
    expect(r.suggestions.some((s) => s.includes("extend the deadline"))).toBe(true);
  });

  it("treats a fully funded goal as funded", () => {
    const r = ok(base({ reportedSavings: USD("700") }));
    expect(r.status).toBe("funded");
    expect(r.remaining.minor).toBe(0n);
    expect(r.readinessDate).toBe(TODAY);
  });

  it("handles zero savings", () => {
    const r = ok(base({ reportedSavings: USD("0") }));
    expect(r.remaining.minor).toBe(70000n);
    expect(r.requiredDaily?.minor).toBe(700n);
  });

  it("handles a past deadline without fabricating a required rate", () => {
    const r = ok(base({ targetDate: "2026-10-01" }));
    expect(r.status).toBe("past_deadline");
    expect(r.requiredDaily).toBeNull();
    expect(r.achievable).toBe(false);
  });

  it("handles zero contribution with no readiness date", () => {
    const r = ok(base({ contribution: USD("0") }));
    expect(r.status).toBe("no_contribution");
    expect(r.readinessDate).toBeNull();
  });

  it("separates reported savings from verified contributions", () => {
    const r = ok(base({ reportedSavings: USD("100"), verifiedSavings: USD("100") }));
    expect(r.reported.minor).toBe(10000n);
    expect(r.verified.minor).toBe(10000n);
    expect(r.remaining.minor).toBe(50000n);
  });

  it("rejects mixed currencies instead of combining them", () => {
    const out = evaluatePlan(base({ reportedSavings: parseMoney("200", "NGN") }));
    expect(out.ok).toBe(false);
  });

  it("rejects invalid inputs with messages", () => {
    const out = evaluatePlan(base({ productName: "  ", price: USD("0") }));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe("price shock simulator", () => {
  it("uses the standard scenarios and marks them hypothetical", () => {
    const scenarios = standardPriceShocks(base());
    expect(scenarios.map((s) => s.adjustedPrice.minor)).toEqual([63000n, 70000n, 77000n, 84000n]);
    expect(scenarios.every((s) => s.hypothetical)).toBe(true);
  });

  it("supports a custom percentage change", () => {
    const s = simulatePriceChange(base(), 550); // +5.5%
    expect(s.adjustedPrice.minor).toBe(73850n);
  });

  it("flags deadline infeasibility under a price increase", () => {
    const s = simulatePriceChange(base({ contribution: USD("5.50") }), 2000);
    if (!s.outcome.ok) throw new Error("expected ok");
    expect(s.outcome.result.achievable).toBe(false);
  });
});

describe("alternative comparison", () => {
  it("computes cost difference against the original goal", () => {
    const comps = compareAlternatives(base(), [
      { name: "Cheaper bike", price: USD("550") },
      { name: "Premium bike", price: USD("900") },
    ]);
    expect(comps[0].costDifference.minor).toBe(-15000n);
    expect(comps[1].costDifference.minor).toBe(20000n);
    expect(comps[0].outcome.ok).toBe(true);
  });

  it("does not mutate the original plan", () => {
    const original = base();
    compareAlternatives(original, [{ name: "Alt", price: USD("500") }]);
    expect(original.price.minor).toBe(70000n);
    expect(original.productName).toBe("Bike");
  });
});
              
