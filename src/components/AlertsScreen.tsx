import { useState } from "react";
import { alertsForChange } from "../lib/alerts";
import { loadProducts } from "../lib/productStorage";

/**
 * Alerts are derived from stored data each time this screen opens.
 * Nothing runs in the background, and each product gets one entry per alert type,
 * so unchanged prices do not repeat alerts.
 */
export default function AlertsScreen({ onBack }: { onBack: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [products] = useState(() => loadProducts().filter((p) => !p.archived));

  const items = products.flatMap((p) => {
    const h = p.history;
    const previous = h.length > 1 ? h[h.length - 2] : undefined;
    return alertsForChange(previous, p, today).map((a) => ({ ...a, product: p.name, asOf: h[h.length - 1].at }));
  });

  return (
    <main className="wrap">
      <header className="brand">
        <button className="ghost" onClick={onBack}>Back</button>
        <span className="tag">Alerts</span>
      </header>
      <p className="small muted">
        Alerts use the prices you recorded. PriceShield does not check stores or monitor prices in the background.
      </p>

      {items.length === 0 && (
        <section className="card">
          <p className="small muted">
            No alerts. Alerts appear when a recorded price reaches your target, changes, or affects your deadline.
          </p>
        </section>
      )}

      {items.map((a) => (
        <section className="notice" key={`${a.product}-${a.kind}`}>
          <strong>{a.title}</strong>
          <p className="small">{a.product}: {a.detail}</p>
          <p className="small muted">Based on the price recorded on {a.asOf}.</p>
        </section>
      ))}
    </main>
  );
}
