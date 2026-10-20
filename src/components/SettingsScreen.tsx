import { useState } from "react";
import { loadProducts, saveProducts } from "../lib/productStorage";
import { isInNimiqPay } from "../nimiq/nimiq";

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [count, setCount] = useState(() => loadProducts().length);
  const [exported, setExported] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [notice, setNotice] = useState("");

  function exportData() {
    const text = JSON.stringify(loadProducts(), null, 2);
    setExported(text);
    setNotice("Your data is shown below. Copy it to keep a backup.");
  }

  function deleteAll() {
    if (confirmText !== "DELETE") {
      setNotice('Type DELETE in the box to confirm.');
      return;
    }
    saveProducts([]);
    setCount(0);
    setExported("");
    setConfirmText("");
    setNotice("All tracked products, savings plans, and price history were deleted from this browser.");
  }

  return (
    <main className="wrap">
      <header className="brand">
        <button className="ghost" onClick={onBack}>Back</button>
        <span className="tag">Settings</span>
      </header>

      {notice && <p className="notice small" role="status">{notice}</p>}

      <section className="card">
        <h2>Your data</h2>
        <p className="small">Tracked products saved on this device: {count}</p>
        <p className="small muted">
          Data is stored only in this browser on this device. It does not sync to other devices, and it is not a
          secure cloud backup. Clearing browser data will delete it.
        </p>
        <button className="ghost" onClick={exportData}>Export my data</button>
        {exported && <pre className="report-text">{exported}</pre>}
      </section>

      <section className="card">
        <h2>Delete data</h2>
        <p className="small muted">
          This deletes every tracked product, its savings plan, and its price history on this device. It cannot be
          undone.
        </p>
        <label>
          Type DELETE to confirm
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
        </label>
        <button className="primary" onClick={deleteAll}>Delete all data</button>
      </section>

      <section className="card">
        <h2>How tracking works</h2>
        <p className="small muted">
          Prices are tracked manually. You enter each price, and PriceShield records it. PriceShield does not monitor
          product pages or stores.
        </p>
      </section>

      <section className="card">
        <h2>Nimiq Pay</h2>
        <p className="small muted">
          {isInNimiqPay()
            ? "Connected to Nimiq Pay."
            : "Not connected. Nimiq Pay payments are not implemented yet, so no payment or contribution is recorded."}
        </p>
      </section>
    </main>
  );
}
