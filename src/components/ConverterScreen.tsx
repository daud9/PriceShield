import { useState } from "react";
import { fiatToNim, nimToFiat } from "../lib/converter";
import { formatMoney, money, tryParseMoney } from "../lib/money";
import { isStale, loadRates, saveRates, type RateBook } from "../lib/rates";

const FIAT = ["EUR", "GBP", "NGN"] as const;
type Fiat = (typeof FIAT)[number];

export default function ConverterScreen({ onBack }: { onBack: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [book, setBook] = useState<RateBook>(() => loadRates());
  const [currency, setCurrency] = useState<Fiat>("GBP");
  const [direction, setDirection] = useState<"fiatToNim" | "nimToFiat">("fiatToNim");
  const [amount, setAmount] = useState("");
  const [rateText, setRateText] = useState("");
  const [rateMessage, setRateMessage] = useState("");

  const rate = book[currency];

  function saveRate() {
    const parsed = tryParseMoney(rateText, currency);
    if (typeof parsed === "string") {
      setRateMessage(parsed);
      return;
    }
    if (parsed.minor <= 0n) {
      setRateMessage("Enter a rate greater than zero.");
      return;
    }
    const next: RateBook = { ...book, [currency]: { rateMinor: parsed.minor.toString(), updatedAt: today } };
    setBook(next);
    saveRates(next);
    setRateText("");
    setRateMessage(`Saved. 1 NIM = ${formatMoney(money(parsed.minor, currency))}.`);
  }

  // Conversion result
  let result: string | null = null;
  let resultError: string | null = null;
  if (amount.trim() && rate) {
    const parsedAmount = tryParseMoney(amount, direction === "fiatToNim" ? currency : "NIM");
    if (typeof parsedAmount === "string") {
      resultError = parsedAmount;
    } else {
      const r = BigInt(rate.rateMinor);
      result = formatMoney(
        direction === "fiatToNim" ? fiatToNim(parsedAmount, r) : nimToFiat(parsedAmount, r, currency),
      );
    }
  }

  return (
    <main className="wrap">
      <header className="brand">
        <button className="ghost" onClick={onBack}>Back</button>
        <span className="tag">Currency Converter</span>
      </header>

      <section className="notice">
        <strong>Estimates only.</strong>
        <p className="small">
          Rates are entered by you, not taken from a market feed. Conversions are indicative. No swap or payment
          happens here.
        </p>
      </section>

      <section className="card">
        <h2>Your rate</h2>
        <label>
          Fiat currency
          <select value={currency} onChange={(e) => { setCurrency(e.target.value as Fiat); setRateMessage(""); }}>
            {FIAT.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        {rate ? (
          <p className="small">
            1 NIM = {formatMoney(money(BigInt(rate.rateMinor), currency))}, entered {rate.updatedAt}.
            {isStale(rate.updatedAt, today) && " This rate is more than 7 days old. Please update it."}
          </p>
        ) : (
          <p className="small muted">No rate entered for {currency} yet.</p>
        )}
        <label>
          New rate: {currency} per 1 NIM
          <input inputMode="decimal" value={rateText} onChange={(e) => setRateText(e.target.value)} />
        </label>
        <button className="primary" type="button" onClick={saveRate}>Save rate</button>
        {rateMessage && <p className="small" role="status">{rateMessage}</p>}
      </section>

      <section className="card">
        <h2>Convert</h2>
        <label>
          Direction
          <select value={direction} onChange={(e) => setDirection(e.target.value as "fiatToNim" | "nimToFiat")}>
            <option value="fiatToNim">{currency} to NIM</option>
            <option value="nimToFiat">NIM to {currency}</option>
          </select>
        </label>
        <label>
          Amount ({direction === "fiatToNim" ? currency : "NIM"})
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>

        {!rate && <p className="small muted">Enter a rate above to convert.</p>}
        {resultError && <p className="errors">{resultError}</p>}
        {result && (
          <div className="notice">
            <strong>Estimated {direction === "fiatToNim" ? "NIM" : currency}:</strong> {result}
            <p className="small muted">Rate: 1 NIM = {formatMoney(money(BigInt(rate!.rateMinor), currency))}</p>
            <p className="small muted">Rate provider: entered by you. Last updated: {rate!.updatedAt}</p>
          </div>
        )}
      </section>

      <section className="card">
        <p className="small muted">USDC conversions are not available yet.</p>
      </section>
    </main>
  );
}
