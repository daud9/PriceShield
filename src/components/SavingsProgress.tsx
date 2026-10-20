import { formatMoney, type Money } from "../lib/money";

interface Props {
  saved: Money;
  total: Money;
  remaining: Money;
}

export default function SavingsProgress({ saved, total, remaining }: Props) {
  const pct = total.minor === 0n ? 0 : Math.min(100, Number((saved.minor * 100n) / total.minor));
  return (
    <div>
      <div className="bar" role="progressbar" aria-label="Savings progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <p className="small muted">
        {pct}% of {formatMoney(total)} saved. {formatMoney(remaining)} remaining. Savings are user-reported.
      </p>
    </div>
  );
}
