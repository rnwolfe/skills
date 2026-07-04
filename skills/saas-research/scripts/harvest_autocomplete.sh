#!/usr/bin/env bash
# Harvest Google autocomplete for a seed × suffix matrix.
# Usage: ./harvest_autocomplete.sh "seed phrase" "seed_niche_label"
# Output: tab-separated to stdout: keyword<TAB>seed_niche<TAB>source

set -euo pipefail

SEED="$1"
NICHE="$2"

# Suffix set: letters give broad expansion, modifiers give intent-loaded expansion.
# Trailing space ensures Google treats it as the next word, not just continuing the last.
SUFFIXES=(
  ""
  " a" " b" " c" " d" " e" " f" " g" " h" " i" " j"
  " k" " l" " m" " n" " o" " p" " q" " r" " s" " t"
  " u" " v" " w" " x" " y" " z"
  " best" " online" " free" " open source" " alternative"
  " vs" " how to" " how" " why" " what" " for"
  " tool" " generator" " checker" " calculator" " converter"
  " api" " library" " framework" " saas" " github"
  " not working" " slow" " error"
)

for suffix in "${SUFFIXES[@]}"; do
  query="${SEED}${suffix}"
  encoded=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$query")
  url="https://suggestqueries.google.com/complete/search?client=firefox&q=${encoded}"
  body=$(curl -s --max-time 10 "$url" || echo "[]")
  # Parse the array of suggestions (index 1 in the response)
  echo "$body" | jq -r --arg n "$NICHE" --arg q "$query" '.[1][]? | [., $n, "autocomplete:" + $q] | @tsv' 2>/dev/null || true
  # Polite delay
  sleep 0.15
done
