#!/usr/bin/env bash
# Harvest Hacker News sentiment for a query via the public Algolia API.
#
# This is one half of the scripted sentiment baseline. Reddit is the other
# half — see sentiment_reddit.sh, which covers the broader, non-dev-tools
# audience HN misses (SREs, ops, vertical SaaS buyers, SMB users).
#
# HN bias note: the Algolia index is comprehensive but the audience skews
# toward developer-tools, infra, and AI/ML. For a niche outside that orbit
# (small-business CRM, marketing tools, design tools), expect thin HN
# signal even when real demand exists — and lean harder on the Reddit and
# review-site legs.
#
# Usage:
#   sentiment_harvest.sh "<query>" [output-dir]
#
# Output:
#   {output-dir}/hn-{slug}.tsv   — TSV: created_at, points, num_comments, author, url, title, snippet
#   {output-dir}/hn-{slug}.json  — raw HN Algolia response (for reference)

set -euo pipefail

QUERY="${1:?usage: sentiment_harvest.sh \"<query>\" [output-dir]}"
OUT_DIR="${2:-./sentiment}"
SLUG=$(echo "$QUERY" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\+/-/g; s/^-//; s/-$//')

mkdir -p "$OUT_DIR"

encoded=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$QUERY")

# Algolia search hits: stories AND comments, sorted by relevance, top 50
URL="https://hn.algolia.com/api/v1/search?query=${encoded}&tags=(story,comment)&hitsPerPage=50"

raw=$(curl -s --max-time 15 "$URL" || echo '{"hits":[]}')
echo "$raw" > "$OUT_DIR/hn-${SLUG}.json"

# TSV: date | points | comments | author | url | title | snippet (500 chars)
echo "$raw" | jq -r '
  .hits[] |
  [
    (.created_at // ""),
    (.points // 0),
    (.num_comments // 0),
    (.author // ""),
    (.url // ("https://news.ycombinator.com/item?id=" + .objectID)),
    ((.title // .story_title // "") | gsub("\t"; " ") | gsub("\n"; " ")),
    ((.story_text // .comment_text // "") | gsub("<[^>]+>"; "") | gsub("&[a-z]+;"; " ") | gsub("\\s+"; " ") | .[0:500])
  ] | @tsv
' > "$OUT_DIR/hn-${SLUG}.tsv" 2>/dev/null

count=$(wc -l < "$OUT_DIR/hn-${SLUG}.tsv" || echo 0)
echo "HN: ${count} hits → $OUT_DIR/hn-${SLUG}.tsv"

# Sort the TSV by points desc so top hits float
if [ "$count" -gt 0 ]; then
  sort -t$'\t' -k2 -nr -o "$OUT_DIR/hn-${SLUG}.tsv" "$OUT_DIR/hn-${SLUG}.tsv"
fi
