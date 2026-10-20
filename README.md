# PriceShield

*Know when you can afford it.*

PriceShield is a purchase-planning Mini App for the Nimiq Mini Apps Competition, Cycle 3 (category: SAVE). It works out how much you need to save for a purchase, checks whether your deadline is still realistic, and recalculates when a price you recorded changes.

## Features

- **Purchase goals:** create, edit, archive, and delete. Each goal has its savings plan.
- **Readiness engine:** total cost (price, delivery, taxes and other costs), remaining amount, required daily, weekly, and monthly savings, readiness date, and whether the deadline is achievable.
- **Price Shock Simulator:** hypothetical -10%, 0%, +10%, +20% price scenarios, using the same engine.
- **Tracked products:** add a product by link (https:// only) and enter its details yourself. Record new prices manually. Each price is kept in a history.
- **Price Intelligence:** explains how the plan changes at the recorded price and with a +10% rise.
- **Compare Products:** enter alternatives by hand, compare them with the original, and set one as the active target without changing the original.
- **Savings Progress:** saved and remaining amounts per goal, with currencies kept separate.
- **Dashboard:** summary, upcoming deadlines, products at or below target, recent price changes, and archived goals.
- **Alerts:** derived from stored prices and plans. Nothing runs in the background.
- **Shareable report:** copy, share (where the browser supports it), or print a plain-text purchase report.
- **Settings:** export your data, delete all data, and see how tracking and Nimiq status work.

## What is not included

- **Automatic price monitoring.** PriceShield does not check product pages or stores. Every price is entered by you.
- **Automatic product lookup.** The provider layer only has a manual provider, which always reports that automatic lookup is not configured.
- **Contribution history and verified blockchain contributions.** Savings are user-reported. Nothing is recorded from Nimiq Pay yet.
- **Nimiq Pay payments.** `src/nimiq/nimiq.ts` is a placeholder. It doesn't import the SDK, initialize a wallet, or send transactions. See "Nimiq setup" below.
- **Cross-device sync.** Data is stored in the browser on one device.

## Run locally

```bash
npm install
npm test          # automated tests (engine, money, URL validation, alerts, report, alternatives)
npm run build     # type-check and production build into dist/
npm run dev       # development server
```

## Deploy (Deno Deploy)

The build output is `dist/`. In the Deno Deploy app settings:

- Install command: `npm install`
- Build command: `npm run build`
- Static directory: `dist`
- Single page app: disabled

Each push to `main` triggers a new build. The live site is served over HTTPS.

## Nimiq setup

The app currently has no Nimiq configuration. To connect it:

1. Confirm the current SDK package name, version, and methods in the Nimiq Mini Apps API reference (https://nimiq.dev/mini-apps/api-reference) and the competition starter kit (https://miniappscompetition.com/starterkit).
2. Add the SDK to `package.json` with the verified version and install it.
3. Replace `src/nimiq/nimiq.ts` with calls to the documented initialization method, and keep payment-confirmation logic tied to the wallet's documented result.
4. Test inside Nimiq Pay before submitting.

Secrets (API keys, private keys, seed phrases) must never be committed. This project has none.

## Testing status

Automated tests live in `src/lib/*.test.ts`. Run them with `npm test`. Results are not recorded in this README. Run them yourself and record the output before submitting.

## Known limitations

- Savings and prices are user-entered. Nothing is verified.
- Browser storage can be cleared, and it is not a backup. Use Settings → Export to keep a copy.
- Alerts are computed when you open the Alerts screen. They are not push notifications.
- The old goal form screen in `App.tsx` is no longer reachable from the app.

## License

Add a license before making the repository public.
