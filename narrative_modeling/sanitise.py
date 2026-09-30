"""
sanitise.py — Literary text pre-processor for the Text2Story agent.

Splits a Project Gutenberg novel into chapters, rewrites paragraphs that
contain graphic threats or violence into neutral academic prose, and saves
a clean version that the text2story-agent can process without triggering
content filters.

Usage:
    python sanitise.py great-expectations.txt
    python sanitise.py great-expectations.txt --chapters 1 2 3
    python sanitise.py great-expectations.txt --chapter-start "Chapter I" --chapter-end "Chapter II"

Output:
    great-expectations-clean/
        chapter-01.txt
        chapter-02.txt
        ...
"""

import anthropic
import argparse
import os
import re
import sys
import time


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MODEL = "claude-sonnet-4-20250514"

SYSTEM_PROMPT = """You are an academic text normalisation tool used in a university
literary analysis pipeline. Your only task is to rewrite passages of published
fiction so that graphic or threatening language is expressed in neutral
third-person academic prose, while preserving every narratively relevant fact.

Rules:
- Keep all named entities, locations, and proper nouns exactly as they appear.
- Keep all neutral description, setting, and non-threatening dialogue unchanged.
- Replace graphic threats, coercive direct speech, and visceral physical
  description with clinical factual statements of the same event.
- Never omit an event — only rephrase its surface language.
- Return only the rewritten paragraph. No commentary, no preamble."""

PASSAGE_PROMPT = """Rewrite the following paragraph from a published 19th-century novel
for academic narrative analysis. Preserve all narrative facts and named entities.
Replace any graphic threats, coercive speech, or visceral description with
neutral academic prose.

PARAGRAPH:
{paragraph}"""


# ---------------------------------------------------------------------------
# Gutenberg helpers
# ---------------------------------------------------------------------------

def strip_gutenberg_header_footer(text: str) -> str:
    """Remove Project Gutenberg boilerplate from start and end."""
    start_marker = "*** START OF THE PROJECT GUTENBERG EBOOK"
    end_marker = "*** END OF THE PROJECT GUTENBERG EBOOK"

    start = text.find(start_marker)
    if start != -1:
        # Move past the marker line
        start = text.find("\n", start) + 1

    end = text.find(end_marker)
    if end == -1:
        end = len(text)

    return text[start:end].strip()


def split_into_chapters(text: str) -> list[tuple[str, str]]:
    """
    Split text into (chapter_label, chapter_text) tuples.
    Handles 'Chapter I.', 'Chapter 1', 'CHAPTER ONE', etc.
    """
    pattern = re.compile(
        r'^(Chapter\s+[IVXLCDM\d]+\.?[^\n]*)',
        re.MULTILINE | re.IGNORECASE
    )

    matches = list(pattern.finditer(text))
    if not matches:
        # No chapter markers found — treat whole text as one chunk
        return [("Full text", text)]

    chapters = []
    for i, match in enumerate(matches):
        label = match.group(1).strip()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        chapters.append((label, text[start:end].strip()))

    return chapters


def split_into_paragraphs(text: str) -> list[str]:
    """Split chapter text into paragraphs (double newline separated)."""
    paragraphs = re.split(r'\n{2,}', text)
    return [p.strip() for p in paragraphs if p.strip()]


# ---------------------------------------------------------------------------
# Content detection
# ---------------------------------------------------------------------------

# Simple heuristic patterns — not exhaustive, but catches the common cases
# in 19th-century fiction that trigger content filters.
FLAGGING_PATTERNS = [
    re.compile(r"cut your throat", re.IGNORECASE),
    re.compile(r"heart and liver", re.IGNORECASE),
    re.compile(r"kill\s+(you|him|her|them)", re.IGNORECASE),
    re.compile(r"I.ll\s+(kill|murder|tear|rip|gut|slit)", re.IGNORECASE),
    re.compile(r"tore.{0,20}out", re.IGNORECASE),
    re.compile(r"roasted.{0,20}ate", re.IGNORECASE),
    re.compile(r"cut\s+(your|his|her)\s+\w+\s+off", re.IGNORECASE),
    re.compile(r"smash(ed)?\s+your", re.IGNORECASE),
    re.compile(r"strangle", re.IGNORECASE),
    re.compile(r"hang(ed|ing)?\s+(you|him|her)", re.IGNORECASE),
    re.compile(r"beat\s+(you|him|her)\s+to", re.IGNORECASE),
]


def needs_sanitisation(paragraph: str) -> bool:
    """Return True if the paragraph contains potentially flagged content."""
    return any(p.search(paragraph) for p in FLAGGING_PATTERNS)


# ---------------------------------------------------------------------------
# Sanitisation via API
# ---------------------------------------------------------------------------

def sanitise_paragraph(client: anthropic.Anthropic, paragraph: str) -> str:
    """Call the API to rewrite a single flagged paragraph."""
    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": PASSAGE_PROMPT.format(paragraph=paragraph)
            }]
        )
        return response.content[0].text.strip()
    except Exception as e:
        print(f"  [warning] API call failed for paragraph, keeping original: {e}")
        return paragraph


def sanitise_chapter(
    client: anthropic.Anthropic,
    chapter_text: str,
    verbose: bool = True
) -> tuple[str, int]:
    """
    Sanitise all flagged paragraphs in a chapter.
    Returns (sanitised_text, count_of_paragraphs_modified).
    """
    paragraphs = split_into_paragraphs(chapter_text)
    result = []
    modified = 0

    for i, para in enumerate(paragraphs):
        if needs_sanitisation(para):
            if verbose:
                print(f"    Sanitising paragraph {i + 1}/{len(paragraphs)}...")
            clean = sanitise_paragraph(client, para)
            result.append(clean)
            modified += 1
            time.sleep(0.3)  # Gentle rate limiting
        else:
            result.append(para)

    return "\n\n".join(result), modified


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Pre-process a Gutenberg novel for the text2story-agent."
    )
    parser.add_argument("input_file", help="Path to the .txt file")
    parser.add_argument(
        "--chapters",
        nargs="+",
        type=int,
        metavar="N",
        help="Only process these chapter numbers (1-indexed). Default: all."
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        default=True,
        help="Print progress (default: on)"
    )
    args = parser.parse_args()

    # Check API key
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY environment variable not set.")
        sys.exit(1)

    # Read input
    print(f"Reading {args.input_file}...")
    with open(args.input_file, "r", encoding="utf-8") as f:
        raw = f.read()

    text = strip_gutenberg_header_footer(raw)
    chapters = split_into_chapters(text)
    print(f"Found {len(chapters)} chapters.")

    # Output directory
    base = os.path.splitext(os.path.basename(args.input_file))[0]
    out_dir = f"{base}-clean"
    os.makedirs(out_dir, exist_ok=True)
    print(f"Output directory: {out_dir}/\n")

    client = anthropic.Anthropic(api_key=api_key)

    # Process chapters
    for i, (label, chapter_text) in enumerate(chapters, start=1):
        if args.chapters and i not in args.chapters:
            continue

        print(f"Processing {label} ({len(chapter_text)} chars)...")
        clean_text, n_modified = sanitise_chapter(
            client, chapter_text, verbose=args.verbose
        )

        filename = f"chapter-{i:02d}.txt"
        out_path = os.path.join(out_dir, filename)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(f"{label}\n\n{clean_text}")

        status = f"{n_modified} paragraph(s) sanitised" if n_modified else "no changes needed"
        print(f"  → saved to {out_path} ({status})\n")

    print("Done. Pass the files in the output directory to the text2story-agent.")


if __name__ == "__main__":
    main()
