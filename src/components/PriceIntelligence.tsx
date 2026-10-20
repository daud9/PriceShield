import type { TrackedProduct } from "../integrations/products/types";
import { evaluatePlan, simulatePriceChange, type Frequency, type PlanResult } from "../lib/engine";
import { formatMoney, money } from "../lib/money";
import { planInput } from "../lib/alerts";
import { latestObservation } from "../lib/priceHistory";

const PER: Record<Frequency, string> = { daily: "day", weekly: "week", monthly: "month" };

function requiredPer(r: PlanResult, f: Frequency): string {
  const amount = { daily: r.requiredDaily, weekly: r.requiredWeekly, monthly: r.requiredMonthly }[f];
  return amount ? `${formatMoney(amount)} per ${PER[f]}` : "not applicable";
}

/** Deterministic impact summary. No predictions and no market data. */
export default function PriceIntelligence({ product, today }: { product: TrackedProduct; today: string }) {
  const input = planInput(product, today);
  const base = evaluatePlan(input);
  if (!base.ok) return null;
  const r = base.result;
  const cur = product.currency;
  const latest = money(BigInt(latestObservation(product).minor), cur);
  const target = money(BigInt(product.targetMinor), cur);
  const diff = latest.minor - target.minor;

  const scenario = simulatePriceChange(input, 1000, "+10%");
  let scenarioText = "Not available for this price.";
  if (scenario.outcome.ok) {
    const s = scenario.outcome.result;
    scenarioText =
      `If the recorded price rose 10% to ${formatMoney(scenario.adjustedPrice)}, ` +
      `the remaining amount would be ${formatMoney(s.remaining)} and the required saving ` +
      `${requiredPer(s, product.frequency)}. ` +
      (s.achievable ? "The deadline would still be achievable." : "The deadline would no longer be achievable.");
  }

  let next: string;
  if (r.status === "funded") next = "Savings cover this purchase. Decide when to buy.";
  else if (!r.achievable) next = r.suggestions[0] ?? "Increase contributions or extend the deadline.";
  else if (diff <= 0n) next = "The recorded price is at or below your target and the plan is achievable.";
  else next = "Keep your current contribution. The plan is achievable by your deadline.";

  const differenceText =
    diff > 0n
      ? `${formatMoney(money(diff, cur))} above your target`
      : diff === 0n
        ? "At your target"
        : `${formatMoney(money(-diff, cur))} below your target`;

  return (
    <div className="notice">
      <strong>PriceShield Intelligence</strong>
      <dl className="stats">
        <div><dt>Recorded price</dt><dd>{formatMoney(latest)}</dd></div>
        <div><dt>Your target</dt><dd>{formatMoney(target)}</dd></div>
        <div><dt>Difference</dt><dd>{differenceText}</dd></div>
        <div><dt>Remaining</dt><dd>{formatMoney(r.remaining)}</dd></div>
        <div><dt>Ready by</dt><dd>{r.readinessDate ?? "Not at current rate"}</dd></div>
        <div><dt>Deadline</dt><dd>{r.achievable ? "Achievable" : "Not achievable"}</dd></div>
      </dl>
      <p className="small">{scenarioText}</p>
      <p className="small"><strong>Next action:</strong> {next}</p>
    </div>
  );
}
