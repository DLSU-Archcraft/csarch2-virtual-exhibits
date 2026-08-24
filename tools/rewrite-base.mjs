import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { rewriteBaseRefs } from "./lib/base-path.mjs";
import { normalizeBase } from "./integrate/rewrite.mjs";

// Files whose base-path matches are ALL external URLs pointing at other
// students' repositories and deployments. Never rewrite these.
const EXCLUDE = new Set(["src/data/exhibits.json"]);

const EXTENSIONS = new Set([
  ".astro",
  ".mdx",
  ".md",
  ".jsx",
  ".tsx",
  ".js",
  ".ts",
  ".css",
  ".json",
]);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

export function rewriteTree(root, { from, to, dryRun, exclude = EXCLUDE }) {
  const report = [];

  // Normalize here too, so the cheap prefilter below looks for the same needle
  // rewriteBaseRefs will build. Without it, `--from '/virtual-exhibit-template/'`
  // prefiltered on '//virtual-exhibit-template/', matched nothing, and reported
  // a clean tree.
  const fromSegment = normalizeBase(from);

  for (const file of walk(root)) {
    if (exclude.has(file.split("\\").join("/"))) continue;
    if (!EXTENSIONS.has(extname(file))) continue;

    const before = readFileSync(file, "utf8");
    if (!before.includes(`/${fromSegment}`)) continue;

    const { text, changed } = rewriteBaseRefs(before, { from, to });
    if (changed === 0) continue;

    if (!dryRun) writeFileSync(file, text);
    report.push({ file, changed });
  }

  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const get = (flag, fallback) => {
    const i = args.indexOf(flag);
    return i === -1 ? fallback : args[i + 1];
  };

  const from = get("--from", "csarch2-virtual-exhibits");
  const to = get("--to", "");
  const dryRun = args.includes("--dry-run");

  let report;
  try {
    report = rewriteTree("src", { from, to, dryRun });
  } catch (e) {
    // A rejected --from (see rewriteBaseRefs) is a usage error, not a crash.
    // Nothing has been written at this point: rewriteTree only writes after
    // rewriteBaseRefs returns.
    console.error(e.message);
    process.exit(2);
  }
  const total = report.reduce((n, r) => n + r.changed, 0);

  for (const { file, changed } of report) {
    console.log(`${String(changed).padStart(3)}  ${file}`);
  }
  console.log(
    `\n${dryRun ? "[dry run] would rewrite" : "rewrote"} ${total} references across ${report.length} files`,
  );
}
