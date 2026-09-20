# Recovery runbook

Spending Tracker is local-only. Recovery starts by preserving what remains before clearing storage, unregistering workers, or restoring a backup.

## First response

1. Stop entering new transactions on the affected installation.
2. If Data tools opens, choose **Export backup** immediately and save the file under a new name.
3. Record the device, browser, app URL, visible error, date, and whether the issue began after an update or restore.
4. Keep the original `rem-money` installation and its exports untouched.

## Corrupt or unreadable local state

The storage layer keeps a last-known-good snapshot and refuses failed writes. Reload once. If the app reports snapshot recovery, export a fresh backup and inspect Today, Activity, Plan, and Cards.

If the app remains unusable, use browser developer tools only if you are comfortable with them: copy the raw values for keys beginning `spending-tracker-next:` before changing anything. Never paste private financial data into a public issue.

Do not hand-edit a JSON backup to bypass validation. Restore the newest known-good export instead.

## Restore a JSON backup

1. Open the app online and wait for the normal shell.
2. Open **Data tools** and first export the destination’s current state.
3. Select the backup under **Import backup**.
4. Confirm the preview’s source version and transaction, category, and cycle counts.
5. Choose **Replace current data** only if the preview is expected.
6. Review all four workspaces and export a new post-recovery backup.

Invalid, oversized, deeply nested, unsupported, or referentially inconsistent files are rejected without partial replacement. CSV cannot restore the complete app.

## Service-worker or stale-update recovery

Try these in order:

1. Reconnect, open the hosted `/app/` URL in Safari, and accept **Update now** if shown.
2. Close every tab and installed-app window, then reopen the app.
3. Export a backup before removing any site data.
4. In browser site settings, remove only data for the Spending Tracker Pages origin if a full reset is necessary. This erases local records for the site.
5. Reopen online, wait for offline readiness, restore the JSON backup, and reinstall the home-screen icon if required.

The app’s service worker must not delete caches outside the `spending-tracker-next-app-` prefix. Do not clear all browser history as a first troubleshooting step.

## Lost device or cleared website data

There is no server copy. Install the app on the replacement device and restore the latest JSON backup. Reconstruct transactions after that backup from bank records, then export a new baseline backup.

## Return to the original app

The new and original apps do not share storage automatically. To return:

1. Preserve a current JSON backup and CSV export from the new app.
2. Open the original app at its original URL; do not clear either site’s data.
3. Confirm the original app still has the expected records.
4. Import only a format the original app explicitly supports. Otherwise use the CSV as a reference and enter the required current balances manually.
5. Keep both exports until the chosen installation has been checked through a full spending cycle.

Never rename or modify cache/storage keys to force cross-app migration.
