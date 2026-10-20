# PriceShield

*Know when you can afford it.*

A purchase-planning Mini App for the Nimiq Mini Apps Competition, Cycle 3 (category: SAVE).

## What works

- **Smart Purchase Readiness Engine** (`src/lib/engine.ts`): total cost, remaining amount, required daily, weekly and monthly savings, readiness date, achievability, shortfall, and practical options when the goal is out of reach.
- **Price Shock Simulator**: -10%, 0%, +10%, +20% scenarios, plus `simulatePriceChange()` for any custom basis-point change. Every result is labelled hypothetical and uses the same `evaluatePlan()` as the main planner.
- **Alternative comparison**: manual entry only, cost difference against the original, and an active-target selector. The original goal is never overwritten.
- **Money** (`src/lib/money.ts`): integer minor units with BigInt, no floating point. Currency is stored with each amount. Mixed currencies are rejected, not converted.
- **Tests** (`src/lib/engine.test.ts`): covers the brief's $700 example, the $800 price change, zero savings, fully funded goals, past deadlines, zero contributions, invalid input, currency mixing, and the shock and comparison logic.

## What is not finished

- Verified on-chain contributions are entered manually. There is no transaction lookup yet.
- Shareable report, change alerts, and persistent storage are not built.
- The Nimiq wrapper only calls `init()`. Wallet methods are not used yet.
- The `@nimiq/mini-app-sdk` version in `package.json` is a placeholder range. Check the current version on npm and against https://nimiq.dev/mini-apps before deploying.
- The UI has been written but not yet tested on a real Android device.

## Run

```bash
npm install
npm test          # engine and money tests
npm run dev       # local dev server (use --host for phone testing on your Wi-Fi)
npm run build
```

Load the dev server inside Nimiq Pay using the local Mini App guide at https://nimiq.dev/mini-apps/development/load-local-mini-app.

## Deploy (Deno)

The build output in `dist/` is static. Serve it from a Deno static host or Deno Deploy, then submit the public GitHub repository through https://miniappscompetition.com/submit.
