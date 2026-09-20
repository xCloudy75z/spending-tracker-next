# Spending Tracker Next Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build, verify, publish, and document a production-quality offline Spending Tracker PWA that imports the original app’s backups and installs reliably on iPhone.

**Architecture:** A dependency-free static runtime lives under site/app, with pure ES modules for domain rules and a small observable application store for browser state. The GitHub Pages root is a separate static evidence hub; Node development dependencies provide unit, browser, accessibility, PWA, and publishing validation without becoming runtime dependencies.

**Tech Stack:** Semantic HTML5, CSS, native ES modules, localStorage, Service Worker, Web App Manifest, Node.js 22 LTS, Node test runner, Playwright, axe-core, Sharp, Python 3 standard library, GitHub Actions, GitHub Pages.

**Spec:** docs/superpowers/specs/2026-09-20-spending-tracker-next-design.md

**Execution method:** Native execution in this task, followed by independent whole-branch review. The user authorized autonomous decisions and requested work through deployment.

## Global Constraints

- Write or delete files only inside the designated Spending Tracker project directory and its GitHub repository.
- Read access elsewhere in Documents is allowed, but no writes outside the project.
- Keep the existing rem-money repository and deployed application unchanged.
- Deploy the report hub at the GitHub Pages root and the installable application under /app/.
- Keep core runtime operation free of servers, accounts, analytics, CDNs, external fonts, and required third-party network calls.
- Use a unique storage namespace: spending-tracker-next:v1.
- Scope the service worker to /app/ and never delete caches outside the spending-tracker-next prefix.
- Accept original schemaVersion 1 backups through explicit, transactional import; do not silently read the original app’s storage key.
- Support English and Arabic, LTR and RTL, light/dark/system themes, reduced motion, and WCAG 2.2 AA where applicable.
- Use test-driven development: every behavior change begins with a failing focused test.
- Publish exact test declaration, case, and execution counts; never inflate totals through imported test registration.
- Do not publish private financial fixtures, local filesystem paths, credentials, or secrets.
- Do not claim release completion until the deployed HTTPS app has been checked online and in a cold offline state.

## Review Focus

- A valid-looking backup with duplicate IDs, invalid references, HTML-bearing names, or malformed colors must be rejected or normalized before storage changes; Task 3 adds adversarial import tests.
- A transaction on a cycle boundary, leap day, future date, or after midnight resume must resolve to the correct cycle and refreshed Today model; Tasks 2 and 7 add deterministic clock and lifecycle tests.
- Disabling wife tracking with existing reimbursable purchases must normalize flags without corrupting bank liability history; Task 4 adds transition tests.
- A service-worker upgrade interrupted between install and activate must retain a usable prior shell and must not touch caches belonging to rem-money; Task 11 adds upgrade and cache-isolation browser tests.
- Very long mixed Arabic/English notes, 200% zoom, increased text size, safe-area insets, and narrow landscape viewports must not hide controls or overlap the transaction action; Tasks 6, 9, and 12 add content and visual tests.

---

## File Map

### Repository and tooling

- package.json — exact scripts, supported Node version, development dependencies, and release metadata.
- package-lock.json — reproducible dependency graph.
- .gitignore — generated browser reports, local caches, and temporary evidence.
- README.md — user-facing project overview, privacy promise, install path, development commands, and release status.
- LICENSE — MIT license.
- tools/validate-public-site.mjs — internal link, metadata, privacy-string, version, asset, and hash validation.
- tools/count-tests.mjs — declaration/case/execution reporting without module re-registration.
- tools/generate-icons.mjs — deterministic branded icon rasterization from the approved source mark.
- tools/serve.mjs — local static server with correct MIME types and no-cache development headers.

### Application domain

- site/app/src/domain/model.js — canonical state factory, entity shapes, ID rules, and invariants.
- site/app/src/domain/dates.js — strict ISO-local date arithmetic and cycle boundary generation.
- site/app/src/domain/cycles.js — cycle lookup, safe-to-spend, pace, summaries, and category totals.
- site/app/src/domain/liabilities.js — bank card and wife reimbursement ledgers.
- site/app/src/domain/transactions.js — immutable add/update/delete/category reassignment and wife-mode normalization.
- site/app/src/domain/sms.js — supported bank SMS parsing and duplicate detection.
- site/app/src/domain/csv.js — safe spreadsheet export.
- site/app/src/domain/backup.js — V1 detection, schema validation, migration preview, and transactional restore preparation.

### Application platform

- site/app/src/platform/clock.js — injectable local clock and lifecycle date-change detection.
- site/app/src/platform/storage.js — versioned localStorage adapter, snapshots, quota failures, and backup timestamp metadata.
- site/app/src/platform/downloads.js — JSON/CSV file creation and safe filename generation.
- site/app/src/platform/pwa.js — registration, update-ready state, and deliberate activation.

### Application UI

- site/app/index.html — semantic application shell, CSP, metadata, navigation, dialog hosts, and no-script message.
- site/app/src/main.js — boot, migration recovery, controller wiring, lifecycle refresh, and fatal-state handling.
- site/app/src/app-store.js — state reducer, persistence boundary, selectors, and subscription API.
- site/app/src/router.js — four-tab route state and history handling.
- site/app/src/i18n.js — complete English/Arabic message catalogs and locale formatting.
- site/app/src/ui/dom.js — safe DOM helpers, focus restoration, live-region announcements, and dialog primitives.
- site/app/src/ui/today.js — safe-to-spend hero, pace, recent activity, and quick action.
- site/app/src/ui/activity.js — searchable/filterable transactions and cycle history.
- site/app/src/ui/plan.js — allowance, cycle, categories, rollover, backup health, and settings.
- site/app/src/ui/card.js — separate bank and wife ledgers.
- site/app/src/ui/transaction-dialog.js — create/edit transaction form with progressive fields.
- site/app/src/ui/sms-dialog.js — SMS paste, review, cycle routing, and batch import.
- site/app/src/ui/backup-dialog.js — import preview, confirmation, restore result, and export controls.
- site/app/assets/app.css — complete responsive visual system.

### PWA and brand

- site/app/manifest.webmanifest — standalone app manifest scoped to /app/.
- site/app/sw.js — versioned, prefix-isolated application-shell caching and upgrade messaging.
- site/app/assets/brand/mark.svg — accessible source logo.
- site/app/assets/icons/*.png — 180, 192, 512, and 512-maskable icons.
- site/app/assets/screenshots/*.png — manifest-ready app screenshots generated from verified UI.

### Public hub

- site/index.html — overview, verified status, app launch, and install path.
- site/features/index.html — feature and workflow tour.
- site/privacy/index.html — local-data model and permissions.
- site/evidence/index.html — test matrix, screenshots, audit remedies, and exact commit/version.
- site/migrate/index.html — original-app backup migration guide.
- site/releases/index.html — release notes and support boundaries.
- site/assets/site.css — responsive report-hub design.
- site/assets/site.js — progressive enhancement only; pages remain usable without it.

### Tests and evidence

- tests/helpers/fixtures.js — isolated factories; never registers tests when imported.
- tests/helpers/fake-storage.js — quota/error-capable storage double.
- tests/unit/*.test.js — pure domain and platform tests.
- tests/integration/*.test.js — store, migration, lifecycle, and recovery tests.
- tests/browser/*.spec.js — user journeys, accessibility, RTL, themes, PWA, and offline checks.
- tests/site/validate-public-site.test.js — validator regression suite.
- playwright.config.js — desktop and iPhone WebKit/Chromium projects.
- evidence/verification.md — exact commands, results, limitations, and live checks.
- evidence/visual-review.md — written desktop/iPhone, English/Arabic, light/dark review.
- evidence/screenshots/*.png — reviewed screenshots without personal data.
- .github/workflows/quality.yml — clean install and complete verification.
- .github/workflows/pages.yml — validated Pages artifact deployment.

---

### Task 1: Establish the reproducible project and validator baseline

**Files:**
- Create: package.json
- Create: .gitignore
- Create: LICENSE
- Create: tools/serve.mjs
- Create: tools/validate-public-site.mjs
- Create: tests/site/validate-public-site.test.js
- Create: site/index.html

**Interfaces:**
- Consumes: Node.js 22 or newer and the repository root.
- Produces: npm run serve, npm run validate:site, and validatePublicSite(rootDir) returning { ok, errors, filesChecked }.

- [ ] **Step 1: Write the failing validator regression test**

    import test from 'node:test';
    import assert from 'node:assert/strict';
    import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
    import { tmpdir } from 'node:os';
    import { join } from 'node:path';
    import { validatePublicSite } from '../../tools/validate-public-site.mjs';

    test('validator rejects a broken internal link and a local Windows path', async () => {
      const root = await mkdtemp(join(tmpdir(), 'spending-site-'));
      await mkdir(root, { recursive: true });
      await writeFile(join(root, 'index.html'),
        '<title>Spending Tracker Next</title><a href="./missing/">Open</a><p>C:\\Users\\owner</p>');
      const result = await validatePublicSite(root);
      assert.equal(result.ok, false);
      assert.match(result.errors.join('\n'), /missing/);
      assert.match(result.errors.join('\n'), /local filesystem path/);
    });

- [ ] **Step 2: Run the test and verify the module is missing**

    Run: node --test tests/site/validate-public-site.test.js
    Expected: FAIL with ERR_MODULE_NOT_FOUND for tools/validate-public-site.mjs.

- [ ] **Step 3: Create package scripts and the minimal validator**

    package.json must set type to module, engines.node to >=22, version to 1.0.0, and scripts:
    test:unit, test:integration, test:site, test:browser, test, validate:site, serve, icons, and verify.

    validatePublicSite must recursively inspect site HTML, resolve root-relative and relative local href/src values, reject missing targets, reject file:// and Windows absolute paths, require title/description/viewport on every page, and expose a CLI that exits nonzero when errors exist.

- [ ] **Step 4: Add a minimal valid hub page and static server**

    The server must accept --root and --port arguments, map extensionless directories to index.html, return correct manifest/JS/CSS/SVG/PNG types, prevent path traversal, and send Cache-Control: no-store during local review.

- [ ] **Step 5: Run focused and baseline checks**

    Run: npm run test:site
    Expected: PASS with one declaration and one execution.

    Run: npm run validate:site
    Expected: PASS and report filesChecked: 1.

- [ ] **Step 6: Commit**

    git add package.json .gitignore LICENSE tools tests/site site/index.html
    git commit -m "build: establish project validation baseline"

### Task 2: Implement deterministic dates, cycles, and one canonical pace model

**Files:**
- Create: site/app/src/domain/dates.js
- Create: site/app/src/domain/cycles.js
- Create: site/app/src/platform/clock.js
- Create: tests/helpers/fixtures.js
- Create: tests/unit/dates.test.js
- Create: tests/unit/cycles.test.js
- Create: tests/unit/clock.test.js

**Interfaces:**
- Consumes: state with cycles and transactions maps plus YYYY-MM-DD local dates.
- Produces: addDays(date, count), daysInclusive(start, end), cycleForDate(state, date), deriveToday(state, today), paceStatus(model), createClock(nowFn), and didLocalDayChange(previous, current).

- [ ] **Step 1: Write boundary and leap-day failures**

    test('cycleForDate includes both boundaries and rejects adjacent days', () => {
      const state = stateWithCycle({ id: 'c1', startDate: '2028-02-01', endDate: '2028-02-29' });
      assert.equal(cycleForDate(state, '2028-02-01').id, 'c1');
      assert.equal(cycleForDate(state, '2028-02-29').id, 'c1');
      assert.equal(cycleForDate(state, '2028-03-01'), null);
    });

    test('deriveToday exposes one pace state and safe amount', () => {
      const model = deriveToday(stateWithSpending(), '2026-09-20');
      assert.deepEqual(Object.keys(model.pace).sort(), ['detailKey', 'state']);
      assert.equal(Number.isFinite(model.safeToSpend), true);
    });

    test('a resumed page detects a changed local day', () => {
      assert.equal(didLocalDayChange('2026-09-20', '2026-09-21'), true);
    });

- [ ] **Step 2: Run focused tests and verify missing exports**

    Run: node --test tests/unit/dates.test.js tests/unit/cycles.test.js tests/unit/clock.test.js
    Expected: FAIL because the domain modules do not exist.

- [ ] **Step 3: Implement strict date arithmetic and cycle resolution**

    Reject invalid calendar dates instead of relying on UTC parsing. Use integer Gregorian conversion for addDays and daysInclusive. cycleForDate must return the sole containing cycle, throw INVARIANT_OVERLAPPING_CYCLES when more than one matches, and return null outside all ranges.

- [ ] **Step 4: Implement the canonical Today model**

    deriveToday must calculate cycle budget, pace-counted spend, spent today, remaining balance, days remaining, safeToSpend, and a single pace object. pace.state is one of insufficient-data, ahead, steady, watch, or over; every UI consumes this object instead of recalculating a status.

- [ ] **Step 5: Add future, pre-cycle, DST, overspend, refund, and excluded-spend tests**

    Tests must pin local-date behavior around 2026-03-29 and 2026-10-25 without constructing dates inside pure domain modules. Overspending must produce a negative safeToSpend value and pace state over; wife-excluded spending must not alter safeToSpend.

- [ ] **Step 6: Run tests and commit**

    Run: npm run test:unit
    Expected: PASS with each test declared only once.

    git add site/app/src/domain/dates.js site/app/src/domain/cycles.js site/app/src/platform/clock.js tests/helpers tests/unit
    git commit -m "feat: add deterministic spending cycle model"

### Task 3: Define the state model and adversarial backup migration

**Files:**
- Create: site/app/src/domain/model.js
- Create: site/app/src/domain/backup.js
- Create: tests/fixtures/original-v1.json
- Create: tests/fixtures/malicious-v1.json
- Create: tests/unit/model.test.js
- Create: tests/unit/backup.test.js
- Create: tests/integration/backup-roundtrip.test.js

**Interfaces:**
- Consumes: parsed unknown JSON and injected { nowISO, idFactory }.
- Produces: createEmptyState(), validateState(candidate), inspectBackup(text, options), migrateOriginalV1(candidate, options), serializeBackup(state), and RestorePreview { candidate, sourceVersion, counts, warnings }.

- [ ] **Step 1: Add a sanitized original-app fixture**

    The fixture must include settings, two categories, two cycles, expenses, refund, credit purchase, wife purchase, wife payment, category budgets, and localized timestamps. Values must be artificial and clearly labeled TEST DATA.

- [ ] **Step 2: Write failing compatibility and adversarial tests**

    test('original V1 backup migrates without changing financial totals', () => {
      const preview = inspectBackup(originalText, fixedOptions);
      assert.equal(preview.sourceVersion, 'original-v1');
      assert.equal(preview.counts.transactions, 4);
      assert.equal(sumSigned(preview.candidate), sumSignedOriginal(originalText));
    });

    test('invalid references and dangerous presentational fields never reach storage', () => {
      assert.throws(() => inspectBackup(maliciousText, fixedOptions), error =>
        error.code === 'BACKUP_INVALID' &&
        error.issues.some(issue => issue.path === 'transactions.bad.categoryId') &&
        error.issues.some(issue => issue.path === 'categories.bad.color'));
    });

    test('duplicate embedded IDs are rejected even when map keys differ', () => {
      assert.throws(() => inspectBackup(duplicateIdText, fixedOptions), /duplicate entity id/);
    });

- [ ] **Step 3: Run tests and confirm failure**

    Run: node --test tests/unit/model.test.js tests/unit/backup.test.js tests/integration/backup-roundtrip.test.js
    Expected: FAIL with missing model.js and backup.js.

- [ ] **Step 4: Implement canonical state and strict validation**

    The state schema remains schemaVersion 1 in the new namespace for explicit compatibility. Validate finite currency amounts in 0.01..999999999.99, IDs against a strict alphanumeric/dash/underscore pattern with a 64-character limit, colors as six-digit hexadecimal values, ISO dates strictly, locale as en or ar, theme as system/light/dark, note length at most 500, category name at most 40, and referential integrity for cycles/categories. Reject overlapping cycles and unsupported collections.

- [ ] **Step 5: Implement non-mutating migration and preview**

    migrateOriginalV1 deep-clones input, fills optional liability/reimbursement/category-budget fields, maps old settings, retains stable valid IDs, generates replacements only for missing legacy IDs, normalizes wife purchases to isCredit=true and isExcludedFromPace=true, and records warnings. inspectBackup enforces a 5 MiB UTF-8 limit before JSON parsing and returns no partially migrated candidate on error.

- [ ] **Step 6: Add corrupt, truncated, oversized, prototype-key, and round-trip tests**

    Include __proto__, constructor, NaN-like strings, excessive nesting, absent collections, null entities, invalid Unicode control characters, duplicate category names, overlapping cycles, and serialization followed by reinspection. Confirm the original fixture object is byte-for-byte unchanged after migration.

- [ ] **Step 7: Run tests and commit**

    Run: npm run test:unit
    Run: npm run test:integration
    Expected: PASS; original V1 totals and IDs are preserved where valid.

    git add site/app/src/domain/model.js site/app/src/domain/backup.js tests/fixtures tests/unit tests/integration
    git commit -m "feat: add safe original-backup migration"

### Task 4: Implement immutable transactions, card liabilities, reimbursements, SMS, and CSV

**Files:**
- Create: site/app/src/domain/transactions.js
- Create: site/app/src/domain/liabilities.js
- Create: site/app/src/domain/sms.js
- Create: site/app/src/domain/csv.js
- Create: tests/unit/transactions.test.js
- Create: tests/unit/liabilities.test.js
- Create: tests/unit/sms.test.js
- Create: tests/unit/csv.test.js

**Interfaces:**
- Consumes: canonical state and validated transaction/category/payment commands.
- Produces: addTransaction, updateTransaction, deleteTransaction, reassignCategory, setWifeTracking, bankSummary, wifeSummary, parseSms, prepareSmsTransactions, and exportTransactionsCsv.

- [ ] **Step 1: Write failing mutation and ledger tests**

    test('backdated transaction is assigned to its containing cycle', () => {
      const next = addTransaction(twoCycleState, expense({ date: '2026-08-31' }), fixedContext);
      assert.equal(next.transactions.t1.cycleId, 'august');
    });

    test('turning wife tracking off normalizes stale flags but preserves explicit card use', () => {
      const next = setWifeTracking(wifeState, false);
      assert.equal(next.settings.wifeTracking, false);
      assert.equal(next.transactions.wifeOnly.byWife, false);
      assert.equal(next.transactions.wifeOnly.isExcludedFromPace, false);
      assert.equal(next.transactions.cardAndWife.isCredit, true);
    });

    test('bank and wife summaries remain independent', () => {
      assert.equal(bankSummary(ledgerState).outstanding, 300);
      assert.equal(wifeSummary(ledgerState).balance, 120);
    });

- [ ] **Step 2: Run tests and verify failure**

    Run: node --test tests/unit/transactions.test.js tests/unit/liabilities.test.js
    Expected: FAIL because transaction and liability modules are missing.

- [ ] **Step 3: Implement immutable commands and ledgers**

    Every command returns a new state, validates its inputs, and leaves the prior state unchanged. addTransaction derives cycleId from date and refuses dates outside every cycle with code DATE_OUTSIDE_CYCLES. Wife-only purchases set isCredit and isExcludedFromPace; disabling wife tracking clears byWife, wifeSettled, wifeSettledAt, and wife-only exclusion while retaining card status when creditSource is explicit.

- [ ] **Step 4: Write and implement SMS parser tests**

    Cover approved/declined card purchase formats, debit format, commas, merchant commas, duplicate lines, unrecognized lines, invalid dates, and transaction dates in archived cycles. prepareSmsTransactions must require user-selected category and confirmation, skip declined rows, and assign every accepted row through cycleForDate.

- [ ] **Step 5: Write and implement CSV formula-safety tests**

    test('CSV neutralizes spreadsheet formulas in every text column', () => {
      const csv = exportTransactionsCsv(csvStateWithNotes('=HYPERLINK("https://bad")'));
      assert.match(csv, /"'=HYPERLINK/);
      assert.doesNotMatch(csv, /,"=HYPERLINK/);
    });

    Prefix cells beginning after optional whitespace with =, +, -, @, tab, or carriage return by a single apostrophe before RFC 4180 quoting. Emit UTF-8 BOM for Excel and deterministic column order.

- [ ] **Step 6: Run tests and commit**

    Run: npm run test:unit
    Expected: PASS.

    git add site/app/src/domain tests/unit
    git commit -m "feat: add safe transaction and liability workflows"

### Task 5: Add transactional storage and the application store

**Files:**
- Create: site/app/src/platform/storage.js
- Create: site/app/src/app-store.js
- Create: tests/helpers/fake-storage.js
- Create: tests/unit/storage.test.js
- Create: tests/integration/app-store.test.js
- Create: tests/integration/restore-transaction.test.js

**Interfaces:**
- Consumes: window.localStorage-compatible adapter and validated state commands.
- Produces: STORAGE_KEY, SNAPSHOT_KEY, META_KEY, createStorage(adapter), createAppStore({ initialState, persist }), dispatch(command), getState(), subscribe(listener), previewRestore(text), and commitRestore(preview).

- [ ] **Step 1: Write failing namespace, quota, and atomic restore tests**

    test('storage uses only Spending Tracker Next keys', () => {
      const storage = createStorage(fakeStorage());
      storage.save(createEmptyState());
      assert.deepEqual(storage.adapter.keys(), [
        'spending-tracker-next:meta:v1',
        'spending-tracker-next:state:v1'
      ]);
    });

    test('failed restore preserves current state and snapshot', async () => {
      const store = createAppStore({ initialState, persist: quotaFailingStorage });
      const preview = store.previewRestore(validBackup);
      await assert.rejects(() => store.commitRestore(preview), /STORAGE_WRITE_FAILED/);
      assert.deepEqual(store.getState(), initialState);
    });

- [ ] **Step 2: Run focused tests and confirm missing modules**

    Run: node --test tests/unit/storage.test.js tests/integration/app-store.test.js tests/integration/restore-transaction.test.js
    Expected: FAIL with module-not-found errors.

- [ ] **Step 3: Implement storage and recovery**

    save first serializes and validates, writes a recovery snapshot, writes the new state, reads it back, and only then updates metadata. On failure, restore the prior serialized state and return a typed error. load reports empty, ready, recovered-snapshot, or corrupt without silently discarding raw corrupt data.

- [ ] **Step 4: Implement command dispatch and subscriptions**

    dispatch accepts named command objects, calls one domain reducer, persists once, and notifies subscribers only after successful persistence. Reject re-entrant dispatch and duplicate submissionId values for 10 seconds to stop rapid double saves.

- [ ] **Step 5: Add storage-access, quota, corrupt-state, and duplicate-submit tests**

    Include getItem throwing SecurityError, setItem throwing QuotaExceededError, read-back mismatch, corrupt primary with valid snapshot, corrupt primary and corrupt snapshot, and two immediate identical transaction commands.

- [ ] **Step 6: Run tests and commit**

    Run: npm run test:unit
    Run: npm run test:integration
    Expected: PASS.

    git add site/app/src/platform/storage.js site/app/src/app-store.js tests/helpers/fake-storage.js tests/unit/storage.test.js tests/integration
    git commit -m "feat: add recoverable local application store"

### Task 6: Build internationalization and accessible UI primitives

**Files:**
- Create: site/app/src/i18n.js
- Create: site/app/src/ui/dom.js
- Create: site/app/assets/app.css
- Create: tests/unit/i18n.test.js
- Create: tests/browser/primitives.spec.js

**Interfaces:**
- Consumes: locale en/ar, message key, values, safe DOM document, and dialog configuration.
- Produces: messages, t(locale, key, values), formatMoney, formatDate, setDocumentLocale, el, text, createDialog, announce, and restoreFocus.

- [ ] **Step 1: Write failing catalog-parity and bidi tests**

    test('English and Arabic catalogs expose identical keys', () => {
      assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages.ar).sort());
    });

    test('mixed-script notes render as isolated text, never HTML', () => {
      const node = text(document, '<img src=x onerror=alert(1)> مرحبا');
      assert.equal(node.textContent, '<img src=x onerror=alert(1)> مرحبا');
      assert.equal(node.querySelector('img'), null);
      assert.equal(node.dir, 'auto');
    });

- [ ] **Step 2: Run tests and confirm failure**

    Run: node --test tests/unit/i18n.test.js
    Expected: FAIL because i18n.js does not exist.

- [ ] **Step 3: Implement complete catalogs and locale formatting**

    Provide every navigation, action, field, status, empty-state, import, restore, error, update, privacy, and install string in both languages. Use Intl.NumberFormat with AED and Intl.DateTimeFormat; wrap dynamic mixed-script content in bdi or dir=auto.

- [ ] **Step 4: Implement dialog, focus, and announcement primitives**

    Dialogs trap focus, close on Escape unless a destructive commit is running, restore the opener, expose aria-labelledby and aria-describedby, prevent background interaction, and announce save/import/error results through a persistent polite or assertive live region.

- [ ] **Step 5: Establish visual tokens and accessibility rules**

    Define the approved paper/ink/teal/slate/amber/red palette for light and dark modes, native font stack, tabular numbers, 44 px targets, visible focus rings, safe-area variables, reduced-motion overrides, responsive content widths, and no fixed element that can overlap final content.

- [ ] **Step 6: Run unit tests and commit**

    Run: npm run test:unit
    Expected: PASS.

    git add site/app/src/i18n.js site/app/src/ui/dom.js site/app/assets/app.css tests/unit/i18n.test.js tests/browser/primitives.spec.js
    git commit -m "feat: add accessible bilingual UI foundation"

### Task 7: Build the application shell, routing, boot, and lifecycle refresh

**Files:**
- Create: site/app/index.html
- Create: site/app/src/router.js
- Create: site/app/src/main.js
- Create: tests/unit/router.test.js
- Create: tests/integration/lifecycle.test.js
- Create: tests/browser/shell.spec.js

**Interfaces:**
- Consumes: createAppStore, createClock, four view render functions, and browser events.
- Produces: route values today/activity/plan/card, mountApp(root, dependencies), refreshForCurrentDay(), and a semantic shell with one main landmark.

- [ ] **Step 1: Write failing route and overnight-resume tests**

    test('unknown routes normalize to Today without a network navigation', () => {
      assert.equal(parseRoute('#/unknown'), 'today');
      assert.equal(formatRoute('card'), '#/card');
    });

    test('visibility resume after midnight recalculates the active cycle', () => {
      const app = lifecycleHarness({ dates: ['2026-09-20', '2026-09-21'] });
      app.emitVisibility('visible');
      assert.equal(app.latestToday, '2026-09-21');
      assert.equal(app.renderCount, 2);
    });

- [ ] **Step 2: Run focused tests and confirm failure**

    Run: node --test tests/unit/router.test.js tests/integration/lifecycle.test.js
    Expected: FAIL because router and main modules are missing.

- [ ] **Step 3: Implement semantic shell and four-tab router**

    index.html contains skip link, header, main, bottom navigation, dialog host, live region, SVG icon sprite, no inline event handlers, manifest and Apple metadata, and a strict same-origin CSP. Hash routes avoid server rewrites and keep all app navigation under /app/.

- [ ] **Step 4: Implement boot and lifecycle recovery**

    main.js loads storage, surfaces corrupt/recovered states, initializes a first-run state without storing until setup completes, and subscribes to visibilitychange, focus, and pageshow. Each event compares the clock date to lastRenderedDate and recomputes active cycle only when changed.

- [ ] **Step 5: Add keyboard navigation, reload, and fatal-state browser tests**

    Verify skip link, tab order, current-page aria state, hash back/forward, app reload retaining state, and a storage-denied screen that still permits backup-file inspection without claiming a save succeeded.

- [ ] **Step 6: Run tests and commit**

    Run: npm run test:unit
    Run: npm run test:integration
    Expected: PASS.

    git add site/app/index.html site/app/src/router.js site/app/src/main.js tests
    git commit -m "feat: add resilient application shell"

### Task 8: Implement Today and progressive transaction entry

**Files:**
- Create: site/app/src/ui/today.js
- Create: site/app/src/ui/transaction-dialog.js
- Create: tests/unit/today-view-model.test.js
- Create: tests/browser/today.spec.js
- Create: tests/browser/transactions.spec.js

**Interfaces:**
- Consumes: deriveToday, translated strings, app-store commands, active categories, and current local date.
- Produces: renderToday(container, model, actions) and openTransactionDialog(options) resolving to a validated command or cancel.

- [ ] **Step 1: Write failing Today model and DOM safety tests**

    Test that safe-to-spend is the first monetary heading, only one pace state is rendered, overspend is explained without hiding the negative amount, no-data state links to setup, and a malicious note appears only as text.

- [ ] **Step 2: Run focused tests and confirm missing views**

    Run: node --test tests/unit/today-view-model.test.js
    Expected: FAIL because today.js does not exist.

- [ ] **Step 3: Implement the Today hierarchy**

    Render safe-to-spend hero, remaining balance, days left, canonical pace detail, last five transactions, backup-age warning when older than 14 days, and one primary add button. Use a document fragment and safe text nodes only.

- [ ] **Step 4: Implement progressive transaction entry**

    Amount is first and uses decimal inputmode. Show expense/income and category immediately; place date, note, card, wife, and refund controls under More details. Disable Save until amount/category/date are valid. If date is outside all cycles, show a localized error and offer Plan rather than assigning the active cycle.

- [ ] **Step 5: Add create/edit/backdate/double-submit browser tests**

    Verify keyboard-only creation, editing amount/category/date, correct past-cycle routing, future-outside-cycle refusal, cancel preserving state, wife flags, explicit credit flags, 500-character note limit, and rapid double-click producing one record.

- [ ] **Step 6: Run tests and commit**

    Run: npm run test:unit
    Run: npm run test:browser -- --grep "Today|transaction"
    Expected: PASS in desktop Chromium and iPhone WebKit.

    git add site/app/src/ui/today.js site/app/src/ui/transaction-dialog.js tests
    git commit -m "feat: add focused Today and transaction flows"

### Task 9: Implement Activity, Plan, and Card destinations

**Files:**
- Create: site/app/src/ui/activity.js
- Create: site/app/src/ui/plan.js
- Create: site/app/src/ui/card.js
- Create: tests/unit/activity-model.test.js
- Create: tests/unit/plan-model.test.js
- Create: tests/browser/activity-plan-card.spec.js

**Interfaces:**
- Consumes: canonical selectors, app-store commands, translation/formatting, and dialogs.
- Produces: renderActivity, renderPlan, and renderCard.

- [ ] **Step 1: Write failing filter, setup, and separation tests**

    Test accent/case-insensitive search, combined category/type/cycle filters, cycle history exclusion from current totals, no-category setup recovery, and distinct headings and totals for “You owe the bank” and “Wife owes you.”

- [ ] **Step 2: Run tests and confirm failure**

    Run: node --test tests/unit/activity-model.test.js tests/unit/plan-model.test.js
    Expected: FAIL because the destination modules do not exist.

- [ ] **Step 3: Implement Activity**

    Provide search, type/category/cycle filters, result count, grouped accessible transaction list, edit/delete controls, clear-filters action, and archived cycle summaries. Preserve filter state during an edit and use a confirmation dialog for deletion.

- [ ] **Step 4: Implement Plan**

    Provide first-run allowance/cycle/category setup; category budget rows; add/edit/archive/reassign flows; cycle rollover preview; locale/theme/wife settings; backup age; export/import entry points. Prevent category deletion while referenced unless reassignment is completed atomically.

- [ ] **Step 5: Implement Card**

    Present bank outstanding and wife reimbursement as separate sections with independent histories and actions. Bank settlement never settles wife debt, and wife settlement never removes bank liability. Hide wife section when tracking is off after the normalization command succeeds.

- [ ] **Step 6: Add browser journeys and responsive assertions**

    Cover filters, empty states, category creation from zero categories, referenced-category reassignment, rollover, card settlement, wife settlement, toggling wife mode, 320×568 portrait, 667×375 landscape, and 200% browser zoom with the last control scrollable above navigation.

- [ ] **Step 7: Run tests and commit**

    Run: npm run test:unit
    Run: npm run test:browser -- --grep "Activity|Plan|Card"
    Expected: PASS.

    git add site/app/src/ui tests
    git commit -m "feat: add activity planning and card workspaces"

### Task 10: Add SMS review, backups, downloads, and user-controlled recovery

**Files:**
- Create: site/app/src/ui/sms-dialog.js
- Create: site/app/src/ui/backup-dialog.js
- Create: site/app/src/platform/downloads.js
- Create: tests/unit/downloads.test.js
- Create: tests/browser/import-export.spec.js
- Create: tests/browser/sms.spec.js

**Interfaces:**
- Consumes: parseSms, inspectBackup, serializeBackup, exportTransactionsCsv, app-store restore methods, Blob, URL, and injected download trigger.
- Produces: openSmsDialog, openBackupDialog, downloadJsonBackup, and downloadCsv.

- [ ] **Step 1: Write failing filename, MIME, and restore-preview tests**

    Assert deterministic spending-tracker-next-backup-YYYY-MM-DD.json and spending-tracker-next-transactions-YYYY-MM-DD.csv names, application/json and text/csv;charset=utf-8 MIME types, URL revocation, and no state mutation before restore confirmation.

- [ ] **Step 2: Run focused tests and confirm failure**

    Run: node --test tests/unit/downloads.test.js
    Expected: FAIL because downloads.js does not exist.

- [ ] **Step 3: Implement SMS review**

    Display recognized, declined, duplicate, out-of-cycle, and unrecognized rows separately. Every accepted purchase shows amount, merchant, date, target cycle, category, and credit/wife flags. Save one atomic batch and announce exact imported/skipped counts.

- [ ] **Step 4: Implement backup import/export**

    Read at most 5 MiB, inspect without persistence, show source version/counts/warnings, require explicit Replace data confirmation, create a pre-restore downloadable backup, commit transactionally, and display accepted/normalized/rejected results. Update backup metadata only after a successful download trigger or restore commit.

- [ ] **Step 5: Add hostile backup, round-trip, CSV, and SMS browser tests**

    Exercise corrupt/truncated/oversized backups, malicious labels, duplicate IDs, failed storage commit, valid original fixture, new-format round-trip, CSV formula notes, duplicate SMS lines, declined lines, mixed recognized/unrecognized content, and imported backdated rows.

- [ ] **Step 6: Run tests and commit**

    Run: npm run test:unit
    Run: npm run test:integration
    Run: npm run test:browser -- --grep "backup|CSV|SMS"
    Expected: PASS.

    git add site/app/src/ui site/app/src/platform/downloads.js tests
    git commit -m "feat: add reviewed imports and recoverable exports"

### Task 11: Add the brand, iPhone manifest, scoped service worker, and update flow

**Files:**
- Create: site/app/assets/brand/mark.svg
- Create: tools/generate-icons.mjs
- Create: site/app/manifest.webmanifest
- Create: site/app/sw.js
- Create: site/app/src/platform/pwa.js
- Create: tests/unit/pwa.test.js
- Create: tests/browser/pwa.spec.js
- Create: tests/browser/offline.spec.js

**Interfaces:**
- Consumes: same-origin /app/ assets, navigator.serviceWorker, version constant 1.0.0, and approved logo source.
- Produces: icon PNGs, registerPwa(), update-ready event, activateUpdate(), cache prefix spending-tracker-next-app-, and cold offline application launch.

- [ ] **Step 1: Create and review the source mark**

    Produce a simple vector mark combining an AED monetary cue with a horizon/daily allowance motif. It must remain legible at 32 px, use the approved ink/teal/paper colors, contain no text smaller than the safe icon size, and include a monochrome-friendly silhouette.

- [ ] **Step 2: Write failing manifest and cache-isolation tests**

    Assert manifest start_url ./, scope ./, display standalone, lang en, dir auto, theme/background colors, 192/512 any icons, 512 maskable icon, and screenshot entries. Parse sw.js and assert deletion filters only names beginning spending-tracker-next-app- and never calls caches.keys deletion without that guard.

- [ ] **Step 3: Run focused tests and confirm failure**

    Run: node --test tests/unit/pwa.test.js
    Expected: FAIL because manifest.webmanifest and sw.js do not exist.

- [ ] **Step 4: Generate and inspect icons**

    Generate 180, 192, 512, and 512-maskable PNGs using Sharp from mark.svg. Validate dimensions and alpha channels programmatically. Inspect a contact sheet at 32, 60, 120, and 180 px and revise the source until the symbol remains distinct.

- [ ] **Step 5: Implement safe service-worker lifecycle**

    Precache a versioned shell during install; do not call skipWaiting automatically. On activate, delete only older spending-tracker-next-app- caches. Use cache-first for known shell assets, network-first with cached app-shell fallback for in-scope navigations, reject out-of-scope interception, and accept ACTIVATE_UPDATE only after the UI asks the user.

- [ ] **Step 6: Implement and test update UI**

    registerPwa reports unsupported, installing, ready, offline, and update-ready states. The app offers “Update now”; activation reloads once after controllerchange. A failed new install leaves the current controller/cache usable.

- [ ] **Step 7: Run online, cold-offline, upgrade, and shared-origin tests**

    Browser tests install v1, reload offline, navigate every tab offline, seed an unrelated rem-money cache, stage v2, simulate failed and successful updates, and confirm the unrelated cache survives.

- [ ] **Step 8: Run tests and commit**

    Run: npm run icons
    Run: npm run test:unit
    Run: npm run test:browser -- --grep "PWA|offline|update"
    Expected: PASS.

    git add site/app tools/generate-icons.mjs tests
    git commit -m "feat: add branded isolated offline installation"

### Task 12: Complete accessibility, RTL, visual, and destructive break testing

**Files:**
- Create: playwright.config.js
- Create: tests/browser/accessibility.spec.js
- Create: tests/browser/rtl-theme.spec.js
- Create: tests/browser/break-testing.spec.js
- Create: tests/browser/visual.spec.js
- Create: evidence/visual-review.md
- Create: evidence/screenshots/.gitkeep

**Interfaces:**
- Consumes: local static server, Playwright Chromium/WebKit projects, axe-core, artificial fixtures, and fixed clocks.
- Produces: repeatable desktop/iPhone evidence, accessibility results, screenshots, and a written visual review.

- [ ] **Step 1: Configure deterministic desktop and iPhone projects**

    Use desktop Chromium at 1440×1000, iPhone 13 WebKit portrait, and iPhone 13 WebKit landscape. Set locale/timezone explicitly to en-AE/Asia-Dubai and ar-AE/Asia-Dubai; disable animations and seed a fixed 2026-09-20 clock.

- [ ] **Step 2: Add automated accessibility checks**

    Run axe on Today, Activity, Plan, Card, transaction dialog, SMS dialog, backup preview, empty state, error state, and dark mode. Add manual assertions for heading order, one main landmark, dialog focus trap/restoration, live announcements, target dimensions, and keyboard-only transaction completion.

- [ ] **Step 3: Add Arabic/RTL and mixed-content checks**

    Assert html lang/dir, navigation order, directional icons, bdi/dir=auto notes, AED number readability, date formatting, no clipped Arabic labels, and preserved values after switching locale. Test a 500-character mixed Arabic/English/emoji note.

- [ ] **Step 4: Add destructive and boundary scenarios**

    Cover storage quota, denied storage, midnight resume, leap day, huge valid values, zero/negative rejection, rapid submissions, category deletion with references, wife-mode transition, broken backup, 5 MiB boundary, interrupted update, and offline route reload.

- [ ] **Step 5: Capture and inspect visual evidence**

    Capture all four screens in desktop light English, iPhone light English, iPhone dark English, and iPhone Arabic RTL plus transaction/import dialogs. Inspect for hierarchy, clipping, overlap, safe-area handling, empty/error states, last-row reachability, and icon legibility. Record each screenshot and PASS/fix/retest result in evidence/visual-review.md.

- [ ] **Step 6: Run the complete browser suite and commit**

    Run: npm run test:browser
    Expected: PASS in every configured project with no serious or critical axe violations.

    git add playwright.config.js tests/browser evidence
    git commit -m "test: add accessibility visual and break coverage"

### Task 13: Build the multi-page GitHub Pages report hub

**Files:**
- Modify: site/index.html
- Create: site/features/index.html
- Create: site/privacy/index.html
- Create: site/evidence/index.html
- Create: site/migrate/index.html
- Create: site/releases/index.html
- Create: site/assets/site.css
- Create: site/assets/site.js
- Modify: tests/site/validate-public-site.test.js

**Interfaces:**
- Consumes: verified app capabilities, evidence files, repository URL, release version, screenshots, and exact test report.
- Produces: accessible static report pages, direct /app/ launch, iPhone install guide, privacy disclosures, migration guide, and evidence summary.

- [ ] **Step 1: Expand validator regressions before authoring pages**

    Tests must reject missing canonical/title/description/viewport, broken internal links, missing image alt, target=_blank without rel, external runtime assets, local paths, secret-like tokens, inconsistent versions, missing app icons, absent privacy statement, and evidence claims without a matching machine-readable test report.

- [ ] **Step 2: Run validator tests and confirm new failures**

    Run: npm run test:site
    Expected: FAIL until validation rules and pages are implemented.

- [ ] **Step 3: Implement validator rules and machine evidence input**

    Add site/evidence/results.json with commit, version, generatedAt, declarationCount, caseCount, executionCount, suite results, and browser matrix. validate-public-site verifies its schema and checks the values displayed on evidence/index.html.

- [ ] **Step 4: Build the six report pages**

    Use one consistent navigation/footer and the calm visual language. Root explains the product and links directly to app/. Features shows the four destinations. Privacy explicitly states local-only storage and exports. Evidence maps every audit finding to remedy and test. Migrate gives old-app export/import steps. Releases documents v1.0.0 and limitations.

- [ ] **Step 5: Add truthful install and support guidance**

    State that iPhone installation uses Safari Share → Add to Home Screen, offline use begins after one successful online load, backups remain the user’s responsibility, clearing website data removes local records, and old/new apps do not share storage automatically.

- [ ] **Step 6: Validate and visually inspect the hub**

    Run: npm run validate:site
    Expected: PASS with all local links/assets present and no external runtime dependency.

    Capture desktop and phone screenshots of each page and check navigation, code-free readability, contrast, and app-launch links.

- [ ] **Step 7: Commit**

    git add site tests/site
    git commit -m "docs: add verified project and install hub"

### Task 14: Add exact test accounting, CI, documentation, and release evidence

**Files:**
- Create: tools/count-tests.mjs
- Create: .github/workflows/quality.yml
- Create: .github/workflows/pages.yml
- Modify: package.json
- Create: README.md
- Create: evidence/verification.md
- Create: docs/owner/OPERATIONS.md
- Create: docs/owner/RECOVERY.md

**Interfaces:**
- Consumes: all tests, site validator, build-free site directory, Git commit SHA, and GitHub Actions.
- Produces: npm run verify, site/evidence/results.json, reproducible CI, Pages artifact, owner runbooks, and release evidence.

- [ ] **Step 1: Write test-accounting regression tests**

    Use fixture test files where a helper is imported by two suites. Assert count-tests reports helper declarations once and never executes imported registration side effects. Separate declarationCount, caseCount, and executionCount fields.

- [ ] **Step 2: Run the regression and verify failure**

    Run: node --test tests/site/test-accounting.test.js
    Expected: FAIL because count-tests.mjs does not exist.

- [ ] **Step 3: Implement exact accounting and verify script**

    count-tests reads native test reporter JSON and Playwright JSON, validates uniqueness by file/title/project, and writes site/evidence/results.json. npm run verify performs clean static validation, unit, integration, site, browser, accessibility, and test-accounting checks in that order.

- [ ] **Step 4: Add least-privilege workflows**

    quality.yml checks out, sets Node 22, runs npm ci, installs pinned Playwright browsers, and runs npm run verify. pages.yml runs only after main quality succeeds, grants contents:read, pages:write, id-token:write, uploads site/, and deploys through actions/deploy-pages. Pin action major versions and enable concurrency cancellation for stale deployments.

- [ ] **Step 5: Write user and owner documentation**

    README covers purpose, privacy, app URL, install, backup migration, development, exact verification, repository map, and limitations. OPERATIONS covers version bump, test evidence, deployment, rollback, and Pages health. RECOVERY covers corrupt local data, snapshot recovery, backup restore, service-worker reset, and return to the old app.

- [ ] **Step 6: Perform a clean local release rehearsal**

    Remove only project-local generated dependencies and reports through the package clean script, run npm ci, run npm run verify, and serve site/ for a final online/offline smoke. Record command, timestamp, commit, result, and browser matrix in evidence/verification.md.

- [ ] **Step 7: Commit**

    git add package.json package-lock.json tools .github README.md docs/owner evidence site/evidence/results.json tests/site
    git commit -m "ci: add reproducible release verification"

### Task 15: Independent review, GitHub repository creation, Pages deployment, and live acceptance

**Files:**
- Modify: any project file found defective by review
- Modify: evidence/verification.md
- Modify: site/evidence/results.json
- Modify: site/releases/index.html
- Modify: README.md

**Interfaces:**
- Consumes: clean main branch, authenticated GitHub CLI, complete verification, and independent whole-branch review.
- Produces: public spending-tracker-next repository, protected original rem-money deployment, live GitHub Pages hub/app, and final acceptance evidence.

- [ ] **Step 1: Run independent whole-branch review**

    Review against every specification section, audit finding, Global Constraint, Review Focus item, and release gate. Record actionable findings with file/line evidence. Fix each confirmed issue using a failing regression test, rerun its focused suite, and commit with a specific message.

- [ ] **Step 2: Run pre-publish secret and privacy inspection**

    Search tracked files for local user paths, home-directory variants, email addresses, tokens, API keys, real transaction merchants/amounts, original localStorage payloads, and private screenshots. Confirm fixtures are artificial and git status is clean.

- [ ] **Step 3: Run final clean verification**

    Run: npm ci
    Run: npm run verify
    Expected: every unit, integration, site, browser, accessibility, PWA, offline, validator, and accounting check passes; evidence/results.json names the current commit.

- [ ] **Step 4: Create and configure the separate GitHub repository**

    Run: gh repo create xCloudy75z/spending-tracker-next --public --source . --remote origin --push
    Expected: repository created without modifying rem-money.

    Configure Pages for GitHub Actions, confirm default branch main, add repository description/topics, and keep Actions permissions at the workflow minimum.

- [ ] **Step 5: Observe CI and Pages to terminal success**

    Use gh run watch for quality and Pages deployment. If a run fails, inspect authoritative logs, add a local regression, fix inside this repository, rerun complete verification, commit, push, and watch the new run. Do not report completion from a queued or in-progress state.

- [ ] **Step 6: Verify the live HTTPS hub and application**

    Confirm the root hub, every report page, /app/, manifest, icons, service worker, and screenshots return 200 with correct content types. Run a live browser journey: first-run setup, transaction add/edit/delete, card/wife flow, original-backup preview/import, JSON round-trip, CSV export, Arabic/RTL, dark mode, install metadata, and online reload.

- [ ] **Step 7: Verify installed cold-offline behavior**

    After one successful live load, set the browser context offline, close/reopen the app, refresh /app/, navigate all tabs, create/edit a transaction, export a backup, and confirm data remains after another reopen. Confirm rem-money still loads and its caches/storage were not altered.

- [ ] **Step 8: Publish final evidence and tag**

    Update evidence/verification.md, evidence/results.json, release notes, and README with live URL, exact commit, exact test counts, completed browser matrix, offline result, known limitations, and verification timestamp. Re-run npm run verify, commit, push, wait for green deployment, and create annotated tag v1.0.0 only after the evidence commit is live.

- [ ] **Step 9: Final requirement-by-requirement audit**

    Build a checklist from the user objective, approved specification, every numbered release gate, and all plan tasks. For each requirement, link authoritative file/test/live evidence and mark proven, contradicted, or missing. Continue work for every contradicted or missing item; completion requires all items proven and a clean repository.

---

## Self-Review Record

- **Spec coverage:** Every capability in sections 3–10 maps to Tasks 2–15. The Today/Activity/Plan/Card IA maps to Tasks 8–9; original backup compatibility maps to Tasks 3, 5, and 10; iPhone/PWA maps to Tasks 11–12; public hub and evidence map to Tasks 13–15.
- **Placeholder scan:** The plan contains no deferred implementation markers. Each task names exact files, interfaces, failing-test intent, verification commands, and commit boundaries.
- **Type consistency:** Canonical state originates in model.js; cycleForDate and deriveToday feed commands/views; inspectBackup produces RestorePreview consumed by the app store and backup dialog; app-store commands are the sole persistence path.
- **Review Focus coverage:** Adversarial imports are pinned in Task 3; date/lifecycle edges in Tasks 2 and 7; wife normalization in Task 4; cache upgrade isolation in Task 11; long mixed content and constrained layouts in Tasks 6, 9, and 12.
- **Execution choice:** Native execution is preserved from the user’s autonomous-completion instruction. Independent whole-branch review remains mandatory before publication.
