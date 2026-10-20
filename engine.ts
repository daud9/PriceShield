// Smart Purchase Readiness Engine. All calculations are deterministic.
// The price shock simulator and alternative comparison reuse evaluatePlan().

import {
  Money, MoneyError, add, assertSameCurrency, ceilDiv, formatMoney,
  max0, money, scaleRatio, sub,
} from "./money";

export type Frequency = "daily" | "weekly" | "monthly";
export const PERIOD_DAYS: Record<Frequency, number> = { daily: 1, weekly: 7, monthly: 30 };

export interface PlanInput {
  productName: string;
  category?: string;
  price: Money;
  reportedSavings: Money;
  verifiedSavings?: Money;      // on-chain verified contributions
  deliveryCost: Money;
  otherCosts: Money;            // taxes or other additional costs
  contribution: Money;          // per frequency period
  frequency: Frequency;
  targetDate: string;           // YYYY-MM-DD
  today: string;                // YYYY-MM-DD, injected for testability
  maxAffordable?: Money;
  requirements?: string;
  notes?: string;
}

export type Status = "funded" | "on_track" | "behind" | "past_deadline" | "no_contribution";

export interface PlanResult {
  currency: string;
  totalCost: Money;
  reported: Money;
  verified: Money;
  totalSaved: Money;
  remaining: Money;
  daysRemaining: number;
  requiredDaily: Money | null;
  requiredWeekly: Money | null;
  requiredMonthly: Money | null;
  projectedSaved: Money;
  shortfall: Money;
  achievable: boolean;
  readinessDate: string | null;
  status: Status;
  suggestions: string[];
}

export type EvaluateOutcome =
  | { ok: true; result: PlanResult }
  | { ok: false; errors: string[] };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(s: string): number {
  if (!DATE_RE.test(s)) throw new MoneyError(`"${s}" is not a YYYY-MM-DD date.`);
  const t = Date.parse(`${s}T00:00:00Z`);
  if (Number.isNaN(t)) throw new MoneyError(`"${s}" is not a valid date.`);
  return t;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to) - parseDate(from)) / 86_400_000);
}

export function addDays(from: string, days: number): string {
  return new Date(parseDate(from) + days * 86_400_000).toISOString().slice(0, 10);
}

export function validatePlan(input: PlanInput): string[] {
  const errors: string[] = [];
  if (!input.productName.trim()) errors.push("Enter a product name.");
  if (input.price.minor <= 0n) errors.push("Product price must be greater than zero.");
  if (input.reportedSavings.minor < 0n) errors.push("Current savings cannot be negative.");
  if (input.verifiedSavings && input.verifiedSavings.minor < 0n) errors.push("Verified savings cannot be negative.");
  if (input.deliveryCost.minor < 0n) errors.push("Delivery cost cannot be negative.");
  if (input.otherCosts.minor < 0n) errors.push("Taxes or other costs cannot be negative.");
  if (input.contribution.minor < 0n) errors.push("Contribution cannot be negative.");
  if (input.maxAffordable && input.maxAffordable.minor < 0n) errors.push("Maximum affordable price cannot be negative.");
  try {
    const parts = [input.price, input.reportedSavings, input.deliveryCost, input.otherCosts, input.contribution];
    if (input.verifiedSavings) parts.push(input.verifiedSavings);
    if (input.maxAffordable) parts.push(input.maxAffordable);
    assertSameCurrency(...parts);
  } catch (e) {
    errors.push((e as Error).message);
  }
  try {
    parseDate(input.targetDate);
    parseDate(input.today);
  } catch (e) {
    errors.push((e as Error).message);
  }
  return errors;
}

export function evaluatePlan(input: PlanInput): EvaluateOutcome {
  const errors = validatePlan(input);
  if (errors.length) return { ok: false, errors };

  const cur = input.price.currency;
  const zero = money(0n, cur);
  const verified = input.verifiedSavings ?? zero;
  const reported = input.reportedSavings;
  const totalSaved = add(reported, verified);
  const totalCost = add(add(input.price, input.deliveryCost), input.otherCosts);
  const remaining = max0(sub(totalCost, totalSaved));
  const days = daysBetween(input.today, input.targetDate);
  const period = PERIOD_DAYS[input.frequency];
  const c = input.contribution;

  const suggestions: string[] = [];
  let status: Status;
  let achievable: boolean;
  let readinessDate: string | null = null;
  let requiredDaily: Money | null = null;
  let requiredWeekly: Money | null = null;
  let requiredMonthly: Money | null = null;
  let projectedAdditional = zero;

  if (remaining.minor === 0n) {
    status = "funded";
    achievable = true;
    readinessDate = input.today;
  } else if (days <= 0) {
    status = "past_deadline";
    achievable = false;
    suggestions.push("The target date has passed. Choose a new date to get a required savings rate.");
  } else {
    requiredDaily = money(ceilDiv(remaining.minor, BigInt(days)), cur);
    requiredWeekly = money(ceilDiv(remaining.minor * 7n, BigInt(days)), cur);
    requiredMonthly = money(ceilDiv(remaining.minor * 30n, BigInt(days)), cur);

    const periodsAvailable = BigInt(Math.floor(days / period));
    projectedAdditional = money(c.minor * periodsAvailable, cur);
    achievable = remaining.minor <= projectedAdditional.minor;

    if (c.minor === 0n) {
      status = "no_contribution";
      achievable = false;
      suggestions.push("Add a contribution amount to see when you could be ready.");
    } else {
      const periodsNeeded = ceilDiv(remaining.minor, c.minor);
      readinessDate = addDays(input.today, Number(periodsNeeded) * period);
      status = achievable ? "on_track" : "behind";
    }

    if (!achievable) {
      const required = { daily: requiredDaily, weekly: requiredWeekly, monthly: requiredMonthly }[input.frequency];
      suggestions.push(
        `Increase contributions to ${formatMoney(required)} per ${input.frequency === "daily" ? "day" : input.frequency === "weekly" ? "week" : "month"}.`,
      );
      if (c.minor > 0n && readinessDate) {
        suggestions.push(`Or extend the deadline to ${readinessDate}, when your current rate reaches the goal.`);
      }
      const maxTotal = add(totalSaved, projectedAdditional);
      const maxPrice = sub(sub(maxTotal, input.deliveryCost), input.otherCosts);
      if (maxPrice.minor > 0n) {
        suggestions.push(`Or choose a product priced at or below ${formatMoney(maxPrice)} including your current costs.`);
      }
      if (input.otherCosts.minor > 0n) {
        suggestions.push(`Or reduce optional costs. Up to ${formatMoney(input.otherCosts)} is currently included.`);
      }
    }
  }

  if (input.maxAffordable && totalCost.minor > input.maxAffordable.minor) {
    suggestions.push(
      `Total cost is ${formatMoney(sub(totalCost, input.maxAffordable))} above your maximum affordable price.`,
    );
  }

  return {
    ok: true,
    result: {
      currency: cur,
      totalCost,
      reported,
      verified,
      totalSaved,
      remaining,
      daysRemaining: days,
      requiredDaily,
      requiredWeekly,
      requiredMonthly,
      projectedSaved: add(totalSaved, projectedAdditional),
      shortfall: max0(sub(remaining, projectedAdditional)),
      achievable,
      readinessDate,
      status,
      suggestions,
    },
  };
}

export interface PriceScenario {
  label: string;
  changeBps: number; // basis points: 1000 = +10%, -1000 = -10%
  hypothetical: true;
  adjustedPrice: Money;
  outcome: EvaluateOutcome;
}

/** Hypothetical price change. Reuses evaluatePlan(). changeBps is in basis points. */
export function simulatePriceChange(input: PlanInput, changeBps: number, label?: string): PriceScenario {
  const factor = BigInt(10000 + changeBps);
  const adjustedPrice = scaleRatio(input.price, factor, 10000n);
  const outcome = evaluatePlan({ ...input, price: adjustedPrice });
  const pct = changeBps / 100;
  return {
    label: label ?? (changeBps === 0 ? "No price change" : `${pct > 0 ? "+" : ""}${pct}% price change`),
    changeBps,
    hypothetical: true,
    adjustedPrice,
    outcome,
  };
}

export const STANDARD_SCENARIOS_BPS = [-1000, 0, 1000, 2000];

export function standardPriceShocks(input: PlanInput): PriceScenario[] {
  return STANDARD_SCENARIOS_BPS.map((bps) => simulatePriceChange(input, bps));
}

export interface AlternativeInput {
  name: string;
  price: Money;
  requirements?: string;
}

export interface AlternativeComparison {
  name: string;
  requirements?: string;
  price: Money;
  costDifference: Money; // alternative total minus original total
  outcome: EvaluateOutcome;
}

export function compareAlternatives(base: PlanInput, alternatives: AlternativeInput[]): AlternativeComparison[] {
  const baseTotal = add(add(base.price, base.deliveryCost), base.otherCosts);
  return alternatives.map((alt) => {
    const outcome = evaluatePlan({ ...base, productName: alt.name, price: alt.price, requirements: alt.requirements });
    const altTotal = add(add(alt.price, base.deliveryCost), base.otherCosts);
    return {
      name: alt.name,
      requirements: alt.requirements,
      price: alt.price,
      costDifference: sub(altTotal, baseTotal),
      outcome,
    };
  });
}
