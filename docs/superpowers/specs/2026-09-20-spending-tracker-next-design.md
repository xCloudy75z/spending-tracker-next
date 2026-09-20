# Spending Tracker Next — Product and Technical Design

**Date:** 2026-09-20  
**Status:** Approved direction; formal design pending final review  
**Target workspace:** `C:\Users\games\Documents\ChatGPT\Spending Tracker`  
**Planned repository:** `spending-tracker-next`

## 1. Purpose

Spending Tracker Next will be a private-by-design, installable personal spending tracker that works without an account, server, subscription, analytics service, or continuous internet connection. It will preserve the useful workflows and backup compatibility of the existing Spending Tracker while correcting the reliability, usability, accessibility, and publishing problems found during the audit.

The finished repository will contain both:

1. A polished GitHub Pages project and evidence hub at the site root.
2. The installable offline application under `/app/`.

The existing `rem-money` repository and deployed app will remain unchanged so the user has a working fallback throughout development and migration.

## 2. Design principles

- **One glance, one decision:** the Today screen answers “How much is safe to spend today?” before showing secondary information.
- **Local means local:** financial data stays on the device unless the user explicitly exports a file.
- **Offline is a supported operating mode:** every core workflow must function after installation without network access.
- **Simple before clever:** calculations and labels must remain understandable without financial jargon.
- **Recoverable by default:** backups, migration, failed imports, and application updates must never silently destroy usable data.
- **Evidence over claims:** the public report will show verifiable tests, screenshots, release details, and privacy behavior.
- **Progressive disclosure:** common actions remain immediate while advanced settings and explanations stay available without crowding the main interface.

## 3. Scope

### 3.1 Included product capabilities

- Daily safe-to-spend allowance and current-cycle balance
- Manual income and expense entry
- Category management and category-based summaries
- Transaction editing, deletion, search, and filtering
- Current and historical cycle views
- Configurable cycle start, allowance, rollover, and savings treatment
- Credit-card spending and repayment tracking
- Wife reimbursement tracking
- SMS transaction import with review before saving
- JSON backup export, validation, restore, and migration from the existing app
- CSV export with spreadsheet-injection protection
- Arabic and English interfaces with correct RTL/LTR behavior
- Light, dark, and system-responsive themes
- Installable iPhone PWA with branded icons and offline startup
- Clear application update and recovery behavior

### 3.2 Public project hub

The GitHub Pages root will be a static, multi-page project hub inspired by the verified Neyer publishing pattern. It will include:

- Overview and direct app launch/install guidance
- Feature and workflow tour
- Privacy and local-data explanation
- Original audit findings and implemented remedies
- Test evidence, supported scenarios, and screenshots
- Backup/migration instructions
- Release notes and version metadata
- Repository and source links

The report must not contain private financial data, local filesystem paths, development secrets, or misleading test totals.

### 3.3 Explicitly excluded from the initial release

- User accounts, cloud sync, shared household accounts, or a backend
- Bank account connections or automatic financial aggregation
- Advertising, analytics, telemetry, or behavioral tracking
- Required third-party fonts, CDNs, scripts, or APIs at runtime
- Push notifications and background financial processing
- Native App Store distribution

These exclusions preserve the core promise: a small, dependable, offline personal tool.

## 4. Information architecture and user experience

The application will use four primary destinations.

### 4.1 Today

The default screen emphasizes one hero figure: **Safe to spend today**. Supporting information appears in a stable hierarchy:

1. Safe-to-spend amount
2. Remaining cycle balance and days remaining
3. One consistent pace state and explanation
4. Recent activity
5. Primary “Add transaction” action

Pace status will come from one canonical calculation and vocabulary, preventing contradictory messages such as “Spending fast” and “On track” at the same time.

### 4.2 Activity

Activity combines transaction history and cycle browsing. It provides:

- Search and accessible filters
- Clear expense, income, credit-card, and reimbursement treatment
- Edit and delete actions with confirmation appropriate to impact
- Date, category, note, payment method, and source visibility
- Empty states that explain the next useful action
- Historical cycle summaries without mixing them into the active cycle

### 4.3 Plan

Plan contains allowance and category setup, cycle configuration, rollover, savings choices, and backup health. Setup will guide a new user through the minimum usable configuration and will not leave them trapped if no categories exist.

### 4.4 Card

Credit-card obligations and reimbursements will be visually and semantically separated:

- **You owe the bank** — the user’s outstanding card balance.
- **Wife owes you** — reimbursable spending that should not distort the user’s actual cost.

Turning reimbursement tracking off will normalize related transaction flags safely and predictably rather than leaving hidden stale state.

### 4.5 Transaction entry

The entry flow will prioritize speed:

- Amount is the first control and receives focus when appropriate.
- Expense/income and category are quick choices.
- Advanced fields such as date, note, card use, reimbursement, and import source are progressively disclosed.
- Backdated transactions are routed to the cycle that actually contains their date.
- The interface explains any unusual treatment before saving.

### 4.6 Visual language

The application will feel like a calm daily financial instrument, not a dense banking dashboard.

- Warm paper background: approximately `#F6F5F0`
- Ink text: approximately `#17232C`
- Primary teal: approximately `#2E7D70`
- Secondary slate: approximately `#6B7780`
- Warning amber: approximately `#B87924`
- Danger red: approximately `#B94A48`
- Native system font stack with tabular numerals
- Restrained corner rounding and shadows
- Minimum 44×44 px interactive targets
- Strong visible focus states and contrast-compliant text
- Motion kept brief and disabled when reduced motion is requested

The brand mark will combine an AED/dirham monetary cue with a horizon or daily-allowance motif. A complete icon family will be generated and visually checked at iPhone home-screen sizes.

## 5. Technical architecture

### 5.1 Runtime model

The app will be a static client-side PWA using semantic HTML, CSS, and modular JavaScript. Core operation will have zero runtime service dependencies. Development-only tools may be used for validation and testing, but the deployed app must not need them.

Suggested repository structure:

```text
spending-tracker-next/
├── .github/workflows/
├── docs/
│   └── superpowers/
├── site/
│   ├── index.html
│   ├── features/
│   ├── privacy/
│   ├── evidence/
│   ├── releases/
│   ├── assets/
│   └── app/
│       ├── index.html
│       ├── manifest.webmanifest
│       ├── sw.js
│       ├── assets/
│       └── src/
├── tests/
├── tools/
├── package.json
└── README.md
```

### 5.2 Domain separation

Calculations will be isolated from rendering and browser storage. Pure modules will cover:

- Cycle boundaries and transaction-to-cycle routing
- Safe-to-spend and pace calculations
- Card balance and reimbursement calculations
- Category totals
- Backup validation and migration
- Locale-independent monetary and date normalization

UI components will consume derived state rather than duplicate financial formulas.

### 5.3 Storage and compatibility

- The new app will use a unique, versioned localStorage namespace, such as `spending-tracker-next:v1`.
- It will not automatically read or overwrite the old app’s origin-wide key.
- Existing V1 JSON backup files will be accepted through an explicit import and migration flow.
- Imports will be parsed and schema-validated before any persistent state changes.
- IDs, colors, categories, dates, transaction types, numeric bounds, and optional fields will be normalized or rejected with actionable messages.
- Restore will be transactional: the current state is preserved until the entire candidate backup is valid.
- An automatic pre-restore backup will be offered or created where browser capabilities allow.
- The Plan screen will display the date of the most recent successful backup export or restore.

### 5.4 Date and lifecycle behavior

- “Today” will be derived through one clock abstraction that can be controlled in tests.
- On visibility change, focus, page restoration, or resume after midnight, the app will re-evaluate the active day and cycle.
- Backdated and future-dated transactions will be classified by their actual dates rather than forced into the active cycle.
- Date rendering will use locale-aware formatting and explicit bidi isolation where needed.

### 5.5 Security and output safety

- User-controlled values will be rendered through safe text APIs rather than interpolated HTML.
- Imported identifiers and color values will use strict allowlists or normalization.
- CSV cells beginning with spreadsheet formula prefixes will be escaped.
- No secrets will be embedded in the static site.
- A content security policy suitable for the self-contained app will be evaluated and enabled if compatible with PWA requirements.

## 6. PWA, iPhone, and offline behavior

- The app will live under `/app/`, and its service worker scope will be limited to that path.
- Cache names will include the product and release version.
- Installation and activation will never delete unrelated caches belonging to other GitHub Pages applications on the same origin.
- The application shell and required local assets will be precached.
- Navigation will fall back only to the app shell within scope.
- Runtime caching will be minimal because the app has no required external data.
- Failed upgrades will retain a usable previous cache until the new release is complete.
- The UI will explain when an update is ready and let the user apply it deliberately.
- Manifest, Apple touch icons, theme colors, safe-area handling, viewport behavior, and standalone display will be verified on iPhone-sized viewports.
- The report hub will provide concise Safari “Add to Home Screen” instructions and backup-before-upgrade advice.

## 7. Accessibility and internationalization

The release target is WCAG 2.2 AA where applicable.

- Semantic landmarks, headings, labels, dialogs, lists, and buttons
- Complete keyboard interaction and logical focus management
- Screen-reader announcements for saves, errors, imports, and destructive actions
- Color is never the only carrier of meaning
- Contrast and target-size checks
- Reduced-motion support
- English and Arabic copy kept in a centralized message layer
- Document direction, component direction, icon direction, number presentation, dates, and mixed-script notes tested in RTL
- Monetary values remain understandable in both languages without fragile string concatenation

## 8. Testing and verification strategy

Test reporting will distinguish declarations, parameterized cases, and total executions so imported test modules cannot inflate published counts.

### 8.1 Automated layers

- **Unit tests:** cycle boundaries, pace, allowances, card/reimbursement logic, validation, migration, dates, and CSV safety
- **Integration tests:** storage, import/restore transactionality, UI state transitions, settings changes, and lifecycle refresh
- **Browser tests:** first run, transaction CRUD, backdating, history, card use, reimbursements, SMS review, backup round-trip, Arabic, themes, and update flow
- **PWA tests:** manifest, icon availability, service-worker registration/scope, cold offline launch, cached navigation, and version upgrades
- **Accessibility checks:** automated scanning plus keyboard/focus assertions
- **Static-site validation:** internal links, required metadata, downloadable artifact hashes where applicable, prohibited private content, and published version consistency

### 8.2 Break-testing scenarios

- Corrupt, truncated, oversized, and structurally malicious backups
- Duplicate IDs and invalid category references
- Dates at month/year/leap-day/DST boundaries
- Midnight rollover while the installed app remains open
- Storage quota or write failures
- Rapid repeated saves and duplicate submissions
- Deleting categories referenced by transactions
- Toggling wife tracking with existing reimbursable transactions
- Interrupted service-worker update
- Offline refresh on every application route
- Very long notes, large values, zero/negative values, and mixed Arabic/English content
- Narrow screens, landscape orientation, zoom, increased text size, and safe-area insets

### 8.3 Human visual review

Desktop and iPhone-sized screenshots will be captured for all primary screens in light/dark and representative English/Arabic modes. A written review will check hierarchy, clipping, overlap, empty states, error states, dialogs, fixed navigation, the transaction action, and home-screen icon legibility.

## 9. Publishing and release gates

GitHub Actions will validate and deploy the `site/` directory to GitHub Pages. A release is complete only when all of the following are true:

1. Clean dependency installation succeeds.
2. Formatting/lint/static validation succeeds.
3. Unit and integration suites pass.
4. Browser, accessibility, migration, and offline tests pass.
5. The public-site validator and its regression tests pass.
6. Production pages contain no broken internal links or missing icons/assets.
7. The deployed HTTPS app launches online and from a cold offline state after installation.
8. The old application remains unaffected.
9. Published evidence matches the exact tested commit and version.
10. The README, hub, manifest, app version, and release notes agree.

The deployment workflow will use the standard GitHub Pages artifact and deployment actions with the minimum required permissions. Repository creation, Pages enablement, and final live verification will use the authenticated GitHub account already associated with the original project.

## 10. Migration and rollout

The old and new applications will coexist.

1. User exports a JSON backup from the old app.
2. User opens Spending Tracker Next and selects import.
3. The new app identifies the backup format, validates it, and previews a migration summary.
4. Nothing is written until the user confirms.
5. After import, the app reports accepted, normalized, and rejected records.
6. User verifies key totals and keeps the old app until satisfied.

No automatic cross-application migration will be attempted because GitHub Pages projects share an origin and automatic storage access could create unsafe ambiguity.

## 11. Implementation approach considered

Three approaches were evaluated:

1. **Evolutionary rebuild — selected.** Reuse and verify sound domain concepts and backup compatibility while rebuilding lifecycle handling, validation, UI composition, PWA isolation, and release infrastructure. This offers the strongest balance of continuity and quality.
2. **Clean-sheet vanilla rewrite.** Offers conceptual cleanliness but increases the risk of losing subtle existing behaviors and delaying compatibility.
3. **Framework-based rewrite.** Provides component tooling but adds dependencies, build complexity, and upgrade surface without solving a necessary product problem.

The selected approach treats the current code as a behavior reference and migration source, not as code that must be copied unquestioningly.

## 12. Success criteria

The project succeeds when the user can install it from GitHub Pages on an iPhone, import an old backup, record and review spending entirely offline, understand the daily safe-to-spend figure without contradictory messaging, export a restorable backup, and return after updates without lost data. The public hub must make those capabilities, privacy properties, limitations, and verification evidence independently understandable.

## 13. Approval record

The user approved the recommended direction on 2026-09-20: separate public repository, report hub at the Pages root, scoped PWA under `/app/`, preservation of the original app, backup compatibility, complete audit remediation, offline operation, iPhone branding, and comprehensive automated and hands-on testing.
