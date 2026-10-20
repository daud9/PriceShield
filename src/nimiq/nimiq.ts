// Nimiq Pay integration. Uses the SDK's documented init() helper, per
// https://nimiq.dev/mini-apps/api-reference. PriceShield does not currently
// call any wallet method: it is a planning tool, and the verified-savings
// field is filled from user-confirmed on-chain transactions in a later step.
//
// If init() throws (for example, when the app runs in a normal browser), this
// wrapper returns null so the planner still works for development and testing.
// Confirm the exact init() behaviour against the Developer Center before release.

import { init } from "@nimiq/mini-app-sdk";

export type NimiqHandle = Awaited<ReturnType<typeof init>>;

let handle: NimiqHandle | null = null;
let attempted = false;

export async function connectNimiq(): Promise<NimiqHandle | null> {
  if (attempted) return handle;
  attempted = true;
  try {
    handle = await init();
  } catch {
    handle = null;
  }
  return handle;
}

export function isInNimiqPay(): boolean {
  return handle !== null;
}
