#!/usr/bin/env python3
"""
extract_dependencies.py

Build the COMPLETE, ground-truth logical dependency graph of Spinoza's *Ethics*
straight from the source text (Spinoza_Ethics.txt).

Unlike the curated 258-node visualization, this covers the entire book — every
Part's definitions, axioms, postulates, lemmas, propositions, corollaries, the
48 Definitions of the Emotions, prefaces and appendices — and resolves every
citation inside every Proof to a precise node id.

ID scheme (granular / exact)
    I.D3            Part I, Definition III              (primitive)
    I.A1            Part I, Axiom I                     (primitive)
    II.Post4        Part II, Postulate IV               (primitive)
    II.L3           Part II, Lemma III
    III.DE18        Part III, Definition of Emotion 18  (primitive)
    III.DEgen       General Definition of the Emotions  (primitive)
    I.P14           Part I, Proposition 14
    I.P14.C1        Corollary 1 of Proposition 14
    I.App / IV.Pref Appendix / Preface                  (primitive)

A node is "primitive" when it states a foundation rather than proving a result
(definitions, axioms, postulates, the emotion-definitions, prefaces, appendices).
Primitives have no outgoing dependency edges, but may be cited by others.
Dependencies are extracted for PROPOSITIONS, COROLLARIES and LEMMAS — the units
Spinoza actually demonstrates.

Output
    dependencies.json   { nodes:[...], edges:[[src,tgt],...], unresolved:[...] }
    dependencies.tsv    one "src<TAB>tgt" per line (edge = "src is needed by tgt")

Usage
    python extract_dependencies.py
    python extract_dependencies.py --debug III.P11
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TXT = ROOT / "Spinoza_Ethics.txt"

PARTS = ["I", "II", "III", "IV", "V"]

# ── numerals ────────────────────────────────────────────────────────────────
_ROMAN = {"i": 1, "v": 5, "x": 10, "l": 50, "c": 100, "d": 500, "m": 1000}


def num_to_int(tok):
    tok = tok.strip().lower().rstrip(".")
    if tok.isdigit():
        return int(tok)
    if not tok or any(ch not in _ROMAN for ch in tok):
        return None
    total = 0
    for k, ch in enumerate(tok):
        cur = _ROMAN[ch]
        nxt = _ROMAN[tok[k + 1]] if k + 1 < len(tok) else 0
        total += -cur if cur < nxt else cur
    return total


def num_list(s):
    """'iii. and v' / 'i., ii.' / 'xvii., xviii' -> [3,5] etc."""
    if not s:
        return []
    out = []
    for tok in re.split(r"[.,]|\band\b", s):
        n = num_to_int(tok.strip())
        if n is not None:
            out.append(n)
    return out


# ── citation extraction ──────────────────────────────────────────────────────
_NUM = r"(?:\d+|[ivxlcdm]+)"
_LIST = _NUM + r"(?:\s*[.,]\s*(?:and\s+)?" + _NUM + r")*"

# Definitions of the Emotions, e.g. "Def. of the Emotions, xviii."
_RE_DEFEMO = re.compile(
    r"Def(?:inition)?s?\.?\s+of\s+the\s+Emotions,?\s*(" + _LIST + r")", re.I
)
# Compact, part-prefixed dialect (Parts III-V): "II. vii.", "I. xxiv. Coroll.",
# "III. Def. ii.", "II. Post. v.", "II. Lemma iii.", "I. 36".
_RE_COMPACT = re.compile(
    r"\b(I|II|III|IV|V)\.\s+"
    r"(Deff?\.|Ax\.|Axioms?|Posts?\.|Postulates?|Lemmas?\.?)?\s*"
    r"(" + _LIST + r")"
    r"\.?\s*"
    r"(Coroll(?:ary)?\.?|Corolls?\.?|notes?\.?|Schol\w*\.?)?"
)
# Keyword dialect (Parts I-II): "Prop. vii.", "Deff. iii. and v.", "Ax. i.",
# "Part i., Prop. xxv., Coroll.", "Prop. xiv., Coroll. i.", "Post. iv. Part ii.".
# Trailing part qualifier supports both "Prop. v., Part ii." and "Prop. v. of Part ii."
_RE_KEYWORD = re.compile(
    r"(?:(?:Pt\.|Part)\s+([ivxlcdm]+)\b[.,\s]*)?"
    r"(Props?\.|Deff?\.|Ax\.|Axioms?|Posts?\.|Postulates?|Lemmas?|Coroll(?:ary)?\.?|Corolls?\.?)\s*"
    r"(" + _LIST + r")?"
    r"\.?"
    r"(?:\s*,?\s*(Coroll(?:ary)?\.?|Corolls?\.?|[Nn]otes?\.?)\s*(" + _LIST + r")?)?"
    r"(?:\s*,?\s*(?:of\s+)?(?:Pt\.|Part)\s+([ivxlcdm]+))?"
)
# Physics-interlude axioms: "Ax. i. after Lemma iii." or "Ax. i. (which see after Lemma iii.)"
# — these always reference the Part II physics-interlude axioms (II.PhysA1/II.PhysA2).
# [^;.]*? lazily skips optional parenthesized gloss between "Ax. N." and "after Lemma".
_RE_PHYSAX = re.compile(
    r"\bAx\.\s+(" + _NUM + r")\.[^;.]*?after\s+Lemma",
    re.I,
)
# "Coroll. of Prop. vi", "Corollary, Prop vi." — separator may be whitespace or comma,
# and "Prop" may lack its trailing period.
_RE_COROLL_PROP = re.compile(r"Coroll(?:ary)?\.?[\s,]+(?:of\s+)?Props?\.?\s+([ivxlcdm]+)", re.I)
_RE_RELATIVE = re.compile(r"\b(last|foregoing|preceding)\s+Prop(?:osition)?\b", re.I)
# Bare relative reference with no "Prop" word, e.g. "similar to that of the last",
# "evident from the last" — refers to the immediately preceding proposition.
_RE_RELLAST = re.compile(r"\b(?:that of|from|as)\s+the\s+(?:last|preceding|foregoing)\b", re.I)
_RE_PREFACE = re.compile(r"\bpreface\s+to\s+this\s+Part\b", re.I)
_RE_FIRSTPROP = re.compile(r"first\s+Prop(?:osition)?\.?\s+of\s+this\s+part", re.I)
_RE_NLAXIOM = re.compile(
    r"\b(?:the\s+(?:first|second|third|fourth|fifth|sixth|seventh|last|preceding|foregoing)\s+axiom"
    r"|axiom\s+of\s+this\s+part|by\s+the\s+axiom)\b",
    re.I,
)


def extract_refs(text, cur_part, cur_prop):
    """Return canonical citation dicts {part,kind,num,coroll} found in `text`."""
    refs = []

    def add(part, kind, num=None, coroll=None):
        if kind == "P" and (num is None or num < 1):
            return
        refs.append({"part": (part or cur_part).upper(), "kind": kind,
                     "num": num, "coroll": coroll})

    work = text

    # Physics-interlude axioms: "Ax. i. after Lemma iii." → II.PhysA1.
    # Blank out first so the keyword pass doesn't generate a spurious III.A1.
    def _physax(m):
        n = num_to_int(m.group(1).strip())
        if n:
            add("II", "PhysA", n)
        return " " * len(m.group(0))
    work = _RE_PHYSAX.sub(_physax, work)

    # Definitions of the Emotions (Part III) — resolve, then blank out.
    def _defemo(m):
        for n in num_list(m.group(1)):
            add("III", "DE", n)
        return " " * len(m.group(0))
    work = _RE_DEFEMO.sub(_defemo, work)

    # Compact part-prefixed dialect — resolve, then blank out so the keyword
    # pass below does not re-count the same numbers.
    def _compact(m):
        part, marker, lst, trailing = m.group(1), m.group(2), m.group(3), m.group(4)
        marker = (marker or "").lower()
        trailing = (trailing or "").lower()
        if marker.startswith("def"):
            add(part, "D", _first(lst))
        elif marker.startswith("ax"):
            add(part, "A", _first(lst))
        elif marker.startswith("post"):
            add(part, "Post", _first(lst))
        elif marker.startswith("lemma"):
            add(part, "L", _first(lst))
        else:  # proposition number(s)
            is_c = trailing.startswith("coroll")
            for n in num_list(lst):
                add(part, "P", n, "generic" if is_c else None)
        return " " * len(m.group(0))
    work = _RE_COMPACT.sub(_compact, work)

    # Keyword dialect.
    for m in _RE_KEYWORD.finditer(work):
        lead_part, kw, lst = m.group(1), m.group(2).lower(), m.group(3)
        tkw = (m.group(4) or "").lower()
        tlst, trail_part = m.group(5), m.group(6)
        part = lead_part or trail_part
        if kw.startswith("def"):
            for n in num_list(lst):
                add(part, "D", n)
        elif kw.startswith("ax"):
            for n in num_list(lst):
                add(part, "A", n)
        elif kw.startswith("post"):
            for n in num_list(lst):
                add(part, "Post", n)
        elif kw.startswith("lemma"):
            for n in num_list(lst):
                add(part, "L", n)
        elif kw.startswith("coroll"):
            pass  # bare "Coroll." with no proposition: too contextual
        else:  # proposition
            is_c = tkw.startswith("coroll")
            cidx = num_list(tlst) if is_c else []
            for n in num_list(lst):
                if is_c:
                    if cidx:
                        for ci in cidx:
                            add(part, "P", n, ci)
                    else:
                        add(part, "P", n, "generic")
                else:
                    add(part, "P", n)

    # "Coroll. Prop. vi" (corollary OF a proposition).
    for m in _RE_COROLL_PROP.finditer(text):
        add(None, "P", num_to_int(m.group(1)), "generic")

    # relative + natural-language references.
    if cur_prop:
        for _ in _RE_RELATIVE.finditer(text):
            add(cur_part, "P", cur_prop - 1)
        for _ in _RE_RELLAST.finditer(text):
            add(cur_part, "P", cur_prop - 1)
        if _RE_FIRSTPROP.search(text):
            add(cur_part, "P", 1)
    if _RE_PREFACE.search(text):
        add(cur_part, "Pref")
    if _RE_NLAXIOM.search(text):
        add(cur_part, "A", 1)  # part's axioms exist as A1.. ; coarse but rare

    return refs


def _first(lst):
    ns = num_list(lst)
    return ns[0] if ns else None


# ── structural parsing ────────────────────────────────────────────────────────
_PART_HEADER = re.compile(r"^PART\s+(I|II|III|IV|V)[.:]", re.M)

_HEADERS = [
    ("DEFINITIONS OF THE EMOTIONS", "defemo"),
    ("GENERAL DEFINITION OF THE EMOTIONS", "gendef"),
    ("DEFINITIONS", "defs"),
    ("DEFINITION", "defs"),
    ("AXIOMS", "axioms"),
    ("AXIOM", "axioms"),
    ("POSTULATES", "postulates"),
    ("POSTULATE", "postulates"),
    ("PROPOSITIONS", "props"),
    ("APPENDIX", "appendix"),
    ("PREFACE", "preface"),
]

_RE_PROP = re.compile(r"^PROP\.\s+([IVXLCDM]+)\.\s*(.*)", re.S)
_RE_LEMMA = re.compile(r"^LEMMA\s+([IVXLCDM]+)\.\s*(.*)", re.S)
_RE_AXIOM_N = re.compile(r"^AXIOM\s+([IVXLCDM]+)\.\s*(.*)", re.S)
_RE_DEF_N = re.compile(r"^DEFINITION\s+([IVXLCDM]+)\.\s*(.*)", re.S)
_RE_ROMAN_UNIT = re.compile(r"^([IVXLCDM]+)\.\s+(\S.*)", re.S)
# Matches both "Corollary I.—" and abbreviated "Coroll. I.—"
_RE_COROLL = re.compile(r"^Coroll(?:ar(?:y|ies))?\.?\s*([IVXLCDM]+)?\.?\s*[.——-]?\s*(.*)", re.S)
_RE_PROOF = re.compile(r"^(?:Proof|Another\s+proof|Demonstrat)", re.I)
# "Coroll" removed: corollary paragraphs are now caught before reaching this check
_RE_COMMENT = re.compile(r"^(?:Note|Scholium|Explanation|N\.B\.)", re.I)


def header_section(p):
    """If paragraph `p` is exactly a section header, return its section key."""
    flat = p.strip().rstrip(".:").upper()
    for label, sect in _HEADERS:
        if flat == label:
            return sect
    return None


def parse():
    raw = TXT.read_text(encoding="latin-1").replace("\r\n", "\n")
    heads = list(_PART_HEADER.finditer(raw))
    assert len(heads) == 5, f"expected 5 part headers, got {len(heads)}"

    nodes = {}      # id -> node dict
    proofs = []     # (target_id, part, prop_num, text) for dependency extraction
    order = []      # preserve insertion order of node ids

    def add_node(nid, part, kind, number=None, statement="", parent=None):
        if nid not in nodes:
            nodes[nid] = {"id": nid, "part": part, "kind": kind,
                          "number": number, "statement": statement[:240].strip(),
                          "parent": parent}
            order.append(nid)
        return nid

    for i, h in enumerate(heads):
        part = h.group(1)
        start = h.start()
        end = heads[i + 1].start() if i + 1 < len(heads) else len(raw)
        body = raw[start:end]
        paras = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]

        section = None
        cur_prop = None          # current proposition id
        cur_prop_num = None
        cur_target = None        # current demonstrable unit id (prop/lemma/coroll)
        coroll_count = 0
        in_proof = False         # are we inside a unit's statement/proof flow?
        seen_appendix = False
        defemo_n = 0

        for para in paras:
            # part header line itself / table-of-contents row
            # In Part I the header and DEFINITIONS. share one paragraph with no
            # blank line between them, so check subsequent lines for a section tag.
            if para.startswith("PART ") and _PART_HEADER.match(para):
                for line in para.split("\n")[1:]:
                    s = header_section(line.strip())
                    if s:
                        section = s
                        if section == "preface":
                            add_node(f"{part}.Pref", part, "preface", statement=line.strip())
                        elif section == "gendef":
                            add_node("III.DEgen", "III", "defemo-general", statement=line.strip())
                        break
                continue
            sect = header_section(para)
            if sect:
                section = sect
                cur_prop = cur_prop_num = cur_target = None
                coroll_count = 0
                in_proof = False
                if section == "preface":
                    add_node(f"{part}.Pref", part, "preface", statement=para)
                if section == "gendef":
                    add_node("III.DEgen", "III", "defemo-general", statement=para)
                continue

            # proposition
            m = _RE_PROP.match(para)
            if m:
                section = "props"
                cur_prop_num = num_to_int(m.group(1))
                cur_prop = f"{part}.P{cur_prop_num}"
                add_node(cur_prop, part, "proposition", cur_prop_num, m.group(2))
                cur_target = cur_prop
                coroll_count = 0
                in_proof = True
                proofs.append([cur_prop, part, cur_prop_num, m.group(2)])
                continue

            # lemma (Part II physics interlude)
            m = _RE_LEMMA.match(para)
            if m:
                ln = num_to_int(m.group(1))
                lid = f"{part}.L{ln}"
                add_node(lid, part, "lemma", ln, m.group(2))
                cur_target = lid
                cur_prop = None
                coroll_count = 0
                in_proof = True
                proofs.append([lid, part, None, m.group(2)])
                continue

            # interlude physics axiom ("AXIOM I. All bodies ...")
            m = _RE_AXIOM_N.match(para)
            if m and section == "props":
                an = num_to_int(m.group(1))
                add_node(f"{part}.PhysA{an}", part, "axiom-phys", an, m.group(2))
                cur_target = None
                in_proof = False
                continue

            # explicit "DEFINITION I." (Part II)
            m = _RE_DEF_N.match(para)
            if m:
                dn = num_to_int(m.group(1))
                add_node(f"{part}.D{dn}", part, "definition", dn, m.group(2))
                cur_target = None
                in_proof = False
                continue

            # corollary of the current proposition — matches both "Corollary" and "Coroll."
            if section == "props" and re.match(r"^Coroll", para, re.I):
                cm = _RE_COROLL.match(para)
                idx_roman = cm.group(1) if cm else None
                coroll_count += 1
                cidx = num_to_int(idx_roman) if idx_roman else coroll_count
                if cur_prop:
                    cid = f"{cur_prop}.C{cidx}"
                    add_node(cid, part, "corollary", cidx,
                             cm.group(2) if cm else "", parent=cur_prop)
                    cur_target = cid
                    in_proof = True
                    proofs.append([cid, part, cur_prop_num, para])
                continue

            # commentary — stops dependency capture until the next marker
            if _RE_COMMENT.match(para):
                in_proof = False
                continue

            # proof paragraph
            if _RE_PROOF.match(para):
                if cur_target:
                    in_proof = True
                    proofs.append([cur_target, part, cur_prop_num, para])
                continue

            # bare-roman unit inside a primitive section
            m = _RE_ROMAN_UNIT.match(para)
            if m and section in ("defs", "axioms", "postulates", "defemo"):
                n = num_to_int(m.group(1))
                if n is not None:
                    if section == "defs":
                        add_node(f"{part}.D{n}", part, "definition", n, m.group(2))
                    elif section == "axioms":
                        add_node(f"{part}.A{n}", part, "axiom", n, m.group(2))
                    elif section == "postulates":
                        add_node(f"{part}.Post{n}", part, "postulate", n, m.group(2))
                    elif section == "defemo":
                        defemo_n = n
                        add_node(f"{part}.DE{n}", part, "emotion-definition", n, m.group(2))
                    cur_target = None
                    in_proof = False
                    continue

            # single unnumbered axiom (Part IV "AXIOM.")
            if section == "axioms" and not seen_appendix:
                # a non-roman statement directly under the AXIOM. header
                if not _RE_ROMAN_UNIT.match(para) and len(para) > 30:
                    existing = [k for k in nodes if k.startswith(f"{part}.A")]
                    add_node(f"{part}.A{len(existing) + 1}", part, "axiom",
                             len(existing) + 1, para)
                    in_proof = False
                    continue

            # appendix — collapse to a single node per part
            if section == "appendix":
                if not seen_appendix:
                    add_node(f"{part}.App", part, "appendix", statement=para)
                    seen_appendix = True
                continue

            # continuation paragraph of a proof (multi-paragraph demonstration)
            if in_proof and cur_target and section == "props":
                proofs.append([cur_target, part, cur_prop_num, para])
                continue

    return nodes, order, proofs


# ── resolution ────────────────────────────────────────────────────────────────
def resolve(ref, nodeset):
    part, kind, num, coroll = ref["part"], ref["kind"], ref["num"], ref["coroll"]
    if kind == "D":
        return _ok(f"{part}.D{num}", nodeset)
    if kind == "A":
        return _ok(f"{part}.A{num}", nodeset)
    if kind == "Post":
        return _ok(f"{part}.Post{num}", nodeset)
    if kind == "L":
        return _ok(f"II.L{num}", nodeset)  # lemmas live only in Part II
    if kind == "PhysA":
        return _ok(f"II.PhysA{num}", nodeset)  # physics-interlude axioms
    if kind == "DE":
        return _ok(f"III.DE{num}", nodeset)
    if kind == "App":
        return _ok(f"{part}.App", nodeset)
    if kind == "Pref":
        return _ok(f"{part}.Pref", nodeset)
    # proposition (optionally a corollary)
    base = f"{part}.P{num}"
    if coroll is not None:
        if coroll == "generic":
            c1 = f"{base}.C1"
            return c1 if c1 in nodeset else _ok(base, nodeset)
        cid = f"{base}.C{coroll}"
        return cid if cid in nodeset else _ok(base, nodeset)
    return _ok(base, nodeset)


def _ok(nid, nodeset):
    return nid if nid in nodeset else None


# ── main ──────────────────────────────────────────────────────────────────────
def build():
    nodes, order, proofs = parse()
    nodeset = set(nodes)

    deps = {nid: set() for nid in nodes}     # tgt -> set(src)
    unresolved = {}                          # tgt -> [raw ref strings]

    for tgt, part, prop_num, text in proofs:
        for ref in extract_refs(text, part, prop_num):
            src = resolve(ref, nodeset)
            if src is None:
                unresolved.setdefault(tgt, []).append(_refstr(ref))
                continue
            if src == tgt:
                continue
            deps[tgt].add(src)

    # Structural corollary edges: a corollary necessarily follows from its parent
    # proposition, even when the (often one-line) corollary text cites nothing.
    for nid, node in nodes.items():
        parent = node.get("parent")
        if parent and parent in nodeset:
            deps[nid].add(parent)

    edges = sorted((s, t) for t, srcs in deps.items() for s in srcs)
    return nodes, order, deps, edges, unresolved


def _refstr(r):
    if r["kind"] == "P":
        c = f".C{r['coroll']}" if r["coroll"] not in (None, "generic") else (
            ".C?" if r["coroll"] == "generic" else "")
        return f"{r['part']}.P{r['num']}{c}"
    return f"{r['part']}.{r['kind']}{r['num'] if r['num'] else ''}"


def main():
    if len(sys.argv) > 2 and sys.argv[1] == "--debug":
        want = sys.argv[2]
        nodes, order, deps, edges, unresolved = build()
        n = nodes.get(want)
        print(f"node: {want}")
        if n:
            print(f"  kind: {n['kind']}   statement: {n['statement'][:120]}")
        print(f"  depends on: {sorted(deps.get(want, []))}")
        if want in unresolved:
            print(f"  unresolved citations: {unresolved[want]}")
        succs = sorted(t for (s, t) in edges if s == want)
        print(f"  needed by: {succs}")
        return

    nodes, order, deps, edges, unresolved = build()

    kinds = {}
    for n in nodes.values():
        kinds[n["kind"]] = kinds.get(n["kind"], 0) + 1

    out = {
        "meta": {
            "source": "Spinoza_Ethics.txt (Elwes translation, Project Gutenberg #3800)",
            "node_count": len(nodes),
            "edge_count": len(edges),
            "node_kinds": kinds,
        },
        "nodes": [nodes[i] for i in order],
        "edges": edges,
        "unresolved": unresolved,
    }
    (ROOT / "dependencies.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    with open(ROOT / "dependencies.tsv", "w", encoding="utf-8") as f:
        f.write("# source\ttarget   (source is a premise of target)\n")
        for s, t in edges:
            f.write(f"{s}\t{t}\n")

    print(f"nodes: {len(nodes)}   edges: {len(edges)}")
    print("node kinds:", ", ".join(f"{k}={v}" for k, v in sorted(kinds.items())))
    n_unres = sum(len(v) for v in unresolved.values())
    print(f"unresolved citations: {n_unres} (across {len(unresolved)} units)")
    print("wrote dependencies.json, dependencies.tsv")


if __name__ == "__main__":
    main()
