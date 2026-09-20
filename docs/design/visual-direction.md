# Spending Tracker Next — Visual Direction

## Product character

This is a private daily instrument for one person, not a bank portal or accounting suite. Its visual metaphor is a pocket spending dial: one decisive figure, a measured horizontal “day line,” and quiet supporting records. The interface should feel calm when spending is healthy and clear—not dramatic—when attention is needed.

## Tokens

- Paper `#F3F0E8`: warm enough to feel personal without becoming the familiar cream-and-terracotta template.
- Ink `#17232C`: blue-charcoal for readable financial figures.
- Tide `#24766B`: the primary control and steady-status color.
- Mist `#DCE6E2`: restrained selected and informational surfaces.
- Amber `#A46616`: attention without alarm.
- Signal `#B0443F`: overspending, destructive actions, and errors.
- Night `#10181D` and night surface `#19252B`: dark-mode bases that preserve the same hierarchy.

Use the native Apple/system sans stack because the app must remain dependency-free and feel installed on iPhone. Personality comes from proportion: compact supporting copy, generous tabular figures, and deliberately uneven scale rather than decorative display fonts.

## Layout concept

Today is an instrument face: the main figure sits start-aligned beside a short day-line marker. Activity is a chronological ledger. Plan is a worksheet with visible grouping rules. Card is a two-column relationship on wider screens and two clearly separated ledgers on mobile.

    ┌────────────────────────────┐
    │ Spending Tracker      ⋯    │
    │                            │
    │ Safe to spend today        │
    │ AED 186.36                 │
    │ ━━━━━━━━━●━━━━  11 days    │
    │ AED 2,550 remains          │
    │                            │
    │ Recent activity            │
    │ Food               40.00   │
    │ Transport          18.00   │
    │                            │
    │ Today Activity Plan Card   │
    └────────────────────────────┘

Content is left-aligned in English and logically start-aligned in Arabic. Monetary figures retain tabular alignment. Borders and spacing communicate grouping; rounded containers are reserved for actionable sheets, not wrapped around every piece of content.

## Principles

1. The safe-to-spend figure is the only oversized element.
2. A thin day line—not a decorative gradient or generic progress ring—is the memorable motif.
3. Status always pairs plain language with color; color never carries meaning alone.
4. Transactions resemble a calm ledger with aligned amounts, not repeated SaaS cards.
5. Arabic receives genuine mirrored composition and isolated mixed-script values, not only `direction: rtl`.
6. Fixed navigation reserves its own document space so the last control is always reachable.

## Brief review and revision

The initial paper-and-teal palette risked resembling a common warm-cream generated interface. The revised direction cools the paper, strengthens the blue-charcoal ink, removes decorative shadows and gradients, and spends the visual identity on the horizontal day line and financial-number proportions. The result is specific to daily allowance pacing and does not depend on generic cards, all-caps labels, numbered feature blocks, or ornamental motion.
