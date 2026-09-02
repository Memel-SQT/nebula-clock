# Nebula Clock brand assets

The mark is self-contained: these files depend on nothing in the app and can
be dropped straight into a slide, a README or a store listing.

| File                         | Use                                                |
| ---------------------------- | -------------------------------------------------- |
| `nebula-clock-mark.svg`      | The mark on its own. Favicons, app icons, avatars. |
| `nebula-clock-lockup.svg`    | Mark plus wordmark, horizontal. Headers, docs.     |
| `nebula-clock-mark-512.png`  | Raster fallback.                                   |
| `nebula-clock-mark-1024.png` | Store listings and press.                          |

## What it is

A clock face inside the Nebula card. The card (`#1A1A2E`, corner radius 24 on
a 100-unit square) and the blue-to-violet diagonal gradient are the cues
shared with every other Nebula product; the clock is what makes this one
Nebula Clock rather than Nebula or Nebula News.

## Colour

| Token          | Value          | Role                                  |
| -------------- | -------------- | ------------------------------------- |
| Card           | `#1A1A2E`      | The rounded square behind the mark    |
| Gradient start | `#4C6EF5`      | Nebula blue, top-left                 |
| Gradient end   | `#A855F7`      | Nebula violet, bottom-right           |
| Wordmark       | `currentColor` | `#F1F1F6` on dark, `#18172B` on light |

The gradient always runs top-left to bottom-right. Do not flip it, rotate it,
or replace it with a flat colour.

## Clear space and minimum size

Keep clear space of at least **one eighth of the mark's width** on every side.

The mark is legible down to **16 px**; below that use a solid-colour circle
instead. The lockup should not be used under **120 px** wide — drop to the
mark alone.

## Please don't

- Recolour the card or the gradient.
- Add a drop shadow, outline or bevel to the mark itself.
- Stretch it: the mark is square and the lockup has a fixed ratio.
- Place the mark on a busy photograph without the card behind it.

## Regenerating

Every raster, the `.ico` and the `.icns` come from the same geometry as the
SVG, so the vector and bitmap versions cannot drift. The geometry constants at
the top of the renderer match the numbers in `nebula-clock-mark.svg` exactly.

```bash
pip install pillow
python scripts/generate-icons.py
```

It writes an `icons-out/` folder; copy the results into `apps/web/public`,
`apps/desktop/build`, `apps/desktop/resources` and here.

## Licence

Part of Nebula Clock, MIT licensed. See the repository root.
