// Nimiq Pay integration placeholder.
// The official SDK import is disabled until the exact package name and version
// are confirmed in the Nimiq Mini Apps API reference (https://nimiq.dev/mini-apps/api-reference).
// PriceShield's planner works without it.

export type NimiqHandle = null;

export async function connectNimiq(): Promise<NimiqHandle> {
  return null;
}

export function isInNimiqPay(): boolean {
  return false;
}
