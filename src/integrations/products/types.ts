import type { Frequency } from "../../lib/engine";

export type PriceSource = "user_entered" | "provider" | "merchant_quote";

// Amounts are stored as integer minor units in string form (JSON-safe).
export interface PriceObservation {
  minor: string;
  currency: string;
  at: string; // YYYY-MM-DD
  source: PriceSource;
  sourceRef?: string;
}

export interface TrackedProduct {
  id: string;
  name: string;
  url: string;
  merchant?: string;
  currency: string;
  targetMinor: string;
  savedMinor: string;
  contributionMinor: string;
  frequency: Frequency;
  targetDate: string;
  deliveryMinor: string;
  otherMinor: string;
  history: PriceObservation[]; // never empty
  trackingMode: "manual";
  createdAt: string;
  archived?: boolean;
  alternatives?: Alternative[];
  contributions?: Contribution[];
  priceLock?: PriceLock;
  savingsTarget?: "live" | "locked"; // which fiat amount the savings plan follows
  savingsAsset?: "NIM";              // USDC is not offered until its network and payments are verified
  activeAlternativeId?: string; // when set, the plan uses this alternative's price
}

// A NIM payment sent through Nimiq Pay. "submitted" means the wallet returned a hash.
// It does not prove the transaction executed. Only "verified" counts as verified savings.
export interface Contribution {
  id: string;
  minor: string; // Luna (1 NIM = 100,000 Luna)
  currency: "NIM";
  at: string;
  status: "submitted" | "verified" | "failed";
  verifiedAt?: string;
  note?: string;
  txHash: string;
  recipient: string;
}

// A Price Lock records the fiat amount the user chose to protect as their savings target.
// It never changes on its own. It is a record of the user's target, not a merchant guarantee.
export interface PriceLock {
  minor: string;      // fiat amount in minor units
  currency: string;
  createdAt: string;  // YYYY-MM-DD
}

export interface Alternative {
  id: string;
  name: string;
  minor: string;
  requirements?: string;
}

export type LookupResult =
  | { status: "unavailable"; reason: string }
  | { status: "found"; name: string; minor: string; currency: string; merchant?: string };

export interface ProductProvider {
  id: string;
  canHandle(url: string): boolean;
  lookup(url: string): Promise<LookupResult>;
}
