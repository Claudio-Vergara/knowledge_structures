# Mapping the Logical Structure of Unstructured Political Texts
## Project Plan: US Constitution + Federalist Papers

---

## The Core Problem and How It Differs from Spinoza

With the Ethics, logical structure was explicit and authorially encoded. Every
proposition cited its premises. The graph was latent in the text, waiting to be
read off.

With the Constitution and Federalist Papers the situation is fundamentally
different in four ways:

**1. Structure must be extracted, not read.**
Neither document labels its claims as premises or conclusions. The logical
architecture is implicit in the prose and must be reconstructed by
interpretation.

**2. Two documents, two different logical registers.**
The Constitution is normative and prescriptive — it establishes rules.
The Federalist Papers are justificatory and rhetorical — they argue *why*
the rules are good. The relationship between them is not premise→conclusion
but something more like design→rationale, or rule→defense. This is an
inter-document argument structure, a harder problem than intra-document
mining.

**3. Arguments are probabilistic and empirical, not deductive.**
Spinoza's inferences are claimed to be logically necessary. Hamilton and
Madison argue from historical precedent, political theory, and anticipated
consequences. These are defeasible inferences — they can be weakened by
contrary evidence without being formally invalid.

**4. Multiple, sometimes conflicting voices.**
Hamilton and Madison don't always agree. The 85 Federalist Papers span
multiple authors and occasionally contain internal tensions. The graph
has to handle divergence, not just convergence.

Despite these differences, the same fragility framework applies — you're
still asking: which claims are load-bearing? Which survive scrutiny? What
collapses if a key inference is severed? The pipeline is harder to build
but the analytical payoff is the same.

---

## Document Corpus

```
Layer 0 — The Foundational Text
  US Constitution (1787, with Bill of Rights 1791)
  — 7 Articles + 10 Amendments
  — Each clause is a candidate node

Layer 1 — Justificatory Layer
  The Federalist Papers (1787–1788)
  — 85 essays by Hamilton (51), Madison (29), Jay (5)
  — Each essay advances claims about why constitutional provisions are
    justified, necessary, or superior to alternatives

Layer 2 — Optional Extension (later phases)
  Anti-Federalist Papers — the attack layer
  — Brutus, Centinel, Federal Farmer: systematic objections to the Constitution
  — These become the "attack" edges in the argument graph
  — Adding them transforms the graph from a support structure into a
    full adversarial argumentation framework (Dung-style)
```

---

## Phase 0 — Conceptual Groundwork

Before touching code, clarify what kind of nodes and edges this graph
will contain. This is the design decision that shapes everything downstream.

### 0.1 Node Typology

Unlike Spinoza, nodes here are not all of the same logical type.
Define at least four categories:

```
PROVISION    — A specific clause or section of the Constitution.
               Normative, not true/false but valid/invalid.
               Example: "Article I §8 — Congress shall have power to
               lay and collect taxes"

CLAIM        — A propositional assertion in the Federalist Papers
               that can be true or false.
               Example: "A large republic better controls faction than
               a small one" (Federalist No. 10)

PRINCIPLE    — A general political or theoretical premise invoked across
               multiple papers. More abstract than a claim.
               Example: "Ambition must be made to counteract ambition"
               Example: "Separation of powers prevents tyranny"

HISTORICAL   — An empirical premise drawn from historical precedent.
               Example: "The Athenian democracy collapsed due to faction"
               Example: "The Articles of Confederation failed to prevent
               interstate trade wars"
```

### 0.2 Edge Typology

Edges here carry richer semantics than in the Ethics:

```
SUPPORTS     — Premise supports conclusion (the basic inference edge)
JUSTIFIES    — A Federalist claim justifies a Constitutional provision
               (the inter-document link)
ENTAILS      — Strict logical consequence (rare in this corpus)
EXEMPLIFIES  — Historical case used as evidence for a general claim
ATTACKS      — One claim undermines another (Anti-Federalist layer)
QUALIFIES    — A claim limits the scope of another without refuting it
```

### 0.3 Granularity Decision

This is the most consequential design choice. Options:

- **Clause-level**: Each constitutional clause is a node; each paragraph
  in the Federalist Papers is a cluster of claims. ~200–400 nodes.
  Manageable, loses nuance.

- **Sentence-level**: Each sentence is a candidate node. ~8,000+ nodes.
  Very granular, most sentences are not argumentatively significant.

- **Argument-component level**: Extract only the argumentatively
  significant units — claims, premises, conclusions — and discard
  transitional, rhetorical, and expository text. This is what argument
  mining does. Estimated ~600–1,200 nodes for the full corpus.
  Recommended.

Recommendation: **argument-component level**, with clause-level nodes for
the Constitution and extracted argument components for the Federalist Papers.

---

## Phase 1 — Corpus Preparation

**Goal:** Clean, segmented, and citable source text for all documents.

### 1.1 Fetch and Structure the Constitution

```
Source: archives.gov or Avalon Project (Yale Law School)
Structure:
  - Article → Section → Clause as a three-level hierarchy
  - Each clause gets a stable ID: e.g. "ART1.S8.C1" (Article 1, Section 8,
    Clause 1 — the taxing power)
  - Amendments get IDs: "AM1", "AM2", ... "AM10"
  - Store as JSON: { id, article, section, clause, text, type: "PROVISION" }
```

The Constitution is short (~4,500 words). This is largely a manual
structuring task — one Claude Code session.

### 1.2 Fetch and Structure the Federalist Papers

```
Source: gutenberg.org (complete text) or avalon.law.yale.edu
Structure:
  - Each paper gets a parent node: "FED10", "FED51", etc.
  - Store full text per paper with metadata:
    { id, number, title, author, date, text }
```

The Federalist Papers are ~175,000 words across 85 essays.
This is the bulk of the corpus.

### 1.3 Build a Provision→Paper Cross-Reference Index

Manually (or with LLM assistance) build a lookup table:
which Federalist Papers discuss which constitutional provisions?

```json
{
  "ART1.S8.C1": ["FED30", "FED34", "FED35", "FED36"],
  "ART2.S2.C1": ["FED69", "FED74"],
  "AM1": ["FED84"]
}
```

This is essential scaffolding. It constrains the argument mining search
space — instead of looking for links between all 85 papers and all 200+
clauses, you search only within the relevant paper/provision pairs.

**Deliverable:** `src/data/constitution.json`, `src/data/federalist.json`,
`src/data/cross_reference.json`

---

## Phase 2 — Intra-Document Argument Extraction

**Goal:** Extract the argument structure *within* each Federalist Paper
before tackling cross-document links.

This is where argument mining enters. The task for each paper is:

1. **Segment** the text into argument components
   (claim, premise, conclusion, non-argumentative filler)
2. **Classify** each component's role
3. **Link** components within the paper
   (which premises support which claims)

### 2.1 LLM-Based Argument Component Extraction

For each Federalist Paper, run a structured extraction prompt:

```
You are analyzing Federalist No. {N} by {author} for its argument structure.

Your task:
1. Identify every CLAIM — a propositional assertion the author is making
2. Identify every PREMISE — a reason or evidence offered for a claim
3. Identify every PRINCIPLE — a general theoretical premise invoked
4. Identify every HISTORICAL — an empirical/historical evidence unit
5. For each claim, identify which premises/principles/historicals support it
6. Identify if any claims attack or qualify other claims

Output as JSON:
{
  "components": [
    {
      "id": "FED10.C1",
      "type": "CLAIM" | "PREMISE" | "PRINCIPLE" | "HISTORICAL",
      "text": "...",          // exact quote from source
      "paraphrase": "...",    // your condensed restatement (≤15 words)
      "location": "paragraph N"
    }
  ],
  "relations": [
    {
      "from": "FED10.P3",
      "to": "FED10.C1",
      "type": "SUPPORTS" | "ATTACKS" | "QUALIFIES" | "EXEMPLIFIES",
      "strength": 0.0–1.0    // how directly does the from-component
                              // support/attack the to-component?
    }
  ]
}
```

Run this for all 85 papers. ~85 API calls, each processing one essay.

### 2.2 Quality Review Protocol

LLMs are good at identifying explicit argumentative structures but miss:
- Implicit premises (unstated assumptions)
- Irony and rhetorical hedging
- Arguments that span non-adjacent paragraphs

Prioritize review of the 10 most structurally important papers:
No. 10 (faction), No. 51 (separation of powers), No. 70 (executive energy),
No. 78 (judicial review), No. 84 (bill of rights), and the 5 papers by Jay
(foreign affairs).

### 2.3 Principle Deduplication

Many papers invoke the same principles ("separation of powers prevents
tyranny", "a large republic controls faction better"). These should resolve
to shared PRINCIPLE nodes rather than duplicates. Run a deduplication pass:

For each set of PRINCIPLE components across papers, cluster by semantic
similarity (embedding distance) and merge clusters into canonical principle
nodes with IDs like `PRIN.separation_of_powers`, `PRIN.faction_control` etc.

This is the step that reveals the deep structure — the handful of
theoretical commitments that underpin the entire constitutional argument.

**Deliverable:** `src/data/components_{paper_id}.json` for all 85 papers,
`src/data/principles.json` (deduplicated canonical principles)

---

## Phase 3 — Inter-Document Argument Linking

**Goal:** Connect Federalist Paper arguments to constitutional provisions.

This is the hardest phase and the novel contribution of the project.
The relationship between a Federalist argument and a constitutional
provision is not a standard logical dependency — it's a *justificatory*
relationship. The provision doesn't follow from the argument; rather,
the argument is offered as a reason to accept the provision.

### 3.1 Justification Edge Extraction

For each (provision, paper) pair in the cross-reference index, extract
the specific JUSTIFIES edges:

```
Prompt:
Constitutional provision: {text of ART1.S8.C1}
Federalist Paper excerpt: {relevant paragraphs from FED30}

Which specific claims or conclusions in this excerpt are offered as
justifications for this constitutional provision? That is, which
argument components have the provision as their intended conclusion?

Output:
[
  {
    "from": "FED30.C4",
    "to": "ART1.S8.C1",
    "type": "JUSTIFIES",
    "mechanism": "shows necessity" | "shows sufficiency" |
                 "shows superiority over alternatives" | "preempts objection",
    "strength": 0.0–1.0
  }
]
```

### 3.2 Principle→Provision Links

Some constitutional provisions are justified not by arguments in specific
papers but by invocation of general principles. Extract these:

```
PRIN.separation_of_powers → ART1 (entire legislative structure)
PRIN.faction_control → ART1.S2 (House composition)
PRIN.energy_in_executive → ART2.S1 (single executive)
```

These are the deepest structural links — if a principle is attacked, every
provision it supports is downstream.

### 3.3 The Implicit Premise Problem

Political arguments routinely rely on unstated premises. For example,
Madison's argument in Federalist No. 10 that a large republic controls
faction better than a small one implicitly assumes:
- That faction is the primary threat to republican government
- That geographic diversity produces diversity of interests
- That representatives are more capable of discerning the public good
  than direct participants

These implicit premises are not stated but are logically necessary for
the argument to work. They are also exactly the premises that Anti-Federalists
contested.

Extraction prompt variant:
```
For this argument: {FED10.C1 + its explicit premises}
What unstated premises are required for this inference to be valid?
These are claims the argument would need to be true but does not assert.
```

Flag all implicit premises with `implicit: true` in the schema.
They are attack surfaces that would be invisible in a purely extractive
approach.

**Deliverable:** `src/data/inter_document_links.json`,
`src/data/implicit_premises.json`

---

## Phase 4 — Graph Construction and Validation

**Goal:** Assemble the full multi-document argument graph and validate it.

### 4.1 Node and Edge Assembly

Merge all components into a unified graph:

```
Nodes:
  - Constitutional provisions (from Phase 1.1)
  - Federalist argument components (from Phase 2.1)
  - Canonical principles (from Phase 2.3)
  - Historical premises (from Phase 2.1)
  - Implicit premises (from Phase 3.3)

Edges:
  - Intra-paper support/attack links (from Phase 2.1)
  - JUSTIFIES links provision←argument (from Phase 3.1)
  - Principle→provision links (from Phase 3.2)
  - Principle→argument links (from Phase 2.1)
```

Expected scale: ~800–1,500 nodes, ~2,000–4,000 edges.

### 4.2 Graph Validation Checks

Before analysis, verify structural integrity:

- **Acyclicity:** The justificatory structure should be a DAG.
  Cycles indicate a circular argument — flag them for human review.
- **Connectivity:** Every constitutional provision should have at least
  one incoming JUSTIFIES edge. Undefended provisions are noted.
- **Orphaned arguments:** Federalist claims that justify no provision
  and support no other claim are rhetorical filler — mark them as
  `argumentative_role: "rhetorical"`.
- **Principle coverage:** Each canonical principle should connect to
  at least 2 provisions. Single-use principles may be mislabeled
  as principles rather than claims.

### 4.3 Human Spot-Check

Review 50 randomly sampled edges — 10 per edge type — and assess
whether the link is genuine. Track precision. Target >80% precision
before proceeding to fragility analysis.

If precision is low, refine the extraction prompts in Phase 2–3 and
re-run.

**Deliverable:** `src/data/argument_graph.json` — the unified graph,
validated.

---

## Phase 5 — Flakiness Annotation

**Goal:** Assign a flakiness score to every edge.

The flakiness rubric from the Spinoza project applies, but needs
two additions for political/empirical arguments:

### 5.1 Extended Flakiness Rubric

| Score | Meaning |
|-------|---------|
| 0.0–0.1 | Definitional or tautological. The connection is true by definition. |
| 0.2–0.3 | Strong empirical support. The historical premise is well-documented and uncontested. |
| 0.4–0.5 | Plausible but contested. Reasonable people disagree on the empirical claim or the inference. |
| 0.6–0.7 | Historically challenged. The premise or inference has been substantially refuted by subsequent history or scholarship. |
| 0.8–0.9 | Largely discredited. Most scholars or subsequent events have undermined this inference. |
| 1.0 | Demonstrably false or invalid. The premise is historically or logically broken. |

Note: For empirical/historical premises, flakiness can be grounded in
what actually happened — e.g. Madison's confidence in the Senate as a
check on faction was tested by the Civil War.

### 5.2 Temporal Dimension

Unlike Spinoza, these arguments have a *history of testing*.
Assign each historical/empirical premise a `historical_verdict` field:

```
"historical_verdict": "confirmed" | "refuted" | "mixed" | "untested"
"verdict_evidence": "brief description of what happened"
```

This creates a second fragility layer: the *ex post* fragility, based on
what we now know, as distinct from the *ex ante* flakiness, based on the
quality of the inference at the time of writing.

Running the threshold filter on ex-post flakiness gives you
"The Constitution as the founders expected it to work."
Running it on ex-ante flakiness gives you
"The Constitution as it actually held up."

### 5.3 Batch LLM Annotation

Run the same batch annotation pipeline as the Spinoza project, adapted
for the political/empirical register.

**Deliverable:** `src/data/flakiness_annotated.json`

---

## Phase 6 — Anti-Federalist Attack Layer (Optional Extension)

**Goal:** Add the adversarial structure — arguments that attack the
Federalist justifications.

The Anti-Federalist Papers (Brutus, Federal Farmer, Centinel et al.)
are a systematic attack on the Constitution's justificatory structure.
Adding them transforms the graph from a support network into a full
Dung-style argumentation framework with attack relations.

For each Anti-Federalist objection:
1. Identify which Federalist claim or constitutional provision it targets
2. Classify the attack type:
   - `REBUTS` — directly contradicts the claim
   - `UNDERMINES` — attacks a premise the claim depends on
   - `UNDERCUTS` — argues the inference rule doesn't hold
3. Assign an attack strength (0–1)

The surviving structure at threshold T then becomes:
arguments that are not successfully attacked at that strength,
and provisions that remain justified after attacks are absorbed.

This directly enables the full Dung semantics:
a claim is *acceptable* if all its attackers are themselves attacked
by acceptable arguments.

---

## Phase 7 — Fragility Analysis and Visualization

**Goal:** Apply the fragility engine from the Spinoza project to this graph.

The fragility engine (`fragility.js`) is already built. It needs
minor adaptations:

- Support for `JUSTIFIES` edges (not just `SUPPORTS`)
- Support for `ATTACKS` edges (subtracts from, rather than adds to,
  a node's support)
- Handle PRINCIPLE nodes which have no premises (they are axioms in
  this system — their flakiness is assigned directly, not computed)

### 7.1 Key Analytical Questions

**Which constitutional provisions are most thinly justified?**
Provisions with few incoming JUSTIFIES edges, or where all justifying
arguments have high flakiness. These are the constitutionally vulnerable
clauses — defensible politically but argued weakly.

**Which Federalist principles are load-bearing?**
Principles that appear in every surviving support set for a large number
of provisions. `PRIN.separation_of_powers` and `PRIN.faction_control`
are candidates for very high criticality scores.

**What collapses if Madison's faction theory fails?**
Federalist No. 10's large-republic thesis is probably the most famous
argument in the corpus. Tracing its collapse footprint reveals how much
of the constitutional structure depends on it being right.

**Do Hamilton and Madison's arguments have different fragility profiles?**
Hamilton tends toward structural/institutional arguments;
Madison toward theoretical/philosophical ones. Their arguments may
have systematically different fragility characteristics.

**What is constitutionally orphaned at threshold 0.7?**
Which provisions have no adequately-argued justification once weak
inferences are removed? These are the provisions that were adopted
on political rather than intellectual grounds.

### 7.2 Visualization

Extend the existing React visualization with:

- **Document-layer filter**: toggle between showing Constitution nodes,
  Federalist nodes, or both
- **Author filter**: isolate Hamilton vs Madison vs Jay subgraphs
- **Temporal filter**: show ex-ante vs ex-post flakiness
- **Provision highlight**: click a constitutional clause to see all its
  Federalist justifications and their flakiness
- **Principle centrality view**: nodes sized by number of provisions
  they (transitively) justify

---

## Phase 8 — The Generalized Pipeline

**Goal:** Extract the general tooling so any text corpus can be analyzed.

The Constitution + Federalist Papers project reveals the general pipeline
for unstructured texts:

```
1. SEGMENT        — Break text into citable units
2. CLASSIFY       — Label each unit's argumentative role
3. LINK (intra)   — Connect units within a document
4. LINK (inter)   — Connect units across documents
5. DEDUPLICATE    — Merge shared concepts into canonical nodes
6. VALIDATE       — Check graph integrity
7. ANNOTATE       — Assign flakiness/strength to edges
8. ANALYZE        — Run fragility engine
9. VISUALIZE      — Display and explore
```

Steps 1–6 are the new work this project adds on top of the Spinoza
pipeline. Steps 7–9 are already built and reusable.

Package this as a general library:

```
src/
  pipeline/
    segmenter.js        — splits document into citable units
    classifier.js       — LLM-based component type labeling
    linker_intra.js     — intra-document argument extraction
    linker_inter.js     — inter-document justification extraction
    deduplicator.js     — semantic clustering for shared concepts
    validator.js        — graph integrity checks
  engine/
    fragility.js        — already built (Spinoza project)
  prompts/
    classify.md         — prompt templates, parameterized by text type
    link_intra.md
    link_inter.md
    flakiness.md
```

Future corpora that could go through this pipeline:
- John Rawls' *A Theory of Justice*
- Kant's *Groundwork* (semi-structured, like Spinoza)
- The Declaration of Independence + Common Sense (short, tractable)
- The Communist Manifesto + Capital Vol. 1 (test for economic arguments)
- Any supreme court majority + dissent pair

---

## Project Structure

```
constitution-argument-map/
  src/
    data/
      constitution.json             — Phase 1.1
      federalist.json               — Phase 1.2
      cross_reference.json          — Phase 1.3
      components_{paper_id}.json    — Phase 2.1 (85 files)
      principles.json               — Phase 2.3
      inter_document_links.json     — Phase 3.1
      implicit_premises.json        — Phase 3.3
      argument_graph.json           — Phase 4.1 (unified)
      flakiness_annotated.json      — Phase 5.3
    pipeline/
      segmenter.js
      classifier.js
      linker_intra.js
      linker_inter.js
      deduplicator.js
      validator.js
    engine/
      fragility.js                  — reused from Spinoza project
    components/
      ConstitutionGraph.jsx
      FragilityPanel.jsx
      AuthorFilter.jsx
      DocumentLayerToggle.jsx
    App.jsx
    main.jsx
  scripts/
    fetch_corpus.js
    extract_components.js           — Phase 2 batch job
    extract_links.js                — Phase 3 batch job
    annotate_flakiness.js           — Phase 5 batch job
  analysis/
    fragility_report.json
    orphaned_provisions.json
    principle_centrality.json
  index.html
  package.json
  CLAUDE.md
```

---

## Key Differences from Spinoza Pipeline (Summary)

| Dimension | Spinoza | Constitution + Federalist |
|-----------|---------|--------------------------|
| Structure | Explicit, authorially encoded | Implicit, must be extracted |
| Node types | Uniform (proposition) | Heterogeneous (provision, claim, principle, historical) |
| Edge types | Support only | Support, justification, attack, exemplification |
| Documents | 1 | 87+ (growing with Anti-Federalist layer) |
| Inference type | Deductive | Defeasible/probabilistic |
| Flakiness basis | Logical validity | Logical validity + historical track record |
| Temporal dimension | None | Ex-ante vs ex-post |
| Attack structure | External to corpus | Endogenous (Anti-Federalist Papers) |

---

## Rough Effort Estimate

| Phase | Effort |
|-------|--------|
| 0 — Conceptual groundwork | 2–3 hours design work |
| 1 — Corpus preparation | 1 Claude Code session + 2h manual structuring |
| 2 — Intra-doc extraction (85 papers) | 2–3 Claude Code sessions + review |
| 3 — Inter-doc linking | 2 Claude Code sessions + review |
| 4 — Graph construction and validation | 1 Claude Code session |
| 5 — Flakiness annotation | 1 Claude Code session + 3–4h review |
| 6 — Anti-Federalist layer (optional) | 2 Claude Code sessions |
| 7 — Fragility analysis + visualization | 2–3 Claude Code sessions |
| 8 — Generalized pipeline | 2 Claude Code sessions |

The concentrated human effort is in Phase 0 (deciding what counts as a
node and an edge — this shapes everything), Phase 2 review (checking the
LLM's component extraction against the actual text), and Phase 5 review
(calibrating flakiness for empirical/historical claims, which requires
historical judgment the LLM can only partially provide).

---

## The Deepest Risk: What Kind of Graph Is This?

The fundamental challenge this project has to confront is that the
relationship between the Federalist Papers and the Constitution is not
purely logical. It is partly logical (some provisions follow from
some principles), partly rhetorical (some arguments are persuasive without
being valid), partly historical (some arguments are justified by precedent),
and partly political (some provisions reflect compromises that no argument
adequately justifies).

The fragility analysis is most meaningful for the logical and historical
layers. It is less meaningful — but still interesting — for the rhetorical
layer, where "flakiness" becomes something closer to "persuasive weakness."
And it's honest to acknowledge that the political layer (slavery provisions,
the Three-Fifths Compromise, the Senate's equal-state representation) may
be largely unjustifiable at any threshold — the graph would show these
provisions as orphaned not because the arguments are weak but because there
were never serious arguments to begin with.

That result — which provisions were always politically rather than
intellectually grounded — is perhaps the most philosophically interesting
output the project could produce.
