import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { rewriteTree } from '../rewrite-base.mjs';
import { addBaseToTree } from '../add-base.mjs';
import { loadExhibits } from '../lib/exhibits.mjs';

test('no source file hardcodes the old base path', () => {
  const report = rewriteTree('src', {
    from: 'virtual-exhibit-template',
    to: '',
    dryRun: true,
  });
  assert.deepEqual(
    report.map((r) => r.file),
    [],
    'these files reintroduced a hardcoded base path; run: node tools/rewrite-base.mjs',
  );
});

test('exhibits.json still carries its external URLs', () => {
  const s = readFileSync('src/data/exhibits.json', 'utf8');
  const n = (s.match(/virtual-exhibit-template/g) || []).length;
  assert.equal(n, 25, 'external links to other students\' deployments were damaged');
});

test('a file in the exclude set is skipped even when its reference IS rewritable', () => {
  const dir = mkdtempSync(join(tmpdir(), 'exclude-'));
  writeFileSync(join(dir, 'keep.json'), '{"x": "/virtual-exhibit-template/a.webp"}');
  writeFileSync(join(dir, 'skip.json'), '{"x": "/virtual-exhibit-template/b.webp"}');

  const report = rewriteTree(dir, {
    from: 'virtual-exhibit-template',
    to: '',
    dryRun: true,
    exclude: new Set([join(dir, 'skip.json').split('\\').join('/')]),
  });

  assert.deepEqual(
    report.map((r) => r.file),
    [join(dir, 'keep.json')],
    'the excluded file was reported, so the path guard is not doing its job',
  );
});

test('no source file has a bare, un-prefixed slug reference', () => {
  const slugs = loadExhibits().map((e) => e.slug);
  const report = addBaseToTree('src', { slugs, base: 'csarch2-virtual-exhibits', dryRun: true });
  assert.deepEqual(
    report.map((r) => r.file),
    [],
    'these files have a bare slug reference that needs the base prefix; run: node tools/add-base.mjs --base csarch2-virtual-exhibits',
  );
});

// addBaseToTree() (used above) and rewriteTree() can only ever see LITERAL
// slug text in source - that's how both are documented to work (see
// tools/lib/add-base.mjs's header comment: "A match only counts when a '/'
// is immediately followed by one of those slugs"). Neither can see a
// reference built at runtime from a variable, so neither test above catches
// a bug that only exists as a template-literal interpolation. That is
// exactly what shipped in src/components/ExhibitCard.astro:
// `href=\`/${slug}\`` - there is no literal slug text anywhere in that file
// for a text-based matcher to find, so both guards above passed while every
// homepage exhibit-card link 404'd at a non-root base.
//
// This is deliberately NOT a general dynamic-href checker (an href built
// from a fetch() response, a CMS field, etc. is out of scope and would need
// a different approach entirely). It targets only the one shape that
// actually bit here: an href/src whose value starts with a bare '/'
// immediately followed by '${', with nothing - no base variable - between
// the opening delimiter and the slash. A correctly-fixed reference like
// `href=\`${base}/${slug}\`` does NOT match, because the '/' there is not
// the first character of the attribute value.
//
// The pattern has to cover two different syntaxes, because the two file
// types this test scans can only ever express a runtime-interpolated href
// one way each:
//   - .astro frontmatter permits a bare template literal directly after
//     `=`, with no curly braces: `href=\`/${slug}\`` (this is the exact
//     shape ExhibitCard.astro shipped, per commit b63e8ba).
//   - .jsx/.tsx (JSX) has no bare-template-after-`=` syntax at all - it is
//     not legal JSX. Any expression in a JSX attribute, template literal
//     included, MUST be wrapped in curly braces: `href={\`/${slug}\`}`.
// An earlier version of this regex only matched the first shape, so it
// could never see the second - the same blind spot this test exists to
// close, just one syntax over. The optional `\{?` below is what makes it
// see both: it matches whether or not a `{` sits between `=` and the
// quote/backtick.
function walkForBareInterpHref(dir, exts, exclude = new Set()) {
  const offenders = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      offenders.push(...walkForBareInterpHref(p, exts, exclude));
      continue;
    }
    if (!exts.has(extname(entry.name))) continue;
    const rel = p.split('\\').join('/');
    if (exclude.has(rel)) continue;
    if (BARE_INTERP_ATTR.test(readFileSync(p, 'utf8'))) offenders.push(p);
  }

  return offenders;
}

const BARE_INTERP_ATTR = /(?:href|src)\s*=\s*\{?\s*[`"']\/\$\{/;

test('BARE_INTERP_ATTR matches both the Astro bare-template and JSX curly-brace shapes', () => {
  // Astro shape: a bare template literal directly after `=` (legal only in
  // .astro frontmatter/markup). This is the exact shape ExhibitCard.astro
  // shipped in commit b63e8ba.
  assert.equal(
    BARE_INTERP_ATTR.test('<a href=`/${slug}` target="_blank">'),
    true,
    'must catch the Astro bare-template shape',
  );

  // JSX shape: the same bug, but wrapped in the mandatory curly braces JSX
  // requires for any attribute expression. Confirmed live in
  // src/components/s01g1/MainMenu.jsx and
  // src/components/s02g5/InteractiveTimeline.jsx.
  assert.equal(
    BARE_INTERP_ATTR.test('<a href={`/${era.id}`} style={s.card}>'),
    true,
    'must catch the JSX curly-brace shape',
  );

  // Both syntaxes' correctly-fixed forms - a base variable sits before the
  // slash, so it is no longer the first character of the value - must NOT
  // match. A false positive here would flag already-correct code.
  assert.equal(
    BARE_INTERP_ATTR.test('<a href={`${base}/${slug}`} style={s.card}>'),
    false,
    'must not flag a correctly-prefixed JSX reference',
  );
  assert.equal(
    BARE_INTERP_ATTR.test('<a href=`${base}/${slug}` target="_blank">'),
    false,
    'must not flag a correctly-prefixed Astro reference',
  );
});

// src/components/s01g1/MainMenu.jsx and src/components/s02g5/InteractiveTimeline.jsx
// carry the exact bare "/${...}" JSX bug this guard now catches, but both
// are confirmed dead code: nothing under src/pages/ (directly or
// transitively, including every other .astro/.jsx/.tsx file those pages
// import) ever imports either component, and a repo-wide grep for their
// names/dynamic import() turns up nothing beyond their own file. MainMenu.jsx
// has zero importers anywhere. InteractiveTimeline.jsx's only importer,
// ExhibitApp.jsx, itself has zero importers anywhere - the live s02g5 page
// (src/pages/s02g5.astro) renders ArcadeMenu.jsx instead, which already
// prefixes its era links correctly. Since neither file is ever rendered,
// there is no reason to touch their content (see ExhibitCard.astro's
// comment for why a live version of this bug needs a real fix); they are
// excluded here, by name, instead - matching tools/add-base.mjs's EXCLUDE
// pattern for known-safe files with a documented reason, rather than left
// for the guard to silently miss.
const DEAD_CODE_EXCLUDE = new Set([
  'src/components/s01g1/MainMenu.jsx',
  'src/components/s02g5/InteractiveTimeline.jsx',
]);

test(
  'no .astro/.tsx/.jsx file builds an href/src as a bare, un-prefixed "/${...}" reference ' +
    '(Astro bare-template or JSX curly-brace syntax)',
  () => {
    const offenders = walkForBareInterpHref(
      'src',
      new Set(['.astro', '.tsx', '.jsx']),
      DEAD_CODE_EXCLUDE,
    );
    assert.deepEqual(
      offenders,
      [],
      'these files build an href/src that starts with a bare "/${" - no base ' +
        'is prefixed before the leading slash, so it will 404 at a non-root ' +
        'base; combine it with the real base first (e.g. ' +
        "import.meta.env.BASE_URL, stripped of its trailing slash) instead of " +
        'interpolating straight after the slash',
    );
  },
);
