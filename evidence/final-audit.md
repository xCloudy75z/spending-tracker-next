# Final requirement audit — Spending Tracker 1.0.0

This checklist records the release state of the standalone `spending-tracker-next` repository. “Proven” means a tracked implementation and an automated or inspectable evidence source exist. A physical-iPhone-only observation is explicitly separated from automated proof.

| Requirement | Status | Evidence |
| --- | --- | --- |
| Separate project and repository; original app untouched | Proven locally; live recheck pending publication | Separate cache/storage prefixes in `site/app/src/platform/storage.js` and `site/app/sw.js`; isolation regression in `tests/browser/pwa.spec.js` |
| Static, serverless, local-only app | Proven | `site/app/`, CSP in `site/app/index.html`, privacy page, and public-site validator |
| Installable icon and standalone PWA metadata | Proven | `site/app/manifest.webmanifest`, generated 192/512/maskable icons, `tests/unit/pwa.test.js`, `tests/browser/pwa.spec.js` |
| Cold offline operation after first load | Proven in Chromium; WebKit cache path proven in emulation | `tests/browser/offline.spec.js`; platform limitation documented in `evidence/verification.md` |
| Today safe-to-spend calculation | Proven | `site/app/src/domain/today.js`, unit boundary coverage, and `tests/browser/today.spec.js` |
| Activity add/edit/delete/search/filter/history | Proven | Activity/transaction domain and UI modules; sequential-typing and journey tests |
| Expense, income, and refund remain distinct | Proven | Canonical `kind` model, migration, CSV mapping, and unit/browser regressions |
| Spendable allowance, preferred cycle-start day, savings treatment, categories, future rollover | Proven | Planning/cycle domain and UI plus savings, default-date, and future-cycle regressions |
| Card debt and wife reimbursement stay independent | Proven | Liability domain/UI and mixed settlement/overpayment regressions |
| Bank SMS paste with review before import | Proven | SMS parser/dialog and atomic import browser test |
| JSON backup, preview, migration, restore, and corrupt-state recovery | Proven | Backup/storage domain tests, restore integration tests, and import/recovery browser tests |
| CSV is safe and never misreported as a restorable backup | Proven | CSV formula-neutralization/type tests and backup-health browser regression |
| English/Arabic RTL and dark/light/system themes | Proven | Catalog parity tests, RTL browser journey, accessibility scans, and visual matrix |
| Keyboard, touch-target, reduced-motion, and serious/critical axe checks | Proven | Accessibility and primitive browser suites; zero serious/critical findings |
| Responsive desktop, iPhone portrait, and iPhone landscape layouts | Proven in automated profiles | 105 browser executions and reviewed screenshots in `evidence/screenshots/` |
| Exact tested commit deployed by least-privilege CI | Proven by workflow regression; live run pending publication | `.github/workflows/quality.yml`, `.github/workflows/pages.yml`, `tests/site/validate-public-site.test.js` |
| Public report hub, privacy, migration, release, and audit map | Proven | Seven validated HTML files under `site/` and machine-readable `site/evidence/results.json` |
| No tracked local account path, email address, or credential | Proven at candidate scan | Filename-only tracked-file scan; deliberate fake-secret fixture is required by validator tests |

## Deliberate product boundaries

- Users enter the amount available for discretionary spending after fixed commitments. Savings may stay inside the allowance or be deducted from daily spending. Version 1.0.0 does not model bank balances, recurring bills, credit limits, statement dates, or due dates.
- There is no cloud account, sync, analytics, remote database, password, or application-level encryption.
- CSV is for analysis, not restoration. JSON is the complete restore format.
- Windows Playwright cannot perform a context-level offline switch in WebKit. The WebKit profiles prove the cache inventory, service-worker registration, offline event behavior, routes, responsive UI, and core journeys. A final tap-through on a physical iPhone remains an owner acceptance observation, not an automated claim.
