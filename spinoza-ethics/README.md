# Spinoza — Ethica Ordine Geometrico Demonstrata

Interactive graph visualization of the complete logical structure of Spinoza's *Ethics* (1677).

## Setup

requires node.js installed in the machine. https://nodejs.org/en/download

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Project structure

```
src/
  App.jsx              — root component, mounts SpinozaEthics
  SpinozaEthics.jsx    — main visualization (all data + rendering)
  main.jsx             — React entry point
index.html             — full-viewport shell
```

## Interaction

| Action | Effect |
|--------|--------|
| Hover node | Highlight direct neighbors |
| Click node | Lock selection |
| Double-click node | Trace full ancestry (all upstream nodes/edges) |
| Double-click again / double-click canvas | Clear |
| Scroll | Zoom (0.2× – 4×) |
| Drag | Pan |
| Part filter buttons | Show only one Part |
| ↺ | Reset view |

## Layout

Node positions computed with the Kamada-Kawai algorithm via networkx.
All 258 nodes and 630 edges are encoded directly in `SpinozaEthics.jsx`. The edges
are derived from the proof citations in the source text by `extract_dependencies.py`
(full-book granular graph → `dependencies.json`) and projected onto the 258 curated
nodes by `_update_viz_edges.py`.

## Parts

| Color | Part |
|-------|------|
| Gold  | Part I — Concerning God |
| Blue  | Part II — On the Nature and Origin of the Mind |
| Purple | Part III — On the Origin and Nature of the Emotions |
| Red   | Part IV — Of Human Bondage |
| Green | Part V — Of Human Freedom |
