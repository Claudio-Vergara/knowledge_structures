import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ETHICS from "../ethics.json";
// Spanish statements per element id, extracted from docs/etica_spanish.txt by
// scripts/parse_spanish.mjs. Keys are ethics.json element ids ("I.P16", "III.DE12").
// Coverage is ~99% — any id missing from this file falls back to the English text.
import ETHICS_ES from "../ethics_es.json";

// Part keys drive iteration and colour lookups. Human-readable labels/subtitles live in
// the i18n table below — colours are language-independent and stay here.
const PARTS = { I: 0, II: 0, III: 0, IV: 0, V: 0 };

// ── i18n ────────────────────────────────────────────────────────────────────
// All user-visible strings, keyed by language. Add a new locale by extending both
// branches — every key must exist in both. Helpers with runtime arguments (counts,
// interpolation) are functions; static labels are strings.
const L18N = {
  en: {
    header_author: "Benedictus de Spinoza — 1677",
    // The title is a Latin phrase; it does not change with the interface language.
    header_title: "Ethica Ordine Geometrico Demonstrata",
    header_sub: "Complete Logical Structure — Definitions, Axioms, Propositions & Corollaries",
    parts: {
      I:   { label: "Part I",   subtitle: "Concerning God" },
      II:  { label: "Part II",  subtitle: "On the Nature and Origin of the Mind" },
      III: { label: "Part III", subtitle: "On the Origin and Nature of the Emotions" },
      IV:  { label: "Part IV",  subtitle: "Of Human Bondage" },
      V:   { label: "Part V",   subtitle: "Of Human Freedom" },
    },
    all: "ALL",
    contents: "Contents",
    filter: "Filter…",
    no_matches: "No matching nodes",
    sub_defs: "Definitions & Axioms",
    sub_props: "Propositions",
    sub_emotions: "Definitions of the Emotions",
    kind: { prop: "Proposition", coroll: "Corollary", def: "Definition", axiom: "Axiom" },
    proof: "Proof",
    ancestry: "Ancestry Trace",
    ancestry_line: (n, kindLabel) => (
      <>upstream node{n !== 1 ? "s" : ""} feed into this {kindLabel.toLowerCase()} — directly and indirectly.</>
    ),
    ancestry_reclick: "Double-click again to clear.",
    hint_trace: "Double-click to trace full ancestry",
    navigate: "Navigate",
    nav_hover: "Hover to highlight connections",
    nav_click: "Click to lock selection",
    nav_double_click: "Double-click to trace ancestry",
    nav_scroll: "Scroll to zoom · Drag to pan",
    nav_filter: "Filter by Part above",
    legend: (<>○ Proposition &nbsp;◇ Corollary<br/>▢ Definition &nbsp;▭ Axiom</>),
    stats: (nodes, edges) => `${nodes} elements · ${edges} dependencies, from ethics.json`,
    layout: "Layout",
    layout_modes: {
      force:      { label: "Force-directed", hint: "organic, clustered by Part" },
      sequential: { label: "Sequential",     hint: "axioms → derivations, bottom-up" },
      physical:   { label: "Physical",       hint: "gravity + elastic bands" },
    },
    layout_footer: "Drag any node to reposition it.",
    display: "Display",
    theme: "Theme", theme_dark: "Dark", theme_light: "Light",
    language: "Language",
    show_all: "Show all",
    show_all_hint: "no dimming on focus",
    show_all_title: "Toggle dimming of unrelated nodes on focus",
    source: "Source",
    reload: "Reload ethics.json",
    rebuilding: "Rebuilding…",
    reload_title: "Re-fetch ethics.json and rebuild the graph and both layouts",
    reload_updated: "Updated · ",
    reload_failed:  "Failed · ",
    reload_hint: "Rebuilds nodes, edges & both layouts from the file.",
    zoom_out: "Zoom out", zoom_in: "Zoom in", zoom_level: "Zoom level",
    fit_view: "Fit to view", reset_positions: "Reset node positions",
  },
  es: {
    header_author: "Benedicto de Spinoza — 1677",
    header_title: "Ethica Ordine Geometrico Demonstrata",
    header_sub: "Estructura lógica completa — Definiciones, Axiomas, Proposiciones y Corolarios",
    parts: {
      I:   { label: "Parte I",   subtitle: "De Dios" },
      II:  { label: "Parte II",  subtitle: "De la naturaleza y origen del alma" },
      III: { label: "Parte III", subtitle: "Del origen y naturaleza de los afectos" },
      IV:  { label: "Parte IV",  subtitle: "De la servidumbre humana" },
      V:   { label: "Parte V",   subtitle: "De la libertad humana" },
    },
    all: "TODAS",
    contents: "Contenido",
    filter: "Filtrar…",
    no_matches: "Sin coincidencias",
    sub_defs: "Definiciones y Axiomas",
    sub_props: "Proposiciones",
    sub_emotions: "Definiciones de los afectos",
    kind: { prop: "Proposición", coroll: "Corolario", def: "Definición", axiom: "Axioma" },
    proof: "Demostración",
    ancestry: "Rastreo genealógico",
    // Spanish drops the "this X" reference — the count is enough context and avoids the
    // gendered "esta/este" branching that a literal rendering would need. The kindLabel
    // parameter is unused for that reason but kept to match the English signature.
    // eslint-disable-next-line no-unused-vars
    ancestry_line: (n, kindLabel) => (
      <>nodo{n !== 1 ? "s" : ""} precedente{n !== 1 ? "s" : ""} alimenta{n !== 1 ? "n" : ""} este elemento — directa e indirectamente.</>
    ),
    ancestry_reclick: "Doble clic para limpiar.",
    hint_trace: "Doble clic para rastrear la genealogía",
    navigate: "Navegar",
    nav_hover: "Pasa el cursor para resaltar conexiones",
    nav_click: "Clic para fijar la selección",
    nav_double_click: "Doble clic para rastrear la genealogía",
    nav_scroll: "Rueda para acercar · Arrastra para desplazar",
    nav_filter: "Filtra por Parte arriba",
    legend: (<>○ Proposición &nbsp;◇ Corolario<br/>▢ Definición &nbsp;▭ Axioma</>),
    stats: (nodes, edges) => `${nodes} elementos · ${edges} dependencias, desde ethics.json`,
    layout: "Disposición",
    layout_modes: {
      force:      { label: "Dirigida por fuerzas", hint: "orgánica, agrupada por Parte" },
      sequential: { label: "Secuencial",           hint: "axiomas → derivaciones, de abajo a arriba" },
      physical:   { label: "Física",               hint: "gravedad + bandas elásticas" },
    },
    layout_footer: "Arrastra cualquier nodo para reubicarlo.",
    display: "Pantalla",
    theme: "Tema", theme_dark: "Oscuro", theme_light: "Claro",
    language: "Idioma",
    show_all: "Mostrar todo",
    show_all_hint: "sin atenuar al enfocar",
    show_all_title: "Alternar atenuación de nodos no relacionados al enfocar",
    source: "Fuente",
    reload: "Recargar ethics.json",
    rebuilding: "Reconstruyendo…",
    reload_title: "Recargar ethics.json y reconstruir el grafo y ambas disposiciones",
    reload_updated: "Actualizado · ",
    reload_failed:  "Falló · ",
    reload_hint: "Reconstruye nodos, aristas y ambas disposiciones desde el archivo.",
    zoom_out: "Alejar", zoom_in: "Acercar", zoom_level: "Nivel de zoom",
    fit_view: "Ajustar a la vista", reset_positions: "Restablecer posiciones",
  },
};

// Two color palettes sharing the same token names. The per-Part colors above are
// semantic and used unchanged in both themes.
const THEMES = {
  dark: {
    bg:"#080705", panel:"rgba(8,7,5,0.97)", panelSolid:"rgba(8,7,5,0.9)",
    border:"#2a200855", divider:"#1a1508", accent:"#D4A85A", accentSoft:"#D4A85A66",
    tint:"rgba(200,169,110,0.12)", tintSoft:"rgba(200,169,110,0.07)", inputBg:"rgba(0,0,0,0.3)",
    grid:"#c8a96e", gridOpacity:0.03,
    textBright:"#f0e8d8", textGold:"#c8a96e",
    t1:"#9a8a64", t2:"#8a7a5a", t3:"#7a6040", t4:"#6a5a3a", t5:"#5a4a30", t6:"#4a3a20", t7:"#3a3020",
    nodeFill:"#100e0a", nodeFillBox:"#181410", nodeFillDim:"#1e1a12",
    nodeTextActive:"#fff", nodeTextDim:"#4a3a20", glow:"#ffffff", arrowDim:"#2a2010", btnActiveText:"#08070a",
    parts:{ I:"#D4A85A", II:"#5AABCC", III:"#B06AC8", IV:"#CC6A6A", V:"#5CC47A" },
  },
  light: {
    bg:"#f6f2ea", panel:"rgba(252,250,245,0.97)", panelSolid:"rgba(252,250,245,0.95)",
    border:"#c3b58e99", divider:"#e0d8c4", accent:"#8a5e12", accentSoft:"#8a5e1255",
    tint:"rgba(138,94,18,0.12)", tintSoft:"rgba(138,94,18,0.07)", inputBg:"rgba(255,255,255,0.7)",
    grid:"#b8ab8c", gridOpacity:0.04,
    textBright:"#241c10", textGold:"#5a4012",
    t1:"#33291a", t2:"#43381f", t3:"#544730", t4:"#665740", t5:"#786750", t6:"#8b7a60", t7:"#a08d70",
    nodeFill:"#fdfbf6", nodeFillBox:"#f0e8d6", nodeFillDim:"#ece4d2",
    nodeTextActive:"#1c150a", nodeTextDim:"#a89a7c", glow:"#8a5e12", arrowDim:"#c7b99a",
    btnActiveText:"#fbf7ee",
    // Darker, more saturated Part colors so strokes and labels read on a light ground.
    parts:{ I:"#9a6a14", II:"#1f7a9c", III:"#8a2fa8", IV:"#b43636", V:"#2a8048" },
  },
};

// ── Source of truth ─────────────────────────────────────────────────────────
// Every node and edge is derived from ethics.json at load time. To change the
// graph — add a proposition, fix a dependency — edit ethics.json. Nothing about
// the structure is hand-authored here.
//
// Each element carries: id ("I.P16", "I.P6.C1", "III.DE12"), part, kind
// (definition | axiom | proposition | corollary), the full statement, an optional
// proof, and `parent` — the list of ids it is demonstrated from. Those parent
// links are the edges of the graph.

const KIND_TYPE = { definition:"def", axiom:"axiom", proposition:"prop", corollary:"coroll" };

// Compact label for a node id: drop the "P" from proposition/corollary ids so they
// read like classic citations (I.P16 → "I.16", I.P6.C1 → "I.6.C1"). Definitions and
// axioms keep their natural ids (I.D1, I.A1, III.DE5).
function makeLabel(id) { return id.replace(/\.P(?=\d)/, "."); }

// Numeric ordering key within a Part: the first number after the part prefix.
// "I.P14" / "I.P14.C1" → 14, "I.D3" → 3.
function nodeNum(id) {
  const m = id.slice(id.indexOf(".") + 1).match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}
// Corollary ordinal: "I.P14.C2" → 2 (for ordering corollaries under their prop).
function corollNum(id) {
  const m = id.match(/\.C(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

// Turn raw ethics.json elements into render-ready nodes. Every node carries English and
// Spanish variants of the statement + proof; the UI's language toggle selects which one
// to display. Any missing translation silently falls back to English.
function buildNodes(elements) {
  const es      = (ETHICS_ES && ETHICS_ES.statements) || {};
  const esProof = (ETHICS_ES && ETHICS_ES.proofs) || {};
  return elements.map(e => ({
    id:      e.id,
    part:    e.part,
    kind:    e.kind,
    type:    KIND_TYPE[e.kind] || "prop",
    label:   makeLabel(e.id),
    desc:    e.statement || "",
    descEs:  es[e.id] || null,
    proof:   e.proof || null,
    proofEs: esProof[e.id] || null,
  }));
}

function statementFor(node, lang) { return lang === "es" && node.descEs  ? node.descEs  : node.desc; }
function proofFor(node, lang)     { return lang === "es" && node.proofEs ? node.proofEs : node.proof; }

// Directed edges: [dependency, dependent]. Read off each element's `parent` list.
function buildEdges(elements) {
  const edges = [];
  for (const e of elements) {
    if (Array.isArray(e.parent)) for (const p of e.parent) edges.push([p, e.id]);
  }
  return edges;
}

function computeAncestors(nodeId, edges) {
  const nodeSet = new Set([nodeId]);
  const edgeSet = new Set();
  const queue = [nodeId];
  while (queue.length) {
    const cur = queue.shift();
    edges.forEach(([a, b]) => {
      if (b === cur) {
        edgeSet.add(a + "->" + b);
        if (!nodeSet.has(a)) { nodeSet.add(a); queue.push(a); }
      }
    });
  }
  return { nodeSet, edgeSet };
}

function getRadius(type) {
  if (type === "def" || type === "axiom") return 22;
  if (type === "coroll") return 16;
  return 18; // proposition
}

// Zoom bounds, shared by the wheel, the +/- buttons and the slider. The slider runs
// on a log scale (0–1000) so equal travel multiplies the zoom by a constant factor.
const MIN_SCALE = 0.04, MAX_SCALE = 4;
const SCALE_LOG = Math.log(MAX_SCALE / MIN_SCALE);
const scaleToSlider = (s) =>
  Math.round(1000 * Math.log(Math.min(MAX_SCALE, Math.max(MIN_SCALE, s)) / MIN_SCALE) / SCALE_LOG);
const sliderToScale = (v) => MIN_SCALE * Math.exp((v / 1000) * SCALE_LOG);

// One-sentence gloss for the index, derived from a node's full statement: the first
// real sentence, with any trailing "(From …)" citation dropped. Skips mid-sentence
// abbreviations (e.g. "etc.") by requiring the period to be followed by a capital, "(", or end.
function shortGloss(desc) {
  if (!desc) return "";
  const s = desc.replace(/\s+/g, " ").trim();
  let end = -1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== ".") continue;
    const m = s.slice(i + 1).match(/^\s*(\S)/);
    const next = m ? m[1] : "";
    if (next === "" || next === "(" || /[A-Z0-9]/.test(next)) { end = i; break; }
  }
  let out = (end >= 0 ? s.slice(0, end + 1) : s).replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (out.length > 140) out = out.slice(0, 137).replace(/\s+\S*$/, "") + "…";
  return out;
}

// Build a table-of-contents tree: per Part → definitions & axioms, the "Definitions
// of the Emotions" block (Part III's DE1–48 + general definition), propositions (with
// their corollaries nested), all in document order.
function buildContents(nodes, nodeMap) {
  return Object.keys(PARTS).map(pk => {
    const ns = nodes.filter(n => n.part === pk);
    const foundations = ns
      .filter(n => (n.type === "def" || n.type === "axiom") && !n.id.includes(".DE") && !n.id.includes(".DEG"))
      .sort((a, b) => (a.type === b.type ? nodeNum(a.id) - nodeNum(b.id) : a.type === "def" ? -1 : 1));
    const emotionDefs = ns
      .filter(n => n.id.includes(".DE"))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    const props = ns.filter(n => n.type === "prop").sort((a, b) => nodeNum(a.id) - nodeNum(b.id));
    const corolls = ns.filter(n => n.type === "coroll");

    const byProp = {};
    const orphanCorolls = [];
    corolls.forEach(c => {
      const parentId = c.id.replace(/\.C\d+$/, "");
      if (nodeMap[parentId] && nodeMap[parentId].type === "prop") (byProp[parentId] ||= []).push(c);
      else orphanCorolls.push(c);
    });
    Object.values(byProp).forEach(arr => arr.sort((a, b) => corollNum(a.id) - corollNum(b.id)));
    orphanCorolls.sort((a, b) => nodeNum(a.id) - nodeNum(b.id) || corollNum(a.id) - corollNum(b.id));

    return { pk, foundations, emotionDefs, props, byProp, orphanCorolls };
  });
}

// ── Layouts ─────────────────────────────────────────────────────────────────
// No positions live in the source data, so both layouts are computed from the
// node/edge sets at load time.

// Force-directed (Fruchterman–Reingold) with a gentle per-Part anchoring so the
// five Parts settle into distinct, color-coherent regions while edges and mutual
// repulsion shape the local structure. Deterministic (seeded), computed once.
function buildForceLayout(nodes, edges) {
  const ids = nodes.map(n => n.id);
  const N = ids.length;
  const idx = {}; ids.forEach((id, i) => { idx[id] = i; });
  const part = {}; nodes.forEach(n => { part[n.id] = n.part; });

  const partList = Object.keys(PARTS);
  const ANCHOR = {};
  partList.forEach((p, i) => {
    const a = (i / partList.length) * 2 * Math.PI - Math.PI / 2;
    ANCHOR[p] = { x: Math.cos(a) * 1150, y: Math.sin(a) * 1150 };
  });

  // Seeded PRNG (mulberry32) — keeps the layout identical across reloads.
  let seed = 987654321 >>> 0;
  const rnd = () => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ t >>> 15, 1 | t);
    t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  const px = new Float64Array(N), py = new Float64Array(N);
  nodes.forEach((n, i) => {
    const A = ANCHOR[n.part];
    px[i] = A.x + (rnd() - 0.5) * 600;
    py[i] = A.y + (rnd() - 0.5) * 600;
  });

  const E = edges
    .filter(([a, b]) => idx[a] != null && idx[b] != null && a !== b)
    .map(([a, b]) => [idx[a], idx[b]]);

  const k = 170, k2 = k * k;
  const dx = new Float64Array(N), dy = new Float64Array(N);
  let temp = 600;
  for (let it = 0; it < 160; it++) {
    dx.fill(0); dy.fill(0);
    // Repulsion between every pair.
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        let vx = px[i] - px[j], vy = py[i] - py[j];
        let dd = vx * vx + vy * vy;
        if (dd < 0.01) { dd = 0.01; vx = (rnd() - 0.5) * 0.1; vy = (rnd() - 0.5) * 0.1; }
        const len = Math.sqrt(dd), f = k2 / dd;
        dx[i] += vx / len * f; dy[i] += vy / len * f;
        dx[j] -= vx / len * f; dy[j] -= vy / len * f;
      }
    }
    // Attraction along edges.
    for (const [a, b] of E) {
      let vx = px[a] - px[b], vy = py[a] - py[b];
      const len = Math.sqrt(vx * vx + vy * vy) || 0.01, f = (len * len) / k;
      dx[a] -= vx / len * f; dy[a] -= vy / len * f;
      dx[b] += vx / len * f; dy[b] += vy / len * f;
    }
    // Gentle pull toward each node's Part anchor.
    for (let i = 0; i < N; i++) {
      const A = ANCHOR[part[ids[i]]];
      dx[i] += (A.x - px[i]) * 0.03; dy[i] += (A.y - py[i]) * 0.03;
    }
    // Apply, capped by the cooling temperature.
    for (let i = 0; i < N; i++) {
      const len = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 1;
      const m = Math.min(len, temp);
      px[i] += dx[i] / len * m; py[i] += dy[i] / len * m;
    }
    temp = Math.max(temp * 0.97, 6);
  }

  const pos = {};
  ids.forEach((id, i) => { pos[id] = { x: px[i], y: py[i] }; });
  return pos;
}

// Sequential (per-Part banded DAG) layout. Each Part is laid out in its own horizontal
// band, the bands stacked bottom-up in reading order (Part I at the bottom, Part V on
// top). Within a band, that Part's definitions & axioms form the base row and its
// propositions rise above them by intra-Part dependency depth — so every Part's
// foundations sit right beneath its first proposition. Cross-Part citations become
// edges that span between bands. Every edge still points strictly upward.
function buildSequentialLayout(nodes, edges) {
  const ids = nodes.map(n => n.id);
  const idSet = new Set(ids);
  const nodeById = {};
  nodes.forEach(n => { nodeById[n.id] = n; });

  // Collect valid edges, then strip any back-edges so the graph is a strict DAG.
  const rawValid = edges.filter(([a, b]) => idSet.has(a) && idSet.has(b) && a !== b);
  const adj = {}; ids.forEach(id => { adj[id] = []; });
  rawValid.forEach(([a, b]) => adj[a].push(b));

  // DFS; an edge into a node currently on the recursion stack is a back-edge.
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const mark = {}; ids.forEach(id => { mark[id] = WHITE; });
  const backEdges = new Set();
  const visit = root => {
    const stack = [[root, 0]];
    mark[root] = GRAY;
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const [u, i] = frame;
      if (i < adj[u].length) {
        frame[1]++;
        const v = adj[u][i];
        if (mark[v] === GRAY) backEdges.add(`${u} ${v}`);
        else if (mark[v] === WHITE) { mark[v] = GRAY; stack.push([v, 0]); }
      } else { mark[u] = BLACK; stack.pop(); }
    }
  };
  ids.forEach(id => { if (mark[id] === WHITE) visit(id); });

  const out = {}, inc = {}, indeg = {};
  ids.forEach(id => { out[id] = []; inc[id] = []; indeg[id] = 0; });
  rawValid.forEach(([a, b]) => {
    if (backEdges.has(`${a} ${b}`)) return; // drop back-edge to keep DAG
    out[a].push(b); inc[b].push(a); indeg[b]++;
  });

  // A global topological order (Kahn) so each node is processed after its parents.
  const topo = [];
  const deg = { ...indeg };
  const queue = ids.filter(id => deg[id] === 0);
  while (queue.length) {
    const cur = queue.shift();
    topo.push(cur);
    out[cur].forEach(b => { if (--deg[b] === 0) queue.push(b); });
  }

  // Local layer within each Part: foundations on the base row (0), every proposition
  // at least one row above, rising by its deepest intra-Part dependency.
  const isFoundation = id => { const tp = nodeById[id].type; return tp === "def" || tp === "axiom"; };
  const localLayer = {};
  topo.forEach(id => {
    if (isFoundation(id)) { localLayer[id] = 0; return; }
    let m = 0, hasIntraParent = false;
    inc[id].forEach(p => {
      if (nodeById[p].part === nodeById[id].part) {
        hasIntraParent = true;
        if (localLayer[p] > m) m = localLayer[p];
      }
    });
    localLayer[id] = hasIntraParent ? m + 1 : 1; // props always sit above the foundations row
  });

  // Stack the Part bands bottom-up, each tall enough for its own local layers plus a gap.
  const partList = Object.keys(PARTS);
  const partMaxLocal = {}; partList.forEach(P => { partMaxLocal[P] = 0; });
  ids.forEach(id => {
    const P = nodeById[id].part;
    if (localLayer[id] > partMaxLocal[P]) partMaxLocal[P] = localLayer[id];
  });
  const BAND_GAP = 2; // blank rows separating consecutive Parts
  const bandBase = {}; let acc = 0;
  partList.forEach(P => { bandBase[P] = acc; acc += partMaxLocal[P] + 1 + BAND_GAP; });

  // Absolute level (height from the bottom) = the Part's band base + the local layer.
  const level = {};
  ids.forEach(id => { level[id] = bandBase[nodeById[id].part] + localLayer[id]; });
  const maxLevel = ids.reduce((mx, id) => Math.max(mx, level[id]), 0);

  const levels = Array.from({ length: maxLevel + 1 }, () => []);
  ids.forEach(id => levels[level[id]].push(id));
  levels.forEach(arr => arr.sort((a, b) => a.localeCompare(b)));

  const SPACING = 170; // minimum horizontal gap between nodes in a row
  const X = {};
  const centerRow = arr => {
    const w = (arr.length - 1) * SPACING;
    arr.forEach((id, i) => { X[id] = i * SPACING - w / 2; });
  };
  levels.forEach(centerRow);

  // 1) Ordering — barycenter sweeps settle the left-to-right ORDER within each row so
  // linked nodes sit near each other, cutting edge crossings. Cross-Part edges count too.
  const bary = (id, side) => {
    const ns = side[id];
    if (!ns.length) return X[id];
    return ns.reduce((s, n) => s + X[n], 0) / ns.length;
  };
  for (let iter = 0; iter < 16; iter++) {
    for (let l = 1; l <= maxLevel; l++) { levels[l].sort((a, b) => bary(a, inc) - bary(b, inc)); centerRow(levels[l]); }
    for (let l = maxLevel - 1; l >= 0; l--) { levels[l].sort((a, b) => bary(a, out) - bary(b, out)); centerRow(levels[l]); }
  }

  // 2) Coordinate assignment — with the order fixed, slide each node toward the mean X of
  // its neighbours (parents + children) while preserving the row order and a minimum gap.
  // This straightens causal chains (fewer sharp angles), centres each node over the nodes
  // it links to (better left-right balance), and tightens the overall shape. Placing an
  // ordered row as close as possible to those targets under a min-gap is isotonic
  // regression, solved exactly by pool-adjacent-violators (substitute yᵢ = xᵢ − i·gap).
  const isotonic = g => {
    const val = [], wt = [], cnt = [];
    for (let i = 0; i < g.length; i++) {
      let v = g[i], w = 1, c = 1;
      while (val.length && val[val.length - 1] > v) {
        const pv = val.pop(), pw = wt.pop(), pc = cnt.pop();
        v = (v * w + pv * pw) / (w + pw); w += pw; c += pc;
      }
      val.push(v); wt.push(w); cnt.push(c);
    }
    const y = new Array(g.length); let i = 0;
    for (let b = 0; b < val.length; b++) for (let k = 0; k < cnt[b]; k++) y[i++] = val[b];
    return y;
  };
  const relaxRow = arr => {
    if (!arr.length) return;
    const g = arr.map((id, i) => {
      const ns = inc[id].concat(out[id]);
      const target = ns.length ? ns.reduce((s, n) => s + X[n], 0) / ns.length : X[id];
      return target - i * SPACING;
    });
    const y = isotonic(g);
    arr.forEach((id, i) => { X[id] = y[i] + i * SPACING; });
  };
  for (let iter = 0; iter < 100; iter++) {
    if (iter % 2 === 0) for (let l = 0; l <= maxLevel; l++) relaxRow(levels[l]);
    else for (let l = maxLevel; l >= 0; l--) relaxRow(levels[l]);
  }

  // Centre the whole graph horizontally for balanced, symmetric framing.
  const allX = ids.map(id => X[id]);
  const mid = (Math.min(...allX) + Math.max(...allX)) / 2;
  ids.forEach(id => { X[id] -= mid; });

  const LAYER_H = 170;
  const pos = {};
  ids.forEach(id => { pos[id] = { x: X[id], y: (maxLevel - level[id]) * LAYER_H }; });
  return pos;
}

// Physical layout — a mass–spring–gravity equilibrium that fuses the sequential and
// force-directed ideas. Every node has mass 1 kg; a uniform field of 1 N/kg pulls them
// all *upward*. A uniform field only shapes a system if something is anchored, so the
// axioms & definitions are pinned at the base of each section (placed as in the
// sequential layout) — they are the scaffold. Each edge is an elastic band: rest length
// 1 m, stretching 1 m per newton (k = 1 N/m). Propositions, free to move, float up from
// the pinned foundations until every band's tension balances the gravity hanging from it
// — so causal chains hang upward, deeper results sit higher, and parent→child bands stay
// stretched (positive tension). Foundations anchored at each section's floor keep them
// below the propositions that use them (the reorder rule, enforced structurally).
// Sections are placed side by side so they read as clusters (the force-directed flavour).
function buildPhysicalLayout(nodes, edges) {
  const ids = nodes.map(n => n.id);
  const idSet = new Set(ids);
  const nodeById = {}; nodes.forEach(n => { nodeById[n.id] = n; });
  const isFoundation = id => { const tp = nodeById[id].type; return tp === "def" || tp === "axiom"; };

  // Strip back-edges so dependencies form a strict DAG (same guard as the other layouts).
  const rawValid = edges.filter(([a, b]) => idSet.has(a) && idSet.has(b) && a !== b);
  const adj = {}; ids.forEach(id => { adj[id] = []; });
  rawValid.forEach(([a, b]) => adj[a].push(b));
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const mark = {}; ids.forEach(id => { mark[id] = WHITE; });
  const backEdges = new Set();
  const visit = root => {
    const stack = [[root, 0]]; mark[root] = GRAY;
    while (stack.length) {
      const frame = stack[stack.length - 1]; const [u, i] = frame;
      if (i < adj[u].length) {
        frame[1]++; const v = adj[u][i];
        if (mark[v] === GRAY) backEdges.add(`${u} ${v}`);
        else if (mark[v] === WHITE) { mark[v] = GRAY; stack.push([v, 0]); }
      } else { mark[u] = BLACK; stack.pop(); }
    }
  };
  ids.forEach(id => { if (mark[id] === WHITE) visit(id); });
  const kept = rawValid.filter(([a, b]) => !backEdges.has(`${a} ${b}`));

  // Per-section dependency depth, for the initial vertical placement ("as in sequential").
  const inc = {}, indeg = {}, out = {};
  ids.forEach(id => { inc[id] = []; out[id] = []; indeg[id] = 0; });
  kept.forEach(([a, b]) => { out[a].push(b); inc[b].push(a); indeg[b]++; });
  const topo = []; const deg = { ...indeg }; const q0 = ids.filter(id => deg[id] === 0);
  while (q0.length) { const c = q0.shift(); topo.push(c); out[c].forEach(b => { if (--deg[b] === 0) q0.push(b); }); }
  const loc = {};
  topo.forEach(id => {
    if (isFoundation(id)) { loc[id] = 0; return; }
    let m = 0, has = false;
    inc[id].forEach(p => { if (nodeById[p].part === nodeById[id].part) { has = true; if (loc[p] > m) m = loc[p]; } });
    loc[id] = has ? m + 1 : 1;
  });

  // Place sections side by side (no overlap); pin foundations across each section's floor.
  // Foundations that participate in proofs sit in the floor row; edge-less foundations
  // (e.g. the 48 Definitions of the Emotions) are packed into a compact grid just below,
  // so they do not stretch the section out.
  const partList = Object.keys(PARTS);
  const FGAP = 2.0, SECTION_PAD = 7;
  let seed = 20260606 >>> 0;
  const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ t >>> 15, 1 | t); t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const X = {}, H = {}, pinned = {};
  let cursor = 0;
  partList.forEach(P => {
    const founds = ids.filter(id => nodeById[id].part === P && isFoundation(id));
    const connected = founds.filter(id => out[id].length > 0).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const isolated = founds.filter(id => out[id].length === 0 && inc[id].length === 0);
    const props = ids.filter(id => nodeById[id].part === P && !isFoundation(id));
    const gridCols = Math.max(1, Math.ceil(Math.sqrt(isolated.length)));
    const propW = Math.ceil(Math.sqrt(props.length || 1)) * FGAP;
    const width = Math.max(connected.length * FGAP, gridCols * 1.5, propW, 4);
    const cx = cursor + width / 2;
    connected.forEach((id, i) => { X[id] = cx + (i - (connected.length - 1) / 2) * FGAP; H[id] = 0; pinned[id] = true; });
    isolated.forEach((id, i) => {
      const r = Math.floor(i / gridCols), c = i % gridCols;
      X[id] = cx + (c - (gridCols - 1) / 2) * 1.5; H[id] = -1.6 - r * 1.4; pinned[id] = true;
    });
    props.forEach(id => { X[id] = cx + (rnd() - 0.5) * propW * 0.6; H[id] = loc[id] + (rnd() - 0.5) * 0.5; pinned[id] = false; });
    cursor += width + SECTION_PAD;
  });

  // Relax to equilibrium: gravity (up) on free nodes + elastic bands, with damping.
  const G = 1, k = 1, L0 = 1, dt = 0.05, damp = 0.86;
  const VX = {}, VH = {}; ids.forEach(id => { VX[id] = 0; VH[id] = 0; });
  for (let it = 0; it < 1100; it++) {
    const FX = {}, FH = {};
    ids.forEach(id => { FX[id] = 0; FH[id] = pinned[id] ? 0 : G; });
    for (const [a, b] of kept) {
      const dx = X[b] - X[a], dh = H[b] - H[a];
      let len = Math.hypot(dx, dh); if (len < 1e-6) len = 1e-6;
      const f = k * (len - L0), ux = dx / len, uh = dh / len;
      FX[a] += f * ux; FH[a] += f * uh; FX[b] -= f * ux; FH[b] -= f * uh;
    }
    for (const id of ids) {
      if (pinned[id]) continue;
      VX[id] = (VX[id] + FX[id] * dt) * damp;
      VH[id] = (VH[id] + FH[id] * dt) * damp;
      X[id] += VX[id] * dt; H[id] += VH[id] * dt;
    }
  }

  // Metres → pixels. Gravity points up, so greater height → smaller screen-y.
  const SCALE = 80;
  const pos = {};
  ids.forEach(id => { pos[id] = { x: X[id] * SCALE, y: -H[id] * SCALE }; });
  return pos;
}

// Build the whole graph from a set of ethics.json elements: nodes, edges, lookup map,
// contents tree, and the three (deterministic) layouts. Re-run this to rebuild after the
// source file changes. Every layout is a pure function of the node/edge sets, so a
// rebuild applies all the layout refinements automatically.
function buildGraph(elements) {
  const nodes = buildNodes(elements);
  const edges = buildEdges(elements);
  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });
  return {
    nodes, edges, nodeMap,
    contents: buildContents(nodes, nodeMap),
    forceLayout: buildForceLayout(nodes, edges),
    sequentialLayout: buildSequentialLayout(nodes, edges),
    physicalLayout: buildPhysicalLayout(nodes, edges),
  };
}

function NodeShape({ type, color, active, dim, t }) {
  const fill = dim ? t.nodeFillDim : (type === "def" || type === "axiom") ? t.nodeFillBox : t.nodeFill;
  const sw = active ? 2.5 : type === "coroll" ? 1 : 0.9;
  const opacity = dim ? 0.55 : 1;
  const filter = active ? "url(#glow)" : undefined;
  const common = { fill, stroke: color, strokeWidth: sw, opacity, filter };

  if (type === "coroll") {
    const r = 16;
    return <polygon points={`0,${-r} ${r},0 0,${r} ${-r},0`} {...common} />;
  }
  if (type === "def" || type === "axiom") {
    const w = type === "def" ? 42 : 46, h = 26;
    return <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={4} {...common} />;
  }
  return <circle r={18} {...common} />;
}

export default function SpinozaEthics() {
  // The whole graph derives from ethics.json. The initial value is the bundled import;
  // the "Reload" button refetches the file and rebuilds, applying every layout refinement.
  const [graph] = useState(() => buildGraph(ETHICS.elements));
  const { nodes: RAW_NODES, edges: RAW_EDGES, nodeMap, contents: CONTENTS,
          forceLayout: FORCE_LAYOUT, sequentialLayout: SEQUENTIAL_LAYOUT,
          physicalLayout: PHYSICAL_LAYOUT } = graph;
  // The app opens on V.P42 with its full ancestry traced — the Ethics' concluding
  // proposition ("Blessedness is not the reward of virtue, but virtue itself…"), whose
  // upstream tree spans every Part and makes the interconnected structure legible at a
  // glance. The zoom+pan are then fit to the layout by the mount effect below.
  const INITIAL_TRACE_ID = "V.P42";
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.4 });
  const [selected, setSelected] = useState(INITIAL_TRACE_ID);
  const [hovered, setHovered] = useState(null);
  const [activePart, setActivePart] = useState(null);
  const [traced, setTraced] = useState(INITIAL_TRACE_ID);
  const [ancestry, setAncestry] = useState(() => computeAncestors(INITIAL_TRACE_ID, RAW_EDGES));
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(() => new Set(["I"]));
  const [treeOpen, setTreeOpen] = useState(true);
  const [layoutMode, setLayoutMode] = useState("sequential"); // "force" | "sequential" | "physical"
  const [overrides, setOverrides] = useState({ force: {}, sequential: {}, physical: {} }); // manual node moves per layout
  const [theme, setTheme] = useState("light"); // "dark" | "light"
  const [lang, setLang] = useState("en"); // "en" | "es" — swaps statement text (proofs stay English)
  const [showAll, setShowAll] = useState(false); // keep everything fully visible (no dimming on focus)
  const t = THEMES[theme];
  const L = L18N[lang]; // active locale strings
  const dimEnabled = !showAll;
  const pc = (part) => t.parts[part]; // theme-aware Part color
  const svgRef = useRef(null);
  const dragRef = useRef({ dragging: false, lx: 0, ly: 0 });
  const clickRef = useRef({ time: 0, target: null });
  const canvasClickRef = useRef({ time: 0 });
  const nodeDragRef = useRef(null);     // active node drag: { id, lx, ly, sx, sy, moved }
  const justDraggedRef = useRef(false); // suppress click right after a drag

  // Layout positions: a base layout per mode, with manual per-node overrides on top.
  const layoutBase = { force: FORCE_LAYOUT, sequential: SEQUENTIAL_LAYOUT, physical: PHYSICAL_LAYOUT };
  const baseLayout = layoutBase[layoutMode] || FORCE_LAYOUT;
  const getPosMap = useCallback((mode, ov) => {
    const base = { force: FORCE_LAYOUT, sequential: SEQUENTIAL_LAYOUT, physical: PHYSICAL_LAYOUT }[mode] || FORCE_LAYOUT;
    const o = ov[mode] || {};
    const m = {};
    RAW_NODES.forEach(n => { m[n.id] = o[n.id] || base[n.id]; });
    return m;
  }, [RAW_NODES, FORCE_LAYOUT, SEQUENTIAL_LAYOUT, PHYSICAL_LAYOUT]);
  const posMap = useMemo(() => getPosMap(layoutMode, overrides), [getPosMap, layoutMode, overrides]);

  // Refs so the window drag listener (bound once) sees current layout/positions.
  const tfRef = useRef(transform);
  const layoutModeRef = useRef(layoutMode);
  const baseLayoutRef = useRef(baseLayout);
  const overridesRef = useRef(overrides);
  useEffect(() => {
    tfRef.current = transform;
    layoutModeRef.current = layoutMode;
    baseLayoutRef.current = baseLayout;
    overridesRef.current = overrides;
  });

  const visNodes = activePart ? RAW_NODES.filter(n => n.part === activePart) : RAW_NODES;
  const visIds = new Set(visNodes.map(n => n.id));
  const visEdges = RAW_EDGES.filter(([a,b]) => visIds.has(a) && visIds.has(b));

  const inTraceMode = !!(traced && ancestry);
  const highlighted = !inTraceMode ? (hovered || selected) : null;
  const connectedIds = highlighted ? new Set(
    RAW_EDGES.filter(([a,b]) => a===highlighted||b===highlighted).flat()
  ) : null;

  // Pan/zoom handlers
  const onMouseDown = useCallback(e => {
    if (e.target.closest && e.target.closest("[data-node]")) return;
    dragRef.current = { dragging: true, lx: e.clientX, ly: e.clientY };
  }, []);

  useEffect(() => {
    const onMove = e => {
      // Dragging a single node to reposition it
      const nd = nodeDragRef.current;
      if (nd) {
        const scale = tfRef.current.scale || 1;
        const dx = (e.clientX - nd.lx) / scale;
        const dy = (e.clientY - nd.ly) / scale;
        nd.lx = e.clientX; nd.ly = e.clientY;
        if (Math.abs(e.clientX - nd.sx) + Math.abs(e.clientY - nd.sy) > 3) nd.moved = true;
        const mode = layoutModeRef.current;
        setOverrides(prev => {
          const cur = (prev[mode] && prev[mode][nd.id]) || baseLayoutRef.current[nd.id];
          return { ...prev, [mode]: { ...prev[mode], [nd.id]: { x: cur.x + dx, y: cur.y + dy } } };
        });
        return;
      }
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.lx;
      const dy = e.clientY - dragRef.current.ly;
      dragRef.current.lx = e.clientX;
      dragRef.current.ly = e.clientY;
      setTransform(p => ({ ...p, x: p.x + dx, y: p.y + dy }));
    };
    const onUp = () => {
      if (nodeDragRef.current) {
        if (nodeDragRef.current.moved) justDraggedRef.current = true;
        nodeDragRef.current = null;
      }
      dragRef.current.dragging = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const onWheel = useCallback(e => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.1 : 0.9;
    setTransform(p => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, p.scale * f));
      const k = newScale / p.scale;
      return { x: p.x * k, y: p.y * k, scale: newScale };
    });
  }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const handleNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation();
    nodeDragRef.current = { id: nodeId, lx: e.clientX, ly: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
  }, []);

  const handleNodeClick = useCallback((e, nodeId) => {
    e.stopPropagation();
    if (justDraggedRef.current) { justDraggedRef.current = false; return; } // was a drag, not a click
    const now = Date.now();
    const ref = clickRef.current;
    if (ref.target === nodeId && now - ref.time < 350) {
      // double-click: toggle trace
      if (traced === nodeId) {
        setTraced(null); setAncestry(null); setSelected(null);
      } else {
        setTraced(nodeId);
        setAncestry(computeAncestors(nodeId, RAW_EDGES));
        setSelected(nodeId);
      }
      clickRef.current = { time: 0, target: null };
    } else {
      if (traced) { setTraced(null); setAncestry(null); }
      setSelected(prev => prev === nodeId ? null : nodeId);
      clickRef.current = { time: now, target: nodeId };
    }
  }, [traced, RAW_EDGES]);

  const handleCanvasClick = useCallback(e => {
    if (e.target.closest && e.target.closest("[data-node]")) return;
    const now = Date.now();
    const ref = canvasClickRef.current;
    if (now - ref.time < 350) {
      setSelected(null); setTraced(null); setAncestry(null);
      canvasClickRef.current = { time: 0 };
    } else {
      canvasClickRef.current = { time: now };
    }
  }, []);

  // Tree filter: match a node by label, id, or statement (in the active language).
  const q = query.trim().toLowerCase();
  const matchNode = (n) => !q ||
    n.label.toLowerCase().includes(q) ||
    n.id.toLowerCase().includes(q) ||
    statementFor(n, lang).toLowerCase().includes(q);

  const togglePart = (pk) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(pk) ? next.delete(pk) : next.add(pk);
    return next;
  });

  // Fit a given position map within the viewport
  const fitView = useCallback((pmap) => {
    const pts = Object.values(pmap);
    if (!pts.length || typeof window === "undefined") return;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = (maxX - minX) + 400, h = (maxY - minY) + 400;
    const scale = Math.max(MIN_SCALE, Math.min(2, Math.min(window.innerWidth / w, window.innerHeight / h)));
    setTransform({ x: -((minX + maxX) / 2) * scale, y: -((minY + maxY) / 2) * scale, scale });
  }, []);

  // On first mount, frame the pre-selected proposition (V.P42) near the top of the
  // viewport at a legible zoom. The sequential layout puts V.P42 at the top of the
  // Part V band, so we anchor to its coordinates directly rather than fitting the whole
  // graph — a full fit would zoom out to ~7% to accommodate the tall Parts I–V stack.
  const didFit = useRef(false);
  useEffect(() => {
    if (didFit.current) return;
    didFit.current = true;
    if (typeof window === "undefined") return;
    const pmap = getPosMap(layoutModeRef.current, overridesRef.current);
    const focus = pmap[INITIAL_TRACE_ID];
    if (!focus) { fitView(pmap); return; }
    const scale = 0.65;
    // Screen(focus) = worldX + focus.x*scale = innerW/2  ⇒  transform.x = -focus.x*scale
    // Screen(focus) = worldY + focus.y*scale = innerH*0.18  ⇒  transform.y = innerH*0.18 - innerH/2 - focus.y*scale
    setTransform({
      x: -focus.x * scale,
      y: window.innerHeight * 0.18 - window.innerHeight / 2 - focus.y * scale,
      scale,
    });
  }, [fitView, getPosMap]);

  const switchLayout = useCallback((mode) => {
    setLayoutMode(mode);
    fitView(getPosMap(mode, overridesRef.current));
  }, [fitView, getPosMap]);

  // Center the view on a node and lock it as the selection
  const FOCUS_SCALE = 0.7;
  const focusNode = useCallback((node) => {
    setActivePart(prev => (prev && node.part !== prev ? null : prev));
    setTraced(null); setAncestry(null);
    setSelected(node.id);
    setHovered(null);
    const p = posMap[node.id];
    setTransform({ x: -p.x * FOCUS_SCALE, y: -p.y * FOCUS_SCALE, scale: FOCUS_SCALE });
  }, [posMap]);

  const TYPE_GLYPH = { prop:"○", coroll:"◇", def:"▢", axiom:"▭" };

  // One clickable entry in the contents tree
  const renderRow = (node, depth) => {
    const color = pc(node.part);
    const isSel = selected === node.id;
    const gloss = shortGloss(statementFor(node, lang));
    const bold = node.type === "def" || node.type === "axiom";
    return (
      <div key={node.id} onClick={() => focusNode(node)}
        onMouseEnter={() => setHovered(node.id)}
        onMouseLeave={() => setHovered(null)}
        style={{ display:"flex", alignItems:"flex-start", gap:7, cursor:"pointer",
          padding:"4px 8px 4px " + (10 + depth * 16) + "px",
          background: isSel ? t.tint : "transparent",
          borderLeft: isSel ? `2px solid ${color}` : "2px solid transparent" }}>
        <span style={{ color, fontSize:11, width:12, flexShrink:0, textAlign:"center", opacity:0.8, marginTop:1 }}>
          {TYPE_GLYPH[node.type]}
        </span>
        <span style={{ fontSize:11.5, lineHeight:1.4, flex:1, minWidth:0 }}>
          <span style={{ color, fontWeight: bold ? "bold" : 600 }}>{node.label}</span>
          {gloss && <span style={{ color: isSel ? t.textBright : t.t2 }}>{" — " + gloss}</span>}
        </span>
      </div>
    );
  };

  const worldX = transform.x + (typeof window !== "undefined" ? window.innerWidth : 1200) / 2;
  const worldY = transform.y + (typeof window !== "undefined" ? window.innerHeight : 800) / 2;

  // Info panel content
  const activeNode = selected ? nodeMap[selected] : hovered ? nodeMap[hovered] : null;

  return (
    <div style={{ width:"100%", height:"100vh", background:t.bg, position:"relative", overflow:"hidden",
      transition:"background 0.3s", fontFamily:"'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif" }}>

      {/* Grid */}
      <div style={{ position:"absolute", inset:0, opacity:t.gridOpacity, pointerEvents:"none",
        backgroundImage:`repeating-linear-gradient(0deg,${t.grid} 0px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,${t.grid} 0px,transparent 1px,transparent 48px)` }} />


      {/* Header */}
      <div style={{ position:"absolute", top:20, left:0, right:0, textAlign:"center", zIndex:10, pointerEvents:"none" }}>
        <div style={{ color:t.t3, fontSize:10, letterSpacing:6, textTransform:"uppercase", marginBottom:3 }}>{L.header_author}</div>
        <div style={{ color:t.textBright, fontSize:26, fontStyle:"italic", letterSpacing:1 }}>{L.header_title}</div>
        <div style={{ color:t.t5, fontSize:10, letterSpacing:4, textTransform:"uppercase", marginTop:3 }}>{L.header_sub}</div>
      </div>

      {/* Part filters */}
      <div style={{ position:"absolute", top:108, left:"50%", transform:"translateX(-50%)", display:"flex", gap:6, zIndex:10 }}>
        {[[L.all, null], ...Object.keys(PARTS).map(k => [k, k])].map(([label, val]) => {
          const color = val ? pc(val) : t.accent;
          const active = activePart === val;
          return (
            <button key={label} onClick={() => setActivePart(activePart === val && val !== null ? null : val)}
              style={{ borderRadius:2, cursor:"pointer", fontSize:10, letterSpacing:3, fontFamily:"inherit",
                padding:"4px 13px", background: active ? color : "transparent",
                color: active ? t.btnActiveText : color, border:`1px solid ${color}55`, transition:"all 0.2s" }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Contents tree — right-hand column. */}
      {!treeOpen ? (
        <button onClick={() => setTreeOpen(true)}
          style={{ position:"absolute", top:148, right:20, zIndex:20, padding:"7px 12px",
            background:t.panel, border:`1px solid ${t.border}`, borderRadius:3,
            color:t.accent, cursor:"pointer", fontSize:10, letterSpacing:3, fontFamily:"inherit",
            textTransform:"uppercase", backdropFilter:"blur(12px)" }}>
          ☰ {L.contents}
        </button>
      ) : (
        <div style={{ position:"absolute", top:148, right:20, bottom:64, width:288, zIndex:20,
          display:"flex", flexDirection:"column", background:t.panel,
          border:`1px solid ${t.border}`, borderRadius:3, backdropFilter:"blur(12px)", overflow:"hidden" }}>

          {/* Header — the collapse arrow points right (‹ would suggest collapsing to the
              left, which no longer matches this panel's docked side). */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"10px 12px", borderBottom:`1px solid ${t.divider}` }}>
            <span style={{ color:t.t3, fontSize:10, letterSpacing:3, textTransform:"uppercase" }}>{L.contents}</span>
            <button onClick={() => setTreeOpen(false)} style={{ background:"none", border:"none",
              color:t.t4, cursor:"pointer", fontSize:14, fontFamily:"inherit", lineHeight:1, padding:0 }}>›</button>
          </div>

          {/* Filter */}
          <div style={{ position:"relative", padding:"8px 10px", borderBottom:`1px solid ${t.divider}` }}>
            <span style={{ position:"absolute", left:19, top:"50%", transform:"translateY(-50%)",
              color:t.t4, fontSize:12, pointerEvents:"none" }}>⌕</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape") setQuery(""); }}
              placeholder={L.filter}
              style={{ width:"100%", boxSizing:"border-box", padding:"6px 24px 6px 26px",
                background:t.inputBg, border:`1px solid ${query?t.accentSoft:t.border}`,
                borderRadius:2, color:t.textBright, fontSize:11.5, fontFamily:"inherit", outline:"none" }}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{ position:"absolute", right:18, top:"50%",
                transform:"translateY(-50%)", background:"none", border:"none", color:t.t4,
                cursor:"pointer", fontSize:13, fontFamily:"inherit", lineHeight:1, padding:2 }}>×</button>
            )}
          </div>

          {/* Tree body */}
          <div style={{ overflowY:"auto", flex:1, padding:"4px 0" }}>
            {(() => {
              let anyMatch = false;
              const subHead = (label) => (
                <div style={{ color:t.t6, fontSize:9, letterSpacing:2, textTransform:"uppercase",
                  padding:"4px 0 2px 28px" }}>{label}</div>
              );
              const body = CONTENTS.map(({ pk, foundations, emotionDefs, props, byProp, orphanCorolls }) => {
                const part = L.parts[pk];
                const partColor = pc(pk);
                const isOpen = !!q || expanded.has(pk);

                const fnd = foundations.filter(matchNode);
                const emo = emotionDefs.filter(matchNode);
                const orph = orphanCorolls.filter(matchNode);
                const propGroups = props
                  .map(p => {
                    const cs = byProp[p.id] || [];
                    const propHit = matchNode(p);
                    const corHits = cs.filter(matchNode);
                    if (q && !propHit && corHits.length === 0) return null;
                    return { prop: p, corolls: q ? (propHit ? cs : corHits) : cs };
                  })
                  .filter(Boolean);

                const partHasMatch = !q ||
                  fnd.length || emo.length || orph.length || propGroups.length;
                if (q && !partHasMatch) return null;
                anyMatch = true;

                return (
                  <div key={pk}>
                    <div onClick={() => togglePart(pk)}
                      style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer",
                        padding:"6px 10px", marginTop:2 }}>
                      <span style={{ color:partColor, fontSize:9, width:9, transition:"transform 0.15s",
                        transform: isOpen ? "rotate(90deg)" : "none" }}>▶</span>
                      <span style={{ width:7, height:7, borderRadius:"50%", background:partColor, flexShrink:0 }}/>
                      <span style={{ color:partColor, fontSize:11, letterSpacing:1, fontWeight:"bold" }}>{part.label}</span>
                      <span style={{ color:t.t5, fontSize:9.5, fontStyle:"italic", overflow:"hidden",
                        textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{part.subtitle}</span>
                    </div>
                    {isOpen && (
                      <div style={{ paddingBottom:4 }}>
                        {fnd.length > 0 && subHead(L.sub_defs)}
                        {fnd.map(n => renderRow(n, 1))}
                        {propGroups.length > 0 && subHead(L.sub_props)}
                        {propGroups.map(({ prop, corolls }) => (
                          <div key={prop.id}>
                            {renderRow(prop, 1)}
                            {corolls.map(c => renderRow(c, 2))}
                          </div>
                        ))}
                        {orph.map(c => renderRow(c, 1))}
                        {emo.length > 0 && subHead(L.sub_emotions)}
                        {emo.map(n => renderRow(n, 1))}
                      </div>
                    )}
                  </div>
                );
              });
              if (q && !anyMatch) {
                return <div style={{ padding:"12px 14px", color:t.t5, fontSize:11, fontStyle:"italic" }}>{L.no_matches}</div>;
              }
              return body;
            })()}
          </div>
        </div>
      )}

      {/* SVG canvas */}
      <svg ref={svgRef} style={{ width:"100%", height:"100%", cursor:"grab" }}
        onMouseDown={onMouseDown} onClick={handleCanvasClick}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {Object.keys(PARTS).map(k => (
            <marker key={k} id={`arr-${k}`} markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3z" fill={pc(k)} opacity="0.6"/>
            </marker>
          ))}
          <marker id="arr-dim" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L7,3z" fill={t.arrowDim}/>
          </marker>
        </defs>
        <g transform={`translate(${worldX},${worldY}) scale(${transform.scale})`}>
          {/* Edges */}
          <g>
            {visEdges.map(([a, b], i) => {
              const na = nodeMap[a], nb = nodeMap[b];
              if (!na || !nb) return null;
              let stroke, sw, opacity, marker;
              if (inTraceMode) {
                const isAnc = ancestry.edgeSet.has(a + "->" + b);
                const isDirect = isAnc && b === traced;
                stroke = pc(na.part);
                sw = isDirect ? 2.2 : isAnc ? 1.2 : (showAll ? 0.9 : 0.4);
                opacity = isDirect ? 1 : isAnc ? 0.7 : (showAll ? 0.6 : 0.18);
                marker = `url(#arr-${na.part})`;
              } else {
                const isHi = highlighted && (a===highlighted||b===highlighted);
                const isDim = dimEnabled && highlighted && !isHi;
                stroke = pc(na.part);
                sw = isHi ? 1.5 : (showAll ? 1.0 : 0.6);
                opacity = isDim ? 0.12 : isHi ? 0.85 : (showAll ? 0.72 : 0.28);
                marker = `url(#arr-${na.part})`;
              }
              const rA = getRadius(na.type), rB = getRadius(nb.type);
              const pa = posMap[a], pb = posMap[b];
              const dx=pb.x-pa.x, dy=pb.y-pa.y, len=Math.sqrt(dx*dx+dy*dy)||1;
              const x1=pa.x+(dx/len)*rA, y1=pa.y+(dy/len)*rA;
              const x2=pb.x-(dx/len)*(rB+6), y2=pb.y-(dy/len)*(rB+6);
              const cx=(x1+x2)/2-(dy/len)*25, cy=(y1+y2)/2+(dx/len)*25;
              return (
                <path key={i} d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`}
                  stroke={stroke} strokeWidth={sw} fill="none" opacity={opacity} markerEnd={marker}/>
              );
            })}
          </g>
          {/* Nodes */}
          <g>
            {visNodes.map(node => {
              const color = pc(node.part);
              let isActive, isDim, isAncestor, isTarget;
              if (inTraceMode) {
                isTarget = node.id === traced;
                isAncestor = ancestry.nodeSet.has(node.id) && !isTarget;
                isActive = isTarget;
                isDim = dimEnabled && !ancestry.nodeSet.has(node.id);
              } else {
                isActive = selected===node.id || hovered===node.id;
                isDim = !!(dimEnabled && highlighted && !connectedIds?.has(node.id) && highlighted!==node.id);
                isAncestor = false; isTarget = false;
              }
              const p = posMap[node.id];
              return (
                <g key={node.id} transform={`translate(${p.x},${p.y})`}
                  style={{ cursor:"grab" }} data-node="1"
                  onMouseDown={e => handleNodeMouseDown(e, node.id)}
                  onClick={e => handleNodeClick(e, node.id)}
                  onMouseEnter={() => { if (!inTraceMode && !nodeDragRef.current) setHovered(node.id); }}
                  onMouseLeave={() => { if (!inTraceMode && !nodeDragRef.current) setHovered(null); }}>
                  {(isActive || isAncestor) && (
                    <circle r={getRadius(node.type)+7} fill={isTarget?t.glow:color} opacity={isTarget?0.18:0.08}/>
                  )}
                  {isTarget && (
                    <circle r={getRadius(node.type)+12} fill="none" stroke={color}
                      strokeWidth={1} opacity={0.5} strokeDasharray="4,3"/>
                  )}
                  <NodeShape type={node.type} color={color} active={isActive||isAncestor} dim={isDim} t={t}/>
                  <text textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents:"none",
                    fontSize: node.type==="coroll"?"7px":(node.type==="def"||node.type==="axiom")?"7px":"8px",
                    fontFamily:"'Palatino Linotype',Palatino,serif",
                    fontWeight: (node.type==="def"||node.type==="axiom")?"bold":"normal",
                    fill: isDim?t.nodeTextDim:(isActive||isAncestor)?t.nodeTextActive:color }}>
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Info panel — anchored top-left below the header. The maxHeight leaves a strip
          of clearance for the horizontal control bar at the bottom of the viewport. */}
      <div style={{ position:"absolute", top:148, left:20, width:288, maxHeight:"calc(100vh - 240px)", zIndex:10,
        background:t.panel, border:`1px solid ${activeNode?pc(activeNode.part)+"55":t.border}`,
        borderRadius:3, padding:20, backdropFilter:"blur(12px)", transition:"border-color 0.3s",
        overflowY:"auto" }}>
        {activeNode ? (
          <>
            <div style={{ color:pc(activeNode.part), fontSize:9, letterSpacing:4, textTransform:"uppercase", marginBottom:7 }}>
              {L.parts[activeNode.part].label} · {L.kind[activeNode.type]}
            </div>
            <div style={{ color:t.textBright, fontSize:15, fontStyle:"italic", marginBottom:10, lineHeight:1.4 }}>
              {activeNode.label}
            </div>
            <div style={{ color:t.t2, fontSize:11.5, lineHeight:1.75, maxHeight:132, overflowY:"auto", paddingRight:6 }}>{statementFor(activeNode, lang)}</div>
            {proofFor(activeNode, lang) && (
              <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid ${t.divider}` }}>
                <div style={{ color:t.textGold, fontSize:9, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>{L.proof}</div>
                <div style={{ color:t.t3, fontSize:11, lineHeight:1.7, fontStyle:"italic", maxHeight:150, overflowY:"auto", paddingRight:6 }}>{proofFor(activeNode, lang)}</div>
              </div>
            )}
            {traced === activeNode.id ? (
              <div style={{ marginTop:12, padding:"8px 10px", background:t.tintSoft,
                borderLeft:`2px solid ${pc(activeNode.part)}66`, borderRadius:2 }}>
                <div style={{ color:pc(activeNode.part), fontSize:9, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>{L.ancestry}</div>
                <div style={{ color:t.t2, fontSize:11, lineHeight:1.7 }}>
                  <b style={{ color:t.textGold }}>{ancestry.nodeSet.size - 1}</b> {L.ancestry_line(ancestry.nodeSet.size - 1, L.kind[activeNode.type])}<br/>
                  <span style={{ color:t.t5 }}>{L.ancestry_reclick}</span>
                </div>
              </div>
            ) : (
              <div style={{ marginTop:10, color:t.t7, fontSize:10, letterSpacing:1 }}>{L.hint_trace}</div>
            )}
          </>
        ) : (
          <>
            <div style={{ color:t.t7, fontSize:9, letterSpacing:3, textTransform:"uppercase", marginBottom:8 }}>{L.navigate}</div>
            <div style={{ color:t.t7, fontSize:11, lineHeight:1.9 }}>
              {L.nav_hover}<br/>
              {L.nav_click}<br/>
              <b style={{ color:t.t4 }}>{L.nav_double_click}</b><br/>
              {L.nav_scroll}<br/>
              {L.nav_filter}
            </div>
            <div style={{ marginTop:14, borderTop:`1px solid ${t.divider}`, paddingTop:14, display:"flex", flexDirection:"column", gap:6 }}>
              {Object.keys(PARTS).map(k => (
                <div key={k} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:pc(k) }}/>
                  <span style={{ color:pc(k), fontSize:10 }}>{L.parts[k].label}:</span>
                  <span style={{ color:t.t6, fontSize:10, fontStyle:"italic" }}>{L.parts[k].subtitle}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:12, borderTop:`1px solid ${t.divider}`, paddingTop:12, color:t.t7, fontSize:10, lineHeight:1.8 }}>
              {L.legend}
            </div>
            <div style={{ marginTop:10, color:t.t7, fontSize:9.5, fontStyle:"italic", lineHeight:1.6 }}>
              {L.stats(RAW_NODES.length, RAW_EDGES.length)}
            </div>
          </>
        )}
      </div>

      {/* Single-row control bar along the bottom edge. Everything the user can adjust
          about the view lives here: layout picker (dropdown), theme, language, dimming
          toggle, zoom slider, and the fit/reset actions. The reload-ethics.json control
          is deliberately hidden — it's a developer affordance and not needed at runtime.
          The bar itself sits above the SVG (zIndex 30) but does not block the canvas. */}
      {(() => {
        const zoomBtn = (fontSize) => ({ width:26, height:26, background:t.panelSolid,
          border:`1px solid ${t.border}`, borderRadius:2, color:t.accent, cursor:"pointer", flexShrink:0,
          fontSize, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center" });
        const seg = (val, active, onClick, lbl, key) => (
          <button key={key ?? val} onClick={onClick}
            style={{ padding:"3px 9px", fontSize:10, letterSpacing:1, fontFamily:"inherit", cursor:"pointer",
              border:"none", background: active ? t.accent : "transparent",
              color: active ? t.btnActiveText : t.t2 }}>{lbl}</button>
        );
        const groupBox = { display:"flex", border:`1px solid ${t.border}`, borderRadius:3, overflow:"hidden" };
        const divider  = { width:1, height:22, background:t.divider, margin:"0 4px" };
        return (
          <div style={{ position:"absolute", bottom:16, left:"50%", transform:"translateX(-50%)", zIndex:30,
            display:"flex", alignItems:"center", gap:10, padding:"7px 12px", maxWidth:"calc(100vw - 40px)",
            background:t.panel, border:`1px solid ${t.border}`, borderRadius:7, backdropFilter:"blur(12px)",
            fontFamily:"inherit" }}>

            {/* Layout picker — a compact <select> keeps three modes in one field instead
                of a three-tall button column. */}
            <label style={{ display:"flex", alignItems:"center", gap:6, color:t.t2, fontSize:10, letterSpacing:1 }}>
              <span style={{ textTransform:"uppercase", letterSpacing:2, color:t.t3 }}>{L.layout}</span>
              <select value={layoutMode} onChange={e => switchLayout(e.target.value)}
                style={{ padding:"3px 6px", fontFamily:"inherit", fontSize:11, color:t.textBright,
                  background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:3, cursor:"pointer" }}>
                {["force","sequential","physical"].map(mode => (
                  <option key={mode} value={mode}>{L.layout_modes[mode].label}</option>
                ))}
              </select>
            </label>

            <div style={divider}/>

            {/* Theme */}
            <div style={groupBox} title={L.theme}>
              {[["dark", L.theme_dark],["light", L.theme_light]].map(([v, lbl]) =>
                seg(v, theme===v, () => setTheme(v), lbl))}
            </div>

            {/* Language */}
            <div style={groupBox} title={L.language}>
              {[["en","EN"],["es","ES"]].map(([v, lbl]) =>
                seg(v, lang===v, () => setLang(v), lbl))}
            </div>

            {/* Show-all / dimming */}
            <button onClick={() => setShowAll(s => !s)} title={L.show_all_title}
              style={{ display:"flex", alignItems:"center", gap:6, background:"transparent",
                border:`1px solid ${t.border}`, borderRadius:3, padding:"3px 8px", cursor:"pointer",
                fontFamily:"inherit", color:t.t2, fontSize:10, letterSpacing:1 }}>
              <span>{L.show_all}</span>
              <span style={{ position:"relative", width:28, height:14, borderRadius:7, flexShrink:0,
                border:`1px solid ${t.border}`, background: showAll ? t.accent : "transparent" }}>
                <span style={{ position:"absolute", top:1, left: showAll ? 14 : 1, width:10, height:10,
                  borderRadius:"50%", background: showAll ? t.btnActiveText : t.t3, transition:"left 0.2s" }}/>
              </span>
            </button>

            <div style={divider}/>

            {/* Zoom */}
            <button onClick={() => setTransform(p => {
                const s = Math.max(MIN_SCALE, p.scale*0.8); const k = s/p.scale;
                return { x:p.x*k, y:p.y*k, scale:s };
              })}
              title={L.zoom_out} style={zoomBtn(16)}>−</button>
            <input type="range" min={0} max={1000} step={1} value={scaleToSlider(transform.scale)}
              onChange={e => setTransform(p => {
                const s = sliderToScale(+e.target.value); const k = s/p.scale;
                return { x:p.x*k, y:p.y*k, scale:s };
              })}
              aria-label={L.zoom_level}
              style={{ width:160, cursor:"pointer", accentColor:t.accent }} />
            <button onClick={() => setTransform(p => {
                const s = Math.min(MAX_SCALE, p.scale*1.2); const k = s/p.scale;
                return { x:p.x*k, y:p.y*k, scale:s };
              })}
              title={L.zoom_in} style={zoomBtn(16)}>＋</button>
            <span style={{ color:t.t2, fontSize:10.5, width:40, textAlign:"center",
              fontVariantNumeric:"tabular-nums" }}>{Math.round(transform.scale*100)}%</span>

            <div style={divider}/>

            <button onClick={() => fitView(posMap)} title={L.fit_view} style={zoomBtn(14)}>⤢</button>
            <button onClick={() => setOverrides(prev => ({ ...prev, [layoutMode]: {} }))}
              title={L.reset_positions} style={zoomBtn(14)}>↺</button>
          </div>
        );
      })()}
    </div>
  );
}
