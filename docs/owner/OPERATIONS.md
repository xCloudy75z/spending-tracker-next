# Operations runbook

This runbook is for the repository owner. The production artifact is exactly the static `site/` directory deployed by GitHub Pages.

## Release checklist

1. Work from a clean `main` branch and create a short-lived `codex/` feature branch.
2. Update the version consistently in `package.json`, `package-lock.json`, the service-worker cache name, `site/app/manifest.webmanifest`, public page footers, release notes, and evidence metadata.
3. If icons or the visual mark changed, run `npm run icons`, inspect the contact sheet, and test the installed iPhone icon.
4. Run `npm run capture:hub` with `npm run serve` active only when public-page screenshots need refreshing.
5. Run `npm run verify`. Do not publish if source declarations disagree with reporter counts or if the working tree contains unexplained generated changes.
6. Commit the release evidence and push to `main`.
7. Confirm the **Quality** workflow succeeds. **Deploy Pages** starts only for that successful `main` revision.
8. Verify the live hub, `/app/`, manifest, service worker, icons, privacy page, and `evidence/results.json` return HTTP 200.
9. On a real iPhone, launch once online, close Safari, enable airplane mode, and open the installed icon. Add and then remove a disposable test transaction.

## Evidence and version accounting

`npm run verify` writes `site/evidence/results.json` from native Node test events and Playwright’s JSON report. It also updates the two headline counts in `site/evidence/index.html`, then validates that the page and JSON agree.

The commit recorded in locally generated evidence is the `HEAD` tested at generation time. In GitHub Actions it is `GITHUB_SHA`. Reports under `evidence/reports/` are transient and ignored; reviewed screenshots and `evidence/verification.md` are durable release evidence.

## Deployment design

- `.github/workflows/quality.yml` has read-only repository permission.
- `.github/workflows/pages.yml` is triggered by a successful Quality run on `main`, checks out that exact SHA, and uploads only `site/`.
- The deployment job has only `contents:read`, `pages:write`, and `id-token:write`.
- Stale quality and deployment jobs are cancelled by concurrency groups.

GitHub repository settings must use **GitHub Actions** as the Pages source. The custom domain field should remain empty unless DNS and canonical URLs are updated together.

## Health checks

After deployment, check:

- Hub and app load with no console errors.
- `manifest.webmanifest` has `start_url` and `scope` under `/app/`.
- `sw.js` controls only `/app/` and retains the `spending-tracker-next-app-` cache prefix.
- An unrelated legacy `rem-money` cache survives activation.
- Browser storage persists across reload.
- JSON export, preview, restore, and CSV download work.
- English/Arabic and light/dark changes survive reload.

## Rollback

1. Identify the last known-good commit and its successful Quality run.
2. Revert the faulty commit with a new commit; do not rewrite published history.
3. Push the revert to `main` and wait for Quality and Deploy Pages.
4. Verify the live service worker. A changed cache version should install; users may need to accept **Update now** or fully close and reopen the installed app.
5. Do not roll back the stored-data schema unless the older code can read every state written by the newer release. If uncertain, ship a forward fix and tell users to export a backup first.

GitHub Pages deployment history can redeploy an earlier artifact for emergency presentation rollback, but a repository revert remains the auditable long-term correction.
