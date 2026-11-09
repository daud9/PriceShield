import { money, scaleRatio, type Money } from "./money";

// 1 NIM = 100,000 Luna (5 decimals). Rates are fiat minor units per 1 NIM.
const LUNA_PER_NIM = 100000n;

/** Indicative estimate only. This does not move any funds. */
export function fiatToNim(fiat: Money, rateMinor: bigint): Money {
  if (rateMinor <= 0n) throw new Error("Rate must be greater than zero.");
  return money(scaleRatio(fiat, LUNA_PER_NIM, rateMinor).minor, "NIM");
}

/** Indicative estimate only. This does not move any funds. */
export function nimToFiat(nim: Money, rateMinor: bigint, currency: string): Money {
  if (rateMinor <= 0n) throw new Error("Rate must be greater than zero.");
  return money(scaleRatio(nim, rateMinor, LUNA_PER_NIM).minor, currency);
}
