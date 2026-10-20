import { isInNimiqPay } from "../nimiq/nimiq";

interface Props {
  onCreateGoal: () => void;
  onTrackProduct: () => void;
  onDashboard: () => void;
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
      <path
        d="M24 4 L41 10 V22 C41 33 34 40 24 44 C14 40 7 33 7 22 V10 Z"
        fill="url(#ps-shield)"
      />
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

/** Illustrative only. These figures are fixed sample values, not user or market data. */
function SamplePreview() {
  return (
    <section className="card preview" aria-label="Illustrative example">
      <p className="small muted">Illustrative example. Not real data.</p>
      <h3>Laptop</h3>
      <dl className="stats">
        <div><dt>Current price</dt><dd>USD 700</dd></div>
        <div><dt>Target price</dt><dd>USD 650</dd></div>
        <div><dt>Saved</dt><dd>USD 200</dd></div>
        <div><dt>Remaining</dt><dd>USD 500</dd></div>
      </dl>
      <div className="bar" role="img" aria-label="Sample savings progress: 29 percent">
        <div style={{ width: "29%" }} />
      </div>
      <p className="small muted">29% of the total cost saved</p>
      <span className="pill" data-status="on_track">Sample status: on track</span>
    </section>
  );
}

const BENEFITS = [
  {
    title: "Plan your savings",
    text: "See the daily, weekly, or monthly amount you need to reach your goal.",
  },
  {
    title: "Track prices yourself",
    text: "Record prices you see, keep a history, and get alerts when they change.",
  },
  {
    title: "Know when to buy",
    text: "Check your readiness date and whether your deadline is still achievable.",
  },
];

export default function Landing({ onCreateGoal, onTrackProduct, onDashboard }: Props) {
  return (
    <main className="wrap landing">
      <header className="brand">
        <span className="logo-lockup">
          <ShieldLogo />
          <span className="logo">PriceShield</span>
        </span>
        <span className="tag">Know when you can afford it.</span>
      </header>

      <section className="hero">
        <p className="eyebrow">Smart purchase planning</p>
        <h1>Your next big purchase. Under control.</h1>
        <p className="lead">
          Track prices, plan your savings, and know when the right time to buy arrives.
        </p>
        <div className="hero-actions">
          <button className="primary" onClick={onCreateGoal}>Create a Purchase Goal</button>
          <button className="ghost" onClick={onTrackProduct}>Track a Product</button>
          <button className="ghost" onClick={onDashboard}>My Dashboard</button>
        </div>
      </section>

      <SamplePreview />

      <section className="benefits" aria-label="What PriceShield does">
        {BENEFITS.map((b) => (
          <article className="benefit" key={b.title}>
            <h3>{b.title}</h3>
            <p className="small muted">{b.text}</p>
          </article>
        ))}
      </section>

      <footer className="footnote small muted">
        <p>
          Prices are entered by you. PriceShield does not monitor stores live, and it does not hold or
          lock your funds.
        </p>
        {isInNimiqPay() && <p>Connected to Nimiq Pay.</p>}
      </footer>
    </main>
  );
}
