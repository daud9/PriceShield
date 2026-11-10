# PriceShield

*Know when you can afford it.*

PriceShield is a purchase-planning Mini App for the Nimiq Mini Apps Competition, Cycle 3 (category: SAVE). It helps you track a product's price, work out how much you need to save, lock your savings target, and send NIM contributions through Nimiq Pay. Contributions are checked on-chain before they count toward savings.

Live app: https://priceshield.daud9.deno.net
Custom domain: https://priceshield.web.id (DNS and certificate setup in progress)

## What works

- **Tracked products.** Add a product by link (https:// only) with its price, currency, and your savings plan. Record new prices by hand. Each price is kept in a history.
- **Readiness engine.** Total cost (price, delivery, taxes and other costs), remaining amount, required daily, weekly, and monthly savings, readiness date, and whether the deadline is achievable.
- **Start Saving.** Each tracked product has a Start Saving panel. It saves the plan, then offers the NIM contribution form on the same card.
- **Price Lock.** Lock the current recorded price as your savings target. The locked amount doesn't change until you update or unlock it. Choose "Follow live price" or "Use locked price."
- **NIM contributions through Nimiq Pay.** Send NIM from the app. Nimiq Pay asks you to approve the payment, and the app records the transaction hash.
- **On-chain verification.** Tap "Verify on-chain" to check a contribution against the network. It is marked verified only when the hash, recipient, amount, and execution result match, and the transaction has at least 10 confirmations. A verified 1 NIM test transfer has been confirmed this way.
- **Currency converter.** Enter your own EUR, GBP, or NGN rate per NIM, then convert in either direction. Results are labelled as estimates. Rates older than 7 days are flagged.
- **Dashboard.** Summary, upcoming deadlines, targets reached, recent price changes, and goal cards with edit, archive, and delete.
- **Comparison.** Enter alternative products by hand, compare them with the original, and set one as the active target without changing the original.
- **Alerts.** Calculated from your recorded prices and plans when you open the Alerts screen. Nothing runs in the background.
- **Reports.** Copy, share, or print a plain-text purchase report.
- **Settings.** Export your data as JSON, delete all data after typing DELETE, and check wallet status.

## What is not implemented

- **USDC savings.** Not offered. Nimiq Pay currently lists USDT on Polygon, which is paused for maintenance, not USDC. USDC would need its own network, token contract, and verification. USDT is not a substitute.
- **NIM balance for fiat-priced goals.** A goal priced in NGN, EUR, or GBP doesn't count verified NIM toward its target. Verified NIM counts only on goals priced in NIM. A NIM-denominated balance compared with a rate-converted target is planned.
- **Live exchange rates.** The converter only uses rates you enter.
- **Pause and resume** for savings plans.
- **Adding a savings goal for an untracked product.** Savings plans start from a tracked product.
- **Automatic price monitoring and retailer lookup.** Prices are entered by you. PriceShield does not check stores.
- **Merchant price guarantees.** Price Lock records your target only. It does not reserve the product with any retailer.
- **Cross-device sync.** Data is stored in the browser on one device.

## Savings and where the money is

PriceShield doesn't hold or lock any funds. When you send a contribution, Nimiq Pay transfers NIM to the address you enter. That address holds the money, so use a Nimiq account you control for savings. PriceShield tracks the contributions and their verification status.

## Run locally

```bash
npm install
npm test          # automated tests
npm run build     # type-check and production build into dist/
npm run dev       # development server
```

The automated tests cover the readiness engine, money handling, URL validation, price history, alternatives, the report, conversion and rates, Price Lock, and on-chain verification rules. Verification tests use a real response from the Nimiq testing server.

## Deploy (Deno Deploy)

The build output is `dist/`. In the Deno Deploy app settings:

- Install command: `npm install`
- Build command: `npm run build`
- Static directory: `dist`
- Single page app: disabled

Each push to `main` triggers a new build. Check that the newest build shows **Success** before testing the live site.

## Nimiq setup

- **SDK:** `@nimiq/mini-app-sdk` version 0.2.4, from the Nimiq Mini Apps API reference (https://nimiq.dev/mini-apps/api-reference).
- **Wallet connection:** `init()` and `listAccounts()`. The app must run inside Nimiq Pay to connect. In a normal browser, it shows "not connected."
- **Payments:** `sendBasicTransaction()`. Nimiq Pay shows its own confirmation. A returned hash only means the wallet submitted the transaction.
- **Verification:** `getTransactionsByAddress` on the JSON-RPC endpoint in `src/lib/rpc.ts`.

### Before launch

- **Replace the RPC endpoint.** `rpc.nimiqwatch.com` is a public testing server. Switch `NIMIQ_RPC_URL` in `src/lib/rpc.ts` to a production endpoint, and confirm it allows requests from your app's origin.
- **Confirm the finality rule.** The app treats a transaction as final after 10 confirmations. This is an assumption, set in `src/lib/verification.ts`. Check it against the Nimiq docs.
- **Confirm the network.** Nimiq Pay and the RPC endpoint must use the same network. Verify this before any real funds are used.

## Environment and secrets

The project needs no API keys or private keys. Do not commit seed phrases, private keys, or access tokens. Use a GitHub token only for pushing from your own machine.

## Known limitations

- Savings and prices are user-entered. Nothing is checked against a merchant.
- Verification depends on a public testing server until a production endpoint is set.
- Browser storage can be cleared. Use Settings → Export my data to keep a copy.
- Alerts are calculated when you open the Alerts screen. They are not push notifications.
- Verified NIM counts only toward NIM-priced goals, as described above.

## License

Add a license before making the repository public.
