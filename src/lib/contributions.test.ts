import { describe, expect, it } from "vitest";
import type { Contribution, TrackedProduct } from "../integrations/products/types";
import { addContribution, normalizeNimAddress, parseNimAmount, submittedMinor, verifiedMinor } from "./contributions";

const base: TrackedProduct = {
  id: "n1",
  name: "Gift",
  url: "https://example.com/gift",
  currency: "NIM",
  targetMinor: "1000000",
  savedMinor: "0",
  contributionMinor: "0",
  frequency: "weekly",
  targetDate: "2027-01-01",
  deliveryMinor: "0",
  otherMinor: "0",
  history: [{ minor: "1000000", currency: "NIM", at: "2026-11-01", source: "user_entered" }],
  trackingMode: "manual",
  createdAt: "2026-11-01",
};

const c = (status: "submitted" | "verified", minor: string): Contribution => ({
  id: status + minor,
  minor,
  currency: "NIM",
  at: "2026-11-02",
  status,
  txHash: "hash-" + minor,
  recipient: "NQ07 0000 0000 0000 0000 0000 0000 0000 0000",
});

describe("NIM addresses", () => {
  it("accepts a grouped Nimiq address and returns it compact", () => {
    const grouped = "NQ07 0000 0000 0000 0000 0000 0000 0000 0000";
    expect(normalizeNimAddress(grouped)).toBe(grouped.replace(/ /g, ""));
    expect(normalizeNimAddress(grouped)?.length).toBe(36);
  });

  it("rejects text that is not a Nimiq address", () => {
    expect(normalizeNimAddress("hello")).toBeNull();
    expect(normalizeNimAddress("0x1234567890abcdef")).toBeNull();
    expect(normalizeNimAddress("")).toBeNull();
  });
});

describe("NIM amounts", () => {
  it("converts NIM to Luna with five decimals", () => {
    const parsed = parseNimAmount("1.5");
    expect(typeof parsed).toBe("object");
    if (typeof parsed !== "string") expect(parsed.minor).toBe(150000n);
  });

  it("rejects more than five decimals", () => {
    expect(typeof parseNimAmount("1.000001")).toBe("string");
  });
});

describe("contribution totals", () => {
  it("counts only verified contributions as verified", () => {
    const p = { ...base, contributions: [c("verified", "200000"), c("submitted", "300000")] };
    expect(verifiedMinor(p)).toBe(200000n);
    expect(submittedMinor(p)).toBe(300000n);
  });

  it("adds a contribution without changing the other fields", () => {
    const next = addContribution(base, c("submitted", "100000"));
    expect(next.contributions).toHaveLength(1);
    expect(next.targetMinor).toBe(base.targetMinor);
    expect(next.history).toEqual(base.history);
    expect(base.contributions).toBeUndefined();
  });
});
