import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { addBaseToSlugRefs } from './lib/add-base.mjs';
import { loadExhibits } from './lib/exhibits.mjs';

// Same exclusion as tools/rewrite-base.mjs: every match in exhibits.json is
// an external URL to another group's repo/deployment, never our own site.
const EXCLUDE = new Set(['src/data/exhibits.json']);

const EXTENSIONS = new Set(['.astro', '.mdx', '.md', '.jsx', '.tsx', '.js', '.ts', '.css', '.json']);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

export function addBaseToTree(root, { slugs, base, dryRun, exclude = EXCLUDE }) {
  const report = [];

  for (const file of walk(root)) {
    if (exclude.has(file.split('\\').join('/'))) continue;
    if (!EXTENSIONS.has(extname(file))) continue;

    const before = readFileSync(file, 'utf8');
    const { text, changed } = addBaseToSlugRefs(before, { slugs, base });
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

  const base = get('--base', '');
  const dryRun = args.includes('--dry-run');

  if (!base) {
    console.error('Usage: node tools/add-base.mjs --base <segment> [--dry-run]');
    process.exit(2);
  }

  const slugs = loadExhibits().map((e) => e.slug);

  let report;
  try {
    report = addBaseToTree('src', { slugs, base, dryRun });
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }

  const total = report.reduce((n, r) => n + r.changed, 0);
  for (const { file, changed } of report) {
    console.log(`${String(changed).padStart(3)}  ${file}`);
  }
  console.log(`\n${dryRun ? '[dry run] would rewrite' : 'rewrote'} ${total} references across ${report.length} files`);
}
