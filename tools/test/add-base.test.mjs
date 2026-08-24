import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addBaseToSlugRefs } from '../lib/add-base.mjs';

const opts = { slugs: ['s01g8', 's40g1'], base: 'csarch2-virtual-exhibits' };

test('prefixes a bare root-relative asset path', () => {
  const { text, changed } = addBaseToSlugRefs("'/s40g1/Teacup.webp'", opts);
  assert.equal(text, "'/csarch2-virtual-exhibits/s40g1/Teacup.webp'");
  assert.equal(changed, 1);
});

test('prefixes href and src attributes', () => {
  const src = '<a href="/s01g8">x</a><img src="/s40g1/a.webp">';
  const { text, changed } = addBaseToSlugRefs(src, opts);
  assert.equal(text, '<a href="/csarch2-virtual-exhibits/s01g8">x</a><img src="/csarch2-virtual-exhibits/s40g1/a.webp">');
  assert.equal(changed, 2);
});

test('prefixes markdown link destinations', () => {
  const { text } = addBaseToSlugRefs('[Main hall](/s01g8)', opts);
  assert.equal(text, '[Main hall](/csarch2-virtual-exhibits/s01g8)');
});

test('prefixes a bare reference with nothing after it', () => {
  const { text, changed } = addBaseToSlugRefs('id={slug} data-href=/s01g8', opts);
  assert.equal(text, 'id={slug} data-href=/csarch2-virtual-exhibits/s01g8');
  assert.equal(changed, 1);
});

test('prefixes a sub-page path exactly once, at the slug boundary', () => {
  const { text, changed } = addBaseToSlugRefs('"/s01g8/03-before-gpus"', opts);
  assert.equal(text, '"/csarch2-virtual-exhibits/s01g8/03-before-gpus"');
  assert.equal(changed, 1);
});

test('does NOT match a slug that is only a prefix of a longer path segment', () => {
  const src = '"/s01g8x/not-our-exhibit"';
  const { text, changed } = addBaseToSlugRefs(src, opts);
  assert.equal(text, src);
  assert.equal(changed, 0);
});

test('LEAVES external https URLs alone even if they happen to contain a slug-shaped segment', () => {
  const src = '"https://example.com/mirror/s01g8"';
  const { text, changed } = addBaseToSlugRefs(src, opts);
  assert.equal(text, src);
  assert.equal(changed, 0);
});

test('ignores a path segment that is not a known slug', () => {
  const src = '"/not-a-real-slug/x.webp"';
  const { text, changed } = addBaseToSlugRefs(src, opts);
  assert.equal(text, src);
  assert.equal(changed, 0);
});

test('is a no-op on source with no slug references', () => {
  const { text, changed } = addBaseToSlugRefs('const x = 1;', opts);
  assert.equal(text, 'const x = 1;');
  assert.equal(changed, 0);
});

test('rejects an empty base — there is nothing to add a reference under', () => {
  assert.throws(() => addBaseToSlugRefs('"/s01g8"', { slugs: ['s01g8'], base: '' }), /base/i);
});

// Regression coverage for a real defect found while building Task 2's CLI
// and applying it across src/: the boundary check only ever validated what
// comes AFTER a matched slug, never what precedes the matched leading '/'.
// That let it match inside relative import/glob specifiers that merely
// happen to contain a slug-shaped path segment, corrupting them, and made
// the function non-idempotent on its own already-correct output.

test('does NOT match a slug-shaped segment inside a relative import specifier', () => {
  const src = 'import X from "../../assets/s04g2/Discord_Logo.webp"';
  const { text, changed } = addBaseToSlugRefs(src, { slugs: ['s04g2'], base: 'csarch2-virtual-exhibits' });
  assert.equal(text, src);
  assert.equal(changed, 0);
});

test('does NOT match a slug-shaped segment inside a content-collection glob path', () => {
  const src = "'./src/content/s01g5/eras'";
  const { text, changed } = addBaseToSlugRefs(src, { slugs: ['s01g5'], base: 'csarch2-virtual-exhibits' });
  assert.equal(text, src);
  assert.equal(changed, 0);
});

test('is idempotent — running it again on its own already-correct output is a no-op', () => {
  const already = '"/csarch2-virtual-exhibits/s01g1/mail.webp"';
  const { text, changed } = addBaseToSlugRefs(already, { slugs: ['s01g1'], base: 'csarch2-virtual-exhibits' });
  assert.equal(text, already);
  assert.equal(changed, 0);
});
