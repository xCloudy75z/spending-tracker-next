# Release verification — 1.0.0

## Clean-room rehearsal

- Date: 2026-09-20
- Final evidence generated: 2026-09-20T13:10:49.057Z
- Source commit at rehearsal start: `3ea64fe38aeafdf793b33e00b9d6bcda7423d4a3`
- Final audited candidate verified: `89b2b0d96c087f4028ac0d69ed119e4ef8209501`
- Platform: Windows, Node.js 25.9.0, npm 11.12.1
- Result: **PASS**

The rehearsal removed only project-local generated dependencies, Playwright browsers, reports, test results, and coverage. It then installed from `package-lock.json`, installed pinned Chromium and WebKit builds into `.playwright-browsers`, and executed the full release gate.

```text
npm run clean
npm ci
npm run browsers:install
npm run verify
```

`npm ci` installed 13 packages and reported zero vulnerabilities. The final verifier reported:

```text
67 unit tests passed
10 integration tests passed
8 site and accounting tests passed
114 browser executions passed
Exact test accounting: 123 declarations, 199 executions.
Public site valid (7 HTML files checked).
[verify] all release checks passed
```

## Browser matrix

| Project | Engine / viewport | Declarations | Executions | Result |
|---|---|---:|---:|---|
| desktop-chromium | Chromium, 1440 × 1000 | 38 | 38 | Pass |
| iphone-webkit | WebKit, iPhone 13 portrait | 38 | 38 | Pass |
| iphone-landscape-webkit | WebKit, iPhone 13 landscape | 38 | 38 | Pass |

The browser suite includes complete primary journeys, persistence, transaction safeguards, card and reimbursement separation, backup/restore, CSV export, SMS review, Arabic RTL, dark mode, fixed-navigation reachability, PWA metadata, service-worker cache isolation, and automated accessibility scans with no serious or critical axe findings.

## Online and offline smoke

The verifier starts the production `site/` directory with the same build-free server path used for local review. All application routes load online. Desktop Chromium then disables network access after a successful first visit and cold-reloads the app shell and all four routes from the scoped cache.

On Windows, Playwright WebKit does not expose the same context-level offline toggle. The iPhone portrait and landscape runs therefore verify the cached shell/module inventory, service-worker registration, offline event behavior, and route availability. This limitation is also disclosed on the public evidence page.

## Visual review

The app was reviewed at desktop Chromium, iPhone 13 portrait, and iPhone 13 landscape sizes. Evidence covers all four destinations in light English, dark English, and Arabic RTL, plus transaction/backup dialogs and corrupt-storage recovery. The six public hub pages were separately captured at desktop and iPhone sizes under `evidence/screenshots/hub/`. The capture tool rejects horizontal overflow before saving each page.

## Release decision

The candidate is suitable for repository publication and GitHub Pages deployment. The deployment remains contingent on the repository-hosted Quality workflow passing for the exact pushed `main` SHA, followed by live HTTP, install-metadata, and iPhone acceptance checks.
