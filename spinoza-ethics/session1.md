# Session 1 — Spinoza *Ethics* Visualization Enhancements

Date: 2026-06-05

All work was done in [src/SpinozaEthics.jsx](src/SpinozaEthics.jsx) — a single-file React
artifact rendering the complete logical structure of Spinoza's *Ethics* (258 nodes,
465 edges) as an interactive SVG graph.

## Starting point

The artifact rendered a force-directed (Kamada-Kawai) graph with hover-highlight,
click-to-lock selection, double-click ancestry tracing, Part filters, and pan/zoom.
Node positions were baked into `RAW_NODES` as fixed `x`/`y` coordinates. Finding a
specific proposition in the graph was difficult.

## Features added (in order)

### 1. Table-of-contents tree (navigation)

The first request was a way to look up / browse specific nodes. After clarification
("a document tree like a table of contents"), built a **collapsible TOC sidebar** on
the left.

- New module-level `CONTENTS` structure: per Part → foundations (Defs/Axioms/Prefaces),
  propositions, and appendices in document order. Corollaries are matched to their
  parent proposition by number (`I.C14a` → `I.14`) and nested/indented beneath it.
  Helper `nodeNum(id)` parses the numeric ordering key.
- Each Part header expands/collapses (`expanded` Set state; Part I open by default).
- Sub-section labels: "Definitions & Axioms", "Propositions", "Appendix".
- Clicking an entry calls `focusNode()` — pans/zooms the canvas to center the node
  (`FOCUS_SCALE = 0.55`) and locks it as the selection. Hover previews via highlight.
- A **Filter** input at the top narrows the tree live (matches label, id, or
  description), auto-expanding Parts and hiding non-matches.
- Glyphs (○ ◇ ⬭ ▭) double as the legend; entries colored by Part.
- Collapses to a compact "☰ Contents" button.

### 2. Layout options + per-node repositioning

Two selectable layouts plus draggable nodes.

- **Kamada-Kawai** (original baked-in spring layout), stored as `KAMADA_LAYOUT`.
- **Sequential** — a layered DAG layout (`buildSequentialLayout()`): axioms / edge-less
  roots at the **bottom**, every edge pointing strictly **upward**. Uses **longest-path
  layering** (minimum possible height = fewest layers) via Kahn topological sort, with a
  cycle-breaking fallback, then **barycenter sweeps** to order nodes within each layer
  and reduce edge crossings. `y = (maxLayer - layer) * LAYER_H` puts layer 0 at the bottom.
- **Drag any node** to reposition it. Positions flow through a `posMap` =
  base layout + per-node `overrides`. Overrides are kept **per layout**
  (`{ kamada:{}, sequential:{} }`) so manual moves survive switching layouts.
  A 3px drag-vs-click threshold (`justDraggedRef`) keeps quick clicks as selections.
  The window mousemove listener (bound once) reads current layout/scale via refs
  (`tfRef`, `layoutModeRef`, `baseLayoutRef`, `overridesRef`).
- Layout switcher panel (top-right). Switching auto-fits the new structure via `fitView()`.
- Updated zoom controls: **＋ / −** zoom (min zoom lowered to `0.04` for the tall
  sequential layout), **⤢** fit-to-view, **↺** reset manual node positions for the
  current layout.

### 3. Dark / light theme + "show all" toggle

- **Theme system**: module-level `THEMES` object with `dark` and `light` palettes sharing
  token names (`bg`, `panel`, `border`, `divider`, `accent`, `textBright`, `t1`–`t7`,
  `nodeFill*`, `glow`, `arrowDim`, etc.). The active palette `t = THEMES[theme]` is threaded
  through every styled element; `NodeShape` receives `t` as a prop.
- **Theme-aware Part colors**: each palette has a `parts` map, accessed via `pc(part)`.
  Light mode uses darker, more saturated Part colors so strokes/labels read on a light
  ground (dark mode keeps the original bright colors).
- **"Show all" toggle** (`showAll` state, `dimEnabled = !showAll`): when on, focusing a
  node no longer dims everything else — **all nodes *and* edges stay fully visible**
  (edges brighten to ~0.72 opacity / thicker stroke; trace-mode non-ancestry edges rise
  too), while the selected node and its connections still get emphasis.
- Both toggles live in a "Display" section of the top-right panel.

### 4. Light-mode polish (follow-up fixes)

- Darkened the light text scale (`t1`–`t7`) and `textBright` for readability.
- Introduced the darker per-Part light colors (the main legibility fix).
- Made the background grid much subtler in light mode (soft tone, low opacity) so the
  square grid lines are no longer obtrusive.
- Ensured "show all" brightens edges, not just nodes.

### 5. One-sentence descriptions in the index

Each index entry now reads like a real table of contents — number + a short description.

- First pass: a `shortGloss(desc)` helper derives the first real sentence from each node's
  `desc` (drops trailing "(From …)" citations, skips mid-sentence abbreviations like
  "etc.", caps length).
- Second pass (on request): authored a curated `GLOSS` map (module-level, keyed by node id)
  with a **hand-written essence sentence for all 258 nodes** — synthesizing each
  proposition's core point rather than quoting it. Verified every node id has exactly one
  matching key (no missing/extra).
- `renderRow` resolves the displayed description as
  `GLOSS[id] || keystoneTitle || shortGloss(desc)`. Rows wrap (no truncation), number in
  bold Part color, description in dimmer text.

## Key implementation notes

- `THEMES` and `PARTS` hold the only remaining hardcoded color literals; the entire render
  body is themed via `t.*` and `pc()`.
- Refs that the once-bound drag listener depends on are synced inside a `useEffect`
  (not mutated during render) to satisfy the `react-hooks/refs` lint rule.
- `buildSequentialLayout` and `KAMADA_LAYOUT` are computed once (module level /
  `useMemo`), independent of theme.

## Verification

- `npx eslint src/SpinozaEthics.jsx` — clean (also removed pre-existing unused
  `containerW` and `isTarget` warnings).
- `npx vite build` — passes.
- Dev server (`npm run dev`) ran throughout with HMR; no runtime errors.

## Possible follow-ups

- Option to remove the light-mode grid entirely.
- Further tuning of light Part colors (gold vs. parchment can still be close).
- Tune sequential layout spacing (`SPACING`, `LAYER_H`) or default zoom.
- Persist theme / layout / node overrides to localStorage.
- Review/refine individual `GLOSS` essence sentences for accuracy or tone.

## Note

A Vite file-watcher `EBUSY` crash was observed once, triggered by the watcher reading the
project data file `Spinoza_Ethics.txt` while it was locked — unrelated to the app code.
Restarting `npm run dev` resolved it.
