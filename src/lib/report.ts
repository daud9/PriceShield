import type { TrackedProduct } from "../integrations/products/types";
import { evaluatePlan } from "./engine";
import { formatMoney, money } from "./money";
import { planInput } from "./alerts";
import { latestObservation } from "./priceHistory";

/** Plain-text report. Contains only stored data and deterministic calculations. */
export function buildReport(p: TrackedProduct, today: string): string {
  const cur = p.currency;
  const last = latestObservation(p);
  const lines: string[] = [
    `PriceShield purchase report (as of ${today})`,
    `Product: ${p.name}`,
  ];
  if (p.merchant) lines.push(`Merchant: ${p.merchant}`);
  if (p.url) lines.push(`Link: ${p.url}`);
  lines.push(`Recorded price: ${formatMoney(money(BigInt(last.minor), cur))} (recorded ${last.at})`);
  lines.push(`Target price: ${formatMoney(money(BigInt(p.targetMinor), cur))}`);
  lines.push(`Savings (user-reported): ${formatMoney(money(BigInt(p.savedMinor), cur))}`);
  lines.push(`Target purchase date: ${p.targetDate}`);

  const outcome = evaluatePlan(planInput(p, today));
  if (outcome.ok) {
    const r = outcome.result;
    lines.push(`Total cost including delivery and other costs: ${formatMoney(r.totalCost)}`);
    lines.push(`Remaining to save: ${formatMoney(r.remaining)}`);
    lines.push(`Estimated ready by: ${r.readinessDate ?? "not at current rate"}`);
    lines.push(`Deadline achievable: ${r.achievable ? "yes" : "no"}`);
    lines.push(`Plan status: ${r.status.replace("_", " ")}`);
  } else {
    lines.push(`Plan status: ${outcome.errors.join(" ")}`);
  }

  lines.push("Tracking: manual price tracking. The price was entered by the user, not verified by the merchant.");
  lines.push("Savings are user-reported. No verified contributions are recorded. PriceShield does not hold or lock funds.");
  return lines.join("\n");
}
