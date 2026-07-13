import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('ethics.json', 'utf8'));
const elements = data.elements;
const validIds = new Set(elements.map(e => e.id));

// parts with exactly one axiom → a number-less "the axiom of this part" is unambiguous
const singularAxiom = {};
{
  const ax = {};
  for (const e of elements) if (e.kind === 'axiom') (ax[e.part] ??= []).push(e.id);
  for (const [p, list] of Object.entries(ax)) if (list.length === 1) singularAxiom[p] = list[0];
}

const PART_NUM = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
const NUM_PART = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };

function romanToInt(s) {
  const m = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
  let total = 0;
  for (let k = 0; k < s.length; k++) {
    const cur = m[s[k]];
    const next = m[s[k + 1]] || 0;
    if (cur == null) return null;
    total += cur < next ? -cur : cur;
  }
  return total;
}

const isUpperPart = t => Object.prototype.hasOwnProperty.call(PART_NUM, t);
const isRoman = t => /^[ivxlcdm]+$/.test(t);
const ORDINAL = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6,
  seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12,
  thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
  eighteenth: 18, nineteenth: 19, twentieth: 20 };
// words that point at the immediately preceding proposition
const PREV = new Set(['last', 'foregoing', 'preceding', 'aforesaid']);
const RELATIVE = new Set(['same', 'this', 'next', 'following', 'said', 'former', 'latter']);
const MODIFIER = new Set(['of', 'the', 'to', 'in', 'see', 'cf', 'by', 'from', 'evident']);
const NOTE = new Set(['note', 'schol', 'scholium', 'proof']);

// Tokenize into words (letters, keep trailing dot) and parentheses.
function tokenize(text) {
  const out = [];
  const re = /\(|\)|[A-Za-z]+\.?/g;
  let m;
  while ((m = re.exec(text))) out.push(m[0]);
  return out;
}

// Strip trailing dot, return {core, dotted}
function norm(tok) {
  const dotted = tok.endsWith('.');
  return { core: dotted ? tok.slice(0, -1) : tok, dotted };
}

// Resolve a single segment (a paren group's content, or an inline run).
// basePart: element part roman. prescanPart: allow uppercase part tokens to set the
// part for the whole segment (used for parenthetical groups).
function resolveSegment(tokens, basePart, prescanPart, prevPropId) {
  const refs = [];
  let part = basePart;
  let explicitPart = false;
  const prevProp = () => prevPropId;

  if (prescanPart) {
    for (let i = 0; i < tokens.length; i++) {
      const { core } = norm(tokens[i]);
      if (isUpperPart(core)) { part = core; explicitPart = true; }
      else if (core === 'Pt' || core === 'Part') {
        const nx = tokens[i + 1] && norm(tokens[i + 1]).core;
        if (nx && isRoman(nx)) { const n = romanToInt(nx); if (NUM_PART[n]) { part = NUM_PART[n]; explicitPart = true; } }
      }
    }
  }

  let mode = explicitPart ? 'PROP' : null; // implicit proposition when a part is named
  let pending = null;        // {prop, coroll}
  let expectPart = false;    // saw "Pt"/"Part", awaiting roman
  let generalFlag = false;
  let preNum = null;         // worded ordinal seen before its type ("third axiom")
  let preRel = false;        // worded "last/preceding" Prop. reference
  let axPending = false;     // saw "axiom" with no number yet ("the axiom of this part")
  let corollFirst = null;    // "Coroll(ary)" stated before its Prop. ("the Coroll. of Prop. lxiii.")

  const flush = () => {
    if (!pending) return;
    refs.push(pending.coroll != null ? `${pending.prop}.C${pending.coroll}` : pending.prop);
    pending = null;
  };
  // close out a reference at a run boundary; a dangling "Coroll." means corollary i.
  const endRef = () => {
    if (mode === 'COROLL' && pending && pending.coroll == null) pending.coroll = 1;
    flush();
    if (axPending) { if (singularAxiom[part]) refs.push(singularAxiom[part]); axPending = false; }
  };

  for (const tok of tokens) {
    const { core } = norm(tok);
    const lc = core.toLowerCase();

    if (expectPart) {
      if (isRoman(lc)) { const n = romanToInt(lc); if (NUM_PART[n]) part = NUM_PART[n]; expectPart = false; endRef(); mode = 'PROP'; continue; }
      expectPart = false;
    }

    if (isUpperPart(core)) { endRef(); part = core; mode = 'PROP'; continue; }
    if (core === 'Pt' || core === 'Part') { expectPart = true; continue; }
    if (lc === 'general') { generalFlag = true; continue; }
    if (lc === 'emotions') { endRef(); mode = 'DE'; part = 'III'; if (generalFlag) { refs.push('III.DEG'); generalFlag = false; mode = null; } continue; }
    if (Object.prototype.hasOwnProperty.call(ORDINAL, lc)) { preNum = ORDINAL[lc]; continue; } // "third" axiom
    if (PREV.has(lc)) { preRel = true; continue; }  // "last/preceding" proposition
    if (lc === 'one') {                             // "the preceding one" / "the last one"
      const sfx = corollFirst != null ? `.C${corollFirst}` : '';
      if (preRel) { const p = prevProp(); if (p) refs.push(p + sfx); }
      else if (preNum != null) refs.push(`${part}.P${preNum}${sfx}`);
      preRel = false; preNum = null; corollFirst = null; continue;
    }
    if (lc === 'def' || lc === 'deff' || lc === 'definition' || lc === 'definitions') {
      endRef(); if (preNum != null) { refs.push(`${part}.D${preNum}`); preNum = null; } else mode = 'DEF'; preRel = false; corollFirst = null; continue;
    }
    if (lc === 'prop' || lc === 'props' || lc === 'proposition' || lc === 'propositions') {
      endRef();
      const sfx = corollFirst != null ? `.C${corollFirst}` : '';
      if (preNum != null) { refs.push(`${part}.P${preNum}${sfx}`); preNum = null; corollFirst = null; }
      else if (preRel) { const p = prevProp(); if (p) refs.push(p + sfx); corollFirst = null; }
      else mode = 'PROP';   // corollFirst (if any) consumed when the number arrives
      preRel = false; continue;
    }
    if (lc === 'ax' || lc === 'axiom' || lc === 'axioms') {
      endRef(); if (preNum != null) { refs.push(`${part}.A${preNum}`); preNum = null; } else { mode = 'AX'; axPending = true; } preRel = false; corollFirst = null; continue;
    }
    if (lc === 'coroll' || lc === 'corollary' || lc === 'corollaries') {
      if (pending) { if (preNum != null) { pending.coroll = preNum; preNum = null; } else mode = 'COROLL'; }
      else corollFirst = preNum != null ? preNum : 1;   // stated before its Prop.
      preNum = null; preRel = false; continue;
    }
    if (NOTE.has(lc)) { mode = 'NOTE'; continue; }  // note/scholium: ref is the prop itself
    if (lc === 'and' || lc === 'or') {              // list connector — next item is a new ref
      if (mode === 'COROLL') { if (pending && pending.coroll == null) pending.coroll = 1; flush(); mode = 'PROP'; }
      continue;                                     // for DEF/AX/DE/PROP lists, keep the type
    }
    if (RELATIVE.has(lc)) { continue; }            // unresolved relative ref
    if (MODIFIER.has(lc)) { continue; }            // connector / filler — keep state

    if (isRoman(lc) && lc !== 'c') {               // 'c' alone is the "&c." abbreviation
      const n = romanToInt(lc);
      if (n == null) { continue; }
      if (mode === 'NOTE') continue;               // swallow the note number
      if (mode === 'DEF') refs.push(`${part}.D${n}`);
      else if (mode === 'AX') { refs.push(`${part}.A${n}`); axPending = false; }
      else if (mode === 'DE') refs.push(`${part}.DE${n}`);
      else if (mode === 'COROLL') { if (pending) pending.coroll = n; mode = null; }
      else if (mode === 'PROP') { flush(); pending = { prop: `${part}.P${n}`, coroll: corollFirst }; corollFirst = null; }
      continue;
    }

    // any other plain word ends the current citation run
    endRef();
    mode = null;
    corollFirst = null;
    preNum = null; preRel = false;
    if (!prescanPart) part = basePart; // inline: revert to element's part between runs
  }
  endRef();
  // a trailing "...of the last/preceding" with no governing type → previous proposition
  if (preRel) { const p = prevProp(); if (p) refs.push(p); }
  return refs;
}

// Split proof into top-level paren groups and inline runs, resolve each.
function resolveProof(proof, basePart, prevPropId) {
  if (!proof) return [];
  const tokens = tokenize(proof);
  const refs = [];
  let depth = 0;
  let buf = [];
  const flushInline = () => { if (buf.length) refs.push(...resolveSegment(buf, basePart, false, prevPropId)); buf = []; };
  let group = [];
  for (const tok of tokens) {
    if (tok === '(') {
      if (depth === 0) { flushInline(); group = []; }
      else group.push(tok);
      depth++;
    } else if (tok === ')') {
      depth--;
      if (depth === 0) { refs.push(...resolveSegment(group, basePart, true, prevPropId)); group = []; }
      else if (depth > 0) group.push(tok);
    } else {
      if (depth > 0) group.push(tok);
      else buf.push(tok);
    }
  }
  flushInline();
  return refs;
}

const partRank = { D: 0, A: 1, P: 2, DE: 3 };
function sortKey(id) {
  const [pp, rest] = [id.split('.')[0], id.split('.').slice(1).join('.')];
  const pnum = PART_NUM[pp] || 9;
  const m = rest.match(/^(DE|DEG|D|A|P)(\d*)(?:\.C(\d+))?/);
  const kind = m ? m[1] : '';
  const num = m && m[2] ? parseInt(m[2], 10) : 0;
  const cor = m && m[3] ? parseInt(m[3], 10) : 0;
  const rank = kind === 'DEG' ? 4 : (partRank[kind] ?? 5);
  return [pnum, rank, num, cor];
}
function cmp(a, b) { const ka = sortKey(a), kb = sortKey(b); for (let i = 0; i < 4; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i]; return 0; }

const unresolved = {};
let totalRefs = 0;
function keep(raw, selfId) {
  const out = [];
  for (const r of raw) {
    if (validIds.has(r)) { if (r !== selfId) out.push(r); continue; }
    // corollary not extracted as its own element → fall back to the proposition
    const base = r.replace(/\.C\d+$/, '');
    if (base !== r && validIds.has(base)) { if (base !== selfId) out.push(base); continue; }
    unresolved[r] = (unresolved[r] || 0) + 1;
  }
  return out;
}
for (const el of elements) {
  if (el.kind === 'corollary') {
    // reasoning lives in the statement; "the last Prop." = the owning proposition.
    // Derive the owner from the id (robust to re-runs that already rewrote parent).
    const owning = el.id.replace(/\.C\d+$/, '');
    const kept = keep(resolveProof(el.statement, el.part, owning), el.id);
    if (validIds.has(owning)) kept.push(owning);       // preserve structural link
    el.parent = [...new Set(kept)].sort(cmp);
    totalRefs += el.parent.length;
    continue;
  }
  if (!el.proof) { el.parent = el.parent ?? null; continue; }
  const pm = el.id.match(/\.P(\d+)/);
  const selfNum = pm ? parseInt(pm[1], 10) : 0;
  const prevPropId = selfNum > 1 ? `${el.part}.P${selfNum - 1}` : null;
  const kept = keep(resolveProof(el.proof, el.part, prevPropId), el.id);
  el.parent = [...new Set(kept)].sort(cmp);
  totalRefs += el.parent.length;
}

writeFileSync('ethics.json', JSON.stringify(data, null, 2) + '\n');

console.log('elements:', elements.length, 'total parent links:', totalRefs);
const u = Object.entries(unresolved).sort((a, b) => b[1] - a[1]);
console.log('distinct unresolved targets:', u.length);
console.log(u.slice(0, 40).map(([k, v]) => `${v}× ${k}`).join('\n'));

// spot-check
const check = elements.find(e => e.id === 'I.P10');
console.log('I.P10.parent =', JSON.stringify(check.parent));
