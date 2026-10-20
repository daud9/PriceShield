import { useState } from "react";
import { isInNimiqPay } from "../nimiq/nimiq";
import Menu, { type NavTarget } from "./Menu";

interface Props {
  onNavigate: (target: NavTarget) => void;
}

function ShieldLogo() {
  return (
    <svg className="shield-logo" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ps-shield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#6d4df0" />
        </linearGradient>
      </defs>
      <path d="M24 4 L41 10 V22 C41 33 34 40 24 44 C14 40 7 33 7 22 V10 Z" fill="url(#ps-shield)" />
      <path
        d="M15 31 L21 24 L26 28 L33 19"
        fill="none"
        stroke="#ffc857"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Icon({ kind }: { kind: "tag" | "grid" | "compare" }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (kind === "tag") {
    return (
      <svg {...common}>
        <path d="M3 12V4h8l10 10-8 8L3 12z" />
        <circle cx="7.5" cy="8.5" r="1.2" />
      </svg>
    );
  }
  if (kind === "grid") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="8" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
        <rect x="13" y="13" width="8" height="8" rx="2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M7 4v16M17 4v16M4 8h6M14 16h6" />
    </svg>
  );
}

/** Illustrative only. Fixed sample values and a sample line, not user or market data. */
function PriceTagPreview() {
  return (
    <section className="ticket" aria-label="Illustrative example">
      <div className="ticket-top">
        <span className="chip">Illustrative sample</span>
        <span className="pill" data-status="on_track">On track</span>
      </div>
      <h3>Laptop</h3>
      <svg className="spark" viewBox="0 0 300 70" role="img" aria-label="Sample price line, not real data">
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8b6cff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#8b6cff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 20 L50 28 L100 18 L150 34 L200 26 L250 44 L300 40 L300 70 L0 70 Z" fill="url(#spark-fill)" />
        <path d="M0 20 L50 28 L100 18 L150 34 L200 26 L250 44 L300 40" fill="none" stroke="#ffc857" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <div className="ticket-grid">
        <div><span className="muted small">Current</span><strong>USD 700</strong></div>
        <div><span className="muted small">Target</span><strong>USD 650</strong></div>
        <div><span className="muted small">Saved</span><strong>USD 200</strong></div>
        <div><span className="muted small">Remaining</span><strong>USD 500</strong></div>
      </div>
      <div className="bar" role="img" aria-label="Sample savings progress: 29 percent">
        <div style={{ width: "29%" }} />
      </div>
      <p className="small muted">29% of the total cost saved. Sample figures only.</p>
    </section>
  );
}

const BENEFITS = [
  { title: "Plan your savings", text: "See the daily, weekly, or monthly amount you need to reach your goal." },
  { title: "Track prices yourself", text: "Record prices you see, keep a history, and get alerts when they change." },
  { title: "Know when to buy", text: "Check your readiness date and whether your deadline is still achievable." },
];

export default function Landing({ onNavigate }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (target: NavTarget) => {
    setMenuOpen(false);
    onNavigate(target);
  };

  return (
    <main className="wrap landing">
      <header className="topbar">
        <button
          className="menu-btn"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="main-menu"
          onClick={() => setMenuOpen(true)}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <span className="logo-lockup">
          <ShieldLogo />
          <span className="logo">PriceShield</span>
        </span>
      </header>

      <Menu open={menuOpen} current="intro" onClose={() => setMenuOpen(false)} onNavigate={go} />

      <section className="hero">
        <p className="eyebrow">Know when you can afford it.</p>
        <h1>Your next big purchase. <span className="accent">Under control.</span></h1>
        <p className="lead">Track prices, plan your savings, and know when the right time to buy arrives.</p>
        <button className="primary cta" onClick={() => go("track")}>Create a Purchase Goal</button>
        <div className="tiles">
          <button className="tile" onClick={() => go("track")}>
            <Icon kind="tag" />
            <span>Track a Product</span>
          </button>
          <button className="tile" onClick={() => go("dashboard")}>
            <Icon kind="grid" />
            <span>My Dashboard</span>
          </button>
          <button className="tile" onClick={() => go("compare")}>
            <Icon kind="compare" />
            <span>Compare</span>
          </button>
        </div>
      </section>

      <PriceTagPreview />

      <section className="benefits" aria-label="What PriceShield does">
        {BENEFITS.map((b, i) => (
          <article className="benefit" key={b.title}>
            <span className="benefit-num">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h3>{b.title}</h3>
              <p className="small muted">{b.text}</p>
            </div>
          </article>
        ))}
      </section>

      <footer className="footnote small muted">
        <p>
          Prices are entered by you. PriceShield does not monitor stores live, and it does not hold or lock your funds.
        </p>
        {isInNimiqPay() && <p>Connected to Nimiq Pay.</p>}
      </footer>
    </main>
  );
}
