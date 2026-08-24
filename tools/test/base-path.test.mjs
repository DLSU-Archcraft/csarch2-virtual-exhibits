import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rewriteBaseRefs } from '../lib/base-path.mjs';
import { rewriteTree } from '../rewrite-base.mjs';

const opts = { from: 'virtual-exhibit-template', to: '' };

test('rewrites a bare root-relative reference', () => {
  const { text, changed } = rewriteBaseRefs("'/virtual-exhibit-template/s40g1/Teacup.webp'", opts);
  assert.equal(text, "'/s40g1/Teacup.webp'");
  assert.equal(changed, 1);
});

test('rewrites href and src attributes', () => {
  const src = '<a href="/virtual-exhibit-template/s01g8">x</a><img src="/virtual-exhibit-template/a.webp">';
  const { text, changed } = rewriteBaseRefs(src, opts);
  assert.equal(text, '<a href="/s01g8">x</a><img src="/a.webp">');
  assert.equal(changed, 2);
});

test('rewrites markdown link destinations', () => {
  const { text } = rewriteBaseRefs('[Main hall](/virtual-exhibit-template/s01g8)', opts);
  assert.equal(text, '[Main hall](/s01g8)');
});

test('rewrites css url()', () => {
  const { text } = rewriteBaseRefs("url('/virtual-exhibit-template/s03g2/fonts/DS-DIGI.TTF')", opts);
  assert.equal(text, "url('/s03g2/fonts/DS-DIGI.TTF')");
});

test('LEAVES external https URLs alone', () => {
  const src = '"https://dmdlsu.github.io/virtual-exhibit-template/journey-of-a-message"';
  const { text, changed } = rewriteBaseRefs(src, opts);
  assert.equal(text, src);
  assert.equal(changed, 0);
});

test('LEAVES the string alone when it is a hostname', () => {
  const src = '"https://virtual-exhibit-template.onrender.com/usb"';
  const { text, changed } = rewriteBaseRefs(src, opts);
  assert.equal(text, src);
  assert.equal(changed, 0);
});

test('LEAVES github repo URLs alone', () => {
  const src = '"https://github.com/DMDLSU/virtual-exhibit-template"';
  const { text, changed } = rewriteBaseRefs(src, opts);
  assert.equal(text, src);
  assert.equal(changed, 0);
});

test('handles a line carrying both an external URL and a real reference', () => {
  const src = 'see https://x.github.io/virtual-exhibit-template/ then load "/virtual-exhibit-template/a.webp"';
  const { text, changed } = rewriteBaseRefs(src, opts);
  assert.equal(text, 'see https://x.github.io/virtual-exhibit-template/ then load "/a.webp"');
  assert.equal(changed, 1);
});

test('rewrites to a non-root base', () => {
  const { text } = rewriteBaseRefs("'/virtual-exhibit-template/a.webp'", {
    from: 'virtual-exhibit-template', to: 'csarch2',
  });
  assert.equal(text, "'/csarch2/a.webp'");
});

test('is a no-op on source with no references', () => {
  const { text, changed } = rewriteBaseRefs('const x = 1;', opts);
  assert.equal(text, 'const x = 1;');
  assert.equal(changed, 0);
});

test('a bare reference at the end of the string resolves to root, not the empty string', () => {
  const { text, changed } = rewriteBaseRefs('/virtual-exhibit-template', opts);
  assert.equal(text, '/');
  assert.equal(changed, 1);
});

test('a bare reference immediately followed by a quote resolves to root', () => {
  const { text, changed } = rewriteBaseRefs('prevUrl="/virtual-exhibit-template" ', opts);
  assert.equal(text, 'prevUrl="/" ');
  assert.equal(changed, 1);
});

test('a bare reference followed by a query string resolves to root plus the query', () => {
  const { text } = rewriteBaseRefs('/virtual-exhibit-template?x=1', opts);
  assert.equal(text, '/?x=1');
});

test('a bare reference followed by a fragment resolves to root plus the fragment', () => {
  const { text } = rewriteBaseRefs('/virtual-exhibit-template#top', opts);
  assert.equal(text, '/#top');
});

test('a bare reference with a non-empty "to" is unaffected by the root-collapse fix', () => {
  const { text } = rewriteBaseRefs('/virtual-exhibit-template', {
    from: 'virtual-exhibit-template', to: 'csarch2',
  });
  assert.equal(text, '/csarch2');
});

// --- 'from' must name a segment (I3) ---
//
// README 14 used to instruct `--from '' --to csarch2` as the one-command way
// to move the site under a base. With from === '' the needle is a bare '/',
// which matches EVERY slash: "/s01g8/diagram.webp" became
// "/csarch2s01g8/csarch2diagram.webp". The tool now refuses.

test("an empty 'from' throws instead of matching every slash", () => {
  assert.throws(
    () => rewriteBaseRefs('"/s01g8/diagram.webp"', { from: '', to: 'csarch2' }),
    /must name a base path segment/,
  );
});

test("a 'from' of '/' throws for the same reason", () => {
  assert.throws(
    () => rewriteBaseRefs('"/s01g8/diagram.webp"', { from: '/', to: 'csarch2' }),
    /must name a base path segment/,
  );
});

test("rewriteTree refuses an empty 'from' and writes nothing", () => {
  const dir = mkdtempSync(join(tmpdir(), 'empty-from-'));
  const file = join(dir, 'page.json');
  const before = '{"x": "/s01g8/diagram.webp"}';
  writeFileSync(file, before);

  assert.throws(
    () => rewriteTree(dir, { from: '', to: 'csarch2', dryRun: false, exclude: new Set() }),
    /must name a base path segment/,
  );
  assert.equal(readFileSync(file, 'utf8'), before);
});

// --- 'from'/'to' are segments, however they are decorated ---

test("a 'to' written with a leading slash does not produce //", () => {
  const { text } = rewriteBaseRefs("'/virtual-exhibit-template/a.webp'", {
    from: 'virtual-exhibit-template', to: '/csarch2',
  });
  assert.equal(text, "'/csarch2/a.webp'");
});

test("a 'to' written with leading and trailing slashes is normalized", () => {
  const { text } = rewriteBaseRefs("'/virtual-exhibit-template/a.webp'", {
    from: 'virtual-exhibit-template', to: '/csarch2/',
  });
  assert.equal(text, "'/csarch2/a.webp'");
});

test("a 'to' of '/' means root, the same as ''", () => {
  const { text } = rewriteBaseRefs("'/virtual-exhibit-template/a.webp'", {
    from: 'virtual-exhibit-template', to: '/',
  });
  assert.equal(text, "'/a.webp'");
});

test("a 'from' written with leading and trailing slashes still matches", () => {
  const { text, changed } = rewriteBaseRefs("'/virtual-exhibit-template/a.webp'", {
    from: '/virtual-exhibit-template/', to: 'csarch2',
  });
  assert.equal(text, "'/csarch2/a.webp'");
  assert.equal(changed, 1);
});

test("rewriteTree's prefilter uses the normalized 'from' too", () => {
  const dir = mkdtempSync(join(tmpdir(), 'decorated-from-'));
  writeFileSync(join(dir, 'page.json'), '{"x": "/virtual-exhibit-template/a.webp"}');

  const report = rewriteTree(dir, {
    from: '/virtual-exhibit-template/', to: 'csarch2', dryRun: true, exclude: new Set(),
  });
  assert.equal(report.length, 1);
  assert.equal(report[0].changed, 1);
});
