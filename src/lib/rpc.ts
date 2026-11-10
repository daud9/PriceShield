// Nimiq JSON-RPC endpoint used for on-chain checks.
// rpc.nimiqwatch.com is a public testing server. Replace it with a production endpoint before launch.
export const NIMIQ_RPC_URL = "https://rpc.nimiqwatch.com";

export type RpcResult = { ok: true; body: unknown } | { ok: false; reason: string };

export async function fetchTransactionsByAddress(address: string): Promise<RpcResult> {
  const compactAddress = address.replace(/\s+/g, "").toUpperCase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(NIMIQ_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "getTransactionsByAddress",
        params: { address: compactAddress },
        id: 1,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, reason: `The RPC server returned status ${res.status}.` };
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "error" in body) {
      return { ok: false, reason: "The RPC server returned an error for this address." };
    }
    return { ok: true, body };
  } catch {
    return { ok: false, reason: "The RPC server could not be reached from this browser." };
  } finally {
    clearTimeout(timer);
  }
}
