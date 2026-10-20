// Decimal-safe money. Amounts are stored as integer minor units (e.g. cents)
// with the currency attached. No floating point is used for money.

export interface Money {
  minor: bigint;
  currency: string;
}

export class MoneyError extends Error {}

const DECIMALS: Record<string, number> = {
  USD: 2, EUR: 2, GBP: 2, NGN: 2, CAD: 2, AUD: 2,
  JPY: 0,
  NIM: 5,
};

export function decimalsFor(currency: string): number {
  return DECIMALS[currency] ?? 2;
}

export function money(minor: bigint, currency: string): Money {
  return { minor, currency };
}

/** Parse a user-entered decimal string such as "699.99" into Money. */
export function parseMoney(input: string, currency: string): Money {
  const text = input.trim().replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(text)) {
    throw new MoneyError(`"${input}" is not a valid amount.`);
  }
  const [whole, frac = ""] = text.split(".");
  const dp = decimalsFor(currency);
  if (frac.length > dp) {
    throw new MoneyError(`${currency} allows at most ${dp} decimal places.`);
  }
  const padded = frac.padEnd(dp, "0");
  const minor = BigInt(whole) * 10n ** BigInt(dp) + BigInt(padded || "0");
  return { minor, currency };
}

export function assertSameCurrency(...amounts: Money[]): string {
  const first = amounts[0].currency;
  for (const a of amounts) {
    if (a.currency !== first) {
      throw new MoneyError(
        `Cannot combine ${first} and ${a.currency}. Convert with an explicit exchange rate first.`,
      );
    }
  }
  return first;
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { minor: a.minor + b.minor, currency: a.currency };
}

export function sub(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { minor: a.minor - b.minor, currency: a.currency };
}

export function max0(a: Money): Money {
  return { minor: a.minor < 0n ? 0n : a.minor, currency: a.currency };
}

/** Integer division rounding up. Requires b > 0 and a >= 0. */
export function ceilDiv(a: bigint, b: bigint): bigint {
  if (b <= 0n) throw new MoneyError("Division by zero.");
  return (a + b - 1n) / b;
}

/** Scale an amount by num/den, rounding half away from zero. */
export function scaleRatio(m: Money, num: bigint, den: bigint): Money {
  if (den === 0n) throw new MoneyError("Division by zero.");
  const n = m.minor * num;
  const sign = n < 0n !== den < 0n ? -1n : 1n;
  const absN = n < 0n ? -n : n;
  const absD = den < 0n ? -den : den;
  const q = (absN * 2n + absD) / (absD * 2n);
  return { minor: sign * q, currency: m.currency };
}

export function formatMoney(m: Money): string {
  const dp = decimalsFor(m.currency);
  const negative = m.minor < 0n;
  const abs = negative ? -m.minor : m.minor;
  const scale = 10n ** BigInt(dp);
  const whole = abs / scale;
  const frac = (abs % scale).toString().padStart(dp, "0");
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body = dp > 0 ? `${wholeStr}.${frac}` : wholeStr;
  return `${negative ? "-" : ""}${m.currency} ${body}`;
}

/** Like parseMoney, but returns an error message instead of throwing. */
export function tryParseMoney(raw: string, currency: string): Money | string {
  try {
    return parseMoney(raw, currency);
  } catch (e) {
    return (e as Error).message;
  }
}

/** Plain decimal text for form fields, for example "700.00" or "500". */
export function toDecimalString(m: Money): string {
  const dp = decimalsFor(m.currency);
  const scale = 10n ** BigInt(dp);
  const whole = m.minor / scale;
  if (dp === 0) return whole.toString();
  return `${whole}.${(m.minor % scale).toString().padStart(dp, "0")}`;
}
