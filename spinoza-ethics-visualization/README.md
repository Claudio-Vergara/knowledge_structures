# Spinoza — Ethica Ordine Geometrico Demonstrata

Interactive graph visualization of the complete logical structure of Spinoza's *Ethics* (1677).

## Setup

```bash
npm install
npm run dev % starts the visualization server
```

Open http://localhost:5173

## Project structure

```
ethics.json            — single source of truth: every element and its dependencies
src/
  App.jsx              — root component, mounts SpinozaEthics
  SpinozaEthics.jsx    — visualization (derives the graph from ethics.json + rendering)
  main.jsx             — React entry point
index.html             — full-viewport shell
```

## Source of truth

[`ethics.json`](ethics.json) holds all 420 elements of the *Ethics* — definitions,
axioms, propositions, corollaries, and the definitions of the emotions. Each element
carries:

```json
{
  "id": "I.P6.C1",
  "part": "I",
  "kind": "corollary",
  "number": 22,
  "statement": "Hence it follows that a substance cannot be produced …",
  "proof": null,
  "parent": ["I.D3", "I.D5", "I.A1", "I.A4", "I.P6"]
}
```

`parent` lists the elements each one is demonstrated from — these are the **edges** of
the graph (919 in total). `SpinozaEthics.jsx` reads `ethics.json` at load time and
builds the nodes, edges, contents tree, and layouts from it. To change the graph —
fix a dependency, edit a statement, add a proposition — **edit `ethics.json`**; nothing
about the structure is hand-authored in the component.

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

`ethics.json` carries no coordinates, so positions are computed in the browser from the
node/edge sets. Three layouts are available (switch top-right; drag any node to adjust):

- **Force-directed** — a deterministic Fruchterman–Reingold simulation with a gentle
  per-Part anchoring, so the five Parts settle into distinct, color-coherent regions.
- **Sequential** — a per-Part banded DAG layout: each Part is a horizontal band (Part I at
  the bottom), its definitions/axioms on the base row and propositions rising by dependency
  depth. Barycenter ordering + isotonic coordinate assignment straighten the causal chains.
- **Physical** — a mass–spring–gravity equilibrium fusing the two. Every node is 1 kg; a
  uniform 1 N/kg field pulls them *upward*. The axioms & definitions are pinned at each
  section's floor (the anchors the field needs); each edge is an elastic band (rest 1 m,
  k = 1 N/m). Propositions float up until each band's tension balances the gravity hanging
  from it — causal chains hang upward and every parent→child band stays in tension.

## Parts

| Color | Part |
|-------|------|
| Gold  | Part I — Concerning God |
| Blue  | Part II — On the Nature and Origin of the Mind |
| Purple | Part III — On the Origin and Nature of the Emotions |
| Red   | Part IV — Of Human Bondage |
| Green | Part V — Of Human Freedom |

## Deploy

Ships as a static nginx container. Everything — `ethics.json`, `ethics_es.json`, React —
is compiled into one ~720 KB JS file at build time, so the running container makes no
network calls and holds no state.

It publishes no host port. A Caddy reverse proxy owns :80 and routes `/spinoza/*` here,
which is why [`vite.config.js`](vite.config.js) sets `base: '/spinoza/'` — every built
asset URL is absolute under that prefix. **That proxy lives in a separate repo**
(`cvergara-lyra/sandbox`, in its `edge/` directory) because it fronts more than this app.

**Host setup — provisioning, firewall, Docker install, TLS — is documented there:
`sandbox/edge/README.md`.** This container attaches to the shared `web` network created
during that setup.

```bash
docker network create web                   # once per host, if not already done
cd sandbox/edge && docker compose up -d     # if not already running
cd <this repo>  && docker compose up -d --build
```

Then:

```bash
curl -sI http://<ip>/spinoza                       # 308 → /spinoza/
curl -s  http://<ip>/spinoza/ | grep script        # src="/spinoza/assets/index-*.js"
```

Open `http://<ip>/spinoza/` and confirm the graph renders and all three layouts switch,
with no 404s in the browser's network panel — that verifies the `base` prefix survives the
proxy end to end.

Because the datasets are bundled rather than fetched, **editing `ethics.json` requires a
rebuild** (`docker compose up -d --build`); there is no way to swap content in a running
container.
