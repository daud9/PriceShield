import { useState, type FormEvent } from "react";
import type { Contribution, TrackedProduct } from "../integrations/products/types";
import {
  addContribution, normalizeNimAddress, NIM_CURRENCY, parseNimAmount, submittedMinor, verifiedMinor,
} from "../lib/contributions";
import { formatMoney, money, type Money } from "../lib/money";
import { fetchTransactionsByAddress } from "../lib/rpc";
import { checkContribution, extractTransactions } from "../lib/verification";
import { connectNimiq, sendContribution, useWalletState } from "../nimiq/nimiq";

interface Props {
  product: TrackedProduct;
  today: string;
  onUpdate: (p: TrackedProduct) => void;
}

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const LABEL: Record<Contribution["status"], string> = {
  submitted: "Submitted, not verified",
  verified: "Verified on-chain",
  failed: "Failed on-chain",
};

export default function ContributionPanel({ product, today, onUpdate }: Props) {
  const wallet = useWalletState();
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const contributions = product.contributions ?? [];
  const connected = wallet.status === "connected";

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    const parsed = parseNimAmount(amount);
    if (typeof parsed === "string") errs.push(parsed);
    else if (parsed.minor <= 0n) errs.push("Enter an amount greater than zero.");
    const address = normalizeNimAddress(recipient);
    if (!address) errs.push("Enter a valid Nimiq address, which starts with NQ.");
    if (errs.length > 0) {
      setErrors(errs);
      setMessage("");
      return;
    }
    if (!connected) {
      setErrors(["Connect Nimiq Pay before sending."]);
      return;
    }
    const amt = parsed as Money;
    setErrors([]);
    setBusy(true);
    setMessage("Waiting for your approval in Nimiq Pay...");
    const result = await sendContribution(address!, amt.minor);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.reason);
      return;
    }
    const record: Contribution = {
      id: newId(),
      minor: amt.minor.toString(),
      currency: NIM_CURRENCY,
      at: today,
      status: "submitted",
      txHash: result.txHash,
      recipient: address!,
    };
    onUpdate(addContribution(product, record));
    setAmount("");
    setRecipient("");
    setMessage("Sent to Nimiq Pay for approval. Use Verify on-chain to confirm it on the network.");
  }

  async function verify(c: Contribution) {
    setCheckingId(c.id);
    setMessage("");
    const res = await fetchTransactionsByAddress(c.recipient);
    setCheckingId(null);
    if (!res.ok) {
      setMessage(`${res.reason} The contribution is still submitted, not verified.`);
      return;
    }
    const outcome = checkContribution(extractTransactions(res.body), c);
    const status: Contribution["status"] =
      outcome.status === "verified" ? "verified" : outcome.status === "failed" ? "failed" : "submitted";
    const next = contributions.map((x) =>
      x.id === c.id
        ? { ...x, status, verifiedAt: status === "verified" ? today : x.verifiedAt, note: outcome.note }
        : x,
    );
    onUpdate({ ...product, contributions: next });
    setMessage(outcome.note);
  }

  return (
    <section className="stack">
      <h3 className="small">NIM contributions</h3>
      <p className="small muted">
        Verified on-chain: {formatMoney(money(verifiedMinor(product), NIM_CURRENCY))}. Submitted, not verified:{" "}
        {formatMoney(money(submittedMinor(product), NIM_CURRENCY))}.
      </p>
      <p className="small muted">
        Enter an address you control. PriceShield does not hold or lock these funds.
      </p>

      {!connected && (
        <div className="row">
          <p className="small muted">Connect Nimiq Pay to send a contribution.</p>
          <button className="ghost" type="button" onClick={() => connectNimiq()}>Connect</button>
        </div>
      )}

      <form onSubmit={submit} noValidate className="stack">
        {errors.length > 0 && (
          <ul className="errors" role="alert">{errors.map((er) => <li key={er}>{er}</li>)}</ul>
        )}
        <label>Amount (NIM)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label>
          Destination Nimiq address
          <input value={recipient} onChange={(e) => setRecipient(e.target.value)} autoComplete="off" />
        </label>
        <button className="primary" type="submit" disabled={busy || !connected}>
          {busy ? "Waiting for Nimiq Pay..." : "Send from Nimiq Pay"}
        </button>
      </form>
      {message && <p className="small" role="status">{message}</p>}

      {contributions.map((c) => (
        <div className="stack" key={c.id}>
          <div className="trow">
            <span>{c.at}</span>
            <span>{formatMoney(money(BigInt(c.minor), NIM_CURRENCY))}</span>
            <span>{LABEL[c.status]}</span>
            <span className="small muted">Ref {c.txHash.slice(0, 10)}...</span>
          </div>
          {c.status === "submitted" && (
            <button
              className="ghost"
              type="button"
              disabled={checkingId === c.id}
              onClick={() => verify(c)}
            >
              {checkingId === c.id ? "Checking network..." : "Verify on-chain"}
            </button>
          )}
          {c.note && c.status !== "submitted" && <p className="small muted">{c.note}</p>}
        </div>
      ))}
    </section>
  );
}
