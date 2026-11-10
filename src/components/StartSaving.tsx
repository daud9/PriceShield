import { useState } from "react";
import type { TrackedProduct } from "../integrations/products/types";
import { fiatToNim } from "../lib/converter";
import { formatMoney, money } from "../lib/money";
import { latestObservation } from "../lib/priceHistory";
import { isStale, loadRates } from "../lib/rates";
import { lockPrice, unlockPrice } from "../lib/savings";
import ContributionPanel from "./ContributionPanel";

// NIM equivalents need a rate. Only these fiat currencies have a converter.
const CONVERTIBLE = ["EUR", "GBP", "NGN"];

interface Props {
  product: TrackedProduct;
  today: string;
  onSave: (p: TrackedProduct) => void;
  onClose: () => void;
}

export default function StartSaving({ product, today, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<TrackedProduct>(product);
  const [saved, setSaved] = useState<TrackedProduct | null>(product.savingsAsset ? product : null);
  const [notice, setNotice] = useState("");

  const latest = latestObservation(draft);
  const liveAmount = money(BigInt(latest.minor), draft.currency);
  const lockAmount = draft.priceLock ? money(BigInt(draft.priceLock.minor), draft.currency) : null;
  const mode: "live" | "locked" = draft.savingsTarget === "locked" && lockAmount ? "locked" : "live";
  const targetAmount = mode === "locked" && lockAmount ? lockAmount : liveAmount;

  const rate = loadRates()[draft.currency];
  let nimText: string;
  if (!CONVERTIBLE.includes(draft.currency)) {
    nimText = "NIM equivalent is not available for this currency yet.";
  } else if (!rate) {
    nimText = "Enter a rate in Currency Converter to see the NIM equivalent.";
  } else {
    const nim = fiatToNim(targetAmount, BigInt(rate.rateMinor));
    nimText =
      `About ${formatMoney(nim)} at your manual rate of ${formatMoney(money(BigInt(rate.rateMinor), draft.currency))} per NIM, entered ${rate.updatedAt}.` +
      (isStale(rate.updatedAt, today) ? " This rate is more than 7 days old. Update it in Currency Converter." : "");
  }

  function lock() {
    setDraft(lockPrice(draft, today));
    setNotice("Price locked. The locked amount stays the same until you unlock or update it.");
  }

  function unlock() {
    setDraft(unlockPrice(draft));
    setNotice("Price unlocked. The savings target now follows the live recorded price.");
  }

  function chooseMode(next: "live" | "locked") {
    if (next === "locked" && !draft.priceLock) {
      setNotice("Lock the price first to use the locked target.");
      return;
    }
    setDraft({ ...draft, savingsTarget: next });
    setNotice("");
  }

  function savePlan() {
    const next: TrackedProduct = { ...draft, savingsAsset: "NIM" };
    onSave(next);
    setSaved(next);
    setNotice("Plan saved. Send your first contribution below. Nothing is sent until you approve it in Nimiq Pay.");
  }

  function updateSaved(u: TrackedProduct) {
    setSaved(u);
    onSave(u);
  }

  return (
    <section className="card stack" aria-label="Savings plan">
      <h3>Savings plan</h3>
      <p className="small muted">
        Current price: {formatMoney(liveAmount)}, entered by you on {latest.at}. Prices are not checked from the store.
      </p>

      <div className="row">
        {!draft.priceLock ? (
          <button className="ghost" type="button" onClick={lock}>Lock current price</button>
        ) : (
          <>
            <button className="ghost" type="button" onClick={lock}>Update locked price</button>
            <button className="ghost" type="button" onClick={unlock}>Unlock price</button>
          </>
        )}
      </div>
      {draft.priceLock && (
        <p className="small muted">
          Locked price: {formatMoney(lockAmount!)}, locked on {draft.priceLock.createdAt}. Current price:{" "}
          {formatMoney(liveAmount)}.
        </p>
      )}

      <div className="row">
        <button
          className={mode === "live" ? "primary" : "ghost"}
          type="button"
          aria-pressed={mode === "live"}
          onClick={() => chooseMode("live")}
        >
          Follow live price
        </button>
        <button
          className={mode === "locked" ? "primary" : "ghost"}
          type="button"
          aria-pressed={mode === "locked"}
          onClick={() => chooseMode("locked")}
        >
          Use locked price
        </button>
      </div>

      <p className="small">
        Target: {formatMoney(targetAmount)}. {nimText}
      </p>

      <p className="small"><strong>Savings asset:</strong> NIM</p>
      <p className="small muted">USDC is not available yet. It will be offered once its network and payments are verified.</p>

      <label>
        Savings deadline
        <input
          type="date"
          min={today}
          value={draft.targetDate}
          onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })}
        />
      </label>

      {notice && <p className="small" role="status">{notice}</p>}

      {!saved ? (
        <div className="row">
          <button className="primary" type="button" onClick={savePlan}>Save plan</button>
          <button className="ghost" type="button" onClick={onClose}>Cancel</button>
        </div>
      ) : (
        <>
          <ContributionPanel product={saved} today={today} onUpdate={updateSaved} />
          <button className="ghost" type="button" onClick={onClose}>Close</button>
        </>
      )}
    </section>
  );
}
