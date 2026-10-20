import { useState } from "react";
import { loadProducts } from "../lib/productStorage";
import PriceIntelligence from "./PriceIntelligence";

export default function IntelligenceScreen({ onBack }: { onBack: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [products] = useState(() => loadProducts().filter((p) => !p.archived));

  return (
    <main className="wrap">
      <header className="brand">
        <button className="ghost" onClick={onBack}>Back</button>
        <span className="tag">Price Intelligence</span>
      </header>
      <p className="small muted">
        Calculations use your recorded prices and savings. There are no predictions and no live market data.
      </p>
      {products.length === 0 && (
        <section className="card">
          <p className="small muted">Track a product to see how price changes affect your savings plan.</p>
        </section>
      )}
      {products.map((p) => (
        <section key={p.id} className="stack">
          <h2 className="small">{p.name}</h2>
          <PriceIntelligence product={p} today={today} />
        </section>
      ))}
    </main>
  );
}
