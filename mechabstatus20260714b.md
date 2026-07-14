# MECHAB — Session Status (2026-07-14, part B)

**Scope:** everything shipped since the last status report (`mechabstatus20260714.md`), plus what's pending going into the next session.
**Deployed:** https://nazodazo.github.io/mechab/ — bare root now redirects straight to the active build at `/proto/` (theatre) and `/proto/bench.html` (bench).

## Shipped and pushed to `main` this session

**1. Bench arsenal integration (theatre-side)**
- `pickStrike()` picks the best affordable *unlocked* ordnance each frame — priority ORBITAL(3 MAT) > CLUSTER(2) > FIRESTORM(2) > EMP(1) > TOMAHAWK(1).
- BTN slot C and ticker slot C both read live from `pickStrike()` instead of a hardcoded TOMAHAWK/ORBITAL toggle.
- `fireLAOE()` gained real implementations for CLUSTER (3 spread warheads), EMP (neutralizes control + fort HP, zero kills), and FIRESTORM (4-shot rolling barrage via `S.barrage`/`barrageTick()`, hooked into `advance()`).
- `P.arsenal`/`P.unlocks` defensively initialized on load.

**2. Theatre ↔ bench unified as one system**
- Command menu gained an **ARSENAL BENCH** button (amber) beside LAUNCH SORTIE.
- Bench gained a **◂ COMMAND** button back to the theatre menu.
- Both read/write the same `warclock_profile` localStorage key — calibration done on the bench is live the moment you launch a sortie.

**3. Bench gauge-stretch bug fixed**
- Radial EFF/POW/VOL gauges were rendering as ellipses (canvas assumed square, container was tall). Fixed by centering the radial pattern in a square region regardless of aspect; `#device` capped at `max-height:960px` so tall desktop windows stop ballooning the layout.

**4. Selectable arsenal loadout, individual profiles**
- Loadout rows (TOMAHAWK/ORBITAL/MECHA/CLUSTER/EMP/FIRESTORM) are clickable. Each weapon keeps its **own** slider build (`P.builds[id]`) instead of one shared CHARGE/FOCUS/MODULATION state. Selecting a weapon loads its saved build; TEST/COMMIT re-target that weapon's recipe specifically.

**5. Denser, tighter voxels + notchy sliders**
- Gauges 13×13→19×19 (~1080 voxels), lattice subcells 8×8→12×12 (~2300 voxels), fill ratios raised so lit cells read as one continuous surface.
- Sliders step in 5% notches with native tick marks, a thumb-scale pulse, and a short vibration per notch.

All of the above is committed and pushed — live on GitHub Pages.

**6. Repo cleanup: old chassis-forge build removed, root is now a lean redirect**
- The pre-pivot game (`index.html` + `parts.js`/`mechgen.js`/`foegen.js`/`chassis.js`/`combat.js`/`input.js`/`game.js`/`style.css`/`sw.js`/`manifest.json`/icons) was archived to `legacy/`, then deleted outright per your call — the warclock direction in `proto/` is the only iteration being preserved going forward. Still recoverable from git history (pre-delete state at commit `8cdfa73`) if ever needed.
- Root `index.html` is now a 5-line redirect (`meta refresh` + JS fallback) to `/proto/`, so the bare Pages URL resolves straight to the active build instead of 404ing.
- Loose reference images that had accumulated at repo root (a UI design inspiration screenshot, a mecha sprite reference, a demo gif) were moved into a new `reference/` folder with descriptive names instead of sitting untracked at top level.

## In flight — NOT yet implemented

**Bench polish pass** (gauges landscape+rescaled, new gauge-informatics ticker,
zero-gap lattice with fixed labels, teal/navy proximity glow, C-button discovery
fast-path, perf split for a real animation loop). Full plan saved alongside this
file at **`proto/bench-polish-plan.md`**.

This plan was drafted locally, then handed to a cloud Ultraplan session
(https://claude.ai/code/session_017nZoHVDQxmz7VpusPoPF3o?from=cli) for
refinement — that session **errored out before producing an approved plan**.
Nothing from it has touched the repo. One open design call flagged in the plan
(§3): whether the 4 named subcategories per lattice quadrant should surface only
in the new ticker (recommended, keeps the lattice visually clean) or be drawn
directly on the lattice in tiny type — worth deciding at the start of the next
session before implementing.

**Next step:** either re-run Ultraplan against `bench-polish-plan.md`, or
implement it directly against `proto/bench.html` (it's fully self-contained,
no theatre-side changes needed).
