import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { addBaseToSlugRefs } from './lib/add-base.mjs';
import { loadExhibits } from './lib/exhibits.mjs';

// Same exclusion as tools/rewrite-base.mjs: every match in exhibits.json is
// an external URL to another group's repo/deployment, never our own site.
//
// The three files below are excluded for a different reason: each already
// combines a bare literal with `import.meta.env.BASE_URL` dynamically at
// render/call time (an `assetPath()`-style helper, or an inline
// `${baseUrl}/${literal}` concatenation). Codemod-prefixing the literal
// corrupts that concatenation into a double-prefixed path/URL the moment
// the site's `base` becomes non-root. This is the same bug class Phase 0a
// already hit once, at src/data/s02g9/rooms.ts's assetPath() helper, during
// the original root-ward base-path migration.
const EXCLUDE = new Set([
  'src/data/exhibits.json',
  'src/data/s02g9/rooms.ts',
  'src/components/s01g2/S01_Group2_FreeBSDLayout.astro',
  'src/components/s01g8/Header.astro',
]);

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
