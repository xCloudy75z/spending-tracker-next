# Visual review

Reviewed against the generated screenshots in `evidence/screenshots/` on 2026-09-20.

| Surface | Desktop Chromium | iPhone portrait WebKit | iPhone landscape WebKit | Result |
| --- | --- | --- | --- | --- |
| Today | Clear amount-first hierarchy; no clipping | Safe-area and bottom navigation clear | Hero and action remain reachable | PASS |
| Activity | Filters and actions remain distinct | Filters stack without horizontal overflow | Rows remain readable and scrollable | PASS |
| Plan | Setup, category, settings, and backup hierarchy is legible | Last backup control scrolls above navigation | Forms remain usable without overlap | PASS |
| Card | Bank and wife sections are visually separate | Independent totals remain clear | Actions remain reachable | PASS |

| Evidence set | Desktop Chromium | iPhone portrait WebKit | iPhone landscape WebKit | Result |
| --- | --- | --- | --- | --- |
| Light English · all four destinations | Reviewed | Reviewed | Reviewed | PASS |
| Dark English · all four destinations | Reviewed | Reviewed | Reviewed | PASS |
| Light Arabic RTL · all four destinations | Reviewed after route-readiness recapture | Reviewed after route-readiness recapture | Reviewed after route-readiness recapture | FIXED → PASS |
| Transaction dialog | Amount-first layout and three types clear | Fits without horizontal clipping | Controls remain reachable | PASS |
| Backup dialog | Destructive replacement is visually separated | Fits and scrolls above navigation | Fits short viewport | PASS |
| Corrupt-storage recovery | Error and import path are clear | File and replace controls fit | Recovery controls remain reachable | PASS |

Additional checks: 32 px icon silhouette remains distinct; dark theme preserves hierarchy; Arabic labels do not clip; fixed navigation does not cover the final control; reduced motion disables meaningful animation. Screenshot labels initially raced route rendering in WebKit; explicit destination-readiness assertions were added and the full matrix was recaptured before acceptance.
