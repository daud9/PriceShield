import { useState } from "react";
import type { TrackedProduct } from "../integrations/products/types";
import { buildReport } from "../lib/report";

export default function ShareReport({ product, today }: { product: TrackedProduct; today: string }) {
  const [status, setStatus] = useState("");
  const text = buildReport(product, today);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Report copied.");
    } catch {
      setStatus("Copying is not available here. Select the report text below and copy it.");
    }
  }

  async function share() {
    if (typeof navigator.share !== "function") {
      setStatus("Sharing is not supported in this browser. Use Copy instead.");
      return;
    }
    try {
      await navigator.share({ title: `PriceShield: ${product.name}`, text });
      setStatus("Report shared.");
    } catch {
      setStatus("Sharing was cancelled or failed.");
    }
  }

  return (
    <div className="report">
      <div className="row">
        <button className="ghost" onClick={copy}>Copy report</button>
        <button className="ghost" onClick={share}>Share report</button>
      </div>
      <button className="ghost" onClick={() => window.print()}>Print</button>
      {status && <p className="small" role="status">{status}</p>}
      <pre className="report-text">{text}</pre>
    </div>
  );
}
