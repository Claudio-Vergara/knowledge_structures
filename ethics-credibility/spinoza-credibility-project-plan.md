# Spinoza at X Credibility — Project Plan

*A machine-assisted logical fragility analysis of the Ethics*

---

## Overview

The project produces a tool that takes a credibility threshold (0–1) and outputs:

1. A filtered version of the logical dependency graph showing only the propositions and inference steps that survive the threshold
2. A rewritten edition of the *Ethics* containing only surviving propositions, each proved using only surviving inference paths, written in Spinoza's geometric style

The threshold is a philosophical stance. At 0.0 everything survives. At 1.0 only logically watertight inferences survive. "Spinoza at 0.7" is the text you'd write if you accepted his premises but held his inference steps to a reasonably high standard of deductive rigor.

---

## Phase 1 — Data Model Enrichment

**Goal:** Extend the existing graph data model to encode proof structure at the sub-proposition level.

The current model stores one `desc` string per node. This phase replaces it with a structured `proofs` array that makes the proof-membership of each edge explicit and stores the original Spinoza text for each proof.

### 1.1 New Node Schema

```typescript
type Proof = {
  id: string;             // e.g. "I.P11.proof1"
  label: string;          // e.g. "Ontological (existence belongs to substance)"
  premises: string[];     // node ids used in this proof, e.g. ["I.P7"]
  original: string;       // Spinoza's original prose for this proof
  flakiness: number;      // 0–1, assigned in Phase 2
  flakiness_rationale: string;  // brief justification for the score
  attack_type: "invalid_inference" | "equivocation" | "both" | null;
};

type Node = {
  id: string;
  part: string;
  type: "prop" | "coroll" | "keystone" | "axiom" | "appendix";
  label: string;
  x: number;
  y: number;
  proofs: Proof[];        // replaces desc
  survival_threshold: number | null;  // computed, not authored
};
```

Edges remain as `[sourceId, targetId]` pairs but gain a `proof_id` field linking them to the specific proof they participate in:

```typescript
type Edge = {
  source: string;
  target: string;
  proof_id: string;   // e.g. "I.P11.proof2"
};
```

This means a single node pair can have multiple edges (one per proof that uses that dependency), which is the correct representation.

### 1.2 Source Text Extraction

Claude Code task: re-fetch `gutenberg.org/files/3800/3800-h/3800-h.htm` and extract the raw proof text for each proposition, corollary, and appendix. Store in a `raw_proofs.json` file keyed by node id. This becomes the source material for Phase 2.

**Deliverable:** `src/data/raw_proofs.json`

### 1.3 Manual Proof Decomposition (high-value nodes first)

For the ~20 most structurally critical nodes (identified by betweenness centrality and high downstream footprint — I.P11, I.P14, I.P15, II.P7, III.P6–7, V.P42 etc.), manually decompose the proofs into the structured schema. This gives ground truth to calibrate the LLM annotation in Phase 2.

**Deliverable:** `src/data/proofs_manual.json` (~20 nodes)

---

## Phase 2 — Flakiness Annotation

**Goal:** Assign a flakiness score (0–1) to every edge in the graph, representing the probability that a competent critic can sever that inference step.

### 2.1 Scoring Rubric

Define the rubric before running any LLM annotation, so scores are consistent:

| Score | Meaning |
|-------|---------|
| 0.0–0.1 | Near-certain. Modus ponens or direct substitution from definitions. |
| 0.2–0.3 | Tight. Follows from premises with only standard logical moves. Minor interpretive leeway. |
| 0.4–0.5 | Moderately contested. Requires a bridging assumption not explicitly stated, or uses a term that could plausibly be read two ways. |
| 0.6–0.7 | Contested. Several serious philosophical critics have challenged this step. The inference relies on a non-trivial hidden premise. |
| 0.8–0.9 | Highly contested. The step has been widely challenged; most analytic philosophers would not accept it as stated. |
| 1.0 | Broken. The inference is demonstrably invalid, or equivocation is unambiguous. |

### 2.2 LLM First-Pass Annotation

Use Claude via the API (claude-sonnet-4-20250514) with a structured prompt to produce a first-pass flakiness score for all ~465 edges. The prompt should:

- Provide the rubric
- Provide the source node's proof text
- Provide the target proposition
- Ask for: score, rationale, attack type (invalid_inference / equivocation / both), and the specific hidden premise or equivocation if applicable
- Request JSON output

Run this as a batch job. Each call handles one proof (not one edge — one proof may have multiple premises, score the proof as a unit then distribute the score to its edges).

**Claude Code task:** `scripts/annotate_flakiness.js` — calls the Anthropic API for each proof in `raw_proofs.json`, writes results to `src/data/flakiness_annotations.json`.

### 2.3 Human Review and Calibration

Review LLM annotations against the manually scored ground-truth nodes from Phase 1.3. Adjust systematic biases (LLMs tend to be charitable — expect scores to need upward adjustment for contested steps). Establish a correction factor or re-prompt with examples.

**Deliverable:** `src/data/flakiness_final.json` — the authoritative scored dataset.

### 2.4 Literature Grounding (optional but strengthens the work)

For the 30–40 most contested edges (flakiness > 0.7), attach references to actual philosophical criticism. Key sources: Bennett (1984) *A Study of Spinoza's Ethics*, Curley (1969) *Spinoza's Metaphysics*, Della Rocca (2008) *Spinoza*, Leibniz's marginalia on the *Ethics*. These become tooltips in the visualization and footnotes in the rewritten text.

---

## Phase 3 — Fragility Engine

**Goal:** Implement the core analytical engine that computes, for any threshold T, the surviving graph structure and per-node metrics.

### 3.1 Core Algorithm

```
function computeSurvivingGraph(nodes, edges, threshold):

  // Step 1: Mark surviving edges
  survivingEdges = edges.filter(e => e.flakiness <= threshold)

  // Step 2: For each node, compute surviving support sets
  // A support set survives if ALL its edges survive
  for each node N:
    N.survivingProofs = N.proofs.filter(proof =>
      proof.premises.every(premiseId =>
        survivingEdges.some(e => e.source == premiseId && e.target == N.id
                                 && e.proof_id == proof.id)
      )
    )

  // Step 3: Propagate — a node is reachable only if
  // (a) it has no premises (axiom/def) OR
  // (b) at least one of its surviving proofs has all premises reachable
  reachable = fixpoint computation over the DAG

  // Step 4: Compute per-node metrics
  for each node N:
    N.redundancy = N.survivingProofs.length
    N.survivalThreshold = max T at which N remains reachable
    N.collapseFootprint = downstream nodes that lose all support sets if N is removed
    N.isSPOF = N appears in every surviving support set of some downstream node
```

### 3.2 Key Metrics Per Node

- `redundancy` — number of surviving independent proofs
- `survival_threshold` — highest T at which the node is still reachable (its "toughness")
- `collapse_footprint_size` — how many downstream nodes fall with it
- `is_spof_for` — list of downstream nodes for which this is a single point of failure
- `fragility_index` — composite: `(1/redundancy) * mean_flakiness_of_surviving_proofs`

### 3.3 Phase Transition Analysis

Sweep T from 0 to 1 in steps of 0.05. At each step record: number of surviving nodes, number of surviving edges, number of connected components. Plot this as a **dissolution curve** — the shape reveals whether the *Ethics* degrades gracefully or collapses suddenly at a critical threshold (analogous to percolation theory).

**Deliverable:** `src/engine/fragility.js` — pure functions, no UI dependencies, fully testable.

---

## Phase 4 — Visualization Upgrades

**Goal:** Extend the existing Vite/React visualization to expose the fragility analysis interactively.

### 4.1 Threshold Slider

Add a continuous slider (0–1) to the UI. As it moves:
- Edges with flakiness above the threshold fade and are removed from routing
- Nodes that lose all support sets visually "orphan" — distinct styling (e.g. desaturated, dashed border)
- Nodes that lose some but not all support sets show partial dimming
- The info panel updates to show which proofs survived for the selected node

### 4.2 Edge Flakiness Encoding

Encode flakiness visually on edges:
- Edge opacity or stroke weight inversely proportional to flakiness
- Colour shift: low flakiness = part colour (solid), high flakiness = amber/red tint
- On hover: show flakiness score, rationale, and attack type

### 4.3 Fragility Overlay Mode

A new view mode (toggle button) that colours nodes by their `survival_threshold`:
- Deep green: survives to T=0.9+ (very robust)
- Amber: survives to T=0.5–0.8
- Red: drops out before T=0.5 (structurally fragile)
- Size encodes `collapse_footprint_size` — large nodes are load-bearing

### 4.4 SPOF Highlighting

In the existing ancestry trace mode, additionally mark SPOF nodes with a distinct indicator (e.g. a small warning glyph). When you hover a SPOF, show its collapse footprint.

### 4.5 Dissolution Curve Panel

A small inset chart (recharts) showing the phase transition curve — number of surviving nodes vs threshold. Clicking a point on the curve sets the threshold slider to that value.

**Deliverable:** Updated `src/SpinozaEthics.jsx` + new `src/components/FragilityPanel.jsx`, `src/components/DissolutionCurve.jsx`

---

## Phase 5 — Text Regeneration

**Goal:** Produce a rewritten edition of the *Ethics* containing only surviving propositions, proved via surviving inference paths, in Spinoza's geometric style.

### 5.1 Rewrite Prompt Design

For each surviving node at a given threshold, construct a prompt:

```
You are rewriting Proposition {id} of Spinoza's Ethics in his geometric style.

The following upstream propositions have survived the credibility filter and may be cited:
{list of surviving upstream node ids and their statements}

The following proof has survived (flakiness {score}):
Premises used: {premise ids}
Original Spinoza text: {original_prose}

Rewrite the proof in Spinoza's geometric style (Demonstratio format).
- Use only the listed surviving premises
- Preserve the logical structure of the original
- Where the original cited a now-removed proposition, either find an alternative
  path through surviving nodes or mark the step as [UNGROUNDED]
- Output the Proposition statement, then the Demonstratio
```

### 5.2 Handling Orphaned Propositions

Orphaned nodes (no surviving proof) are handled in two ways depending on their role:

- **Non-load-bearing orphans**: omitted from the rewritten text with a footnote explaining they could not be derived at this threshold
- **Load-bearing orphans** (nodes with large downstream footprint): flagged with a section break and a note explaining that a significant portion of the subsequent argument depends on an ungrounded step

This makes the incompleteness explicit rather than hiding it — which is itself a philosophical result.

### 5.3 Output Formats

- **Markdown**: full rewritten text, suitable for reading and further editing
- **JSON**: structured edition with metadata per proposition (survival status, which proof was used, flakiness score of that proof, list of omitted propositions)
- **Diff view**: side-by-side original vs rewritten, with removed propositions struck through and modified proofs highlighted

**Claude Code task:** `scripts/generate_edition.js` — takes a threshold as CLI argument, calls the API for each surviving node in topological order, assembles the full text.

---

## Phase 6 — Comparative Analysis

**Goal:** Use the machinery to answer specific philosophical questions.

### 6.1 Threshold Sensitivity of Key Results

For the philosophically most significant conclusions — God's existence (I.P11), Deus sive Natura (I.P14–15), Parallelism (II.P7), Conatus (III.P6–7), Blessedness as Virtue (V.P42) — plot their individual survival curves. At what threshold does each drop out? This produces a **toughness ranking** of Spinoza's major claims.

### 6.2 Comparative Commentator Thresholds

Different commentators effectively apply different thresholds. Encode rough profiles:
- Bennett (very strict, analytic): T ≈ 0.8
- Curley (sympathetic but rigorous): T ≈ 0.6
- Della Rocca (rationalist reading, charitable): T ≈ 0.4
- Wolfson (historical, very charitable): T ≈ 0.25

Run the filter at each profile and compare which parts of the *Ethics* each commentator's reading implicitly endorses. This is a defensible framing for a publication.

### 6.3 Structural Comparison with Other Axiomatic Systems

The fragility engine is not Spinoza-specific. The same pipeline could be applied to Euclid's *Elements* (where the inference steps are much tighter, providing a baseline), or to other geometric-method philosophers (Descartes' *More Geometrico* proofs, Leibniz's attempted proofs of God's existence). This sets the *Ethics* in comparative context.

---

## Project Structure

```
spinoza-ethics/
  src/
    data/
      raw_proofs.json          # Phase 1.2 — Gutenberg source text per proof
      proofs_manual.json       # Phase 1.3 — manually decomposed high-value nodes
      flakiness_annotations.json  # Phase 2.2 — LLM first pass
      flakiness_final.json     # Phase 2.3 — reviewed and calibrated
      nodes_enriched.json      # merged: positions + proofs + flakiness
    engine/
      fragility.js             # Phase 3 — core algorithms, no UI deps
      fragility.test.js        # unit tests
    components/
      FragilityPanel.jsx       # Phase 4 — threshold slider + metrics
      DissolutionCurve.jsx     # Phase 4 — phase transition chart
      EdgeLayer.jsx            # Phase 4 — extracted edge rendering with flakiness encoding
    SpinozaEthics.jsx          # main visualization, updated each phase
    App.jsx
    main.jsx
  scripts/
    fetch_proofs.js            # Phase 1.2 — Gutenberg scraper
    annotate_flakiness.js      # Phase 2.2 — API batch annotation
    generate_edition.js        # Phase 5 — rewritten text generator
  editions/
    spinoza_0.7.md             # output — rewritten Ethics at threshold 0.7
    spinoza_0.5.md
    spinoza_0.9.md
  analysis/
    toughness_ranking.json     # Phase 6.1
    commentator_profiles.json  # Phase 6.2
    dissolution_curve.json     # Phase 3.3
  index.html
  package.json
  vite.config.js
  README.md
```

---

## Sequencing and Dependencies

```
Phase 1.1 (schema)
    └── Phase 1.2 (fetch proofs)
            └── Phase 1.3 (manual decomposition, 20 nodes)
                    └── Phase 2.1 (rubric)
                            └── Phase 2.2 (LLM annotation)
                                    └── Phase 2.3 (human review)
                                            ├── Phase 3 (fragility engine)
                                            │       ├── Phase 4 (visualization)
                                            │       └── Phase 3.3 (dissolution curve)
                                            └── Phase 5 (text regeneration)
                                                    └── Phase 6 (comparative analysis)
```

Phases 4 and 5 can run in parallel once Phase 3 is complete. Phase 6 depends on both.

---

## Claude Code Usage Notes

Each phase maps to a Claude Code session with a clear scope:

- **Phase 1–2**: data wrangling and API calls — Claude Code handles file I/O, the Gutenberg fetch, and the batch annotation script. Human reviews the outputs.
- **Phase 3**: algorithmic — give Claude Code the schema and algorithm sketch above, ask it to implement and test `fragility.js`. The fixpoint computation and SPOF detection are well-defined enough to be fully automated.
- **Phase 4**: React component work — incremental additions to the existing visualization. Each component (slider, dissolution curve, edge encoding) is a separate Claude Code task.
- **Phase 5**: the generative step — Claude Code writes the `generate_edition.js` script; the actual text generation calls the API at runtime with the rewrite prompt.
- **Phase 6**: analysis scripts — short, mostly data transformation from the outputs of Phase 3.

The most important thing to give Claude Code at each phase is the **data contracts** — the exact shape of the JSON at input and output. The algorithm and component specs above are sufficient to drive each session without re-explaining the project from scratch. Keep `CLAUDE.md` in the project root with a concise project description and a pointer to this plan.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| LLM flakiness scores are systematically biased | Manual ground truth on 20 nodes; calibration step in Phase 2.3 |
| Proof decomposition is ambiguous (which premises does a proof really use?) | Err toward inclusion; mark uncertain edges with `uncertain: true` flag |
| Spinoza's proofs are too informal for strict edge labeling | Accept interpretive annotations; document choices in `ANNOTATIONS.md` |
| Rewritten text sounds un-Spinozan | Few-shot prompt with examples from the original; human editing pass |
| Some nodes are genuinely ungroundable at any reasonable threshold | This is a result, not a failure — document and interpret |

---

## Rough Effort Estimate

| Phase | Effort |
|-------|--------|
| 1.1–1.2 Schema + fetch | 1 Claude Code session |
| 1.3 Manual decomposition (20 nodes) | 3–4 hours human work |
| 2.1–2.2 Rubric + LLM annotation | 1 Claude Code session + review |
| 2.3 Human calibration | 2–3 hours human work |
| 3 Fragility engine | 1–2 Claude Code sessions |
| 4 Visualization upgrades | 3–4 Claude Code sessions |
| 5 Text regeneration | 1 Claude Code session + editing |
| 6 Comparative analysis | 1–2 Claude Code sessions |

Total human time outside Claude Code: roughly 10–15 hours, concentrated in Phases 1.3 and 2.3 where philosophical judgment is required and cannot be delegated.
