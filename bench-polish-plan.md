# Bench polish: landscape gauges, denser zero-gap lattice, discovery glow

## Context
The bench (`proto/bench.html`) works but three things are cramped: the EFF/POW/VOL
gauges are square dials eating vertical space that the lattice needs more of; the
lattice's outer quadrant gaps and label placement fight the voxel field for room;
and there's no ambient signal for "you're close to something" beyond the on-demand
TEST hint. This pass rescales the gauges into a wide landscape strip, frees that
height for a taller lattice, adds a second live ticker (reusing the theatre's
proven canvas marquee system) for gauge informatics, tightens the lattice to a
single continuous zero-gap voxel field, and adds two ambient color signals —
teal for "near-ultimate on the recipe you have selected" and navy for "an
undiscovered weapon is about to fall out of your current slider position" — with
button C able to seize a navy discovery immediately.

Single file: `proto/bench.html`. No theatre-side changes needed (P.builds/P.arsenal/
P.unlocks schema is unchanged).

## 1. Gauges: rescale ~40%, landscape ratio, full label names
- `#gaugerow` flex cut from `0.85` to `0.51` (~40% shorter).
- `drawGauge()` currently forces a centered **square** region (`side=Math.min(W,H)`)
  — that was the earlier stretch-bug fix, but now the row will genuinely be wide,
  and we want that reflected as an ellipse, not a coin. Replace the square-crop
  with independent `cw=W/GNX, ch=H/GNY` (e.g. `GNX=19, GNY=11`) and normalize the
  radial term elliptically: `rr = hypot((ix-cx)/rx, (iy-cy)/ry)` where
  `rx=(GNX-1)/2, ry=(GNY-1)/2`. Same band/ember/color logic otherwise.
- Card labels `EFF`/`POW`/`VOL` → `EFFICIENCY`/`POWER`/`VOLATILITY`. Add
  `white-space:nowrap;overflow:hidden;text-overflow:ellipsis` to `.card>.ph` so a
  narrow card never breaks layout if the font renders a hair wider than expected.

## 2. New ticker between gauges and lattice — gauge informatics
Port the theatre's canvas marquee primitives (`mkTape`, `tapeSet`, `tapeMeasure`,
`tapeDraw`, `runsFrom`, `TAPE_COL`) from `proto/index.html` into bench verbatim —
same reusable, already-proven implementation, not a re-derivation. Add:
- `<div id="gtick"><canvas></canvas></div>` between `#gaugerow` and `#quadwrap`,
  styled like the theatre's `.tk` row (flex:none, fixed height ~20px).
- `TAPES.gauge = mkTape(...)`, refreshed on every discrete render (see §5) with
  runs built from current `EFFICIENCY/POWER/VOLATILITY/MATCH` values plus, when
  relevant, the nearest subcategory name (see §3) and glow-state callouts
  ("CLUSTER TOMAHAWK reads hot — PROBE to seize it").

## 3. Lattice: zero-gap grid, unobscured labels, named subcategories via ticker
- **Remove all inter-quadrant spacing.** Drop the `pad` gutter entirely in
  `drawQuad()` — quadrants become `qw=W/2, qh=H/2` sharing exact edges, and
  subcells already tile `qw/2, qh/2` with no gap, so this makes the whole
  lattice one continuous 1:1 voxel field top to bottom.
- **Fix the obscured quadrant label.** Reserve a small top label gutter
  (`labelH ≈ 12*d`) that is excluded from the voxel field (voxels start at
  `qy+labelH`, not `qy`) — the label no longer competes with bits for the same
  pixels; it has its own row.
- **Named subcategories, surfaced without crowding the grid.** The 4 subcells
  per quadrant already exist (`sc 0..3`) but read as generic pow/eff/vol noise.
  Give each a real name — e.g. `PAYLOAD: YIELD / BLAST / SPREAD / PRECISION`,
  `THERMAL: FLARE / BURN / BLOOM / ASH`, similarly for KINETIC/EM — defined in a
  `QUAD_SUBCATS` table next to `QLB`/`QKEY`. Rather than crushing 4 more text
  labels into an already-tight lattice cell (recreating the exact obscured-label
  problem just fixed), surface the nearest/hottest subcategory name through the
  new gauge-informatics ticker from §2 instead. This keeps the lattice purely
  visual/dense and puts the legible detail where there's room to read it.
  *(Flagging this call explicitly — if you'd rather see subcategory labels
  drawn directly on the lattice in tiny type, say so and I'll fit them in.)*

## 4. Ambient color signals + button C fast-path
Two independent proximity scans run every discrete render:
- **Teal — "near-ultimate" on your selected recipe.** `evalRecipe(currentRecipe())`
  score in `[0.85, 0.999)`. Tint the "on" voxels belonging to that recipe's
  required quadrants (from its `need[]` keys) teal instead of their normal
  amber/green.
- **Navy — "a discovery is imminent."** Scan all `RECIPES` with
  `kind==="unlock" && !P.unlocks[id]` for the highest `evalRecipe` score. If that
  score crosses `~0.92`, mark it `discoveryRecipe` and tint its required
  quadrants navy, with a slow pulse (`Math.sin(performance.now()/300)`-driven
  alpha) so it visibly "glows" rather than sitting static.
- **Button C fast-path.** C keeps its existing behavior (hint text for the
  selected recipe). Additionally, if a `discoveryRecipe` is currently glowing
  navy, pressing C also unlocks it on the spot — writes
  `P.unlocks[discoveryRecipe.id]` from the current metrics (same fields COMMIT
  already writes), auto-selects it (`selectArsenal(discoveryRecipe.id)` so its
  build — which already satisfies it — becomes the active slider profile), and
  the hint reads "`<b>NAME</b> discovered — deployable next sortie`". D/COMMIT
  is unchanged (deliberate, selected-only, arm-confirm) — the navy glow is a
  genuine "you stumbled onto it" shortcut, not a replacement for the normal
  tune/commit loop.

## 5. Perf split: static DOM vs. per-frame visuals
Moving the gauges/lattice/ticker into continuous motion (tape scroll + navy
pulse) means bench needs a `requestAnimationFrame` loop for the first time.
Split today's single `render()`:
- `renderStatic()` — loadout list rebuild, stats text, infoline/infodesc,
  sortiecount, `btnD.disabled`. Runs only on real state changes: slider input,
  loadout selection, reset, commit/discover.
- `renderVisual(dt)` — `drawGauge()`×3, `drawQuad()`, `tapeDraw()` for both
  tickers. Runs every animation frame so the navy pulse and marquee scroll are
  live even when nothing else changed.
- Add the loop (mirrors the theatre's `loop()`): track `last=performance.now()`,
  clamp `dt`, call `renderVisual(dt)`, `requestAnimationFrame`. Initial boot and
  every discrete-event handler call `renderStatic()` once; `renderVisual` no
  longer needs to be called from those handlers since the loop covers it.

## Verification
- `sed -n '/"use strict";/,/<\/script>/p' proto/bench.html | sed '$d' > tmp.js && node --check tmp.js`
- Serve locally (`npx http-server -p 8360 -c-1`) and open `/proto/bench.html`:
  confirm gauges read as wide ellipses with full-word labels, the new ticker
  scrolls gauge stats between the gauge row and the lattice, the lattice has no
  visible gaps between quadrants and its labels sit clear of the bits, dragging
  sliders near a recipe's thresholds tints the relevant quadrant teal, and
  finding an unlock recipe's thresholds makes it glow navy — then confirms C
  unlocks it and auto-selects it in the loadout list.
- Confirm the COMMAND ↔ bench round trip and existing tune/unlock commit flow
  (D button) still work unchanged.

## Status note
Drafted locally in-session, then handed to a cloud Ultraplan session for
refinement (https://claude.ai/code/session_017nZoHVDQxmz7VpusPoPF3o?from=cli) —
that cloud session errored out (`error_during_execution`) before producing an
approved plan. **Nothing here has been implemented yet.** This file is the
last-known-good version of the plan; pick up from here on the next session,
either re-running Ultraplan on it or implementing directly.
