#!/usr/bin/env python3
"""
Build source/01-keyword-universe.csv from raw autocomplete.

Logic:
- Dedup keywords (case-insensitive).
- Aggregate sources: a keyword appearing under multiple suffix-queries gets
  raw_volume_signal = "seen-in-multiple-sources"; single-suffix → "autocomplete-only".
- Classify raw_intent_signal heuristically by keyword text patterns.
- Drop noise: keywords that are clearly off-niche (book, tutorial, course, pdf, salary,
  meaning, definition, "what is X"). These are pure-info and waste the universe.
- Keep top N=350 by aggregated signal so the universe is navigable.
"""
import csv
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "source" / "raw" / "autocomplete-raw.tsv"
OUT = ROOT / "source" / "01-keyword-universe.csv"

# Drop these patterns — pure-information, low-buyer-intent noise we don't want in universe.
DROP_PATTERNS = [
    r"\bpdf\b", r"\bbook\b", r"\btutorial\b", r"\bcourse\b",
    r"\bsalary\b", r"\bjobs?\b", r"\bmeaning\b", r"\bdefinition\b",
    r"\binterview\b", r"\bquestions?\b", r"\bcheat ?sheet\b",
    r"\breddit\b", r"\bgithub\b$", r"\byoutube\b",
    r"\bpython\b.*\b(for beginners|for beginner)\b",
    r"^what is\b", r"^how does\b",
    r"\bw3schools\b", r"\bhackerrank\b",
    r"\bcertification\b", r"\bexam\b",
    # The seed itself with no qualifier is too broad
]

# Strong transactional patterns — searcher wants a tool RIGHT NOW
TRANSACTIONAL_PATTERNS = [
    r"\b(online|free|tool|generator|checker|calculator|converter|validator|tester|parser|formatter|builder|simulator|analyzer|debugger)\b",
    r"\b(convert|transform|generate|validate|test|debug|format|parse|compare|diff|encode|decode|encrypt|decrypt)\b.* (to|from|into)",
    r"\b(api) (for|to)\b",
]

# Commercial-investigation patterns — researching, may buy
COMMERCIAL_PATTERNS = [
    r"\bbest\b",
    r"\balternative(s)?\b",
    r"\bvs\b",
    r"\btop\b",
    r"\bcompare(d)?\b",
    r"\b(saas|software|platform|service)\b",
    r"\bcheap(est)?\b",
    r"\bpric(e|ing)\b",
    r"\breview(s)?\b",
]

# Pure informational
INFORMATIONAL_PATTERNS = [
    r"^how to\b", r"^how do (i|you)\b",
    r"^what is\b", r"^why\b",
    r"\bexamples?\b",
    r"\barchitecture\b",
    r"\bdiagram\b",
    r"\bbasics?\b",
    r"\bexplained\b",
]


def classify_intent(kw: str) -> str:
    k = kw.lower()
    for p in TRANSACTIONAL_PATTERNS:
        if re.search(p, k):
            return "transactional"
    for p in COMMERCIAL_PATTERNS:
        if re.search(p, k):
            return "commercial-investigation"
    for p in INFORMATIONAL_PATTERNS:
        if re.search(p, k):
            return "informational"
    return "unknown"


def should_drop(kw: str) -> bool:
    k = kw.lower().strip()
    for p in DROP_PATTERNS:
        if re.search(p, k):
            return True
    # Drop too-short or too-long
    if len(k) < 4 or len(k) > 80:
        return True
    return False


def main():
    # keyword (lowercased) -> {sources: set, niches: set, original: str}
    by_keyword = defaultdict(lambda: {"sources": set(), "niches": set(), "original": None})

    with open(RAW, encoding="utf-8") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 3:
                continue
            kw, niche, src = parts[0].strip(), parts[1].strip(), parts[2].strip()
            if not kw:
                continue
            key = kw.lower()
            d = by_keyword[key]
            d["sources"].add(src)
            d["niches"].add(niche)
            if d["original"] is None:
                d["original"] = kw

    # Filter and classify
    rows = []
    for key, d in by_keyword.items():
        original = d["original"]
        if should_drop(original):
            continue
        intent = classify_intent(original)
        n_sources = len(d["sources"])
        if n_sources >= 3:
            vol = "seen-in-multiple-sources-strong"
        elif n_sources == 2:
            vol = "seen-in-multiple-sources"
        else:
            vol = "autocomplete-only"
        # primary niche = most common in seed labels (just take first sorted)
        niche = sorted(d["niches"])[0]
        # Score: prefer transactional, multi-source, commercial-investigation
        score = 0
        score += {"transactional": 4, "commercial-investigation": 3, "unknown": 1, "informational": 0}[intent]
        score += min(n_sources, 5)
        rows.append({
            "keyword": original,
            "seed_niche": niche,
            "source": ";".join(sorted(d["sources"])[:3]),  # cap to keep CSV tidy
            "raw_volume_signal": vol,
            "raw_intent_signal": intent,
            "notes": f"n_sources={n_sources}",
            "_score": score,
        })

    # Drop pure informational keywords entirely from the universe — too noisy
    rows = [r for r in rows if r["raw_intent_signal"] != "informational"]

    # Sort by score desc, then keyword
    rows.sort(key=lambda r: (-r["_score"], r["keyword"]))

    # Cap at 350 so the universe is decision-grade not a dumping ground
    rows = rows[:350]

    with open(OUT, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["keyword", "seed_niche", "source", "raw_volume_signal", "raw_intent_signal", "notes"])
        for r in rows:
            w.writerow([r["keyword"], r["seed_niche"], r["source"], r["raw_volume_signal"], r["raw_intent_signal"], r["notes"]])

    print(f"Wrote {len(rows)} rows to {OUT}")
    # Distribution
    from collections import Counter
    intent_dist = Counter(r["raw_intent_signal"] for r in rows)
    print(f"Intent distribution: {dict(intent_dist)}")


if __name__ == "__main__":
    main()
