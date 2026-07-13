#!/usr/bin/env python3
"""
Translate the granular dependency graph (dependencies.json) into the
visualization's coarser node-ID scheme and rewrite the RAW_EDGES block in
src/SpinozaEthics.jsx.

ID translation (extractor -> viz):
    I.D3        -> I.Def      (8 defs collapse to one box per part)
    I.A1        -> I.Ax       (axioms collapse to one box per part)
    I.P14.C1    -> I.C14a / I.C14  (corollary suffix scheme)
    I.P14.C2    -> I.C14b
    I.P14.C3    -> I.C14c

Viz nodes with no extractor counterpart (mislabeled corollaries, scholia-embedded
corollaries, etc.) keep their original hand-authored edges as a fallback so they
are not orphaned.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
JSX = ROOT / "src" / "SpinozaEthics.jsx"

jsx = JSX.read_text(encoding="utf-8")
data = json.loads((ROOT / "dependencies.json").read_text(encoding="utf-8"))

nodes_block = re.search(r"const RAW_NODES\s*=\s*\[(.*?)\];", jsx, re.S).group(1)
viz_ids = set(re.findall(r"\bid:\"([^\"]+)\"", nodes_block))
ext_ids = set(n["id"] for n in data["nodes"])


def ext_to_viz(eid):
    if eid in viz_ids:
        return eid
    # Part III emotion definitions (and the general def) collapse to the III.App node,
    # which the visualization uses to represent the "Definitions of the Emotions".
    if re.match(r"^III\.DE(\d+|gen)$", eid) and "III.App" in viz_ids:
        return "III.App"
    m = re.match(r"^([IVX]+)\.D(\d+)$", eid)
    if m and f"{m.group(1)}.Def" in viz_ids:
        return f"{m.group(1)}.Def"
    m = re.match(r"^([IVX]+)\.A(\d+)$", eid)
    if m and f"{m.group(1)}.Ax" in viz_ids:
        return f"{m.group(1)}.Ax"
    m = re.match(r"^([IVX]+)\.P(\d+)\.C1$", eid)
    if m:
        for suf in ("a", ""):
            k = f"{m.group(1)}.C{m.group(2)}{suf}"
            if k in viz_ids:
                return k
    m = re.match(r"^([IVX]+)\.P(\d+)\.C2$", eid)
    if m and f"{m.group(1)}.C{m.group(2)}b" in viz_ids:
        return f"{m.group(1)}.C{m.group(2)}b"
    m = re.match(r"^([IVX]+)\.P(\d+)\.C3$", eid)
    if m and f"{m.group(1)}.C{m.group(2)}c" in viz_ids:
        return f"{m.group(1)}.C{m.group(2)}c"
    return None


# Text-derived edges, translated to viz IDs
new_edges = set()
for s, t in data["edges"]:
    sv, tv = ext_to_viz(s), ext_to_viz(t)
    if sv and tv and sv != tv:
        new_edges.add((sv, tv))

# Viz nodes the extractor cannot reach — keep their original hand-authored edges
mapped_viz = set(filter(None, (ext_to_viz(e) for e in ext_ids)))
unmapped_viz = viz_ids - mapped_viz

edges_block = re.search(r"const RAW_EDGES\s*=\s*\[(.*?)\];", jsx, re.S).group(1)
old_edges = re.findall(r"\[\"([^\"]+)\"\s*,\s*\"([^\"]+)\"\]", edges_block)
kept_old = set()
for s, t in old_edges:
    if (s in unmapped_viz or t in unmapped_viz) and s in viz_ids and t in viz_ids:
        kept_old.add((s, t))

final_edges = new_edges | kept_old

part_order = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5}


def pnum(n):
    pm = re.match(r"^([IVX]+)\.", n)
    p = part_order.get(pm.group(1), 9) if pm else 9
    nm = re.search(r"\d+", n)
    return (p, int(nm.group()) if nm else 0, n)


sorted_edges = sorted(final_edges, key=lambda e: (pnum(e[1]), pnum(e[0])))

# Cycle check (Kahn)
out, indeg = {}, {}
for v in viz_ids:
    out[v], indeg[v] = [], 0
for s, t in sorted_edges:
    out[s].append(t)
    indeg[t] += 1
deg = dict(indeg)
queue = [v for v in viz_ids if deg[v] == 0]
processed = 0
while queue:
    c = queue.pop()
    processed += 1
    for b in out[c]:
        deg[b] -= 1
        if deg[b] == 0:
            queue.append(b)
acyclic = processed == len(viz_ids)

loops = [(s, t) for s, t in sorted_edges if s == t]

lines = ["const RAW_EDGES = ["]
for s, t in sorted_edges:
    lines.append(f'  ["{s}","{t}"],')
lines.append("];")
new_block = "\n".join(lines)

new_jsx = re.sub(r"const RAW_EDGES\s*=\s*\[.*?\];", new_block, jsx, flags=re.S)
JSX.write_text(new_jsx, encoding="utf-8")

print(f"edges written: {len(sorted_edges)}  (text-derived {len(new_edges)}, kept-old fallback {len(kept_old)})")
print(f"self-loops: {loops}")
print(f"acyclic: {acyclic} (processed {processed}/{len(viz_ids)})")
print(f"unmapped viz nodes ({len(unmapped_viz)}): {sorted(unmapped_viz)}")
