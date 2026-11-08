import { useState } from "react";
import { loadProducts } from "../lib/productStorage";
import { useWalletState, walletLabel } from "../nimiq/nimiq";
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

/** Shown only when no data is saved. It contains no figures. */
function GettingStarted({ onNavigate }: { onNavigate: (t: NavTarget) => void }) {
  return (
    <section className="card" aria-label="Getting started">
      <h2>Start your first plan</h2>
      <p className="small muted">
        You have no saved goals yet. PriceShield only shows figures you enter.
      </p>
      <ol className="steps">
        <li>Paste a product link and enter its current price.</li>
        <li>Set a target price, the savings you have, and a regular contribution.</li>
        <li>Record new prices when you see them, and check your readiness date.</li>
      </ol>
      <button className="primary" onClick={() => onNavigate("track")}>Track your first product</button>
    </section>
  );
}

function ContinueCard({ onNavigate }: { onNavigate: (t: NavTarget) => void }) {
  return (
    <section className="card" aria-label="Your plans">
      <h2>Your plans</h2>
      <p className="small muted">Open your dashboard to see your goals, savings and deadlines.</p>
      <button className="primary" onClick={() => onNavigate("dashboard")}>Open my dashboard</button>
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
  const [hasData] = useState(() => loadProducts().length > 0);
  const wallet = useWalletState();
  const chipText =
    wallet.status === "connected"
      ? "Nimiq connected"
      : wallet.status === "connecting"
        ? "Connecting..."
        : "Nimiq not connected";

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
        <span className="chip" data-wallet={wallet.status} style={{ marginLeft: "auto" }}>{chipText}</span>
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

      {hasData ? <ContinueCard onNavigate={go} /> : <GettingStarted onNavigate={go} />}

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
        <p>{walletLabel(wallet)}</p>
      </footer>
    </main>
  );
}
