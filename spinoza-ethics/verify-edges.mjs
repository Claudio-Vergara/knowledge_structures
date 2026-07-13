#!/usr/bin/env node
// verify-edges.mjs
// ----------------------------------------------------------------------------
// Ground-truth verifier for the logical dependency graph in src/SpinozaEthics.jsx.
//
// ROOT CAUSE this script addresses:
//   RAW_EDGES in SpinozaEthics.jsx was authored by hand (not derived from the
//   text), so it contains fabricated dependencies, omits real citations, and
//   leaves some nodes orphaned or isolated. Spinoza, however, cites every
//   dependency explicitly inside each "Proof.—..." block. This script parses
//   Spinoza_Ethics.txt, extracts those citations, resolves them to graph node
//   ids, and diffs the result against RAW_EDGES.
//
// USAGE:
//   node verify-edges.mjs                 full verification report
//   node verify-edges.mjs --debug III.P11 show citation extraction for one node
//   node verify-edges.mjs --json out.json write text-derived edges to JSON
// ----------------------------------------------------------------------------

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const JSX_PATH = join(ROOT, "src", "SpinozaEthics.jsx");
const TXT_PATH = join(ROOT, "Spinoza_Ethics.txt");

// ── roman / arabic numeral parsing ─────────────────────────────────────────
const ROMAN_MAP = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
function numToInt(tok) {
  tok = tok.trim().toLowerCase().replace(/\.$/, "");
  if (/^\d+$/.test(tok)) return parseInt(tok, 10);
  if (!/^[ivxlcdm]+$/.test(tok)) return null;
  let total = 0;
  for (let k = 0; k < tok.length; k++) {
    const cur = ROMAN_MAP[tok[k]];
    const nxt = ROMAN_MAP[tok[k + 1]] || 0;
    total += cur < nxt ? -cur : cur;
  }
  return total;
}
// split "iii. and v" / "i., ii." / "xvii., xviii" into [3,5] etc.
function numList(s) {
  if (!s) return [];
  return s
    .split(/[.,]|\band\b/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map(numToInt)
    .filter((n) => n != null);
}

// ── parse RAW_NODES + RAW_EDGES out of the JSX ──────────────────────────────
function loadGraph() {
  const src = readFileSync(JSX_PATH, "utf8");

  const nodeIds = [...src.matchAll(/\{\s*id:"([^"]+)"/g)].map((m) => m[1]);
  const nodeSet = new Set(nodeIds);

  const edgesBlock = src.slice(
    src.indexOf("const RAW_EDGES"),
    src.indexOf("];", src.indexOf("const RAW_EDGES")),
  );
  const edges = [...edgesBlock.matchAll(/\["([^"]+)"\s*,\s*"([^"]+)"\]/g)].map(
    (m) => [m[1], m[2]],
  );
  return { nodeIds, nodeSet, edges };
}

// ── resolve a canonical citation to a graph node id ─────────────────────────
// ref shape: { part:'I', kind:'P'|'Def'|'Ax'|'App'|'Pref', num, coroll }
//   coroll: null | 'generic' | <int index 1..3>
function resolveNodeId(ref, nodeSet) {
  const { part, kind } = ref;
  if (kind === "Def") return cand(`${part}.Def`);
  if (kind === "Ax") return cand(`${part}.Ax`);
  if (kind === "App") return cand(`${part}.App`);
  if (kind === "Pref") return cand(`${part}.Pref`);

  // proposition (possibly with corollary)
  const base = `${part}.P${ref.num}`;
  if (ref.coroll != null) {
    const suffixes =
      ref.coroll === "generic"
        ? ["", "a"] // generic corollary → single C-node, else first
        : ["abc"[ref.coroll - 1] || "", ""]; // Coroll. i/ii/iii → a/b/c, else single C-node
    for (const sfx of suffixes) {
      const id = `${part}.C${ref.num}${sfx}`;
      if (nodeSet.has(id)) return id;
    }
    // corollary not modelled as its own node → fall back to base proposition
    return cand(base);
  }
  return cand(base);

  function cand(id) {
    return nodeSet.has(id) ? id : null;
  }
}

// ── citation extraction from a block of proof text ──────────────────────────
// Returns array of canonical refs. `curPart` is the Part the block lives in
// (used as the default part for un-prefixed "Prop./Def./Ax." citations).
// `curProp` is the proposition number being proved (for "foregoing Prop." etc).
function extractRefs(text, curPart, curProp) {
  const refs = [];
  const ROMAN = "(?:\\d+|[ivxlcdm]+)";
  const LIST = `${ROMAN}(?:\\s*[.,]\\s*(?:and\\s+)?${ROMAN})*`;

  // -- Pass A: dialect C, part-prefixed compact refs ("II. vii.", "I. xxiv.
  //    Coroll.", "III. Def. ii.", "I. 36"). Matched spans are blanked so the
  //    keyword pass (B) does not double-count the same numbers.
  const passA = new RegExp(
    `\\b(I|II|III|IV|V)\\.\\s+` + // 1: part
      `(Deff?\\.|Ax\\.|Axioms?\\b)?\\s*` + // 2: optional Def/Ax marker
      `(${LIST})` + // 3: item list (props or def/ax numbers)
      `\\.?\\s*` +
      `(Coroll(?:ary)?\\.?|Corolls?\\.?|notes?\\.?|Schol\\w*\\.?)?`, // 4: trailing
    "g",
  );
  let blanked = text;
  blanked = blanked.replace(passA, (m, part, defax, list, trailing, off) => {
    pushClause({ explicitPart: part, defax, list, trailing });
    return " ".repeat(m.length);
  });

  // -- Pass B: dialect A/B keyword refs ("Prop. vii.", "Deff. iii. and v.",
  //    "Ax. i.", "Part i., Prop. xxv., Coroll.", "Prop. xiv., Coroll. i.").
  const passB = new RegExp(
    `(?:(?:Pt\\.|Part)\\s+([ivxlcdm]+)\\b[.,\\s]*)?` + // 1: leading Part (sep may be ".," etc.)
      `(Props?\\.|Deff?\\.|Ax\\.|Axioms?|Coroll(?:ary)?\\.?|Corolls?\\.?)\\s*` + // 2: keyword
      `(${LIST})?` + // 3: item list
      `\\.?` +
      `(?:\\s*,?\\s*(Coroll(?:ary)?\\.?|Corolls?\\.?|[Nn]otes?\\.?)\\s*(${LIST})?)?` + // 4,5: trailing coroll/note
      `(?:\\s*,?\\s*(?:Pt\\.|Part)\\s+([ivxlcdm]+))?`, // 6: trailing Part
    "g", // case-sensitive: roman numerals are lowercase; matching "i" would eat capitals in words
  );
  for (const m of blanked.matchAll(passB)) {
    const leadPart = m[1];
    const kw = m[2].toLowerCase();
    const list = m[3];
    const trailingKw = (m[4] || "").toLowerCase();
    const trailingList = m[5];
    const trailPart = m[6];
    const explicitPart = leadPart || trailPart;

    if (/^def|^deff/.test(kw)) {
      addRef({ explicitPart, kind: "Def" });
    } else if (/^ax/.test(kw)) {
      addRef({ explicitPart, kind: "Ax" });
    } else if (/^coroll|^corolls/.test(kw)) {
      // bare "Coroll." with no proposition — too contextual to resolve.
      // (handled only when attached to a Prop below)
    } else {
      // proposition keyword
      const nums = numList(list);
      const corollIdxs = trailingKw.startsWith("coroll")
        ? numList(trailingList)
        : [];
      const isCoroll = trailingKw.startsWith("coroll");
      for (const n of nums) {
        if (isCoroll) {
          if (corollIdxs.length) {
            for (const ci of corollIdxs)
              addRef({ explicitPart, kind: "P", num: n, coroll: ci });
          } else {
            addRef({ explicitPart, kind: "P", num: n, coroll: "generic" });
          }
        } else {
          addRef({ explicitPart, kind: "P", num: n });
        }
      }
    }
  }

  // -- Pass C: "Coroll. Prop. vi" (corollary OF a proposition) --------------
  for (const m of text.matchAll(
    /Coroll(?:ary)?\.?\s+(?:of\s+)?Prop\.?\s+([ivxlcdm]+)/gi,
  )) {
    addRef({ kind: "P", num: numToInt(m[1]), coroll: "generic" });
  }

  // -- Pass D: relative references ("by the last Prop.", "foregoing Prop.") --
  if (curProp) {
    for (const _ of text.matchAll(
      /\b(last|foregoing|preceding)\s+Prop(?:osition)?\b/gi,
    )) {
      addRef({ explicitPart: curPart, kind: "P", num: curProp - 1 });
    }
    if (/first\s+Prop(?:osition)?\.?\s+of\s+this\s+part/i.test(text)) {
      addRef({ explicitPart: curPart, kind: "P", num: 1 });
    }
  }

  // -- Pass E: natural-language axiom references ("the third axiom",
  //    "the axiom of this part", "by the axiom") -> the current part's axioms.
  if (
    /\b(?:the\s+(?:first|second|third|fourth|fifth|sixth|seventh|last|preceding|foregoing)\s+axiom|axiom\s+of\s+this\s+part|by\s+the\s+axiom)\b/i.test(
      text,
    )
  ) {
    addRef({ explicitPart: curPart, kind: "Ax" });
  }

  return refs;

  function pushClause({ explicitPart, defax, list, trailing }) {
    if (defax && /^def/i.test(defax)) {
      addRef({ explicitPart, kind: "Def" });
      return;
    }
    if (defax && /^ax/i.test(defax)) {
      addRef({ explicitPart, kind: "Ax" });
      return;
    }
    const t = (trailing || "").toLowerCase();
    const isCoroll = t.startsWith("coroll");
    for (const n of numList(list)) {
      if (isCoroll) addRef({ explicitPart, kind: "P", num: n, coroll: "generic" });
      else addRef({ explicitPart, kind: "P", num: n });
    }
  }

  function addRef({ explicitPart, kind, num, coroll = null }) {
    const part = explicitPart ? explicitPart.toUpperCase() : curPart;
    if (kind === "P" && (num == null || num < 1)) return;
    refs.push({ part, kind, num, coroll });
  }
}

// ── parse the source text into demonstrable units + their citations ─────────
const PART_KEYS = ["I", "II", "III", "IV", "V"];

function parseText() {
  let txt = readFileSync(TXT_PATH, "latin1");
  txt = txt.replace(/\r\n/g, "\n");

  // Locate the 5 Part headers (header lines, not the table-of-contents row).
  const partHeader = /^PART\s+(I|II|III|IV|V)[.:]/gm;
  const heads = [...txt.matchAll(partHeader)];
  if (heads.length !== 5) {
    console.error(`Expected 5 Part headers, found ${heads.length}`);
  }
  const parts = [];
  for (let i = 0; i < heads.length; i++) {
    const key = heads[i][1];
    const start = heads[i].index;
    const end = i + 1 < heads.length ? heads[i + 1].index : txt.length;
    parts.push({ key, body: txt.slice(start, end) });
  }

  // For each part, walk its proposition blocks and pull citations.
  const units = []; // { node, part, propNum, kind:'prop'|'coroll', refs:[], rawCites:[] }
  for (const { key, body } of parts) {
    const propRe = /^PROP\.\s+([IVXLCDM]+)\.\s*/gim;
    const marks = [...body.matchAll(propRe)];
    for (let i = 0; i < marks.length; i++) {
      const propNum = numToInt(marks[i][1]);
      const blockStart = marks[i].index;
      const blockEnd =
        i + 1 < marks.length ? marks[i + 1].index : body.length;
      const block = body.slice(blockStart, blockEnd);

      // Split the block into paragraphs (blank-line separated).
      const paras = block.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

      // Accumulators: main proposition + each corollary.
      const propRefs = [];
      const corollUnits = []; // { idx, refs:[] }
      let target = "prop"; // 'prop' | corollIndex | 'skip'
      let corollCount = 0;

      paras.forEach((para, pi) => {
        const lead = para.slice(0, 40);
        if (pi === 0) {
          // proposition statement — may carry an inline citation, e.g.
          // "PROP. IX. ... (Def. iv.)."
          target = "prop";
          collect(para, propRefs);
          return;
        }
        if (/^(Corollary|Coroll\.)/i.test(lead)) {
          corollCount += 1;
          corollUnits.push({ idx: corollCount, refs: [] });
          target = corollCount;
          collect(para, corollUnits[corollUnits.length - 1].refs);
          return;
        }
        if (/^(Note|Scholium|Explanation|Lemma|Postulate|Definition|Axiom)/i.test(lead)) {
          target = "skip"; // commentary / nested apparatus — not a dependency
          return;
        }
        if (/^(Proof|Another proof|Demonstrat)/i.test(lead)) {
          if (target === "prop") collect(para, propRefs);
          else if (typeof target === "number")
            collect(para, corollUnits.find((c) => c.idx === target).refs);
          else collect(para, propRefs); // proof after a note → attribute to prop
          return;
        }
        // continuation paragraph: only fold in if we're mid-proof of a unit
        if (target === "prop") collect(para, propRefs);
        else if (typeof target === "number")
          collect(para, corollUnits.find((c) => c.idx === target).refs);
      });

      const propNode = `${key}.P${propNum}`;
      units.push({
        node: propNode,
        part: key,
        propNum,
        kind: "prop",
        refs: propRefs,
      });
      for (const cu of corollUnits) {
        units.push({
          node: null, // resolved later against nodeSet
          part: key,
          propNum,
          corollIdx: cu.idx,
          kind: "coroll",
          refs: cu.refs,
        });
      }

      function collect(para, sink) {
        sink.push(...extractRefs(para, key, propNum));
      }
    }
  }
  return units;
}

// ── main ────────────────────────────────────────────────────────────────────
function build() {
  const { nodeIds, nodeSet, edges } = loadGraph();
  const units = parseText();

  // text-derived directed edges (src -> tgt), both endpoints must be graph nodes
  const textEdges = new Set();
  const textEdgesByTgt = new Map(); // tgt -> Set(src)
  const unresolvedByTgt = new Map(); // tgt -> [refs not in graph]

  for (const u of units) {
    // resolve this unit's own target node id
    let tgt;
    if (u.kind === "prop") tgt = nodeSet.has(u.node) ? u.node : null;
    else
      tgt = resolveNodeId(
        { part: u.part, kind: "P", num: u.propNum, coroll: u.corollIdx },
        nodeSet,
      );
    if (!tgt) continue; // unit isn't represented in the curated graph

    for (const ref of u.refs) {
      const src = resolveNodeId(ref, nodeSet);
      if (!src) {
        if (!unresolvedByTgt.has(tgt)) unresolvedByTgt.set(tgt, []);
        unresolvedByTgt.get(tgt).push(ref);
        continue;
      }
      if (src === tgt) continue; // self reference (e.g. "this proposition")
      textEdges.add(`${src}|${tgt}`);
      if (!textEdgesByTgt.has(tgt)) textEdgesByTgt.set(tgt, new Set());
      textEdgesByTgt.get(tgt).add(src);
    }
  }

  // Structural dependency: every corollary necessarily depends on its parent
  // proposition (Spinoza states it under the proposition, not as a citation).
  // Inject these so all downstream comparisons treat the prop->corollary link
  // as legitimate rather than fabricated/missing.
  for (const id of nodeSet) {
    const m = /^(\w+)\.C(\d+)[a-c]?$/.exec(id);
    if (!m) continue;
    const parent = `${m[1]}.P${m[2]}`;
    if (!nodeSet.has(parent)) continue;
    textEdges.add(`${parent}|${id}`);
    if (!textEdgesByTgt.has(id)) textEdgesByTgt.set(id, new Set());
    textEdgesByTgt.get(id).add(parent);
  }

  const graphEdges = new Set(edges.map(([a, b]) => `${a}|${b}`));
  return {
    nodeIds,
    nodeSet,
    edges,
    graphEdges,
    units,
    textEdges,
    textEdgesByTgt,
    unresolvedByTgt,
  };
}

function refStr(r) {
  if (r.kind === "P")
    return `${r.part}.${r.num}${r.coroll ? `c${r.coroll === "generic" ? "" : r.coroll}` : ""}`;
  return `${r.part}.${r.kind}`;
}

function report() {
  const g = build();
  const { nodeSet, edges, graphEdges, textEdges, textEdgesByTgt } = g;

  const incoming = new Map();
  const outgoing = new Map();
  for (const id of nodeSet) {
    incoming.set(id, 0);
    outgoing.set(id, 0);
  }
  for (const [a, b] of edges) {
    outgoing.set(a, (outgoing.get(a) || 0) + 1);
    incoming.set(b, (incoming.get(b) || 0) + 1);
  }

  const line = "─".repeat(78);
  console.log(line);
  console.log("SPINOZA ETHICS — DEPENDENCY GRAPH VERIFICATION");
  console.log(line);
  console.log(`Graph nodes: ${nodeSet.size}   Graph edges: ${edges.length}`);
  console.log(`Text-derived edges (both endpoints in graph): ${textEdges.size}`);

  // 1. self-loops
  const selfLoops = edges.filter(([a, b]) => a === b);
  console.log(`\n[1] SELF-LOOPS in graph (always bugs): ${selfLoops.length}`);
  selfLoops.forEach(([a]) => console.log(`    ${a} -> ${a}`));

  // 2. isolated nodes (no edges at all)
  const isolated = [...nodeSet].filter(
    (id) => incoming.get(id) === 0 && outgoing.get(id) === 0,
  );
  console.log(`\n[2] ISOLATED nodes (no edges at all): ${isolated.length}`);
  isolated.forEach((id) =>
    console.log(
      `    ${id}   (text cites: ${
        textEdgesByTgt.has(id)
          ? [...textEdgesByTgt.get(id)].join(", ")
          : "— none resolved —"
      })`,
    ),
  );

  // 3. proposition/corollary nodes with NO incoming edges that the text says
  //    should have predecessors
  const isPrimitive = (id) => /\.(Def|Ax|Pref)$/.test(id);
  const orphans = [...nodeSet].filter(
    (id) =>
      !isPrimitive(id) &&
      incoming.get(id) === 0 &&
      textEdgesByTgt.has(id) &&
      textEdgesByTgt.get(id).size > 0,
  );
  console.log(
    `\n[3] ORPHAN nodes (0 incoming edges, but text cites predecessors): ${orphans.length}`,
  );
  orphans.forEach((id) =>
    console.log(`    ${id}  <- should depend on: ${[...textEdgesByTgt.get(id)].join(", ")}`),
  );

  // a proposition legitimately links to its OWN corollaries; those edges are
  // structural (the corollary inherits the prop) and are never spelled out as
  // a numbered citation, so don't count them as spurious.
  const structuralCoroll = (a, b) => {
    const m = /^([IV]+)\.P(\d+)$/.exec(a);
    if (!m) return false;
    return new RegExp(`^${m[1]}\\.C${m[2]}[a-c]?$`).test(b);
  };

  // graph predecessor sets, for the per-target comparison below
  const graphPredsOf = new Map();
  for (const [a, b] of edges) {
    if (a === b) continue;
    if (!graphPredsOf.has(b)) graphPredsOf.set(b, new Set());
    graphPredsOf.get(b).add(a);
  }

  // 4. spurious edges: in graph, no textual basis
  const spurious = edges.filter(
    ([a, b]) =>
      a !== b && !textEdges.has(`${a}|${b}`) && !structuralCoroll(a, b),
  );
  // 5. missing edges: text says so, graph lacks it
  const missing = [...textEdges]
    .map((k) => k.split("|"))
    .filter(([a, b]) => !graphEdges.has(`${a}|${b}`));

  console.log(
    `\n[4] SPURIOUS edges (in graph, no citation in text): ${spurious.length}`,
  );
  console.log(
    "    (some may be intentional transitive shortcuts across un-modelled props)",
  );
  console.log(
    `\n[5] MISSING edges (text cites, graph lacks): ${missing.length}`,
  );

  // 6. HIGHEST-SIGNAL: nodes whose graph predecessors share NOTHING with the
  //    text's cited predecessors — i.e. the dependency was simply fabricated.
  const disjoint = [];
  for (const id of nodeSet) {
    if (isPrimitive(id)) continue;
    const gp = graphPredsOf.get(id);
    const tp = textEdgesByTgt.get(id);
    if (!gp || !tp || gp.size === 0 || tp.size === 0) continue;
    const overlap = [...gp].some((p) => tp.has(p));
    if (!overlap) disjoint.push([id, [...gp], [...tp]]);
  }
  console.log(
    `\n[6] FABRICATED dependencies (graph preds share NOTHING with text preds): ${disjoint.length}`,
  );
  disjoint
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([id, gp, tp]) =>
      console.log(`    ${id}: graph[${gp.join(",")}]  vs  text[${tp.join(",")}]`),
    );

  // focused look at the three reported nodes
  console.log(`\n${line}\nSPOT-CHECK of reported nodes\n${line}`);
  for (const id of ["III.P11", "IV.P58", "II.P33"]) {
    const graphPreds = edges.filter(([, b]) => b === id).map(([a]) => a);
    const textPreds = textEdgesByTgt.has(id)
      ? [...textEdgesByTgt.get(id)]
      : [];
    console.log(`\n  ${id}`);
    console.log(`    graph predecessors: [${graphPreds.join(", ") || "—"}]`);
    console.log(`    text  predecessors: [${textPreds.join(", ") || "—"}]`);
  }

  console.log(`\n${line}\nFULL DIFF\n${line}`);
  console.log(`\n--- SPURIOUS (graph edge not supported by text) ---`);
  spurious
    .sort()
    .forEach(([a, b]) => console.log(`    - ${a} -> ${b}`));
  console.log(`\n--- MISSING (text-cited edge absent from graph) ---`);
  missing
    .sort()
    .forEach(([a, b]) => console.log(`    + ${a} -> ${b}`));

  console.log(`\n${line}`);
  console.log(
    `SUMMARY: ${selfLoops.length} self-loop(s), ${isolated.length} isolated, ` +
      `${orphans.length} orphan(s), ${spurious.length} spurious, ${missing.length} missing.`,
  );
  console.log(line);
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args[0] === "--debug") {
  const want = args[1];
  const g = build();
  const u = g.units.filter((x) => {
    const id =
      x.kind === "prop"
        ? x.node
        : resolveNodeId(
            { part: x.part, kind: "P", num: x.propNum, coroll: x.corollIdx },
            g.nodeSet,
          );
    return id === want;
  });
  console.log(`Units resolving to ${want}:`);
  for (const x of u) {
    console.log(
      `  [${x.kind}${x.corollIdx ? " " + x.corollIdx : ""}] refs:`,
      x.refs.map(refStr).join(", ") || "(none)",
    );
    const resolved = x.refs
      .map((r) => resolveNodeId(r, g.nodeSet))
      .filter(Boolean);
    console.log(`    -> graph predecessors:`, [...new Set(resolved)].join(", ") || "(none)");
  }
} else if (args[0] === "--json") {
  const g = build();
  const out = [...g.textEdges].map((k) => k.split("|"));
  writeFileSync(args[1] || "text-edges.json", JSON.stringify(out, null, 2));
  console.log(`Wrote ${out.length} text-derived edges to ${args[1] || "text-edges.json"}`);
} else {
  report();
}
