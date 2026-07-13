// Extract Spanish statements for every element in ethics.json from etica_spanish.txt.
// The Spanish source is a noisy OCR: paragraph breaks are inconsistent — some PROPOSICIÓN
// headings sit on their own line, others are jammed against a preceding "Demostración" or
// the following statement. Roman numerals are also unreliable (e.g. "VIH" for VIII,
// duplicated "PROPOSICIÓN II" lines, missing headings). We handle this by:
//   1. Normalising the source so every anchor (PROPOSICIÓN, Corolario, Demostración,
//      Escolio, Explicación, EXPLICACIÓN, Q.E.D., section headings) starts a fresh line.
//   2. Assigning IDs by *sequential order* within each Part rather than trusting the
//      literal Roman numeral, which is the least-brittle strategy given the OCR.
// Anything we cannot confidently match is left out — the UI falls back to English when a
// Spanish string is missing.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const SRC = resolve(root, "..", "..", "..", "simulation", "grid-sim", "docs", "etica_spanish.txt");
const OUT = resolve(root, "ethics_es.json");
const REF = resolve(root, "ethics.json");

const PART_KEYS = ["I", "II", "III", "IV", "V"];

// Anchors that must always start a fresh paragraph. Pre-processing inserts blank lines
// around each occurrence so paragraph splitting yields the intended blocks.
// Anchors we split on. Each must be followed by a colon or (for numbered variants) a
// numeral + colon so we don't split on in-line references like "por el Corolario 4" or
// "según la Definición 3". These are heading markers, not any occurrence of the word.
const ANCHOR_RES = [
  /\bPROPOSICI[ÓO]N\s+[IVXLCDM]/,
  /\bCorolario(?:\s+[IVX]+|\s+\d+)?\s*:/,
  /\bDemostración:/,
  /\bDemostracion:/,
  /\bEscolio(?:\s+[IVX]+|\s+\d+)?\s*:/,
  /\bExplicación:/,
  /\bEXPLICACIÓN:/,
  /\bExplicacion:/,
  /\bEXPLICACION:/,
  // Excursus anchors (Part II's physics interlude).
  /\bLema\s+[IVX]+\b/,
  /\bAxioma\s+[IVX]+\b/,
  /\bPOSTULADOS\b/,
];

// Read + normalise whitespace and CRLF.
const raw = readFileSync(SRC, "utf-8").replace(/\r\n/g, "\n");
let lines = raw.split("\n").map(l => l.replace(/[ \t]+$/g, ""));

// Turn every anchor occurrence into a paragraph boundary. Two steps:
//   (a) split any line that carries an anchor mid-line into "pre-anchor" + blank + "from
//       anchor onwards", so "Demostración: … Q.E.D. PROPOSICIÓN II" becomes two lines
//       separated by a blank.
//   (b) insert a blank line before any line whose *first non-space token* is an anchor
//       (PROPOSICIÓN, Corolario, Demostración, Escolio, Explicación). Without this
//       adjacent lines like "Demostración: … .\nPROPOSICIÓN II" would still merge into a
//       single paragraph even though each already starts with an anchor.
function anchorAtStart(line) {
  return ANCHOR_RES.some(re => {
    const m = re.exec(line);
    return m && m.index === 0;
  });
}
function splitOnAnchors(input) {
  const out = [];
  for (const line of input) {
    let rest = line;
    while (true) {
      let bestIdx = -1;
      for (const re of ANCHOR_RES) {
        const m = re.exec(rest);
        if (m && m.index > 0 && (bestIdx === -1 || m.index < bestIdx)) bestIdx = m.index;
      }
      if (bestIdx < 0) break;
      out.push(rest.slice(0, bestIdx).replace(/\s+$/g, ""));
      out.push("");
      rest = rest.slice(bestIdx);
    }
    // Prepend a blank line when this line starts with an anchor and the previous non-empty
    // output line is also non-empty (i.e. would otherwise merge into a single paragraph).
    if (anchorAtStart(rest) && out.length && out[out.length - 1].trim() !== "") out.push("");
    out.push(rest);
  }
  return out;
}
lines = splitOnAnchors(lines);

// Split into 5 Part blocks on lines that start with "PARTE PRIMERA/SEGUNDA/…".
const partStarts = [];
lines.forEach((l, i) => { if (/^PARTE\s+(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA)\b/i.test(l)) partStarts.push(i); });
if (partStarts.length !== 5) console.warn(`Expected 5 PARTE headers, found ${partStarts.length}`);
const partBlocks = partStarts.map((s, i) => {
  const e = i + 1 < partStarts.length ? partStarts[i + 1] : lines.length;
  return lines.slice(s, e);
});

// Break a block into paragraphs (contiguous non-blank lines joined with a single space).
function paragraphs(block) {
  const out = [];
  let buf = [];
  for (const l of block) {
    if (l.trim() === "") {
      if (buf.length) { out.push(buf.join(" ").replace(/\s+/g, " ").trim()); buf = []; }
    } else {
      buf.push(l);
    }
  }
  if (buf.length) out.push(buf.join(" ").replace(/\s+/g, " ").trim());
  return out;
}

// Top-level section keywords. Case-sensitive on purpose — Part II has an inner
// "POSTULADOS" heading inside its mechanical excursus that must not split the outer
// Proposiciones section. Part IV uses singular "Axioma"; Part V uses "Axiomas".
const SECTION_RE = /^(Definiciones de los afectos|Definición general de los afectos|Definiciones|Axiomas?|Postulados|Proposiciones|Apéndice|Prefacio)\s*$/;

// A definition/axiom entry starts with a numeral-like token followed by ". —". OCR
// substitutions we've seen: "ll" (II), "HI" (III), "MI" (III), "VIH" (VIII), "IM" (III),
// "[.", "|.". We accept any short prefix ending with a period.
// OCR substitutions we've observed for numeral tokens: "ll" (II), "HI" (III), "MI" (III),
// "VIH" (VIII), "IM" (III), "[.", "|.", "XXVI!" (XXVII). We accept any short prefix of
// numeral-lookalike characters ending with ". —".
const ITEM_RE = /^([A-Za-z\[\]|.!]{1,8})\.\s*[—\-–,]\s*(.+)$/;
// Same but for the mid-paragraph split lookahead — see extractNumberedItems.
const ITEM_LOOKAHEAD = /\s+(?=[A-Za-z\[\]|.!]{1,6}\.\s*[—\-–])/g;

function splitSections(block) {
  const headers = [];
  block.forEach((l, i) => {
    const m = SECTION_RE.exec(l.trim());
    if (m) headers.push({ i, name: m[1].toLowerCase() });
  });
  const sections = {};
  headers.forEach((h, k) => {
    const end = k + 1 < headers.length ? headers[k + 1].i : block.length;
    const body = block.slice(h.i + 1, end);
    if (!(h.name in sections)) sections[h.name] = body;
  });
  return sections;
}

function extractNumberedItems(body) {
  const paras = paragraphs(body);
  const out = [];
  // Splits a paragraph that packs several sequential items onto adjacent lines with no
  // blank between them (seen at DE45–DE47 in Part III: "XLV. —La gula … XLVI. —La
  // embriaguez … XLVII. —La avaricia …"). The lookahead marker is a numeral-like token
  // followed by ". —" (or ".–", ".-"), which is how every entry in this file opens.
  for (const p of paras) {
    if (/^(explicación|explicacion|EXPLICACIÓN|EXPLICACION)/i.test(p)) continue;
    for (const chunk of p.split(ITEM_LOOKAHEAD)) {
      const m = ITEM_RE.exec(chunk);
      if (!m || m[1].length > 6) continue;
      out.push(m[2].trim());
    }
  }
  return out;
}

// A paragraph that begins with the PROPOSICIÓN heading. After the pre-processing step the
// heading is on its own paragraph, but sometimes the statement text follows on the same
// paragraph — we handle both forms.
const PROP_HEAD_RE = /^PROPOSICI[ÓO]N\b\s*([A-Za-z|.]{0,10})?\s*(.*)$/;

const DEMO_RE     = /^(demostración|demostracion)\b/i;
// "Non-proposition" bodies that we skip while still allowing recovery immediately after —
// Escolios and Explicaciones can precede a missing (header-less) proposition.
const ESCO_RE     = /^(escolio|escolios|otra demostración|apéndice|de otra manera|explicación|explicacion|EXPLICACIÓN|EXPLICACION)/i;
// Excursus anchors — Part II's physics interlude (Lema, Axioma I/II, POSTULADOS,
// singular "Definición"). These open sub-blocks that carry their own Demostraciones, and
// their statements must NOT be recovered as propositions.
const EXCURSUS_RE = /^(lema\s+[IVX]+|axioma\s+[IVX]+|POSTULADOS|definición\s*$|postulado\s+[IVX]+)/i;
const COR_RE      = /^Corolario(?:\s+([IVX]+|\d+))?\s*[:.]\s*(.+)$/i;

function extractPropositions(body) {
  const paras = paragraphs(body);
  const out = [];
  let cur = null;
  let sawDemo = false;   // A Demostración has appeared for the current proposition.
  let inExcursus = false; // We are inside a Lema/Axioma-N/POSTULADOS sub-block.
  // Which "slot" the current Demostración body should be appended to — the proposition
  // itself (proof) or its most recent corollary (corollary proof). Reset on every anchor.
  let proofTarget = null;
  const startProof = (t) => { proofTarget = t; };
  const stopProof  = () => { proofTarget = null; };
  const pushProofPara = (text) => {
    if (!proofTarget) return;
    const key = proofTarget.k;
    proofTarget.obj[key] = proofTarget.obj[key] ? proofTarget.obj[key] + " " + text : text;
  };
  for (let idx = 0; idx < paras.length; idx++) {
    const p = paras[idx];
    const ph = PROP_HEAD_RE.exec(p);
    if (ph && /^PROPOSICI[ÓO]N/.test(p)) {
      cur = { statement: null, proof: null, corolls: [] };
      out.push(cur);
      const tail = ph[2] ? ph[2].trim() : "";
      if (tail) cur.statement = tail;
      sawDemo = false;
      inExcursus = false;
      stopProof();
      continue;
    }
    if (!cur) continue;
    if (DEMO_RE.test(p)) {
      sawDemo = true;
      // Route this demonstration body to the current corollary if we just captured one,
      // else to the proposition itself. Also seed with the paragraph's trailing text
      // after "Demostración:" so we don't lose the first sentence.
      const target = (cur.corolls.length && !cur.corolls[cur.corolls.length - 1].proof && !inExcursus)
        ? { obj: cur.corolls[cur.corolls.length - 1], k: "proof" }
        : (!inExcursus ? { obj: cur, k: "proof" } : null);
      startProof(target);
      const seed = p.replace(/^(demostración|demostracion)\s*:?\s*/i, "").trim();
      if (seed) pushProofPara(seed);
      continue;
    }
    if (EXCURSUS_RE.test(p)) { inExcursus = true; stopProof(); continue; }
    if (ESCO_RE.test(p)) { stopProof(); continue; }
    const cor = COR_RE.exec(p);
    // Corollaries inside the physics excursus (Lema III has one) belong to the Lema, not
    // to the containing proposition — drop them.
    if (cor && !inExcursus) {
      cur.corolls.push({ label: cor[1] || null, text: cor[2].trim(), proof: null });
      stopProof();
      continue;
    }
    if (cor) { stopProof(); continue; }
    if (cur.statement === null) { cur.statement = p.trim(); continue; }
    // Recovery for OCR-dropped PROPOSICIÓN headings: an unclassified paragraph *followed*
    // by "Demostración" is the statement of a header-less proposition. Two guards keep
    // false positives out:
    //   (a) sawDemo — we must have already seen a Demostración, so the current statement
    //       is complete and this isn't a continuation of it.
    //   (b) !inExcursus — Part II's physics interlude has its own Demostraciones under
    //       Lema/Axioma headings, and those must not be recovered as propositions.
    const nextPara = idx + 1 < paras.length ? paras[idx + 1] : "";
    if (sawDemo && !inExcursus && DEMO_RE.test(nextPara)) {
      cur = { statement: p.trim(), proof: null, corolls: [] };
      out.push(cur);
      sawDemo = false;
      stopProof();
      continue;
    }
    // Otherwise, if we're currently collecting a Demostración body, this is a
    // continuation paragraph of it.
    if (proofTarget) pushProofPara(p.trim());
  }
  return out;
}

// Strip OCR footnote-marker artifacts from an extracted statement. The scanner peppers
// the text with tokens like "!?0!", "l*01", "!*%!", "[?21]", "!?4l," which are attempts
// at footnote superscripts. They read as garbage and add no meaning — we drop them.
function clean(text) {
  return text
    .replace(/[!\[]{1,2}[^A-Za-zÁÉÍÓÚáéíóúñÑü\s]{1,6}[!\]]{1,2}/g, "")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// Build the ID → Spanish statement mapping (and ID → Spanish proof mapping).
const result = {};
const proofs = {};

partBlocks.forEach((block, idx) => {
  const partKey = PART_KEYS[idx];
  const sections = splitSections(block);

  if (sections["definiciones"]) {
    const defs = extractNumberedItems(sections["definiciones"]);
    defs.forEach((text, i) => { result[`${partKey}.D${i + 1}`] = clean(text); });
  }

  const axBody = sections["axiomas"] || sections["axioma"];
  if (axBody) {
    const axs = extractNumberedItems(axBody);
    if (axs.length === 0) {
      const paras = paragraphs(axBody).filter(p => p && !/^(explicación|explicacion)/i.test(p));
      if (paras.length) result[`${partKey}.A1`] = clean(paras[0]);
    } else {
      axs.forEach((text, i) => { result[`${partKey}.A${i + 1}`] = clean(text); });
    }
  }

  if (sections["definiciones de los afectos"]) {
    const des = extractNumberedItems(sections["definiciones de los afectos"]);
    des.forEach((text, i) => { result[`${partKey}.DE${i + 1}`] = clean(text); });
  }
  if (sections["definición general de los afectos"]) {
    const paras = paragraphs(sections["definición general de los afectos"])
      .filter(p => p && !/^(explicación|explicacion)/i.test(p));
    if (paras.length) result[`${partKey}.DEG`] = clean(paras[0]);
  }

  if (sections["proposiciones"]) {
    const props = extractPropositions(sections["proposiciones"]);
    props.forEach((p, i) => {
      const pid = `${partKey}.P${i + 1}`;
      if (p.statement) result[pid] = clean(p.statement);
      if (p.proof) proofs[pid] = clean(p.proof);
      p.corolls.forEach((c, j) => {
        const cid = `${pid}.C${j + 1}`;
        result[cid] = clean(c.text);
        if (c.proof) proofs[cid] = clean(c.proof);
      });
    });
  }
});

// Coverage report against ethics.json.
const eng = JSON.parse(readFileSync(REF, "utf-8"));
const engIds = eng.elements.map(e => e.id);
const missing = engIds.filter(id => !(id in result));
const extra = Object.keys(result).filter(id => !engIds.includes(id));

writeFileSync(OUT, JSON.stringify({ statements: result, proofs }, null, 2));

// Proof-coverage report: how many of the propositions that have an English proof also
// have a Spanish proof? Corollary proofs aren't tracked in ethics.json today.
const engWithProof = eng.elements.filter(e => e.proof).map(e => e.id);
const proofMissing = engWithProof.filter(id => !(id in proofs));

console.log(`Wrote ${Object.keys(result).length} statements + ${Object.keys(proofs).length} proofs → ${OUT}`);
console.log(`Statement coverage: ${engIds.length - missing.length}/${engIds.length} (${missing.length} missing)`);
console.log(`Proof coverage:     ${engWithProof.length - proofMissing.length}/${engWithProof.length} (${proofMissing.length} missing)`);
if (missing.length) console.log("Missing statements:", missing.slice(0, 40).join(", "), missing.length > 40 ? "…" : "");
if (extra.length)   console.log("Extra statements:",   extra.slice(0, 20).join(", "),   extra.length   > 20 ? "…" : "");
if (proofMissing.length) console.log("Missing proofs:", proofMissing.slice(0, 20).join(", "), proofMissing.length > 20 ? "…" : "");
