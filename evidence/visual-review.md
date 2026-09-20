# Visual review

Reviewed against the generated screenshots in `evidence/screenshots/` on 2026-09-20.

| Surface | Desktop Chromium | iPhone portrait WebKit | iPhone landscape WebKit | Result |
| --- | --- | --- | --- | --- |
| Today | Clear amount-first hierarchy; no clipping | Safe-area and bottom navigation clear | Hero and action remain reachable | PASS |
| Activity | Filters and actions remain distinct | Filters stack without horizontal overflow | Rows remain readable and scrollable | PASS |
| Plan | Setup, category, settings, and backup hierarchy is legible | Last backup control scrolls above navigation | Forms remain usable without overlap | PASS |
| Card | Bank and wife sections are visually separate | Independent totals remain clear | Actions remain reachable | PASS |

Additional checks: 32 px icon silhouette remains distinct; dialogs fit the viewport; dark theme preserves hierarchy; Arabic labels do not clip; fixed navigation does not cover the final control; reduced motion disables meaningful animation.
