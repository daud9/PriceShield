import { formatMoney, type Money } from "../lib/money";

interface Props {
  saved: Money;
  total: Money;
  remaining: Money;
}

/** Percentage in basis points (hundredths of a percent), rounded down, so 0.00125% is shown as 0.00%, not hidden. */
export default function SavingsProgress({ saved, total, remaining }: Props) {
  const bps = total.minor === 0n ? 0n : (saved.minor * 10000n) / total.minor;
  const capped = bps > 10000n ? 10000n : bps;
  const pctText = (Number(capped) / 100).toFixed(2);
  const widthPct = Math.max(Number(capped) / 100, saved.minor > 0n ? 0.5 : 0);
  return (
    <div>
      <div className="bar" role="progressbar" aria-label="Savings progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(pctText)}>
        <div style={{ width: `${widthPct}%` }} />
      </div>
      <p className="small muted">
        {pctText}% of {formatMoney(total)}. Saved {formatMoney(saved)}. {formatMoney(remaining)} remaining.
      </p>
    </div>
  );
}
