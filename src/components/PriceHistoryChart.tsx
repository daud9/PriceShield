import type { PriceObservation } from "../integrations/products/types";
import { formatMoney, money } from "../lib/money";

const W = 300;
const H = 120;
const PAD = 12;

/** Draws only the recorded observations. Nothing is interpolated or invented. */
export default function PriceHistoryChart({ history, currency }: { history: PriceObservation[]; currency: string }) {
  if (history.length < 2) {
    return (
      <p className="small muted">
        Only one price recorded. Update the price when it changes to see a history chart.
      </p>
    );
  }

  const amounts = history.map((h) => BigInt(h.minor));
  const min = amounts.reduce((a, b) => (a < b ? a : b));
  const max = amounts.reduce((a, b) => (a > b ? a : b));
  const values = amounts.map((a) => Number(a));
  const lo = Number(min);
  const span = Number(max - min) || 1;

  const points = values
    .map((v, i) => {
      const x = PAD + (i * (W - 2 * PAD)) / (values.length - 1);
      const y = H - PAD - ((v - lo) / span) * (H - 2 * PAD);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const first = history[0];
  const last = history[history.length - 1];

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Recorded price history">
        <polyline points={points} fill="none" stroke="#8b6cff" strokeWidth="2.5" strokeLinejoin="round" />
        {points.split(" ").map((pt, i) => {
          const [x, y] = pt.split(",");
          return <circle key={i} cx={x} cy={y} r="3.5" fill="#ffc857" />;
        })}
      </svg>
      <figcaption className="small muted">
        Lowest {formatMoney(money(min, currency))}, highest {formatMoney(money(max, currency))}.
        From {first.at} to {last.at}. {history.length} recorded prices, entered by you.
      </figcaption>
    </figure>
  );
}
