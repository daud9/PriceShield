import type { Contribution } from "../integrations/products/types";

// Assumption: a transaction is treated as final after this many confirmations.
// Confirm the finality rule in the Nimiq docs before launch.
export const MIN_CONFIRMATIONS = 10;

export interface ChainTx {
  hash: string;
  to: string;
  from?: string;
  value: string | number; // Luna
  executionResult?: boolean;
  confirmations?: number;
}

export type VerifyOutcome =
  | { status: "verified"; note: string }
  | { status: "pending"; note: string }
  | { status: "failed"; note: string }
  | { status: "not_found"; note: string };

const compact = (a: string) => a.replace(/\s+/g, "").toUpperCase();

function isChainTx(v: unknown): v is ChainTx {
  if (!v || typeof v !== "object") return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.hash === "string" &&
    typeof t.to === "string" &&
    (typeof t.value === "number" || typeof t.value === "string")
  );
}

/** Reads the transaction list from a getTransactionsByAddress response: result.data[]. */
export function extractTransactions(resp: unknown): ChainTx[] {
  const result = (resp as { result?: { data?: unknown } } | null)?.result;
  const data = result?.data;
  if (!Array.isArray(data)) return [];
  return data.filter(isChainTx);
}

/**
 * Decides whether a recorded contribution is confirmed on-chain.
 * It is verified only when the hash, recipient, amount, execution result and confirmations all match.
 */
export function checkContribution(
  txs: ChainTx[],
  c: Contribution,
  minConfirmations: number = MIN_CONFIRMATIONS,
): VerifyOutcome {
  const wanted = c.txHash.toLowerCase();
  const tx = txs.find((t) => t.hash.toLowerCase() === wanted);
  if (!tx) {
    return { status: "not_found", note: "Not found on the network yet. Try again in a few minutes." };
  }
  if (tx.executionResult === false) {
    return { status: "failed", note: "The network reports this transaction did not execute." };
  }
  if (compact(tx.to) !== compact(c.recipient)) {
    return { status: "failed", note: "The network shows a different recipient than the one you entered." };
  }
  let value: bigint;
  try {
    value = BigInt(tx.value);
  } catch {
    return { status: "failed", note: "The network amount could not be read." };
  }
  if (value !== BigInt(c.minor)) {
    return { status: "failed", note: "The network shows a different amount than the one you entered." };
  }
  if (tx.executionResult !== true) {
    return { status: "pending", note: "The network has not reported an execution result yet." };
  }
  const confirmations = tx.confirmations ?? 0;
  if (confirmations < minConfirmations) {
    return {
      status: "pending",
      note: `Found on the network with ${confirmations} of ${minConfirmations} confirmations. Check again shortly.`,
    };
  }
  return { status: "verified", note: `Confirmed on-chain with ${confirmations} confirmations.` };
}
