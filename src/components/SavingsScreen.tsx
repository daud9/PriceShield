import { useState } from "react";
import { evaluatePlan } from "../lib/engine";
import { formatMoney, money } from "../lib/money";
import { planInput } from "../lib/alerts";
import { loadProducts } from "../lib/productStorage";
import SavingsProgress from "./SavingsProgress";

export default function SavingsScreen({ onBack }: { onBack: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [products] = useState(() => loadProducts().filter((p) => !p.archived));
  const rows = products.map((p) => ({ p, outcome: evaluatePlan(planInput(p, today)) }));

  // Totals are kept per currency. Different currencies are never added together.
  const totals: Record<string, { saved: bigint; remaining: bigint }> = {};
  for (const r of rows) {
    if (!r.outcome.ok) continue;
    const t = (totals[r.p.currency] ??= { saved: 0n, remaining: 0n });
    t.saved += r.outcome.result.totalSaved.minor;
    t.remaining += r.outcome.result.remaining.minor;
  }

  return (
    <main className="wrap">
      <header className="brand">
        <button className="ghost" onClick={onBack}>Back</button>
        <span className="tag">Savings Progress</span>
      </header>
      <p className="small muted">Savings are entered by you. None are verified on-chain yet.</p>

      {Object.entries(totals).map(([cur, t]) => (
        <section className="card" key={cur}>
          <h2 className="small">{cur} total</h2>
          <p className="small">
            {formatMoney(money(t.saved, cur))} saved, {formatMoney(money(t.remaining, cur))} still needed
          </p>
        </section>
      ))}

      {rows.length === 0 && (
        <section className="card">
          <p className="small muted">No goals yet. Track a product to start a savings plan.</p>
        </section>
      )}

      {rows.map(({ p, outcome }) => (
        <section className="card" key={p.id}>
          <div className="row-between">
            <h3>{p.name}</h3>
            {outcome.ok && <span className="pill" data-status={outcome.result.status}>{outcome.result.status.replace("_", " ")}</span>}
          </div>
          {outcome.ok ? (
            <>
              <SavingsProgress
                saved={outcome.result.totalSaved}
                total={outcome.result.totalCost}
                remaining={outcome.result.remaining}
              />
              <p className="small muted">
                Ready by {outcome.result.readinessDate ?? "not at current rate"} · Deadline {p.targetDate}
              </p>
            </>
          ) : (
            <p className="errors">{outcome.errors.join(" ")}</p>
          )}
        </section>
      ))}
    </main>
  );
}
