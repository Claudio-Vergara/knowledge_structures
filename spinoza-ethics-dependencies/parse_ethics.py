# -*- coding: utf-8 -*-
import re, json

PATH = r"c:/code/sandbox/logics/kstruct/spinoza-ethics-v2/Spinoza_Ethics.txt"

def roman_to_int(r):
    vals = {'I':1,'V':5,'X':10,'L':50,'C':100}
    total = 0; prev = 0
    for ch in reversed(r):
        v = vals[ch]
        if v < prev: total -= v
        else: total += v; prev = v
    return total

with open(PATH, encoding='utf-8') as f:
    raw_lines = f.readlines()

# Each paragraph is a single non-blank line. Strip line numbers not present.
lines = [ln.rstrip('\n') for ln in raw_lines]

PART_RE   = re.compile(r'^PART\s+(IX|IV|V?I{0,3})[.:](\s|$)')
ROMAN_RE  = re.compile(r'^([IVXLC]+)\.\s+(.*)$')
DEF_FULL_RE = re.compile(r'^DEFINITION\s+([IVXLC]+)\.\s+(.*)$')
PROP_RE   = re.compile(r'^PROP\.\s+([IVXLC]+)\.\s+(.*)$')
COROLL_RE = re.compile(r'^(?:Corollary|Coroll\.)\s*(?:([IVXLC]+)\.?)?\s*[—.\-]+\s*(.*)$')
PROOF_RE  = re.compile(r'^(?:Proof|Another proof)\s*[—.\-]+\s*(.*)$', re.IGNORECASE)

elements = []
part = None
mode = 'skip'          # def | ax | prop | skip
ax_count = 0
cur_prop = None        # dict reference
cur_prop_id = None
cor_count = 0
in_digression = False
general_done = False
no_proof_props = []

def is_skippable(s):
    return (not s.strip() or s.startswith('(') or s.startswith('[')
            or s.startswith('N.B') or s.startswith('Explanation')
            or s.startswith('*') )

for ln in lines:
    s = ln.strip()
    if not s:
        continue

    m = PART_RE.match(s)
    if m:
        part = m.group(1)
        mode = 'skip'; ax_count = 0; cur_prop = None; in_digression = False
        continue

    # A PROP. line always (re)enters proposition mode, even after a
    # POSTULATES header or the physical digression interrupts the sequence.
    m = PROP_RE.match(s)
    if m:
        mode = 'prop'; in_digression = False
        num = roman_to_int(m.group(1)); txt = m.group(2).strip()
        cur_prop = {'id': f'{part}.P{num}', 'part': part,
            'kind': 'proposition', 'number': num,
            'statement': txt, 'proof': None, 'parent': None}
        cur_prop_id = cur_prop['id']
        cor_count = 0
        elements.append(cur_prop)
        continue

    # section headers
    head = s.rstrip('.:').strip().upper()
    if head in ('DEFINITIONS',):
        mode = 'def'; continue
    if head in ('AXIOMS','AXIOM'):
        mode = 'ax'; ax_count = 0; continue
    if head in ('PROPOSITIONS',):
        mode = 'prop'; cur_prop = None; in_digression = False; continue
    if head == 'DEFINITIONS OF THE EMOTIONS':
        mode = 'demotion'; continue
    if head == 'GENERAL DEFINITION OF THE EMOTIONS':
        mode = 'general'; general_done = False; continue
    if head in ('POSTULATES','PREFACE','APPENDIX'):
        mode = 'skip'; continue

    if mode == 'def':
        m = DEF_FULL_RE.match(s) or ROMAN_RE.match(s)
        if m and not is_skippable(s):
            num = roman_to_int(m.group(1)); txt = m.group(2).strip()
            elements.append({'id': f'{part}.D{num}', 'part': part,
                'kind': 'definition', 'number': num,
                'statement': txt, 'proof': None, 'parent': None})
        continue

    if mode == 'demotion':
        m = ROMAN_RE.match(s)
        if m and not is_skippable(s):
            num = roman_to_int(m.group(1)); txt = m.group(2).strip()
            elements.append({'id': f'{part}.DE{num}', 'part': part,
                'kind': 'definition', 'number': num,
                'statement': txt, 'proof': None, 'parent': None})
        continue

    if mode == 'general':
        if not is_skippable(s) and not general_done:
            elements.append({'id': f'{part}.DEG', 'part': part,
                'kind': 'definition', 'number': None,
                'statement': s, 'proof': None, 'parent': None})
            general_done = True
        continue

    if mode == 'ax':
        if is_skippable(s):
            continue
        m = ROMAN_RE.match(s)
        if m:
            num = roman_to_int(m.group(1)); txt = m.group(2).strip()
        else:
            num = ax_count + 1; txt = s
        ax_count = max(ax_count, num)
        elements.append({'id': f'{part}.A{num}', 'part': part,
            'kind': 'axiom', 'number': num,
            'statement': txt, 'proof': None, 'parent': None})
        continue

    if mode == 'prop':
        if s.startswith('LEMMA'):
            in_digression = True
            continue
        if in_digression:
            continue
        mc = COROLL_RE.match(s)
        if mc:
            cor_count += 1
            txt = mc.group(2).strip()
            elements.append({'id': f'{cur_prop_id}.C{cor_count}', 'part': part,
                'kind': 'corollary', 'number': cor_count,
                'statement': txt, 'proof': None, 'parent': cur_prop_id})
            continue
        mp = PROOF_RE.match(s)
        if mp and cur_prop is not None and cur_prop['proof'] is None \
                and s.lower().startswith('proof'):
            cur_prop['proof'] = mp.group(1).strip()
            continue
        continue

# --- post-processing cleanups ---
FOOTNOTE_RE = re.compile(r'\[\d+\]')
for e in elements:
    e['statement'] = FOOTNOTE_RE.sub('', e['statement']).strip()
    if e['proof']:
        e['proof'] = FOOTNOTE_RE.sub('', e['proof']).strip()

# I.P9 has no separate demonstration; its justification is the inline
# citation "(Def. iv.)" -> Part I, Definition 4.
for e in elements:
    if e['id'] == 'I.P9':
        e['proof'] = 'DI.4'

# Global running numbering: 'number' = position in textual order (1..N).
for i, e in enumerate(elements):
    e['number'] = i + 1

# report props with no proof
for e in elements:
    if e['kind'] == 'proposition' and not e['proof']:
        no_proof_props.append(e['id'])

from collections import Counter
c = Counter((e['part'], e['kind']) for e in elements)
print("COUNTS:")
for k in sorted(c, key=lambda x: (['I','II','III','IV','V'].index(x[0]), x[1])):
    print(f"  {k[0]:4} {k[1]:12} {c[k]}")
print("TOTAL:", len(elements))
print("\nPROPS WITH NO PROOF:", no_proof_props)

with open(r"c:/code/sandbox/logics/kstruct/spinoza-ethics-v2/ethics.json", 'w', encoding='utf-8') as f:
    json.dump({'elements': elements}, f, ensure_ascii=False, indent=2)
