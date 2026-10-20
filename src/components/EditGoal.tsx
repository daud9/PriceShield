import { useState, type ChangeEvent, type FormEvent } from "react";
import type { TrackedProduct } from "../integrations/products/types";
import { validatePlan, type Frequency } from "../lib/engine";
import { money, toDecimalString, tryParseMoney, type Money } from "../lib/money";
import { planInput } from "../lib/alerts";
import { validateProductUrl } from "../lib/url";

interface Props {
  product: TrackedProduct;
  today: string;
  onSave: (p: TrackedProduct) => void;
  onCancel: () => void;
}

/** Edits details and the savings plan. The recorded price is changed with "Update price", not here. */
export default function EditGoal({ product, today, onSave, onCancel }: Props) {
  const cur = product.currency;
  const dec = (minor: string) => toDecimalString(money(BigInt(minor), cur));
  const [f, setF] = useState({
    name: product.name,
    url: product.url,
    merchant: product.merchant ?? "",
    target: dec(product.targetMinor),
    saved: dec(product.savedMinor),
    contribution: dec(product.contributionMinor),
    frequency: product.frequency as Frequency,
    targetDate: product.targetDate,
    delivery: dec(product.deliveryMinor),
    other: dec(product.otherMinor),
  });
  const [errors, setErrors] = useState<string[]>([]);

  const set =
    (k: Exclude<keyof typeof f, "frequency">) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF({ ...f, [k]: e.target.value });

  function submit(e: FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    const url = validateProductUrl(f.url);
    if (!url.ok) errs.push(url.error);
    if (!f.name.trim()) errs.push("Enter a product name.");

    const values = [f.target, f.saved, f.contribution, f.delivery, f.other].map((raw) =>
      tryParseMoney(raw || "0", cur),
    );
    const bad = values.find((v): v is string => typeof v === "string");
    if (bad) errs.push(bad);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    const [target, saved, contribution, delivery, other] = values as Money[];
    const updated: TrackedProduct = {
      ...product,
      name: f.name.trim(),
      url: url.ok ? url.url : product.url,
      merchant: f.merchant.trim() || undefined,
      targetMinor: target.minor.toString(),
      savedMinor: saved.minor.toString(),
      contributionMinor: contribution.minor.toString(),
      frequency: f.frequency,
      targetDate: f.targetDate,
      deliveryMinor: delivery.minor.toString(),
      otherMinor: other.minor.toString(),
    };
    const check = validatePlan(planInput(updated, today));
    if (check.length > 0) {
      setErrors(check);
      return;
    }
    onSave(updated);
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      <h2>Edit goal</h2>
      <p className="small muted">
        The recorded price stays as it is. Use Update price on the goal to record a new price.
      </p>
      {errors.length > 0 && (
        <ul className="errors" role="alert">{errors.map((er) => <li key={er}>{er}</li>)}</ul>
      )}
      <label>Product link<input type="url" value={f.url} onChange={set("url")} /></label>
      <label>Product name<input value={f.name} onChange={set("name")} /></label>
      <label>Merchant (optional)<input value={f.merchant} onChange={set("merchant")} /></label>
      <label>Target price ({cur})<input inputMode="decimal" value={f.target} onChange={set("target")} /></label>
      <label>Savings ({cur})<input inputMode="decimal" value={f.saved} onChange={set("saved")} /></label>
      <div className="row">
        <label>Contribution<input inputMode="decimal" value={f.contribution} onChange={set("contribution")} /></label>
        <label>
          Every
          <select value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value as Frequency })}>
            <option value="daily">Day</option><option value="weekly">Week</option><option value="monthly">Month</option>
          </select>
        </label>
      </div>
      <label>Target purchase date<input type="date" min={today} value={f.targetDate} onChange={set("targetDate")} /></label>
      <div className="row">
        <label>Delivery cost<input inputMode="decimal" value={f.delivery} onChange={set("delivery")} /></label>
        <label>Taxes or other<input inputMode="decimal" value={f.other} onChange={set("other")} /></label>
      </div>
      <div className="row">
        <button className="primary" type="submit">Save changes</button>
        <button className="ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
