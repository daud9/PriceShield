import type { PriceObservation, TrackedProduct } from "../integrations/products/types";
import { evaluatePlan, type PlanInput } from "./engine";
import { formatMoney, money } from "./money";

export interface Alert {
  kind: "price_up" | "price_down" | "target_reached" | "deadline_unrealistic" | "funded";
  title: string;
  detail: string;
  at: string;
}

/** Builds the savings-plan input from a tracked product's latest recorded price. */
export function planInput(p: TrackedProduct, today: string): PlanInput {
  const latest = p.history[p.history.length - 1];
  const cur = p.currency;
  const alt = p.activeAlternativeId
    ? p.alternatives?.find((a) => a.id === p.activeAlternativeId)
    : undefined;
  return {
    productName: alt ? alt.name : p.name,
    price: money(BigInt(alt ? alt.minor : latest.minor), cur),
    reportedSavings: money(BigInt(p.savedMinor), cur),
    deliveryCost: money(BigInt(p.deliveryMinor), cur),
    otherCosts: money(BigInt(p.otherMinor), cur),
    contribution: money(BigInt(p.contributionMinor), cur),
    frequency: p.frequency,
    targetDate: p.targetDate,
    today,
  };
}

/** Call only after a real price change has been recorded. */
export function alertsForChange(
  previous: PriceObservation | undefined,
  p: TrackedProduct,
  today: string,
): Alert[] {
  const cur = p.currency;
  const latest = money(BigInt(p.history[p.history.length - 1].minor), cur);
  const target = money(BigInt(p.targetMinor), cur);
  const alerts: Alert[] = [];

  if (previous) {
    const prev = money(BigInt(previous.minor), cur);
    const diff = latest.minor - prev.minor;
    if (diff !== 0n) {
      alerts.push({
        kind: diff > 0n ? "price_up" : "price_down",
        title: diff > 0n ? "Price increased" : "Price decreased",
        detail: `Previous ${formatMoney(prev)}, new ${formatMoney(latest)}, difference ${formatMoney(money(diff, cur))}.`,
        at: today,
      });
    }
  }

  if (latest.minor <= target.minor) {
    alerts.push({
      kind: "target_reached",
      title: "Price opportunity",
      detail: `Now ${formatMoney(latest)}, at or below your target of ${formatMoney(target)}.`,
      at: today,
    });
  }

  const outcome = evaluatePlan(planInput(p, today));
  if (outcome.ok) {
    const r = outcome.result;
    if (r.status === "funded") {
      alerts.push({ kind: "funded", title: "Savings cover this purchase", detail: "Your savings cover the total cost.", at: today });
    } else if (!r.achievable) {
      alerts.push({
        kind: "deadline_unrealistic",
        title: "Deadline no longer realistic",
        detail: r.suggestions[0] ?? "Review your contribution or deadline.",
        at: today,
      });
    }
  }
  return alerts;
}
