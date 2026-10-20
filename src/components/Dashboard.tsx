import { useMemo, useState } from "react";
import type { TrackedProduct } from "../integrations/products/types";
import { evaluatePlan, type PlanResult } from "../lib/engine";
import { formatMoney, money } from "../lib/money";
import { loadProducts, saveProducts } from "../lib/productStorage";
import { latestObservation } from "../lib/priceHistory";
import { planInput } from "../lib/alerts";
import PriceHistoryChart from "./PriceHistoryChart";
import SavingsProgress from "./SavingsProgress";
import ShareReport from "./ShareReport";
import EditGoal from "./EditGoal";

interface Row {
  p: TrackedProduct;
  r: PlanResult | null;
  latest: ReturnType<typeof money>;
  target: ReturnType<typeof money>;
}

export default function Dashboard({ onBack }: { onBack: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [products, setProducts] = useState<TrackedProduct[]>(() => loadProducts());
  const [openId, setOpenId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const persist = (next: TrackedProduct[]) => {
    setProducts(next);
    saveProducts(next);
  };

  const rows: Row[] = useMemo(
    () =>
      products.map((p) => {
        const outcome = evaluatePlan(planInput(p, today));
        return {
          p,
          r: outcome.ok ? outcome.result : null,
          latest: money(BigInt(latestObservation(p).minor), p.currency),
          target: money(BigInt(p.targetMinor), p.currency),
        };
      }),
    [products, today],
  );

  const active = rows.filter((x) => !x.p.archived);
  const archived = rows.filter((x) => x.p.archived);
  const funded = active.filter((x) => x.r?.status === "funded");
  const onTrack = active.filter((x) => x.r?.status === "on_track");
  const behind = active.filter((x) => x.r && ["behind", "past_deadline", "no_contribution"].includes(x.r.status));
  const upcoming = active
    .filter((x) => x.r && x.r.status !== "funded" && x.r.daysRemaining > 0 && x.r.daysRemaining <= 30)
    .sort((a, b) => (a.r?.daysRemaining ?? 0) - (b.r?.daysRemaining ?? 0));
  const reached = active.filter((x) => x.latest.minor <= x.target.minor);
  const changes = active
    .filter((x) => x.p.history.length > 1)
    .map((x) => {
      const h = x.p.history;
      return { p: x.p, last: h[h.length - 1], prev: h[h.length - 2] };
    })
    .sort((a, b) => b.last.at.localeCompare(a.last.at))
    .slice(0, 5);

  // Totals are kept per currency. Different currencies are never added together.
  const totals: Record<string, { remaining: bigint; saved: bigint }> = {};
  for (const x of active) {
    if (!x.r) continue;
    const t = (totals[x.p.currency] ??= { remaining: 0n, saved: 0n });
    t.remaining += x.r.remaining.minor;
    t.saved += x.r.totalSaved.minor;
  }

  function toggleArchive(p: TrackedProduct) {
    persist(products.map((x) => (x.id === p.id ? { ...x, archived: !p.archived } : x)));
    setNotice(p.archived ? `Restored "${p.name}".` : `Archived "${p.name}". Its data is kept.`);
  }

  function remove(p: TrackedProduct) {
    if (!window.confirm(`Delete "${p.name}"? Its savings plan and price history will be deleted too. This cannot be undone.`)) return;
    persist(products.filter((x) => x.id !== p.id));
    if (openId === p.id) setOpenId(null);
    setNotice(`Deleted "${p.name}" and its savings plan.`);
  }

  function saveEdit(updated: TrackedProduct) {
    persist(products.map((x) => (x.id === updated.id ? updated : x)));
    setEditingId(null);
    setNotice(`Saved changes to "${updated.name}".`);
  }

  function statusLabel(r: PlanResult | null) {
    return r ? r.status.replace("_", " ") : "invalid";
  }

  function goalCard(x: Row) {
    if (editingId === x.p.id) {
      return (
        <EditGoal
          key={x.p.id}
          product={x.p}
          today={today}
          onSave={saveEdit}
          onCancel={() => setEditingId(null)}
        />
      );
    }
    const open = openId === x.p.id;
    return (
      <article className="card" key={x.p.id}>
        <div className="row-between">
          <h3>{x.p.name}</h3>
          <span className="pill" data-status={x.r?.status}>{statusLabel(x.r)}</span>
        </div>
        <p className="small muted">
          {x.p.currency} · Recorded {formatMoney(x.latest)} · Target {formatMoney(x.target)} · Deadline {x.p.targetDate}
        </p>
        {x.r && <SavingsProgress saved={x.r.totalSaved} total={x.r.totalCost} remaining={x.r.remaining} />}
        <div className="row">
          <button className="ghost" onClick={() => setOpenId(open ? null : x.p.id)}>
            {open ? "Hide details" : "Details"}
          </button>
          <button className="ghost" onClick={() => setEditingId(x.p.id)}>Edit</button>
          <button className="ghost" onClick={() => toggleArchive(x.p)}>
            {x.p.archived ? "Restore" : "Archive"}
          </button>
        </div>
        <button className="ghost" onClick={() => remove(x.p)}>Delete goal</button>
        {open && (
          <>
            <h3 className="small">Price history</h3>
            <PriceHistoryChart history={x.p.history} currency={x.p.currency} />
            <ShareReport product={x.p} today={today} />
          </>
        )}
      </article>
    );
  }

  return (
    <main className="wrap">
      <header className="brand">
        <button className="ghost" onClick={onBack}>Back</button>
        <span className="tag">Dashboard</span>
      </header>

      {notice && <p className="notice small" role="status">{notice}</p>}

      {products.length === 0 ? (
        <section className="card">
          <h2>No goals yet</h2>
          <p className="small muted">Track a product to create your first purchase goal.</p>
        </section>
      ) : (
        <>
          <section className="card">
            <h2>Summary</h2>
            <dl className="stats">
              <div><dt>Active goals</dt><dd>{active.length}</dd></div>
              <div><dt>Fully funded</dt><dd>{funded.length}</dd></div>
              <div><dt>On track</dt><dd>{onTrack.length}</dd></div>
              <div><dt>Behind</dt><dd>{behind.length}</dd></div>
            </dl>
            {Object.entries(totals).map(([cur, t]) => (
              <p className="small" key={cur}>
                {cur}: {formatMoney(money(t.saved, cur))} saved, {formatMoney(money(t.remaining, cur))} remaining
              </p>
            ))}
          </section>

          <section className="card">
            <h2>Upcoming deadlines (30 days)</h2>
            {upcoming.length === 0 && <p className="small muted">No deadlines in the next 30 days.</p>}
            {upcoming.map((x) => (
              <p className="small" key={x.p.id}>{x.p.name}: {x.p.targetDate} ({x.r?.daysRemaining} days)</p>
            ))}
          </section>

          <section className="card">
            <h2>Products at or below target</h2>
            {reached.length === 0 && <p className="small muted">No recorded price has reached a target yet.</p>}
            {reached.map((x) => (
              <p className="small" key={x.p.id}>{x.p.name}: {formatMoney(x.latest)} (target {formatMoney(x.target)})</p>
            ))}
          </section>

          <section className="card">
            <h2>Recent price changes</h2>
            {changes.length === 0 && <p className="small muted">No price changes recorded yet.</p>}
            {changes.map((c) => (
              <p className="small" key={c.p.id}>
                {c.p.name}: {formatMoney(money(BigInt(c.prev.minor), c.p.currency))} to{" "}
                {formatMoney(money(BigInt(c.last.minor), c.p.currency))} on {c.last.at}
              </p>
            ))}
          </section>

          <section className="card">
            <h2>Recent contributions</h2>
            <p className="small muted">
              No contributions are recorded. Savings are entered by you. Verified blockchain contributions
              are not connected yet.
            </p>
          </section>

          <section className="card">
            <h2>Goals</h2>
            {active.length === 0 && <p className="small muted">All goals are archived.</p>}
            {active.map(goalCard)}
          </section>

          {archived.length > 0 && (
            <section className="card">
              <button className="ghost" onClick={() => setShowArchived(!showArchived)}>
                {showArchived ? "Hide archived" : `Show archived (${archived.length})`}
              </button>
              {showArchived && archived.map(goalCard)}
            </section>
          )}
        </>
      )}
    </main>
  );
}
