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
  activeAlternativeId?: string; // when set, the plan uses this alternative's price
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
