import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  compareAlternatives, evaluatePlan, Frequency, PlanInput, PlanResult, standardPriceShocks,
} from "./lib/engine";
import { formatMoney, MoneyError, parseMoney } from "./lib/money";
import { connectNimiq } from "./nimiq/nimiq";
import TrackedProducts from "./components/TrackedProducts";
import Landing from "./components/Landing";
import Dashboard from "./components/Dashboard";

type Screen = "intro" | "form" | "plan" | "track" | "dashboard";

interface Form {
  productName: string;
  category: string;
  price: string;
  currency: string;
  savings: string;
  verified: string;
  delivery: string;
  other: string;
  contribution: string;
  frequency: Frequency;
  targetDate: string;
  notes: string;
}

const today = new Date().toISOString().slice(0, 10);

const emptyForm: Form = {
  productName: "", category: "", price: "", currency: "USD", savings: "0", verified: "0",
  delivery: "0", other: "0", contribution: "", frequency: "weekly", targetDate: "", notes: "",
};

function toInput(f: Form): PlanInput {
  return {
    productName: f.productName,
    category: f.category || undefined,
    price: parseMoney(f.price, f.currency),
    reportedSavings: parseMoney(f.savings || "0", f.currency),
    verifiedSavings: parseMoney(f.verified || "0", f.currency),
    deliveryCost: parseMoney(f.delivery || "0", f.currency),
    otherCosts: parseMoney(f.other || "0", f.currency),
    contribution: parseMoney(f.contribution || "0", f.currency),
    frequency: f.frequency,
    targetDate: f.targetDate,
    today,
    notes: f.notes || undefined,
  };
}

function statusLabel(s: PlanResult["status"]) {
  return {
    funded: "Fully funded",
    on_track: "On track",
    behind: "Behind plan",
    past_deadline: "Deadline passed",
    no_contribution: "Add a contribution",
  }[s];
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [form, setForm] = useState<Form>(emptyForm);
  const [input, setInput] = useState<PlanInput | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [alts, setAlts] = useState<{ name: string; price: string }[]>([]);
  const [target, setTarget] = useState<string>("original");

  useEffect(() => { connectNimiq(); }, []);

  const set = (k: keyof Form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const parsed = toInput(form);
      const out = evaluatePlan(parsed);
      if (!out.ok) { setErrors(out.errors); return; }
      setErrors([]);
      setInput(parsed);
      setScreen("plan");
    } catch (err) {
      setErrors([err instanceof MoneyError ? err.message : "Check the amounts and try again."]);
    }
  }

  const planView = useMemo(() => {
    if (!input) return null;
    const alternatives = alts
      .filter((a) => a.name.trim() && a.price.trim())
      .flatMap((a) => {
        try { return [{ name: a.name, price: parseMoney(a.price, input.price.currency) }]; }
        catch { return []; }
      });
    // The original goal is never overwritten; the active plan is derived from it.
    const picked = alternatives.find((a) => a.name === target);
    const active: PlanInput = picked ? { ...input, productName: picked.name, price: picked.price } : input;
    return {
      active,
      scenarios: standardPriceShocks(active),
      comparisons: compareAlternatives(input, alternatives),
    };
  }, [input, alts, target]);

  if (screen === "dashboard") {
    return <Dashboard onBack={() => setScreen("intro")} />;
  }

  if (screen === "track") {
    return <TrackedProducts onBack={() => setScreen("intro")} />;
  }

  if (screen === "intro") {
    return (
      <Landing
        onCreateGoal={() => setScreen("track")}
        onTrackProduct={() => setScreen("track")}
        onDashboard={() => setScreen("dashboard")}
      />
    );
  }

  if (screen === "form") {
    return (
      <main className="wrap">
        <header className="brand"><button className="ghost" onClick={() => setScreen("intro")}>Back</button></header>
        <form className="card" onSubmit={submit} noValidate>
          <h2>New purchase goal</h2>
          {errors.length > 0 && (
            <ul className="errors" role="alert">{errors.map((er) => <li key={er}>{er}</li>)}</ul>
          )}
          <label>Product name<input value={form.productName} onChange={set("productName")} required /></label>
          <label>Category<input value={form.category} onChange={set("category")} placeholder="Electronics, travel…" /></label>
          <div className="row">
            <label>Price<input inputMode="decimal" value={form.price} onChange={set("price")} required /></label>
            <label>Currency
              <select value={form.currency} onChange={set("currency")}>
                <option>USD</option><option>EUR</option><option>GBP</option><option>NGN</option><option>NIM</option>
              </select>
            </label>
          </div>
          <label>Current reported savings<input inputMode="decimal" value={form.savings} onChange={set("savings")} /></label>
          <label>Verified on-chain savings<input inputMode="decimal" value={form.verified} onChange={set("verified")} /></label>
          <div className="row">
            <label>Delivery cost<input inputMode="decimal" value={form.delivery} onChange={set("delivery")} /></label>
            <label>Taxes or other costs<input inputMode="decimal" value={form.other} onChange={set("other")} /></label>
          </div>
          <div className="row">
            <label>Contribution<input inputMode="decimal" value={form.contribution} onChange={set("contribution")} /></label>
            <label>Every
              <select value={form.frequency} onChange={set("frequency")}>
                <option value="daily">Day</option><option value="weekly">Week</option><option value="monthly">Month</option>
              </select>
            </label>
          </div>
          <label>Target purchase date<input type="date" min={today} value={form.targetDate} onChange={set("targetDate")} required /></label>
          <label>Notes (optional)<textarea value={form.notes} onChange={set("notes")} rows={2} /></label>
          <button className="primary" type="submit">Calculate readiness</button>
        </form>
      </main>
    );
  }

  if (!input || !planView) return null;
  const r = evaluatePlan(planView.active);
  if (!r.ok) return null;
  const res = r.result;
  const cur = res.currency;
  const progress = res.totalCost.minor === 0n ? 0 : Number((res.totalSaved.minor * 100n) / res.totalCost.minor);

  return (
    <main className="wrap">
      <header className="brand">
        <button className="ghost" onClick={() => setScreen("form")}>Edit goal</button>
        <span className="tag">{planView.active.productName}</span>
      </header>

      <section className="card">
        <div className="pill" data-status={res.status}>{statusLabel(res.status)}</div>
        <div className="bar" role="progressbar" aria-valuenow={Math.min(progress, 100)} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
        <p className="muted small">{progress}% saved of {formatMoney(res.totalCost)}</p>
        <dl className="stats">
          <div><dt>Remaining</dt><dd>{formatMoney(res.remaining)}</dd></div>
          <div><dt>Days left</dt><dd>{res.daysRemaining}</dd></div>
          {res.requiredDaily && <div><dt>Per day</dt><dd>{formatMoney(res.requiredDaily)}</dd></div>}
          {res.requiredWeekly && <div><dt>Per week</dt><dd>{formatMoney(res.requiredWeekly)}</dd></div>}
          {res.requiredMonthly && <div><dt>Per month</dt><dd>{formatMoney(res.requiredMonthly)}</dd></div>}
          <div><dt>Ready by</dt><dd>{res.readinessDate ?? "Not at current rate"}</dd></div>
        </dl>
        <p className="small muted">
          Reported {formatMoney(res.reported)} · Verified on-chain {formatMoney(res.verified)}
        </p>
        {res.suggestions.length > 0 && (
          <div className="notice">
            <strong>Options</strong>
            <ul>{res.suggestions.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Price shock simulator</h2>
        <p className="small muted">Hypothetical scenarios, not predictions.</p>
        <div className="table">
          {planView.scenarios.map((s) => (
            <div className="trow" key={s.label}>
              <span>{s.label}</span>
              <span>{formatMoney(s.adjustedPrice)}</span>
              <span>{s.outcome.ok ? (s.outcome.result.achievable ? "Feasible" : "Not feasible") : "Invalid"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Alternatives</h2>
        <p className="small muted">Enter products manually. Nothing is fetched from the web.</p>
        {alts.map((a, i) => (
          <div className="row" key={i}>
            <input aria-label="Alternative name" placeholder="Name" value={a.name}
              onChange={(e) => setAlts(alts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <input aria-label="Alternative price" inputMode="decimal" placeholder={`Price (${cur})`} value={a.price}
              onChange={(e) => setAlts(alts.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
          </div>
        ))}
        <button className="ghost" onClick={() => setAlts([...alts, { name: "", price: "" }])}>Add alternative</button>
        {planView.comparisons.map((c) => (
          <div className="trow" key={c.name}>
            <span>{c.name}</span>
            <span>{formatMoney(c.price)}</span>
            <span>{c.outcome.ok ? (c.outcome.result.achievable ? "Feasible" : "Not feasible") : "Invalid"}</span>
          </div>
        ))}
        {target !== "original" && <p className="small">Active target: {target}</p>}
        {planView.comparisons.length > 0 && (
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="original">Keep original: {input.productName}</option>
            {planView.comparisons.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        )}
      </section>
    </main>
  );
}
