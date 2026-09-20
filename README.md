# Spending Tracker

Spending Tracker is a private, offline-first progressive web app for answering one practical question: **what is safe to spend today?** It runs as a static site, has no account or application server, and keeps financial records in the browser on the user’s device.

- Project hub: <https://xcloudy75z.github.io/spending-tracker-next/>
- App: <https://xcloudy75z.github.io/spending-tracker-next/app/>
- Test evidence: <https://xcloudy75z.github.io/spending-tracker-next/evidence/>

## What it does

- Calculates a cycle-aware daily safe-to-spend amount.
- Captures, edits, filters, and deletes income and spending.
- Plans a spendable cycle allowance, preferred start day, savings treatment, category budgets, and the next rollover.
- Tracks outstanding card purchases, payment status, and wife reimbursements independently.
- Reviews pasted bank SMS text before importing recognized transactions.
- Switches between English and Arabic with a genuine right-to-left layout.
- Exports a complete JSON backup and a spreadsheet-friendly CSV.
- Installs to an iPhone home screen and works offline after one successful online load.

## Privacy and data ownership

The app has no analytics, advertising SDK, sign-in, cloud database, or external runtime script. Transactions, cards, planning values, and preferences remain in local browser storage until the user exports them.

That privacy model has a deliberate cost: clearing Safari website data, losing the device, or removing the site’s stored data can erase the records. Export a JSON backup regularly and store it somewhere secure. CSV is useful for analysis but is not a complete restore file.

## Install on iPhone

1. Open the [app URL](https://xcloudy75z.github.io/spending-tracker-next/app/) in Safari while online.
2. Tap **Share**.
3. Choose **Add to Home Screen**, then confirm **Add**.
4. Open the installed icon once while online and wait for the app to finish loading before relying on offline use.

## Backup or move to another device

Open **Data tools** from the top-right button, then choose **Export backup**. On the new installation, open Data tools, select the JSON file under **Import backup**, review the preview, and choose **Replace current data**. The destination creates a safety backup before replacement.

The original `rem-money` app and this app intentionally use separate storage and service-worker cache names. Neither installation silently reads or deletes the other.

## Development

Requirements: Node.js 22 or newer and npm.

```sh
npm ci
npm run browsers:install
npm run serve
```

The local site is served at `http://127.0.0.1:4173/`; the app is under `/app/`.

Run the complete release gate with:

```sh
npm run verify
```

The gate validates the static site, runs 67 unit tests, 10 integration tests, 8 site/accounting tests, and 38 browser declarations across desktop Chromium plus iPhone WebKit portrait and landscape. It then generates and validates exact machine-readable evidence. At version 1.0.0 this is **123 distinct declarations and 199 executions**.

## Repository map

- `site/app/` — installable offline application.
- `site/` — public project, install, privacy, migration, release, and evidence pages.
- `tests/unit/` — pure domain and platform behavior.
- `tests/integration/` — persistence and state lifecycle boundaries.
- `tests/browser/` — complete user journeys, accessibility, RTL, responsive, PWA, and offline behavior.
- `tests/site/` — public-site safety and exact accounting regressions.
- `tools/` — development server, validation, icons, screenshots, cleanup, and release verification.
- `docs/owner/` — operating and recovery runbooks.
- `evidence/` — reviewed screenshots and release rehearsal record.

## Known boundaries

- The durable-storage target is a normal current Safari session; private browsing is unsuitable.
- There is no cloud sync, multi-device merge, password, or app-level encryption.
- Enter the cycle allowance after fixed commitments. Savings can remain inside that allowance or be deducted from daily spending through Plan; the app does not model bank balances, recurring bills, credit limits, statement dates, or due dates.
- Automatic SMS inbox access is not available in a web app; the user pastes message text for review.
- Desktop cold-offline reload is exercised directly. Windows Playwright WebKit cannot toggle context networking, so iPhone-emulation tests instead verify cached resources, service-worker registration, offline events, and route availability.
- An invalid backup is rejected; a valid restore intentionally replaces the current local state after preview.

See [operations](docs/owner/OPERATIONS.md), [recovery](docs/owner/RECOVERY.md), and the [verification record](evidence/verification.md) for owner procedures.
