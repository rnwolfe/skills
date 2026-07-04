#!/usr/bin/env bun
/**
 * Regenerate site/src/content/docs/ from source/.
 * Idempotent: deletes the docs tree and rebuilds it from source/.
 *
 * Run from project root:
 *   bun scripts/sync.ts
 */
import { readFile, writeFile, mkdir, rm, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SOURCE = join(ROOT, "source");
const DOCS = join(ROOT, "site", "src", "content", "docs");
const PUBLIC_DIR = join(ROOT, "site", "public");

interface Frontmatter {
  title: string;
  description: string;
  sidebar?: { order?: number; hidden?: boolean };
  template?: "splash";
  hero?: unknown;
}

function fm(f: Frontmatter): string {
  const out: string[] = ["---"];
  out.push(`title: ${JSON.stringify(f.title)}`);
  out.push(`description: ${JSON.stringify(f.description)}`);
  if (f.template) out.push(`template: ${f.template}`);
  if (f.sidebar) {
    out.push("sidebar:");
    if (f.sidebar.order !== undefined) out.push(`  order: ${f.sidebar.order}`);
    if (f.sidebar.hidden) out.push(`  hidden: true`);
  }
  if (f.hero) {
    out.push("hero:");
    out.push(
      Object.entries(f.hero as Record<string, unknown>)
        .map(([k, v]) => {
          if (Array.isArray(v)) {
            const items = v
              .map(
                (item) =>
                  `    - ` +
                  Object.entries(item as Record<string, unknown>)
                    .map(([ik, iv]) => `${ik}: ${JSON.stringify(iv)}`)
                    .join("\n      ")
              )
              .join("\n");
            return `  ${k}:\n${items}`;
          }
          return `  ${k}: ${JSON.stringify(v)}`;
        })
        .join("\n")
    );
  }
  out.push("---", "");
  return out.join("\n");
}

/** Strip the first H1 line — Starlight renders the title from frontmatter. */
function stripFirstH1(md: string): string {
  return md.replace(/^# .+\n+/, "");
}

/**
 * Rewrite internal links in source markdown to Starlight-style URLs.
 * Maps:
 *   finalists/01-foo.md           → /finalists/01-foo/
 *   raw/serp-foo.md               → /raw/serp/foo/
 *   methodology.md                → /methodology/
 *   shortlist.md                  → /shortlist/
 *   ../03-finalists/01-foo.md     → /finalists/01-foo/
 *   ../04-rejected.md             → /rejected/
 *   00-methodology.md             → /methodology/
 *   02-shortlist.md               → /shortlist/
 *   04-rejected.md                → /rejected/
 *   04-scoring.md                 → /scoring/
 *   01-{anything}.csv             → /{anything}/  (auto-detected)
 *   NOTES.md                      → /notes/
 *   notes.md                      → /notes/
 *   raw/                          → /raw/
 *   finalists/                    → /finalists/
 */
function rewriteLinks(md: string): string {
  const replacements: Array<[RegExp, string]> = [
    // Cross-finalist references e.g. ../03-finalists/01-x.md
    [/\.\.\/03-finalists\/([^.\s)]+)\.md/g, "/finalists/$1/"],
    [/03-finalists\/([^.\s)]+)\.md/g, "/finalists/$1/"],
    [/\(finalists\/([^.\s)]+)\.md\)/g, "(/finalists/$1/)"],
    // Raw SERP links
    [/raw\/(serp-[^.\s)]+)\.md/g, "/raw/$1/"],
    [/\.\.\/raw\/(serp-[^.\s)]+)\.md/g, "/raw/$1/"],
    // Top-level files
    [/\(00-methodology\.md\)/g, "(/methodology/)"],
    [/\(methodology\.md\)/g, "(/methodology/)"],
    [/\(02-shortlist\.md\)/g, "(/shortlist/)"],
    [/\(shortlist\.md\)/g, "(/shortlist/)"],
    [/\(04-rejected\.md\)/g, "(/rejected/)"],
    [/\(rejected\.md\)/g, "(/rejected/)"],
    [/\(04-scoring\.md\)/g, "(/scoring/)"],
    [/\(scoring\.md\)/g, "(/scoring/)"],
    // Auto-detect the candidates CSV (whatever 01-{slug}.csv lives in source/)
    [/\(01-([^.\s)]+)\.csv\)/g, "(/$1/)"],
    [/\(keyword-universe\.md\)/g, "(/keyword-universe/)"],
    [/\(NOTES\.md\)/g, "(/notes/)"],
    [/\(notes\.md\)/g, "(/notes/)"],
    [/\(README\.md\)/g, "(/)"],
    // Directory references
    [/\(finalists\/\)/g, "(/finalists/)"],
    [/\(raw\/\)/g, "(/raw/)"],
  ];
  let out = md;
  for (const [pat, rep] of replacements) out = out.replace(pat, rep);
  return out;
}

/** Convert a CSV file to a Markdown table. Caps rows + offers download link. */
async function csvToMarkdown(
  csvPath: string,
  maxRows: number,
  downloadLink?: string
): Promise<string> {
  const raw = await readFile(csvPath, "utf-8");
  const lines = raw.trim().split("\n");
  const headers = parseCsvLine(lines[0]);
  const dataLines = lines.slice(1);
  const total = dataLines.length;
  const shown = dataLines.slice(0, maxRows);

  const out: string[] = [];
  if (downloadLink && total > maxRows) {
    out.push(
      `> Showing the first ${maxRows} of ${total} rows. ` +
        `[Download the full CSV](${downloadLink}).`,
      ""
    );
  } else {
    out.push(`> ${total} rows.`, "");
  }
  // Wrap the table in a scrollable container for mobile.
  out.push('<div class="csv-scroll">');
  out.push("");
  out.push("| " + headers.join(" | ") + " |");
  out.push("| " + headers.map(() => "---").join(" | ") + " |");
  for (const line of shown) {
    const cells = parseCsvLine(line).map((c) =>
      // Escape pipe and replace internal newlines
      c.replace(/\|/g, "\\|").replace(/\n/g, " ")
    );
    out.push("| " + cells.join(" | ") + " |");
  }
  out.push("");
  out.push("</div>");
  return out.join("\n");
}

/** Parse a CSV line, handling double-quoted fields with embedded commas/quotes. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === ",") {
        out.push(cur);
        cur = "";
      } else if (c === '"') {
        inQuotes = true;
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out;
}

async function copyMd(
  source: string,
  destRel: string,
  frontmatter: Frontmatter
) {
  const raw = await readFile(source, "utf-8");
  const stripped = stripFirstH1(raw);
  const rewritten = rewriteLinks(stripped);
  const dest = join(DOCS, destRel);
  await mkdir(join(dest, ".."), { recursive: true });
  await writeFile(dest, fm(frontmatter) + rewritten);
}

async function listFiles(dir: string, suffix = ".md"): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  return entries.filter((e) => e.endsWith(suffix)).sort();
}

async function checkLinks(): Promise<void> {
  // Walk the docs/ tree and validate that every relative link resolves to a known file.
  const allDocs = new Set<string>();
  async function walk(d: string, prefix = "") {
    const entries = await readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const full = join(d, e.name);
      const slug = (prefix + e.name).replace(/\.(md|mdx)$/, "/").toLowerCase();
      if (e.isDirectory()) {
        allDocs.add("/" + prefix + e.name + "/");
        await walk(full, prefix + e.name + "/");
      } else if (e.isFile() && /\.(md|mdx)$/.test(e.name)) {
        // index becomes the parent dir
        if (e.name === "index.md" || e.name === "index.mdx") {
          allDocs.add("/" + prefix);
        } else {
          allDocs.add("/" + slug);
        }
      }
    }
  }
  // Always treat root as resolvable.
  allDocs.add("/");
  await walk(DOCS);

  // Treat anything in site/public/ as a resolvable static asset.
  async function walkPublic(d: string, prefix = "") {
    if (!existsSync(d)) return;
    const entries = await readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) await walkPublic(full, prefix + e.name + "/");
      else if (e.isFile()) allDocs.add("/" + prefix + e.name);
    }
  }
  await walkPublic(PUBLIC_DIR);

  const broken: string[] = [];
  async function scanFile(d: string, prefix = "") {
    const entries = await readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) await scanFile(full, prefix + e.name + "/");
      else if (e.isFile() && /\.(md|mdx)$/.test(e.name)) {
        const text = await readFile(full, "utf-8");
        // Match markdown links that start with /
        const re = /\]\((\/[^)\s#]*?)(?:#[^)]*)?\)/g;
        let m;
        while ((m = re.exec(text))) {
          const linkPath = m[1];
          if (linkPath.startsWith("/http")) continue;
          // Static files (e.g. .csv downloads) are kept as-is
          // Doc-page links are normalized with trailing slash
          const target = /\.[a-z0-9]+$/i.test(linkPath)
            ? linkPath
            : linkPath.endsWith("/")
              ? linkPath
              : linkPath + "/";
          if (!allDocs.has(target)) {
            broken.push(`${prefix}${e.name}: ${linkPath}`);
          }
        }
      }
    }
  }
  await scanFile(DOCS);

  if (broken.length) {
    console.error("Broken internal links:");
    for (const b of broken) console.error("  -", b);
    throw new Error(`${broken.length} broken link(s)`);
  } else {
    console.log("All internal links resolve.");
  }
}

async function main() {
  // 1. Wipe docs tree (idempotent rebuild)
  if (existsSync(DOCS)) await rm(DOCS, { recursive: true, force: true });
  await mkdir(DOCS, { recursive: true });
  await mkdir(PUBLIC_DIR, { recursive: true });

  // 2. Index page (homepage with hero).
  //    Title comes from the README H1; tagline/description from
  //    `source/.site-meta.json` if present, else derived heuristically.
  const readme = await readFile(join(SOURCE, "README.md"), "utf-8");
  const titleMatch = readme.match(/^# (.+)$/m);
  const siteTitle = titleMatch ? titleMatch[1].trim() : "Research Report";
  const readmeBody = rewriteLinks(stripFirstH1(readme));

  const finalists = (
    await listFiles(join(SOURCE, "03-finalists"))
  ).filter((f) => /^\d+-.*\.md$/.test(f));

  // Optional site-meta.json overrides title/description/tagline.
  let meta: { title?: string; description?: string; tagline?: string } = {};
  const metaPath = join(SOURCE, ".site-meta.json");
  if (existsSync(metaPath)) {
    try {
      meta = JSON.parse(await readFile(metaPath, "utf-8"));
    } catch (e) {
      console.warn(`Could not parse ${metaPath}; using defaults.`);
    }
  }

  const indexFm: Frontmatter = {
    title: meta.title ?? siteTitle,
    description:
      meta.description ??
      `${finalists.length} finalists, evidence-anchored briefs, navigable site.`,
    template: "splash",
    hero: {
      tagline:
        meta.tagline ??
        `${finalists.length} finalist${finalists.length === 1 ? "" : "s"}. Evidence-anchored briefs. One next step.`,
      actions: [
        {
          text: "Top picks",
          link: "/finalists/",
          icon: "right-arrow",
          variant: "primary",
        },
        {
          text: "How this was built",
          link: "/methodology/",
          icon: "external",
          variant: "minimal",
        },
      ],
    },
  };
  await writeFile(join(DOCS, "index.md"), fm(indexFm) + readmeBody);

  // 3. Methodology
  await copyMd(join(SOURCE, "00-methodology.md"), "methodology.md", {
    title: "Methodology",
    description:
      "How the research was conducted: tools used, tier conventions, and honest caveats.",
    sidebar: { order: 1 },
  });

  // 4. Shortlist
  await copyMd(join(SOURCE, "02-shortlist.md"), "shortlist.md", {
    title: "Shortlist",
    description: "Candidates promoted from the universe with rationale.",
    sidebar: { order: 3 },
  });

  // 5. Rejected
  await copyMd(join(SOURCE, "04-rejected.md"), "rejected.md", {
    title: "Rejected",
    description:
      "Candidates considered and dropped, with reasons. Read this if you're tempted by an idea that got cut.",
    sidebar: { order: 5 },
  });

  // 6. Scoring
  await copyMd(join(SOURCE, "04-scoring.md"), "scoring.md", {
    title: "Scoring",
    description: "The 6-dimension rubric used to rank finalists.",
    sidebar: { order: 6 },
  });

  // 7. Notes
  await copyMd(join(SOURCE, "NOTES.md"), "notes.md", {
    title: "Notes",
    description:
      "Journal of decisions, surprises, and the skeptical-investor review of the top 3.",
    sidebar: { order: 7 },
  });

  // 8. Candidates universe (CSV → markdown table + downloadable CSV).
  //    Auto-detect by looking for 01-{slug}.csv in source/.
  const sourceFiles = await readdir(SOURCE);
  const csvName = sourceFiles.find((f) => /^01-.+\.csv$/.test(f));
  if (csvName) {
    const csvSlug = csvName.replace(/^01-/, "").replace(/\.csv$/, "");
    const titleSlug = csvSlug
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const csvSource = join(SOURCE, csvName);
    const csvDownload = join(PUBLIC_DIR, `${csvSlug}.csv`);
    await writeFile(csvDownload, await readFile(csvSource));
    const tableMd = await csvToMarkdown(csvSource, 200, `/${csvSlug}.csv`);
    const universeFm: Frontmatter = {
      title: titleSlug,
      description: `The candidate universe with source attribution. Filter pre-applied during dedupe.`,
      sidebar: { order: 4 },
    };
    await writeFile(
      join(DOCS, `${csvSlug}.md`),
      fm(universeFm) +
        `The full universe of researched candidates. See methodology for filter rules.\n\n` +
        tableMd
    );
  } else {
    console.warn(
      "No 01-*.csv found in source/ — skipping candidates table. (This is fine if your rubric uses a different artifact format.)"
    );
  }

  // 9. Finalists
  await mkdir(join(DOCS, "finalists"), { recursive: true });
  const finalistEntries: Array<{ slug: string; title: string }> = [];
  for (const f of finalists) {
    const slug = f.replace(/\.md$/, "");
    const raw = await readFile(join(SOURCE, "03-finalists", f), "utf-8");
    // Pull the title from the first H1
    const titleMatch = raw.match(/^# (.+)$/m);
    const titleLine = titleMatch ? titleMatch[1].trim() : slug;
    // Format: "01 — LLM Cost Pulse: ..."
    const order = parseInt(f.match(/^(\d+)/)?.[1] ?? "99", 10);
    await copyMd(join(SOURCE, "03-finalists", f), `finalists/${slug}.md`, {
      title: titleLine,
      description: `Finalist brief: target keyword, ranking thesis, build estimate, and risks.`,
      sidebar: { order },
    });
    finalistEntries.push({ slug, title: titleLine });
  }

  // Finalists index page
  const finalistsIndex: string[] = [
    "The eight finalists ranked. Tiered: top 3 (the recommended bets), then secondary.",
    "",
    "## Top 3 (recommended)",
    "",
  ];
  for (const e of finalistEntries.slice(0, 3)) {
    finalistsIndex.push(`- [${e.title}](/finalists/${e.slug}/)`);
  }
  finalistsIndex.push("", "## Secondary (above-cutoff alternatives)", "");
  for (const e of finalistEntries.slice(3)) {
    finalistsIndex.push(`- [${e.title}](/finalists/${e.slug}/)`);
  }
  finalistsIndex.push("");
  finalistsIndex.push(
    "Scoring rationale on the [Scoring](/scoring/) page; rejection reasoning on [Rejected](/rejected/)."
  );
  const finalistsFm: Frontmatter = {
    title: "Finalists",
    description: "The eight surviving candidates, ranked.",
    sidebar: { order: 2 },
  };
  await writeFile(
    join(DOCS, "finalists", "index.md"),
    fm(finalistsFm) + finalistsIndex.join("\n")
  );

  // 10. Raw SERP analyses
  await mkdir(join(DOCS, "raw"), { recursive: true });
  const rawFiles = await listFiles(join(SOURCE, "raw"));
  const rawEntries: Array<{ slug: string; title: string }> = [];
  for (const f of rawFiles) {
    const slug = f.replace(/\.md$/, "");
    const raw = await readFile(join(SOURCE, "raw", f), "utf-8");
    const titleMatch = raw.match(/^# (.+)$/m);
    const titleLine = titleMatch ? titleMatch[1].trim() : slug;
    await copyMd(join(SOURCE, "raw", f), `raw/${slug}.md`, {
      title: titleLine,
      description: `SERP analysis: top 10 ranking pages, gap analysis, verdict.`,
    });
    rawEntries.push({ slug, title: titleLine });
  }

  // Raw index
  const rawIndex: string[] = [
    "Raw SERP analyses for each deep-dive candidate. Each captures top-10 ranking pages, gap analysis, and an outrank-ability verdict.",
    "",
  ];
  rawEntries.sort((a, b) => a.title.localeCompare(b.title));
  for (const e of rawEntries) {
    rawIndex.push(`- [${e.title}](/raw/${e.slug}/)`);
  }
  rawIndex.push("");
  const rawFm: Frontmatter = {
    title: "Raw research",
    description: "Per-keyword SERP analyses.",
    sidebar: { order: 8 },
  };
  await writeFile(
    join(DOCS, "raw", "index.md"),
    fm(rawFm) + rawIndex.join("\n")
  );

  console.log(`Synced ${finalistEntries.length} finalists, ${rawEntries.length} SERP files.`);
  await checkLinks();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
