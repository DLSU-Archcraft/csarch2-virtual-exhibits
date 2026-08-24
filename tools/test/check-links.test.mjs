import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { checkLinks } from '../check-links.mjs';

function dist(files) {
  const dir = mkdtempSync(join(tmpdir(), 'dist-'));
  for (const [rel, body] of Object.entries(files)) {
    const full = join(dir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
  return dir;
}

test('a page linking to an existing file passes', () => {
  const d = dist({
    'index.html': '<a href="/s01g8/">go</a>',
    's01g8/index.html': '<html></html>',
  });
  assert.deepEqual(checkLinks(d).errors, []);
});

test('a page linking to a missing file fails', () => {
  const d = dist({ 'index.html': '<a href="/s01g8/">go</a>' });
  const { ok, errors } = checkLinks(d);
  assert.equal(ok, false);
  assert.ok(errors[0].includes('/s01g8/'));
});

test('a missing image is reported', () => {
  const d = dist({ 'index.html': '<img src="/a/missing.webp">' });
  assert.equal(checkLinks(d).ok, false);
});

test('external, anchor, mailto and data URLs are ignored', () => {
  const d = dist({
    'index.html':
      '<a href="https://example.com/x">a</a><a href="#top">b</a>' +
      '<a href="mailto:x@y.z">c</a><img src="data:image/png;base64,AAAA">',
  });
  assert.deepEqual(checkLinks(d).errors, []);
});

test('a directory link resolves to its index.html', () => {
  const d = dist({
    'index.html': '<a href="/s01g8">go</a>',
    's01g8/index.html': '<html></html>',
  });
  assert.deepEqual(checkLinks(d).errors, []);
});

test('query strings and fragments are stripped before resolving', () => {
  const d = dist({
    'index.html': '<img src="/a.webp?v=2"><a href="/s01g8/#intro">x</a>',
    'a.webp': 'x',
    's01g8/index.html': '<html></html>',
  });
  assert.deepEqual(checkLinks(d).errors, []);
});

test('a file containing NUL bytes is still scanned', () => {
  const d = dist({
    'index.html': `<span>${String.fromCharCode(0)}</span><a href="/gone/">x</a>`,
  });
  assert.equal(checkLinks(d).ok, false);
});

test('a missing distDir returns {ok: false} with an error and does not throw', () => {
  const { ok, errors } = checkLinks('/tmp/definitely-does-not-exist-xyz-123');
  assert.equal(ok, false);
  assert.ok(errors[0].includes('no such directory'));
});

test('an existing but empty distDir returns {ok: true, errors: []}', () => {
  const d = mkdtempSync(join(tmpdir(), 'empty-dist-'));
  const { ok, errors } = checkLinks(d);
  assert.equal(ok, true);
  assert.deepEqual(errors, []);
});

test("a page whose inline <script> contains `const heroSrc = \"/does/not/exist.webp\"` reports NO dead link", () => {
  const d = dist({
    'index.html': '<script>const heroSrc = "/does/not/exist.webp";</script>',
  });
  assert.deepEqual(checkLinks(d).errors, []);
});

test("a page whose inline <script> contains `let src = \"/also/missing.webp\"` reports NO dead link", () => {
  const d = dist({
    'index.html': '<script>let src = "/also/missing.webp";</script>',
  });
  assert.deepEqual(checkLinks(d).errors, []);
});

test('a page with <a href="/real/"> AND a script block still catches the real dead link', () => {
  const d = dist({
    'index.html':
      '<script>const src = "/does/not/exist.webp";</script>' +
      '<a href="/real/">link</a>',
  });
  const { ok, errors } = checkLinks(d);
  assert.equal(ok, false);
  assert.ok(errors[0].includes('/real/'));
  assert.equal(errors.length, 1);
});

test('a page containing an unclosed <script> tag with a link-like string reports no dead link', () => {
  const d = dist({
    'index.html': '<script>let src = "/nope.webp";',
  });
  assert.deepEqual(checkLinks(d).errors, []);
});

// --- protocol-relative URLs (C1b) ---
//
// `${import.meta.env.BASE_URL}/s03g3` renders as "//s03g3" once the base is
// "/". The checker used to skip every "//" reference outright, so the site's
// own gate could not see the 552 broken links this produced.

test('a protocol-relative site path ("//s03g3") is reported, not skipped', () => {
  const d = dist({
    'index.html': '<a href="//s03g3">go</a>',
    's03g3/index.html': '<html></html>',
  });
  const { ok, errors } = checkLinks(d);
  assert.equal(ok, false);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /protocol-relative/);
  assert.match(errors[0], /\/\/s03g3/);
});

test('a protocol-relative site path is reported even when the target exists on disk', () => {
  const d = dist({
    'index.html': '<img src="//s40g6/usb.glb">',
    's40g6/usb.glb': 'x',
  });
  assert.equal(checkLinks(d).ok, false);
});

test('a genuinely external protocol-relative URL ("//cdn.example.com/x") is still skipped', () => {
  const d = dist({
    'index.html': '<script src="//cdn.example.com/lib.js"></script><img src="//img.cdn.net/a.png">',
  });
  assert.deepEqual(checkLinks(d).errors, []);
});

test('a protocol-relative localhost URL is treated as an external host', () => {
  const d = dist({ 'index.html': '<a href="//localhost:4321/s01g8">x</a>' });
  assert.deepEqual(checkLinks(d).errors, []);
});

// --- <script src> (I1) ---
//
// The element body was stripped INCLUDING its opening tag, so every
// <script src> in the build - 119 of them, 113 from s02g7's chunk graph -
// was consumed before the attribute scan ever ran.

test('a missing <script src> is reported', () => {
  const d = dist({ 'index.html': '<script src="/_astro/missing.js"></script>' });
  const { ok, errors } = checkLinks(d);
  assert.equal(ok, false);
  assert.match(errors[0], /_astro\/missing\.js/);
});

test('an existing <script src> passes', () => {
  const d = dist({
    'index.html': '<script type="module" src="/_astro/app.js"></script>',
    '_astro/app.js': 'console.log(1);',
  });
  assert.deepEqual(checkLinks(d).errors, []);
});

test('a <script src> is checked while that same element\'s body is still ignored', () => {
  const d = dist({
    'index.html':
      '<script src="/_astro/present.js">const x = "/does/not/exist.webp";</script>',
    '_astro/present.js': 'x',
  });
  assert.deepEqual(checkLinks(d).errors, []);
});

test('a protocol-relative <script src> to a bare slug is reported', () => {
  const d = dist({ 'index.html': '<script src="//s02g7/chunk.js"></script>' });
  const { ok, errors } = checkLinks(d);
  assert.equal(ok, false);
  assert.match(errors[0], /protocol-relative/);
});

// --- base-aware resolution ---
//
// distDir is never physically nested under a `<base>/` folder - Astro
// prefixes hrefs with `base` as a URL string only, it doesn't change where
// pages are written on disk. Without stripping `base` first, every
// correctly-prefixed reference (including ones Astro generates itself, like
// its bundled CSS) looks dead against distDir, while a reference that is
// MISSING the base can accidentally resolve anyway, by coincidence, and so
// is silently missed. Both directions are covered below.

test('with a base, a correctly base-prefixed link resolves', () => {
  const d = dist({
    'index.html': '<a href="/csarch2-virtual-exhibits/s01g8/">go</a>',
    's01g8/index.html': '<html></html>',
  });
  assert.deepEqual(
    checkLinks(d, { base: '/csarch2-virtual-exhibits' }).errors,
    [],
  );
});

test('with a base, an Astro-auto-generated asset href resolves after the base is stripped', () => {
  const d = dist({
    'index.html': '<link href="/csarch2-virtual-exhibits/_astro/app.BJZUgkGJ.css">',
    '_astro/app.BJZUgkGJ.css': 'body{}',
  });
  assert.deepEqual(
    checkLinks(d, { base: '/csarch2-virtual-exhibits' }).errors,
    [],
  );
});

test('with a base, a bare link to the base itself (the homepage) is not reported as dead', () => {
  const d = dist({ 'index.html': '<a href="/csarch2-virtual-exhibits">home</a>' });
  assert.deepEqual(
    checkLinks(d, { base: '/csarch2-virtual-exhibits' }).errors,
    [],
  );
});

test('with a base, a link that is MISSING the base is reported as dead even though it happens to resolve on disk without it', () => {
  // Regression: this is the exact false-negative the naive (non-base-aware)
  // checker had - "/s01g8/" coincidentally resolves against a distDir that
  // really does contain "s01g8/" at its own root, so a checker that just
  // joins the href straight onto distDir sees it as fine. It is not fine on
  // the real deployed site, where a root-relative href resolves against the
  // domain root, not the project's own namespace.
  const d = dist({
    'index.html': '<a href="/s01g8/">go</a>',
    's01g8/index.html': '<html></html>',
  });
  const { ok, errors } = checkLinks(d, { base: '/csarch2-virtual-exhibits' });
  assert.equal(ok, false);
  assert.match(errors[0], /missing required base/);
  assert.match(errors[0], /\/s01g8\//);
});

test('with a base, a link that is double-prefixed with the base is still reported as dead', () => {
  const d = dist({
    'index.html':
      '<a href="/csarch2-virtual-exhibits/csarch2-virtual-exhibits/s01g8/">go</a>',
    's01g8/index.html': '<html></html>',
  });
  const { ok, errors } = checkLinks(d, { base: '/csarch2-virtual-exhibits' });
  assert.equal(ok, false);
  assert.match(errors[0], /dead link/);
});

test('base is normalized the same way regardless of leading/trailing slashes', () => {
  const d = dist({
    'index.html': '<a href="/csarch2-virtual-exhibits/s01g8/">go</a>',
    's01g8/index.html': '<html></html>',
  });
  for (const base of ['csarch2-virtual-exhibits', 'csarch2-virtual-exhibits/', '/csarch2-virtual-exhibits/']) {
    assert.deepEqual(checkLinks(d, { base }).errors, [], `base: ${JSON.stringify(base)}`);
  }
});

test('omitting base preserves the original root-site behavior', () => {
  const d = dist({
    'index.html': '<a href="/s01g8/">go</a>',
    's01g8/index.html': '<html></html>',
  });
  assert.deepEqual(checkLinks(d).errors, []);
});
