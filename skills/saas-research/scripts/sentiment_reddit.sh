#!/usr/bin/env bash
# Harvest Reddit sentiment for a query via Reddit's public .json endpoints.
#
# Why this exists: HN is dev-tooling-skewed. Reddit covers SREs, ops, vertical
# SaaS buyers, indie hackers, and SMB users HN never sees. Without it the
# sentiment leg of the evidence triangle is biased.
#
# How it works (no auth required):
#   1. Hit https://www.reddit.com/search.json?q=...  for global search, OR
#      https://www.reddit.com/r/{sub}/search.json?... for sub-restricted.
#   2. For the top K threads, fetch {permalink}.json?sort=top to pull top
#      comments — this is where pain quotes live, not in titles.
#   3. Emit TSV (one row per thread + per top comment) sorted by score.
#
# Reddit blocks the default curl User-Agent. Pass a real one. Anonymous JSON
# read is rate-limited to ~60 req/min; we sleep 1.2s between comment fetches
# to stay polite. If you hit 429, lower THREAD_LIMIT or raise SLEEP_BETWEEN.
#
# Usage:
#   sentiment_reddit.sh "<query>" [output-dir]
#   sentiment_reddit.sh "<query>" [output-dir] "sub1,sub2,sub3"
#
# When to pass subreddits: if you already know the audience (e.g.,
# "kubernetes,devops,sre" for K8s ops tools). Without subs, the script does a
# global search — broader recall, more noise.
#
# Output:
#   {output-dir}/reddit-{slug}.tsv   — TSV: kind, created, score, comments, sub, author, url, text
#   {output-dir}/reddit-{slug}.json  — raw aggregated JSON (threads + comments)
#
# TSV row kinds:
#   thread   — top-level submission (use selftext as quote source if non-empty)
#   comment  — top comment under a thread (the highest-quality pain-quote source)

set -euo pipefail

QUERY="${1:?usage: sentiment_reddit.sh \"<query>\" [output-dir] [\"sub1,sub2\"]}"
OUT_DIR="${2:-./sentiment}"
SUBS="${3:-}"

# Identify the bot honestly — Reddit blocks "curl/*" and generic browsers
# are starting to get challenged. A clear bot UA with a contact path is the
# polite default and has the best longevity.
UA="${REDDIT_UA:-saas-research-sentiment/0.1 (research; contact via repo)}"

# Tunables. THREAD_LIMIT * (1 + COMMENT_LIMIT/N) requests are made; default
# 15 threads * 1 comment-fetch each = 16 requests, well under 60/min.
SEARCH_LIMIT="${SEARCH_LIMIT:-25}"     # threads pulled per search
THREAD_LIMIT="${THREAD_LIMIT:-15}"     # threads we then fetch comments for
COMMENT_LIMIT="${COMMENT_LIMIT:-10}"   # top comments kept per thread
SLEEP_BETWEEN="${SLEEP_BETWEEN:-1.2}"  # seconds between comment fetches

SLUG=$(echo "$QUERY" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\+/-/g; s/^-//; s/-$//')
mkdir -p "$OUT_DIR"

encoded=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$QUERY")

# --- 1. Search ---------------------------------------------------------------

search_results=()
if [ -n "$SUBS" ]; then
  IFS=',' read -ra SUB_LIST <<< "$SUBS"
  for sub in "${SUB_LIST[@]}"; do
    sub=$(echo "$sub" | tr -d ' ')
    [ -z "$sub" ] && continue
    url="https://www.reddit.com/r/${sub}/search.json?q=${encoded}&restrict_sr=on&sort=relevance&t=year&limit=${SEARCH_LIMIT}"
    body=$(curl -sS -A "$UA" --max-time 15 "$url" || echo '{"data":{"children":[]}}')
    search_results+=("$body")
    sleep "$SLEEP_BETWEEN"
  done
else
  url="https://www.reddit.com/search.json?q=${encoded}&sort=relevance&t=year&limit=${SEARCH_LIMIT}"
  body=$(curl -sS -A "$UA" --max-time 15 "$url" || echo '{"data":{"children":[]}}')
  search_results+=("$body")
fi

# Stage payloads in temp files so jq doesn't choke on argv size limits.
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

idx=0
for body in "${search_results[@]}"; do
  printf '%s' "$body" > "$WORK/search-$idx.json"
  idx=$((idx+1))
done

# Merge all search payloads, dedupe by post id, sort by score, keep top THREAD_LIMIT.
jq -s --argjson n "$THREAD_LIMIT" '
  [ .[].data.children[]?.data
    | select(.id and (.title // "" | length > 0))
  ]
  | unique_by(.id)
  | sort_by(-.score)
  | .[0:$n]
' "$WORK"/search-*.json > "$WORK/threads.json"

thread_count=$(jq 'length' "$WORK/threads.json")

# --- 2. Comment fetch --------------------------------------------------------

i=0
while IFS= read -r permalink; do
  i=$((i+1))
  [ -z "$permalink" ] && continue
  # Endpoint returns [post_listing, comment_listing]; we only need [1].
  curl -sS -A "$UA" --max-time 15 \
    "https://www.reddit.com${permalink}.json?limit=${COMMENT_LIMIT}&sort=top&depth=1" \
    > "$WORK/raw-$i.json" || echo '[]' > "$WORK/raw-$i.json"
  jq --arg pl "$permalink" --argjson n "$COMMENT_LIMIT" '
    if type == "array" and length >= 2 then
      [ .[1].data.children[]?.data
        | select(.body and .author and .author != "AutoModerator")
        | { permalink: $pl, score: (.score // 0), author: .author, body: .body, created_utc: .created_utc }
      ]
      | sort_by(-.score)
      | .[0:$n]
    else [] end
  ' "$WORK/raw-$i.json" > "$WORK/comments-$i.json"
  sleep "$SLEEP_BETWEEN"
done < <(jq -r '.[].permalink' "$WORK/threads.json")

# Concat all comment files into one array.
if ls "$WORK"/comments-*.json >/dev/null 2>&1; then
  jq -s 'add' "$WORK"/comments-*.json > "$WORK/comments.json"
else
  echo '[]' > "$WORK/comments.json"
fi

# --- 3. Persist raw aggregate ------------------------------------------------

jq -n --arg q "$QUERY" \
  --slurpfile threads "$WORK/threads.json" \
  --slurpfile comments "$WORK/comments.json" \
  '{query: $q, threads: $threads[0], comments: $comments[0]}' \
  > "$OUT_DIR/reddit-${SLUG}.json"

# --- 4. Emit TSV -------------------------------------------------------------
# Columns: kind | created | score | comments | sub | author | url | text(<=500)

{
  jq -r '
    .[] | [
      "thread",
      (.created_utc // 0 | todateiso8601),
      (.score // 0),
      (.num_comments // 0),
      (.subreddit // ""),
      (.author // ""),
      ("https://www.reddit.com" + (.permalink // "")),
      ((.title + " — " + (.selftext // "")) | gsub("\t"; " ") | gsub("\n"; " ") | gsub("\\s+"; " ") | .[0:500])
    ] | @tsv
  ' "$WORK/threads.json"
  jq -r '
    .[] | [
      "comment",
      (.created_utc // 0 | todateiso8601),
      (.score // 0),
      0,
      ((.permalink // "") | capture("^/r/(?<s>[^/]+)/").s // ""),
      (.author // ""),
      ("https://www.reddit.com" + (.permalink // "")),
      ((.body // "") | gsub("\t"; " ") | gsub("\n"; " ") | gsub("\\s+"; " ") | .[0:500])
    ] | @tsv
  ' "$WORK/comments.json"
} > "$OUT_DIR/reddit-${SLUG}.tsv"

# Sort by score desc so the highest-signal rows float to the top.
sort -t$'\t' -k3 -nr -o "$OUT_DIR/reddit-${SLUG}.tsv" "$OUT_DIR/reddit-${SLUG}.tsv"

comment_count=$(jq 'length' "$WORK/comments.json")
echo "Reddit: ${thread_count} threads + ${comment_count} comments → $OUT_DIR/reddit-${SLUG}.tsv"
