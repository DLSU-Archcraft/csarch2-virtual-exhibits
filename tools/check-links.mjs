import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeBase } from './integrate/rewrite.mjs';

// Every internal href/src in the built site must resolve to a file that exists.
//
// Deliberately written in Node rather than shell: dist/s03g8/index.html
// contains NUL bytes, and grep classifies such a file as binary and skips it
// without saying so - which would make this check report a false pass.

const ATTR = /(?<![\w.\-])(?:href|src)\s*=\s*["']([^"']+)["']/gi;

function walk(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = join(dir, e.name);
      return e.isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
    });
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

// A "//X" reference is protocol-relative: the browser resolves X as a HOST,
// not as a path on this site. That is legitimate for a real external host
// ("//cdn.example.com/x"), and is exactly the defect this project shipped when
// `base: '/'` turned `${BASE_URL}/s03g3` into "//s03g3" - which a browser turns
// into https://s03g3/, a DNS lookup for a machine named s03g3. The two are told
// apart by whether the authority looks like a hostname at all: a real host has a
// dot (or is "localhost"), a slug does not.
//
// This check previously skipped EVERY "//" reference, which is why it reported
// "0 dead links" across 552 broken ones.
function classify(url) {
  if (!url.startsWith('/')) return 'external';
  if (!url.startsWith('//')) return 'internal';

  // Strip an optional port ("//localhost:4321") before judging the authority,
  // or a bare-hostname host with a port would be misread as a site path.
  const host = url.slice(2).split(/[/?#]/)[0].split(':')[0];
  if (host.includes('.') || host === 'localhost') return 'external';
  return 'protocol-relative';
}

// The <script> element's own src is a real link and must be checked; its BODY
// is JavaScript, where a "/x.webp" string literal is not necessarily a URL the
// page loads. So the opening tag is harvested first and only then is the whole
// element removed - stripping the element including its opening tag (as this
// did) fed zero of the build's 119 internal <script src> references to the
// attribute scan.
//
// A literal </script> ends the element even inside a JS string — that is real
// HTML parsing, not a regex limitation, which is why authors must escape it as
// <\/script>. Matching the browser here is deliberate.
const SCRIPT_EL = /<script([^>]*)>[\s\S]*?(?:<\/script>|$)/gi;
const STYLE_EL = /<style[^>]*>[\s\S]*?(?:<\/style>|$)/gi;

function collectRefs(html) {
  const refs = [];

  const stripped = html.replace(SCRIPT_EL, (_match, openingTag) => {
    for (const [, raw] of openingTag.matchAll(ATTR)) refs.push(raw);
    return '';
  });

  for (const [, raw] of stripped.replace(STYLE_EL, '').matchAll(ATTR)) refs.push(raw);
  return refs;
}

// The physical dist/ output is never nested under a `<base>/` subfolder -
// Astro always builds pages at dist/s01g1/index.html regardless of `base`,
// and prefixes every href/src it emits itself (bundled CSS/JS, optimized
// images) with `base` purely as a URL string. On the real deployed site,
// that `/<base>` prefix is resolved by GitHub Pages' own routing for a
// project site; locally, it must be stripped before resolving against
// distDir, or every correctly-prefixed reference in the site reports as a
// false-positive dead link (distDir has no `<base>/` folder to find them
// in), while a reference that is MISSING the base can accidentally still
// resolve against distDir by coincidence (e.g. bare "/s03g3" against a
// distDir that happens to contain "s03g3/" at its own root) and so is never
// flagged at all - exactly the two failure modes this project hit the first
// time `base` went non-root. `baseSegment` is normalized with the same
// leading/trailing-slash handling used everywhere else in this codebase
// (tools/integrate/rewrite.mjs's normalizeBase) so '/csarch2-virtual-exhibits',
// 'csarch2-virtual-exhibits/', etc. are all treated the same.
function stripBase(clean, baseSegment) {
  if (!baseSegment) return { relPath: clean, missingBase: false };

  const prefix = `/${baseSegment}`;
  if (clean === prefix) return { relPath: '/', missingBase: false };
  if (clean.startsWith(`${prefix}/`)) {
    return { relPath: clean.slice(prefix.length), missingBase: false };
  }
  return { relPath: clean, missingBase: true };
}

export function checkLinks(distDir, { base = '' } = {}) {
  if (!existsSync(distDir)) {
    return { ok: false, errors: [`${distDir}: no such directory`] };
  }

  const baseSegment = normalizeBase(base);
  const errors = [];

  for (const file of walk(distDir)) {
    const html = readFileSync(file, 'utf8');

    for (const raw of collectRefs(html)) {
      const kind = classify(raw);
      if (kind === 'external') continue;
      if (kind === 'protocol-relative') {
        errors.push(
          `${file}: protocol-relative URL ${raw} - a browser resolves ` +
            `"${raw.slice(2).split(/[/?#]/)[0]}" as a HOST, not as a path on this site`,
        );
        continue;
      }

      const clean = raw.split('#')[0].split('?')[0];
      if (!clean || clean === '/') continue;

      const { relPath, missingBase } = stripBase(clean, baseSegment);
      if (missingBase) {
        errors.push(
          `${file}: internal ref missing required base "/${baseSegment}": ${raw}`,
        );
        continue;
      }
      if (relPath === '/') continue;

      const target = join(distDir, relPath);
      const ok =
        (existsSync(target) && statSync(target).isFile()) ||
        existsSync(join(target, 'index.html'));

      if (!ok) errors.push(`${file}: dead link ${raw}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { default: config } = await import('../astro.config.mjs');
  const { ok, errors } = checkLinks('dist', { base: config.base });
  for (const e of errors) console.error(`FAIL ${e}`);
  console.log(`${errors.length} dead links`);
  process.exit(ok ? 0 : 1);
}
