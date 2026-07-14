# MECHAB — Status Update (2026-07-14)

**Scope:** everything built since the [prior concept/play audit](mechab-concept-audit.md) — implementation, not design speculation.
**File:** `proto/index.html` (proto v5+). **Deployed:** https://nazodazo.github.io/mechab/proto/ (commit `792e4df`)
**Persistence:** still deliberately deferred, per your call — everything below lives within one 180s theatre run.

## 1. Layout rebuilt to spec

Replaced the original deck/actions layout with the wireframed arrangement:

- **Top row**: TIDE trend graph (momentum) + CONTROLS island (clock, tide%, pause, RECALL)
- **THEATRE** map
- **Main ticker** (important events only)
- **TICKER A–D** (left) beside **OP-MONITOR** (right) — each slot's tape is the *informatics* for its paired action tile
- **OP STATS** (crew) + tiles **A** (approve request) / **B** (urge)
- **VOXEL STATS** (macro ledger) + tiles **C** (kinetic LAOE) / **D** (mecha drop)

Panels are now rounded "islands" with in-card headers (no more border-floating labels), modeled loosely on the fitness-app reference you shared — same warm-dark palette and mono type, borrowed layout discipline only.

**Containment hardening**: the whole flex chain (`#device` → row → panel → content) now carries `min-height:0` + `overflow:hidden` end to end. Root cause of every "text bled into the next panel" bug this session was a missing link in that chain — a flex item won't shrink below its content's natural size without it, so overflowing content pushed into the next row instead of clipping.

## 2. Ticker tapes — full rebuild, twice

First pass (DOM/CSS transforms) went through three failed iterations: CSS keyframe percentage-transform (snapped at loop boundary), two-copy JS-measured version (gapped when text was shorter than the window), N-copy coverage version (still relied on DOM `scrollWidth` timing). Each fix addressed a real bug but the underlying approach — sliding real DOM elements and trusting layout measurement to line up — kept producing a new edge case.

**Rebuilt from scratch on canvas.** A tape is now a list of colored text runs drawn at `x = -offset`, repeated until the window is filled, offset advances every frame and wraps by one modulo. No DOM measurement, no transform, no seam to get wrong — it's arithmetic. Widths are cached per content-set (`ctx.measureText` once, not every frame/every repeat). Content swaps are deferred to the cycle seam so frequently-changing tapes (slot B: op phase, urge state) don't visibly replace text mid-read.

Applies uniformly to the main ticker and all four A–D slots. Volatile numbers (countdowns, MAT/req counts) live in a fixed badge next to the slot letter, separate from the scrolling text, so a value ticking over never restarts the scroll.

## 3. Individual operatives (this run's biggest concept shift)

Per your call to make squads "a pool, but individuality can draw out more nuance": every blufor squad now fields 4 named crew members (callsigns from a shuffled pool). Consequences:

- Casualties hit a specific named person, not an anonymous HP tick.
- **Field promotion**: a crew member who survives 2+ completed ops earns a star (amber head on their doll) — earned through performance, matching the "unique identifier through performance" pattern from the earlier attachment-mechanics research, not just survival.
- **Lone-survivor moment**: an op completing with exactly one crew member standing gets called out by name in the ticker and receipts.
- Debrief now opens with the full 141 roster (who stood, who fell, ops count, stars) before the operation log.
- **Scoped down per your correction**: crew dolls now render only for 141 (the squad you actually command). BULL-6/RAZOR-2 collapse to a plain headcount — showing individuals you have no control over was noise, not signal.

## 4. OP-MONITOR — from a single moving line to full scenes

Original version was one animated element per action category (arc / descent line / reticle) — functional but thin, as you flagged. Rebuilt each of the three categories (kinetic, mecha, CAS) into a three-layer scene:

- **Moving element** with real detail (chassis with legs and retro-burn flame, missile with exhaust trail, banking horizon HUD with tracer fire)
- **Live telemetry** readout (ALT/VEL/TTI for kinetic, ALT/VVEL for mecha, SPD/AGL/GUN for CAS)
- **Stage checklist** that fills in as progress advances (☐→▸→■), same idiom as the rocket-launch reference image

**Timing sync fix (just landed)**: the world effect (crater, kills, mecha touchdown) now fires *at the animation's impact stage*, not the instant the button is pressed. Previously `strike()`/`blast()` executed immediately while the monitor played a separate 3.5–4.5s animation — voxels changed before the "impact" the player was watching for arrived. Ordnance now has a real flight delay between commit and effect, which is a genuine gameplay change (you're firing at where the front *will be*), not just a visual fix — worth confirming it doesn't feel laggy in practice.

## 5. Terrain ↔ war coupling (the "macro issue" you suspected)

Confirmed: the height field existed and only affected troop marching speed — the control field itself (the actual voxel war, the CA relaxation step) never read elevation at all. That's why craters and ridges didn't visibly matter to the war.

Fixed at the simulation level:
- CA spread rate now scales down on high ground (`0.13 × (1 − h·0.55)`) and the front-stalling attrition term strengthens with elevation — fronts genuinely stick on ridgelines and pour through valleys/craters now, not just render differently.
- Troop cell-capture rate scales by the same slope factor.
- **Hillshade rendering**: every rendered cell's brightness now scales with elevation, so a crater is a visible dark pit and a ridge is a visible bright crown — not just a thin contour line. Collateral damage now reads on the map, and because low ground is fast ground, forces visibly funnel into craters you've made.

## Net position

The core loop, layout, and information design are now internally consistent — terrain matters to the sim it renders, the monitor's drama matches the effect it precedes, and the roster reflects who you actually command. Remaining known gaps are unchanged from the last audit and still deferred: persistence/save module, bench↔theatre tie-back, doctrine/build-posture, meta-progression model decision (FTL-style stateless vs. tech-ladder — now partially resolved in spirit by individual-operative promotion, which is a third option neither camp considered).
