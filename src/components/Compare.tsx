import { useState, type FormEvent } from "react";
import type { Alternative, TrackedProduct } from "../integrations/products/types";
import { compareAlternatives, evaluatePlan, type Frequency, type PlanResult } from "../lib/engine";
import { formatMoney, money, tryParseMoney } from "../lib/money";
import { loadProducts, saveProducts } from "../lib/productStorage";
import { planInput } from "../lib/alerts";

const PER: Record<Frequency, string> = { daily: "day", weekly: "week", monthly: "month" };

function requiredText(r: PlanResult, f: Frequency): string {
  const amount = { daily: r.requiredDaily, weekly: r.requiredWeekly, monthly: r.requiredMonthly }[f];
  return amount ? `${formatMoney(amount)} per ${PER[f]}` : "not applicable";
}

function signed(minor: bigint, currency: string): string {
  const text = formatMoney(money(minor < 0n ? -minor : minor, currency));
  return minor > 0n ? `+${text}` : minor < 0n ? `-${text}` : text;
}

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function Compare({ onBack }: { onBack: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [all, setAll] = useState<TrackedProduct[]>(() => loadProducts());
  const choices = all.filter((p) => !p.archived);
  const [selectedId, setSelectedId] = useState<string>(() => choices[0]?.id ?? "");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [requirements, setRequirements] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  const base = choices.find((p) => p.id === selectedId) ?? choices[0];

  function commit(next: TrackedProduct[]) {
    setAll(next);
    saveProducts(next);
  }

  function updateBase(patch: Partial<TrackedProduct>) {
    if (!base) return;
    commit(all.map((p) => (p.id === base.id ? { ...p, ...patch } : p)));
  }

  if (!base) {
    return (
      <main className="wrap">
        <header className="brand">
          <button className="ghost" onClick={onBack}>Back</button>
          <span className="tag">Compare Products</span>
        </header>
        <section className="card">
          <p className="small muted">Track a product first, then add alternatives to compare with it.</p>
        </section>
      </main>
    );
  }

  const alts = base.alternatives ?? [];
  const originalInput = planInput({ ...base, activeAlternativeId: undefined }, today);
  const original = evaluatePlan(originalInput);
  const comparisons = compareAlternatives(
    originalInput,
    alts.map((a) => ({ name: a.name, price: money(BigInt(a.minor), base.currency), requirements: a.requirements })),
  );
  const activeName = alts.find((a) => a.id === base.activeAlternativeId)?.name;

  function addAlternative(e: FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!name.trim()) errs.push("Enter a name for this alternative.");
    const parsed = tryParseMoney(price, base!.currency);
    if (typeof parsed === "string") {
      setErrors([...errs, parsed]);
      return;
    }
    if (parsed.minor <= 0n) errs.push("Enter a price greater than zero.");
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    const alt: Alternative = {
      id: newId(),
      name: name.trim(),
      minor: parsed.minor.toString(),
      requirements: requirements.trim() || undefined,
    };
    updateBase({ alternatives: [...alts, alt] });
    setName("");
    setPrice("");
    setRequirements("");
    setErrors([]);
    setNotice("Alternative added.");
  }

  function removeAlternative(alt: Alternative) {
    updateBase({
      alternatives: alts.filter((a) => a.id !== alt.id),
      activeAlternativeId: base!.activeAlternativeId === alt.id ? undefined : base!.activeAlternativeId,
    });
    setNotice(`Removed "${alt.name}".`);
  }

  function setActive(alt: Alternative) {
    updateBase({ activeAlternativeId: alt.id });
    setNotice(`"${alt.name}" is now the active target. The original product is unchanged.`);
  }

  function useOriginal() {
    updateBase({ activeAlternativeId: undefined });
    setNotice(`Back to the original product: ${base!.name}.`);
  }

  return (
    <main className="wrap">
      <header className="brand">
        <button className="ghost" onClick={onBack}>Back</button>
        <span className="tag">Compare Products</span>
      </header>

      {notice && <p className="notice small" role="status">{notice}</p>}

      <section className="card">
        <label>
          Product to compare
          <select value={base.id} onChange={(e) => { setSelectedId(e.target.value); setNotice(""); }}>
            {choices.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <p className="small muted">
          Active target: {activeName ? activeName : `original (${base.name})`}
        </p>
        {base.activeAlternativeId && (
          <button className="ghost" onClick={useOriginal}>Use the original product as the target</button>
        )}
      </section>

      <section className="card">
        <h2>Original</h2>
        <p className="small muted">{base.name} at its recorded price, with the same savings plan.</p>
        {original.ok ? (
          <dl className="stats">
            <div><dt>Total cost</dt><dd>{formatMoney(original.result.totalCost)}</dd></div>
            <div><dt>Remaining</dt><dd>{formatMoney(original.result.remaining)}</dd></div>
            <div><dt>Required</dt><dd>{requiredText(original.result, base.frequency)}</dd></div>
            <div><dt>Ready by</dt><dd>{original.result.readinessDate ?? "Not at current rate"}</dd></div>
            <div><dt>Deadline</dt><dd>{original.result.achievable ? "Achievable" : "Not achievable"}</dd></div>
          </dl>
        ) : (
          <p className="errors">{original.errors.join(" ")}</p>
        )}
      </section>

      <form className="card" onSubmit={addAlternative} noValidate>
        <h2>Add an alternative</h2>
        <p className="small muted">Enter the price yourself. Prices are in {base.currency}, the same as this product.</p>
        {errors.length > 0 && (
          <ul className="errors" role="alert">{errors.map((er) => <li key={er}>{er}</li>)}</ul>
        )}
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Price ({base.currency})<input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
        <label>Specifications or requirements (optional)<textarea rows={2} value={requirements} onChange={(e) => setRequirements(e.target.value)} /></label>
        <button className="primary" type="submit">Add alternative</button>
      </form>

      {comparisons.length === 0 && <p className="small muted">No alternatives yet.</p>}

      {comparisons.map((c, i) => {
        const alt = alts[i];
        const isActive = alt.id === base.activeAlternativeId;
        return (
          <section className="card" key={alt.id}>
            <div className="row-between">
              <h3>{c.name}</h3>
              {isActive && <span className="pill" data-status="on_track">Active target</span>}
            </div>
            {c.requirements && <p className="small muted">{c.requirements}</p>}
            {c.outcome.ok ? (
              <dl className="stats">
                <div><dt>Price</dt><dd>{formatMoney(c.price)}</dd></div>
                <div><dt>Difference vs original</dt><dd>{signed(c.costDifference.minor, base.currency)}</dd></div>
                <div><dt>Total cost</dt><dd>{formatMoney(c.outcome.result.totalCost)}</dd></div>
                <div><dt>Remaining</dt><dd>{formatMoney(c.outcome.result.remaining)}</dd></div>
                <div><dt>Required</dt><dd>{requiredText(c.outcome.result, base.frequency)}</dd></div>
                <div><dt>Ready by</dt><dd>{c.outcome.result.readinessDate ?? "Not at current rate"}</dd></div>
              </dl>
            ) : (
              <p className="errors">{c.outcome.errors.join(" ")}</p>
            )}
            <p className="small">Deadline: {c.outcome.ok && c.outcome.result.achievable ? "achievable" : "not achievable"}</p>
            <div className="row">
              <button className="primary" disabled={isActive} onClick={() => setActive(alt)}>
                {isActive ? "Active target" : "Use as target"}
              </button>
              <button className="ghost" onClick={() => removeAlternative(alt)}>Remove</button>
            </div>
          </section>
        );
      })}
    </main>
  );
}
