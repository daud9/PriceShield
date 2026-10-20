import { useState, type ChangeEvent, type FormEvent } from "react";
import type { TrackedProduct } from "../integrations/products/types";
import { lookupProduct } from "../integrations/products";
import { evaluatePlan, validatePlan, type Frequency } from "../lib/engine";
import { formatMoney, money, parseMoney, type Money } from "../lib/money";
import { loadProducts, saveProducts } from "../lib/productStorage";
import { latestObservation, recordPrice } from "../lib/priceHistory";
import { alertsForChange, planInput, type Alert } from "../lib/alerts";
import { validateProductUrl } from "../lib/url";

interface FormState {
  url: string;
  name: string;
  merchant: string;
  currency: string;
  price: string;
  target: string;
  saved: string;
  contribution: string;
  frequency: Frequency;
  targetDate: string;
  delivery: string;
  other: string;
}

const blank: FormState = {
  url: "", name: "", merchant: "", currency: "USD", price: "", target: "", saved: "0",
  contribution: "", frequency: "weekly", targetDate: "", delivery: "0", other: "0",
};

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function tryMoney(raw: string, currency: string): Money | string {
  try {
    return parseMoney(raw, currency);
  } catch (e) {
    return (e as Error).message;
  }
}

interface Amounts {
  price: Money;
  target: Money;
  saved: Money;
  contribution: Money;
  delivery: Money;
  other: Money;
}

function parseAmounts(f: FormState): Amounts | string {
  const c = f.currency;
  const parts = {
    price: tryMoney(f.price, c),
    target: tryMoney(f.target || f.price, c),
    saved: tryMoney(f.saved || "0", c),
    contribution: tryMoney(f.contribution || "0", c),
    delivery: tryMoney(f.delivery || "0", c),
    other: tryMoney(f.other || "0", c),
  };
  for (const v of Object.values(parts)) {
    if (typeof v === "string") return v;
  }
  return parts as Amounts;
}

type BuildResult = { ok: true; product: TrackedProduct } | { ok: false; errors: string[] };

function buildProduct(f: FormState, today: string): BuildResult {
  const errors: string[] = [];
  const url = validateProductUrl(f.url);
  if (!url.ok) errors.push(url.error);
  if (!f.name.trim()) errors.push("Enter a product name.");

  const amounts = parseAmounts(f);
  if (typeof amounts === "string") return { ok: false, errors: [...errors, amounts] };

  const product: TrackedProduct = {
    id: newId(),
    name: f.name.trim(),
    url: url.ok ? url.url : "",
    merchant: f.merchant.trim() || undefined,
    currency: f.currency,
    targetMinor: amounts.target.minor.toString(),
    savedMinor: amounts.saved.minor.toString(),
    contributionMinor: amounts.contribution.minor.toString(),
    frequency: f.frequency,
    targetDate: f.targetDate,
    deliveryMinor: amounts.delivery.minor.toString(),
    otherMinor: amounts.other.minor.toString(),
    history: [{ minor: amounts.price.minor.toString(), currency: f.currency, at: today, source: "user_entered" }],
    trackingMode: "manual",
    createdAt: today,
  };
  errors.push(...validatePlan(planInput(product, today)));
  return errors.length > 0 ? { ok: false, errors } : { ok: true, product };
}

export default function TrackedProducts({ onBack }: { onBack: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [products, setProducts] = useState<TrackedProduct[]>(() => loadProducts());
  const [form, setForm] = useState<FormState>(blank);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [priceInput, setPriceInput] = useState<Record<string, string>>({});
  const [alerts, setAlerts] = useState<Record<string, Alert[]>>({});

  const persist = (next: TrackedProduct[]) => {
    setProducts(next);
    saveProducts(next);
  };

  const setField =
    (k: Exclude<keyof FormState, "frequency">) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function addProduct(e: FormEvent) {
    e.preventDefault();
    const built = buildProduct(form, today);
    if (!built.ok) {
      setErrors(built.errors);
      setNotice("");
      return;
    }
    const lookup = await lookupProduct(built.product.url);
    setErrors([]);
    setNotice(
      lookup.status === "unavailable"
        ? `${lookup.reason} Your details were saved as you entered them.`
        : "Product added.",
    );
    persist([...products, built.product]);
    setForm(blank);
  }

  function updatePrice(p: TrackedProduct) {
    const parsed = tryMoney(priceInput[p.id] ?? "", p.currency);
    if (typeof parsed === "string") {
      setNotice(parsed);
      return;
    }
    if (parsed.minor <= 0n) {
      setNotice("Enter a price greater than zero.");
      return;
    }
    const result = recordPrice(p, parsed.minor, today);
    if (!result.changed) {
      setNotice("That matches the last recorded price, so nothing was added.");
      return;
    }
    setAlerts({ ...alerts, [p.id]: alertsForChange(result.previous, result.product, today) });
    persist(products.map((x) => (x.id === p.id ? result.product : x)));
    setPriceInput({ ...priceInput, [p.id]: "" });
    setNotice("Price recorded. Savings plan recalculated.");
  }

  function removeProduct(p: TrackedProduct) {
    if (!window.confirm(`Remove "${p.name}"? Its savings plan is removed with it.`)) return;
    persist(products.filter((x) => x.id !== p.id));
    setNotice(`Removed "${p.name}" and its savings plan.`);
  }

  function renderCard(p: TrackedProduct) {
    const cur = p.currency;
    const latest = latestObservation(p);
    const latestAmount = money(BigInt(latest.minor), cur);
    const target = money(BigInt(p.targetMinor), cur);
    const diff = latestAmount.minor - target.minor;
    const outcome = evaluatePlan(planInput(p, today));
    const diffText =
      diff > 0n
        ? `${formatMoney(money(diff, cur))} above target`
        : diff === 0n
          ? "At target"
          : `${formatMoney(money(-diff, cur))} below target`;

    return (
      <section className="card" key={p.id}>
        <h2>{p.name}</h2>
        {p.merchant && <p className="small muted">{p.merchant}</p>}
        <p className="small muted">Manual price tracking. Prices change only when you update them.</p>
        {p.url && (
          <a className="ghost" href={p.url} target="_blank" rel="noopener noreferrer">
            Open product
          </a>
        )}

        <dl className="stats">
          <div><dt>Recorded price</dt><dd>{formatMoney(latestAmount)}</dd></div>
          <div><dt>Target price</dt><dd>{formatMoney(target)}</dd></div>
          <div><dt>Difference</dt><dd>{diffText}</dd></div>
          <div><dt>Last update</dt><dd>{latest.at}</dd></div>
        </dl>

        {outcome.ok ? (
          <dl className="stats">
            <div><dt>Saved</dt><dd>{formatMoney(outcome.result.totalSaved)}</dd></div>
            <div><dt>Remaining</dt><dd>{formatMoney(outcome.result.remaining)}</dd></div>
            <div><dt>Ready by</dt><dd>{outcome.result.readinessDate ?? "Not at current rate"}</dd></div>
            <div><dt>Status</dt><dd>{outcome.result.status.replace("_", " ")}</dd></div>
          </dl>
        ) : (
          <p className="errors">{outcome.errors.join(" ")}</p>
        )}

        {outcome.ok && outcome.result.suggestions.length > 0 && (
          <div className="notice">
            <strong>Options</strong>
            <ul>{outcome.result.suggestions.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        )}

        {(alerts[p.id] ?? []).map((a) => (
          <div className="notice" key={a.kind}>
            <strong>{a.title}</strong>
            <p className="small">{a.detail}</p>
          </div>
        ))}

        <h3 className="small">Price history</h3>
        {p.history.length < 2 && (
          <p className="small muted">Only one price recorded. Update the price when it changes to build a history.</p>
        )}
        <div className="table">
          {p.history.map((h, i) => (
            <div className="trow" key={i}>
              <span>{h.at}</span>
              <span>{formatMoney(money(BigInt(h.minor), h.currency))}</span>
              <span>{h.source === "user_entered" ? "Entered by you" : h.source}</span>
            </div>
          ))}
        </div>

        <div className="row">
          <input
            aria-label="New price"
            inputMode="decimal"
            placeholder={`New price (${cur})`}
            value={priceInput[p.id] ?? ""}
            onChange={(e) => setPriceInput({ ...priceInput, [p.id]: e.target.value })}
          />
          <button className="primary" onClick={() => updatePrice(p)}>Update price</button>
        </div>
        <button className="ghost" onClick={() => removeProduct(p)}>Remove product</button>
      </section>
    );
  }

  return (
    <main className="wrap">
      <header className="brand">
        <button className="ghost" onClick={onBack}>Back</button>
        <span className="tag">My Tracked Products</span>
      </header>

      <form className="card" onSubmit={addProduct} noValidate>
        <h2>Track a Product</h2>
        <p className="small muted">
          Paste a link from a store (https:// only). Prices are entered by you. PriceShield does not fetch them from the store.
        </p>
        {errors.length > 0 && (
          <ul className="errors" role="alert">{errors.map((er) => <li key={er}>{er}</li>)}</ul>
        )}
        {notice && <p className="small" role="status">{notice}</p>}

        <label>
          Product link
          <input type="url" placeholder="Paste a link to the product you want to buy" value={form.url} onChange={setField("url")} />
        </label>
        <label>Product name<input value={form.name} onChange={setField("name")} /></label>
        <label>Merchant (optional)<input value={form.merchant} onChange={setField("merchant")} /></label>
        <div className="row">
          <label>Current price<input inputMode="decimal" value={form.price} onChange={setField("price")} /></label>
          <label>
            Currency
            <select value={form.currency} onChange={setField("currency")}>
              <option>USD</option><option>EUR</option><option>GBP</option><option>NGN</option><option>NIM</option>
            </select>
          </label>
        </div>
        <label>Target price (optional, defaults to current)<input inputMode="decimal" value={form.target} onChange={setField("target")} /></label>
        <label>Current savings<input inputMode="decimal" value={form.saved} onChange={setField("saved")} /></label>
        <div className="row">
          <label>Contribution<input inputMode="decimal" value={form.contribution} onChange={setField("contribution")} /></label>
          <label>
            Every
            <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as Frequency })}>
              <option value="daily">Day</option><option value="weekly">Week</option><option value="monthly">Month</option>
            </select>
          </label>
        </div>
        <label>Target purchase date<input type="date" min={today} value={form.targetDate} onChange={setField("targetDate")} /></label>
        <div className="row">
          <label>Delivery cost<input inputMode="decimal" value={form.delivery} onChange={setField("delivery")} /></label>
          <label>Taxes or other<input inputMode="decimal" value={form.other} onChange={setField("other")} /></label>
        </div>
        <button className="primary" type="submit">Add Product</button>
      </form>

      {products.length === 0 ? (
        <p className="muted small">No tracked products yet.</p>
      ) : (
        products.map(renderCard)
      )}
    </main>
  );
}
