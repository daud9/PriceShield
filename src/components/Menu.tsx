import { useEffect } from "react";

export type NavTarget =
  | "intro"
  | "dashboard"
  | "track"
  | "compare"
  | "intelligence"
  | "savings"
  | "alerts"
  | "settings";

// Every item opens a working screen.
const ITEMS: { label: string; target: NavTarget }[] = [
  { label: "Overview", target: "intro" },
  { label: "My Goals", target: "dashboard" },
  { label: "Tracked Products", target: "track" },
  { label: "Price Intelligence", target: "intelligence" },
  { label: "Compare Products", target: "compare" },
  { label: "Savings Progress", target: "savings" },
  { label: "Alerts", target: "alerts" },
  { label: "Settings", target: "settings" },
];

interface Props {
  open: boolean;
  current: NavTarget;
  onClose: () => void;
  onNavigate: (target: NavTarget) => void;
}

export default function Menu({ open, current, onClose, onNavigate }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button className="scrim" aria-label="Close menu" onClick={onClose} />
      <nav className="drawer" id="main-menu" aria-label="Main menu">
        <div className="drawer-head">
          <span className="logo">Menu</span>
          <button className="menu-btn" aria-label="Close menu" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {ITEMS.map((item) => (
          <button
            key={item.target}
            className="drawer-item"
            aria-current={item.target === current ? "page" : undefined}
            onClick={() => onNavigate(item.target)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </>
  );
}
