# Session Summary — Spinoza *Ethics* element extraction

**Date:** 2026-06-05/06
**Source:** `Spinoza_Ethics.txt` (Project Gutenberg #3800, Elwes translation; UTF-8 despite the header claiming ISO-8859-1)

## Goal
Extract every definition, axiom, proposition, and corollary from the *Ethics* into a
structured JSON file, then extend it with the Definitions of the Emotions.

## Deliverables
| File | Purpose |
|------|---------|
| [ethics.json](ethics.json) | The extracted elements — **420 total** — as `{"elements": [...]}`. |
| [parse_ethics.py](parse_ethics.py) | The parser that generates `ethics.json` (re-runnable). |
| [extract_prompt.txt](extract_prompt.txt) | A self-contained prompt that reproduces this result first-try. |
| [SESSION_SUMMARY.md](SESSION_SUMMARY.md) | This file. |

## Element schema
```json
{ "id", "part", "kind", "number", "statement", "proof", "parent" }
```
- **id**: `{part}.D{n}`, `{part}.A{n}`, `{part}.P{n}`, corollary `{parentPropId}.C{k}`,
  emotion def `III.DE{n}`, general emotion def `III.DEG`.
- **number**: global running index `1..420` in textual order (not per-kind).
- **proof**: propositions only (first `Proof.—` paragraph); `null` for defs/axioms/corollaries.
- **parent**: corollary → preceding proposition id; otherwise `null`.

## Final counts (verified)
Total **420**, `number` contiguous 1..420, all ids unique.

| Part | Definitions | Axioms | Propositions | Corollaries |
|------|---|---|---|---|
| I | 8 | 7 | 36 | 15 |
| II | 7 | 5 | 49 | 17 |
| III | 3 | 0 | 59 | 14 |
| IV | 8 | 1 | 73 | 17 |
| V | 0 | 2 | 42 | 8 |

Plus **48** Definitions of the Emotions (`III.DE1`–`III.DE48`) + **1** General Definition
(`III.DEG`), inserted between `III.P59` (number 220) and `IV.D1` (number 270).

## Key decisions
1. **Emotion definitions included** with `DE` ids; the General Definition kept as `III.DEG`.
2. **`number` is a global running index** (decided when the emotion defs were added —
   inserting them mid-text renumbers everything after Part III's propositions).
3. **Proof = first `Proof.—` paragraph only** (no "Another proof", notes, or scholia).
4. **`I.P9`** has no demonstration; its inline citation `(Def. iv.)` is encoded in the
   proof field as `"DI.4"`.

## Edge cases handled
- File is UTF-8; reading it as latin-1 produced mojibake (fixed).
- Table-of-contents line ignored; real part headers require the Roman numeral followed by `.`/`:`.
- Part II definitions are spelled out (`DEFINITION I.`); other parts use `I.`.
- Part IV's single unnumbered axiom → `IV.A1`.
- Part III has no `AXIOMS` section and no `PROPOSITIONS` header; Part V has no definitions —
  so `PROP.` lines must re-enter proposition mode on their own.
- The physical **digression after II.P13** (extra axioms, `LEMMA I–VII`, an inline
  definition, and a lemma-level `Corollary.—`) is excluded; the lemma-corollary is *not*
  attached to II.P13.
- Excluded throughout: lemmas, postulates, notes, scholia, explanations, prefaces, appendices.
- Footnote markers (`[2]`, `[6]`, …) stripped from statements.
- Source em-dashes `—` (U+2014), including those inside compounds like `self—caused`,
  are preserved verbatim (user opted not to normalize to hyphens).

## Reproduce
```bash
python parse_ethics.py   # reads Spinoza_Ethics.txt, writes ethics.json + prints the count table
```
