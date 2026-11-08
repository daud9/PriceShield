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
  activeAlternativeId?: string; // when set, the plan uses this alternative's price
}

// A NIM payment sent through Nimiq Pay. "submitted" means the wallet returned a hash.
// It does not prove the transaction executed. Only "verified" counts as verified savings.
export interface Contribution {
  id: string;
  minor: string; // Luna (1 NIM = 100,000 Luna)
  currency: "NIM";
  at: string;
  status: "submitted" | "verified";
  txHash: string;
  recipient: string;
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
