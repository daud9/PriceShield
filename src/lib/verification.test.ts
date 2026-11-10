import { describe, expect, it } from "vitest";
import type { Contribution } from "../integrations/products/types";
import { checkContribution, extractTransactions } from "./verification";

// Shape taken from a real getTransactionsByAddress response (trimmed to the fields we use).
const RESPONSE = {
  jsonrpc: "2.0",
  result: {
    data: [
      {
        hash: "405f0d047f005929bfaef98fa33080343d505c50df9eeee23c6301aa09fa347f",
        blockNumber: 66502950,
        confirmations: 5028,
        from: "NQ79 HN52 XV6A 22L6 7ALU F14P LOBG 9YQP KMQ7",
        to: "NQ84 N74N C1FM N0SJ 5NX2 9LYY 9HNS DT2M PNRE",
        value: 10000000,
        executionResult: true,
      },
    ],
  },
};

const HASH = "405f0d047f005929bfaef98fa33080343d505c50df9eeee23c6301aa09fa347f";
const RECIPIENT = "NQ84N74NC1FMN0SJ5NX29LYY9HNSDT2MPNRE";

function contribution(overrides: Partial<Contribution> = {}): Contribution {
  return {
    id: "c1",
    minor: "10000000", // 100 NIM in Luna
    currency: "NIM",
    at: "2026-11-10",
    status: "submitted",
    txHash: HASH,
    recipient: RECIPIENT,
    ...overrides,
  };
}

describe("extractTransactions", () => {
  it("reads the transaction list from result.data", () => {
    expect(extractTransactions(RESPONSE)).toHaveLength(1);
  });

  it("returns an empty list for an unexpected response", () => {
    expect(extractTransactions({ result: { data: [] } })).toEqual([]);
    expect(extractTransactions(null)).toEqual([]);
    expect(extractTransactions({ error: { code: -1 } })).toEqual([]);
  });
});

describe("checkContribution", () => {
  const txs = extractTransactions(RESPONSE);

  it("verifies a matching, executed transaction with enough confirmations", () => {
    expect(checkContribution(txs, contribution()).status).toBe("verified");
  });

  it("reports not found when the hash is not on the network", () => {
    const out = checkContribution(txs, contribution({ txHash: "0".repeat(64) }));
    expect(out.status).toBe("not_found");
  });

  it("fails when the amount differs", () => {
    expect(checkContribution(txs, contribution({ minor: "20000000" })).status).toBe("failed");
  });

  it("fails when the recipient differs", () => {
    expect(checkContribution(txs, contribution({ recipient: "NQ07 0000 0000 0000 0000 0000 0000 0000 0000" })).status).toBe(
      "failed",
    );
  });

  it("fails when the network reports the transaction did not execute", () => {
    const failedTx = [{ ...txs[0], executionResult: false }];
    expect(checkContribution(failedTx, contribution()).status).toBe("failed");
  });

  it("stays pending until the confirmation threshold is reached", () => {
    const few = [{ ...txs[0], confirmations: 2 }];
    expect(checkContribution(few, contribution()).status).toBe("pending");
  });
});
