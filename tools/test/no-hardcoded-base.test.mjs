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
// actually bit here: an href/src template literal whose value starts with a
// bare '/' immediately followed by '${', with nothing - no base variable -
// between the quote/backtick and the slash. A correctly-fixed reference
// like `href=\`${base}/${slug}\`` does NOT match, because the '/' there is
// not the first character of the attribute value.
function walkForBareInterpHref(dir, exts) {
  const offenders = [];
  const BARE_INTERP_ATTR = /(?:href|src)\s*=\s*[`"']\/\$\{/;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      offenders.push(...walkForBareInterpHref(p, exts));
      continue;
    }
    if (!exts.has(extname(entry.name))) continue;
    if (BARE_INTERP_ATTR.test(readFileSync(p, 'utf8'))) offenders.push(p);
  }

  return offenders;
}

test(
  'no .astro/.tsx/.jsx file builds an href/src as a bare, un-prefixed "/${...}" template literal',
  () => {
    const offenders = walkForBareInterpHref('src', new Set(['.astro', '.tsx', '.jsx']));
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
