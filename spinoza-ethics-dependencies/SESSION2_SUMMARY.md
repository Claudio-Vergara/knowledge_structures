# Session 2 Summary — Building the Dependency Graph for `ethics.json`

## Goal

Populate the `parent` field of every element in [`ethics.json`](ethics.json) (a structured
extraction of Spinoza's *Ethics*) with the elements it logically depends on, by parsing the
citations embedded in each element's `proof` (and, for corollaries, `statement`) text.

`parent` is the dependency edge list — e.g. the proof of `I.P10` cites *(Def. iv.)* and
*(Def. iii.)*, so `I.P10.parent = ["I.D3", "I.D4"]`.

## Element model

| Kind | Count | `parent` source |
|------|------:|-----------------|
| Proposition | 259 | citations parsed from `proof` (array) |
| Corollary | 71 | citations from `statement` **+** owning proposition (array) |
| Definition / Axiom | 90 | none — `parent: null` (no proof) |
| **Total** | **420** | |

IDs follow `PART.KIND[.COROLLARY]`: parts `I`–`V`; kinds `D`(efinition), `A`(xiom),
`P`(roposition), `DE`(finition of the Emotions, Part III), `DEG` (general def. of emotions);
corollaries as `…​.C1`, `.C2`. Notes/scholia, lemmas, postulates, and Part II's physical
digression were **not** extracted as elements.

## Deliverable: `build_parents.mjs`

A self-contained, **idempotent** resolver ([`build_parents.mjs`](build_parents.mjs)) that
regenerates every `parent` field from the text. Re-running it any number of times yields
identical output, so the proof/statement text is the single source of truth.

### Citation grammar handled

- **Type keywords**: `Def.`/`Deff.` → `D`, `Prop.`/`Props.` → `P`, `Ax.`/`Axiom` → `A`,
  `Coroll.`/`Corollary` → `.C`, `Def. of the Emotions` → `DE`, `general Def. of the Emotions`
  → `DEG`.
- **Roman numerals** (lowercase) → item numbers; **uppercase `I`–`V`** / `Pt.` / `Part` → the
  part, which may appear *before or after* the number (`Prop. xvi., Part i.`). Unqualified
  citations default to the element's own part.
- **Corollaries**, both word orders: `II. xi. Coroll.` → `II.P11.C1`, and the reverse
  `the Corollary of Prop. lxiii.` → `IV.P63.C1`.
- **Lists**: `Props. xxv. and xvi.`, `I. xxi., xxii.`, and the `Coroll. and vii.` pattern
  (corollary *plus* a fresh proposition).
- **Worded references**: ordinals (`the third axiom` → `A3`) and relative pointers
  (`the last/foregoing/preceding Prop.`, `similar to the preceding one`) → the immediately
  preceding proposition. In a **corollary's** statement, `the last Prop.` correctly resolves to
  its *owning* proposition (the one it sits beneath), not the one before that.
- **Singular axiom**: a number-less `the axiom of this part` (or `(IV. Ax.)`) resolves to a
  part's sole axiom — gated to parts that have exactly one (only Part IV → `IV.A1`).
- **Notes/scholia** resolve to their proposition (no separate note elements exist).
- Deliberately **left unresolved**: vague refs like `by hypothesis`, `the axiom of this part`
  where the part has many axioms, and the `&c.` abbreviation (guarded against parsing as
  roman `c` = 100).

## Work performed this session

1. **Populated all proposition parents** from `proof` citations.
2. **Resolved worded references** — ordinals (`the third axiom`) and relative-proposition
   pointers (`the last Prop.`, `similar to the preceding one`).
3. **Enriched corollaries** — converted their `parent` from a bare string (structural link to
   the owning proposition) into an array combining that owner with citations parsed from the
   corollary's `statement`. 24 corollaries gained real statement-derived dependencies.
4. **Fixed four data-quality / translation defects** in `ethics.json`:
   - **I.P9** — `proof` was the corrupted string `"DI.4"`; restored to *"This is evident from
     Def. iv."* → `["I.D4"]`.
   - **IV.P3** — proof cites *"the axiom of this part"*; taught the resolver the singular-axiom
     rule → `["IV.A1"]`. (Confirmed `IV.A1` already existed — it was **not** missing.)
   - **IV.P65** — English translation had silently dropped the Latin's
     *"(per corollarium propositionis 63 hujus)"*; re-translated the *Demonstratio* and restored
     the citation → `["IV.P63.C1"]`.
   - **IV.P72** — `proof` field actually held Spinoza's *Note* (the breaking-faith thought
     experiment) instead of the *Demonstratio*; replaced with a faithful translation citing
     Prop. 24 and the Corollary of Prop. 31 → `["IV.P24", "IV.P31.C1"]`.
5. **Fixed two resolver bugs** uncovered along the way:
   - **Re-run idempotency** — the corollary branch read its owning proposition from `parent`,
     which the first run had already overwritten; now derived from the element id.
   - **Corollary-first word order** (`Corollary of Prop. X`) — previously mis-resolved to the
     proposition; now yields the corollary. This also corrected two pre-existing mistakes
     (`II.P9` → `II.P8.C1`, `II.P11` → `II.P10.C1`).

## Final state

- **919 parent links** total — 800 across propositions, 119 across corollaries.
- **0** invalid, self-referential, or leftover-string parents (full referential integrity).
- **Idempotent**: two consecutive runs produce byte-identical results.
- **1 unresolvable citation** remaining: `III.A1`, from III.P51's *"Ax. i. after Lemma iii."* —
  it points into Part II's physical digression, which was never extracted as an element.
- **1 proposition with no parents**: `III.P4` — genuinely self-evident (Spinoza cites nothing;
  the proof reasons directly from the definition of a thing). Not a defect.

## How to regenerate

```bash
node build_parents.mjs
```

Edits to any `proof`/`statement` text are picked up automatically on the next run; manual
`parent` edits are not authoritative and will be overwritten, so corrections belong in the
text.
