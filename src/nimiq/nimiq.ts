// Nimiq Pay wallet connection, using the official SDK from the Nimiq Mini Apps API reference:
//   import { init } from '@nimiq/mini-app-sdk'
//   const nimiq = await init()
//   const accounts = await nimiq.listAccounts()
//
// This only connects and reads accounts. It does not send payments and does not record
// contributions. Outside Nimiq Pay, init() is expected to fail, and the app shows a
// "not connected" status instead of breaking.

import { useEffect, useState } from "react";
import { init } from "@nimiq/mini-app-sdk";

export type WalletState =
  | { status: "idle" }
  | { status: "connecting" }
  | { status: "connected"; accountCount: number }
  | { status: "failed"; message: string };

type Instance = Awaited<ReturnType<typeof init>>;

let instance: Instance | null = null;
let state: WalletState = { status: "idle" };
const listeners = new Set<(s: WalletState) => void>();

function setState(next: WalletState) {
  state = next;
  listeners.forEach((l) => l(next));
}

/** Connects to Nimiq Pay and reads the account list. Safe to call more than once. */
export async function connectNimiq(): Promise<WalletState> {
  if (state.status === "connecting" || state.status === "connected") return state;
  setState({ status: "connecting" });
  try {
    instance = await init();
    const accounts: unknown = await instance.listAccounts();
    setState({ status: "connected", accountCount: Array.isArray(accounts) ? accounts.length : 0 });
  } catch {
    instance = null;
    setState({
      status: "failed",
      message: "Open PriceShield inside Nimiq Pay to connect your wallet.",
    });
  }
  return state;
}

/** Subscribes a component to wallet status changes. */
export function useWalletState(): WalletState {
  const [s, setS] = useState<WalletState>(state);
  useEffect(() => {
    listeners.add(setS);
    setS(state);
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return s;
}

export function walletLabel(s: WalletState): string {
  switch (s.status) {
    case "connected":
      return `Nimiq Pay connected. ${s.accountCount} account${s.accountCount === 1 ? "" : "s"} found.`;
    case "connecting":
      return "Connecting to Nimiq Pay...";
    case "failed":
      return s.message;
    default:
      return "Nimiq Pay not connected.";
  }
}
