import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPublicAssetMap } from '../integrate/import-exhibit.mjs';

const CLI = fileURLToPath(new URL('../integrate/import-exhibit.mjs', import.meta.url));

// A minimal exhibit "clone": one entry page and one genuinely-unreferenced
// image, so findOrphans always reports exactly one orphan regardless of slug.
function fixtureRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'import-exhibit-src-'));
  mkdirSync(join(dir, 'src', 'pages'), { recursive: true });
  mkdirSync(join(dir, 'src', 'assets'), { recursive: true });
  writeFileSync(join(dir, 'src', 'pages', 'entry.mdx'), '# Entry\n');
  writeFileSync(join(dir, 'src', 'assets', 'orphan.png'), 'x'.repeat(64));
  return dir;
}

// The orchestrator writes into '.integration-src', 'src', and 'public'
// relative to process.cwd(), so each test gets its own scratch cwd — never
// the real repo — via spawnSync's `cwd` option.
function runCli(args, cwd) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
}

test('a glob slug with --apply and no override refuses, exits 2, and leaves the staged orphan on disk', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'import-exhibit-cwd-'));
  const repo = fixtureRepo();
  const result = runCli(
    ['--slug', 's03g8', '--src', repo, '--entry', 'entry.mdx', '--apply'],
    cwd,
  );
  assert.equal(result.status, 2);
  assert.match(result.stdout, /refusing to delete or copy/);
  assert.match(result.stdout, /--force-glob-repo/);

  const orphanPath = join(cwd, '.integration-src', 's03g8-stage', 'assets', 'orphan.png');
  assert.ok(existsSync(orphanPath), 'the staged orphan must survive the refusal');
  assert.ok(
    !existsSync(join(cwd, 'src', 'pages', 's03g8.mdx')),
    'no copy into src/ should have happened before the refusal',
  );
});

test('the same glob slug with --force-glob-repo proceeds', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'import-exhibit-cwd-'));
  const repo = fixtureRepo();
  const result = runCli(
    ['--slug', 's03g8', '--src', repo, '--entry', 'entry.mdx', '--apply', '--force-glob-repo'],
    cwd,
  );
  assert.equal(result.status, 0);

  const orphanPath = join(cwd, '.integration-src', 's03g8-stage', 'assets', 'orphan.png');
  assert.ok(!existsSync(orphanPath), 'the orphan should have been deleted once forced');
  assert.ok(existsSync(join(cwd, 'src', 'pages', 's03g8.mdx')), 'the entry page should have been copied');
});

test('a non-glob slug with --apply proceeds normally', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'import-exhibit-cwd-'));
  const repo = fixtureRepo();
  const result = runCli(
    ['--slug', 's01g1', '--src', repo, '--entry', 'entry.mdx', '--apply'],
    cwd,
  );
  assert.equal(result.status, 0);

  const orphanPath = join(cwd, '.integration-src', 's01g1-stage', 'assets', 'orphan.png');
  assert.ok(!existsSync(orphanPath), 'a non-glob slug should delete its orphan as before');
  assert.ok(existsSync(join(cwd, 'src', 'pages', 's01g1.mdx')), 'the entry page should have been copied');
});

test('a dry run on a glob slug exits 0 and still prints its orphan report', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'import-exhibit-cwd-'));
  const repo = fixtureRepo();
  const result = runCli(
    ['--slug', 's03g8', '--src', repo, '--entry', 'entry.mdx'],
    cwd,
  );
  assert.equal(result.status, 0);
  assert.match(result.stdout, /orphans: 1 files/);
  assert.ok(!existsSync(join(cwd, 'src')), 'a dry run must never write into src/');
});

// A fixture whose src/ keeps a directory outside the three the orchestrator
// used to hardcode (components/assets/styles), mirroring real repos that use
// src/fonts/, a repo-named component tree, a store/, etc. A stylesheet
// references a file in that directory the same way real CSS does (a quoted
// relative url()), so a rewritten reference proves the extra directory made
// it into the path map, not just onto disk.
function fixtureRepoWithExtraDir() {
  const dir = mkdtempSync(join(tmpdir(), 'import-exhibit-src-'));
  mkdirSync(join(dir, 'src', 'pages'), { recursive: true });
  // optimizeTree (not under test here, and out of scope to change) assumes
  // src/assets/ exists; every fixture needs it present, even empty.
  mkdirSync(join(dir, 'src', 'assets'), { recursive: true });
  mkdirSync(join(dir, 'src', 'fonts'), { recursive: true });
  mkdirSync(join(dir, 'src', 'styles'), { recursive: true });
  writeFileSync(join(dir, 'src', 'pages', 'entry.mdx'), '# Entry\n');
  writeFileSync(join(dir, 'src', 'fonts', 'Test.ttf'), 'FONTDATA');
  writeFileSync(
    join(dir, 'src', 'styles', 'site.css'),
    "@font-face { font-family: 'Test'; src: url('../fonts/Test.ttf'); }\n",
  );
  return dir;
}

test('a directory other than components/assets/styles/pages/layouts is namespaced', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'import-exhibit-cwd-'));
  const repo = fixtureRepoWithExtraDir();
  const result = runCli(
    ['--slug', 's99g9', '--src', repo, '--entry', 'entry.mdx', '--apply'],
    cwd,
  );
  assert.equal(result.status, 0);
  assert.match(result.stdout, /fonts\s*: -> src\/fonts\/s99g9\//);
  assert.ok(
    existsSync(join(cwd, 'src', 'fonts', 's99g9', 'Test.ttf')),
    'the extra directory should have been namespaced and copied, not skipped',
  );
});

test('a stylesheet reference into that directory is rewritten to the namespaced path', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'import-exhibit-cwd-'));
  const repo = fixtureRepoWithExtraDir();
  const result = runCli(
    ['--slug', 's99g9', '--src', repo, '--entry', 'entry.mdx', '--apply'],
    cwd,
  );
  assert.equal(result.status, 0);
  const css = readFileSync(join(cwd, 'src', 'styles', 's99g9', 'site.css'), 'utf8');
  assert.match(css, /url\('\.\.\/\.\.\/fonts\/s99g9\/Test\.ttf'\)/);
});

test('a source repo\'s own astro.config base is read, normalized, and used to rewrite hardcoded references', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'import-exhibit-cwd-'));
  const repo = fixtureRepo();
  writeFileSync(
    join(repo, 'astro.config.mjs'),
    "import { defineConfig } from 'astro/config';\n" +
    "export default defineConfig({ base: '/CSARCH2-G9-Exhibit/' });\n",
  );
  writeFileSync(
    join(repo, 'src', 'pages', 'entry.mdx'),
    '# Entry\n\n<img src="/CSARCH2-G9-Exhibit/astronauts.png" />\n',
  );
  const result = runCli(
    ['--slug', 's03g9', '--src', repo, '--entry', 'entry.mdx', '--apply'],
    cwd,
  );
  assert.equal(result.status, 0);
  assert.match(result.stdout, /source base: CSARCH2-G9-Exhibit/);
  const page = readFileSync(join(cwd, 'src', 'pages', 's03g9.mdx'), 'utf8');
  assert.match(page, /src="\/s03g9\/astronauts\.png"/);
});

test('a source repo with no base (or the default "/") in its astro.config gets no rewriting and no crash', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'import-exhibit-cwd-'));
  const repo = fixtureRepo();
  writeFileSync(
    join(repo, 'astro.config.mjs'),
    "import { defineConfig } from 'astro/config';\nexport default defineConfig({});\n",
  );
  const result = runCli(
    ['--slug', 's01g1', '--src', repo, '--entry', 'entry.mdx', '--apply'],
    cwd,
  );
  assert.equal(result.status, 0);
  assert.match(result.stdout, /source base: \(none/);
});

test('a loose file at the root of src/ is left in the stage and flagged, not silently dropped', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'import-exhibit-cwd-'));
  const repo = fixtureRepo();
  writeFileSync(join(repo, 'src', 'content.config.ts'), 'export const collections = {};\n');
  const result = runCli(
    ['--slug', 's01g1', '--src', repo, '--entry', 'entry.mdx', '--apply'],
    cwd,
  );
  assert.equal(result.status, 0);
  assert.match(result.stdout, /WARNING.*content\.config\.ts/s);
  assert.ok(
    existsSync(join(cwd, '.integration-src', 's01g1-stage', 'content.config.ts')),
    'the loose file should remain in the stage for manual review',
  );
  assert.ok(
    !existsSync(join(cwd, 'src', 'content.config.ts')),
    'the loose file must not be copied verbatim into the shared src/ root',
  );
});

// A staged styles/global.css is byte-identical to this repo's own
// src/styles/global.css unless the exhibit genuinely modified it. Since it is
// not a media file, prune.mjs never flags it as an orphan, so the orchestrator
// must decide for itself whether to drop it. `cwd/src/styles/global.css`
// stands in for "the umbrella's own copy" the same way the real CLI compares
// against the umbrella repo it runs from.
function withUmbrellaGlobalCss(cwd, content) {
  mkdirSync(join(cwd, 'src', 'styles'), { recursive: true });
  writeFileSync(join(cwd, 'src', 'styles', 'global.css'), content);
}

function fixtureRepoWithGlobalCss(content) {
  const dir = fixtureRepo();
  mkdirSync(join(dir, 'src', 'styles'), { recursive: true });
  writeFileSync(join(dir, 'src', 'styles', 'global.css'), content);
  return dir;
}

const REFERENCE_GLOBAL_CSS = '/* global.css */\nbody { margin: 0; }\n';

test('a staged global.css byte-identical to the umbrella copy is dropped', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'import-exhibit-cwd-'));
  withUmbrellaGlobalCss(cwd, REFERENCE_GLOBAL_CSS);
  const repo = fixtureRepoWithGlobalCss(REFERENCE_GLOBAL_CSS);
  const result = runCli(
    ['--slug', 's01g1', '--src', repo, '--entry', 'entry.mdx', '--apply'],
    cwd,
  );
  assert.equal(result.status, 0);
  assert.match(result.stdout, /styles\/global\.css: identical to the umbrella copy, dropped/);
  assert.ok(
    !existsSync(join(cwd, 'src', 'styles', 's01g1', 'global.css')),
    'a byte-identical global.css must not be copied into the exhibit namespace',
  );
});

test('a staged global.css that differs from the umbrella copy is kept', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'import-exhibit-cwd-'));
  withUmbrellaGlobalCss(cwd, REFERENCE_GLOBAL_CSS);
  const repo = fixtureRepoWithGlobalCss('/* global.css */\nbody { margin: 0; padding: 4px; }\n');
  const result = runCli(
    ['--slug', 's01g1', '--src', repo, '--entry', 'entry.mdx', '--apply'],
    cwd,
  );
  assert.equal(result.status, 0);
  assert.match(result.stdout, /styles\/global\.css: differs from the umbrella copy, kept/);
  assert.ok(
    existsSync(join(cwd, 'src', 'styles', 's01g1', 'global.css')),
    'a genuinely customized global.css must survive for the runbook\'s style-scoping step',
  );
});

// --- public-asset rename map sourced from optimizer results (defect: stale
// extension survives rewriting) ---
//
// buildPublicAssetMap is a pure function, importable and callable directly
// without running the CLI body (that body is gated behind an
// import.meta.url guard specifically so this works) and without invoking
// any real image/video/model encoder: publicResults below are hand-built
// objects shaped like optimizeTree's own return values, not the output of
// an actual conversion.
test('buildPublicAssetMap sources an original -> final rename map from optimizeTree-shaped results', () => {
  const dir = mkdtempSync(join(tmpdir(), 'public-asset-map-'));
  mkdirSync(join(dir, 'imgs'), { recursive: true });

  // The final on-disk state, as if optimizeTree already ran: a successful
  // conversion leaves only the new name (the original was deleted); a
  // skipped or failed one leaves the original name in place untouched; a
  // file the optimizer never even considers a candidate is untouched too.
  writeFileSync(join(dir, 'Clock.webp'), 'webp-bytes');
  writeFileSync(join(dir, 'imgs', 'tile.webp'), 'webp-bytes');
  writeFileSync(join(dir, 'skipped.png'), 'png-bytes');
  writeFileSync(join(dir, 'failed.png'), 'png-bytes');
  writeFileSync(join(dir, 'model.glb'), 'glb-bytes');

  const publicResults = [
    { from: join(dir, 'Clock.png'), to: join(dir, 'Clock.webp') },
    { from: join(dir, 'imgs', 'tile.png'), to: join(dir, 'imgs', 'tile.webp') },
    { from: join(dir, 'skipped.png'), to: join(dir, 'skipped.png'), skipped: 'no gain' },
    // A failed conversion still carries the never-realized planned target in
    // `to` (optimizeTree's own catch-block behavior) — the disk still holds
    // the ORIGINAL file, so this must not be trusted as a real rename.
    { from: join(dir, 'failed.png'), to: join(dir, 'failed.webp'), failed: 'encoder exploded' },
  ];

  const map = buildPublicAssetMap(dir, publicResults);

  assert.equal(map.get('Clock.png'), 'Clock.webp', 'a successful conversion maps original -> final');
  assert.equal(map.has('Clock.webp'), false, 'the stale self-mapped final-name entry must not linger');
  assert.equal(map.get('imgs/tile.png'), 'imgs/tile.webp', 'a nested successful conversion is mapped too');
  assert.equal(map.get('skipped.png'), 'skipped.png', 'a skipped conversion maps to itself');
  assert.equal(
    map.get('failed.png'), 'failed.png',
    'a failed conversion maps to itself, not to the never-realized planned target',
  );
  assert.equal(map.has('failed.webp'), false, 'the never-realized planned target is never a map key');
  assert.equal(map.get('model.glb'), 'model.glb', 'a file the optimizer never touched maps to itself');
});

// --- the orchestrator's routes map: the entry page points at the bare
// slug, not slug/<its-old-name> (see rewrite.mjs) ---
test('the entry page\'s own name maps to the bare slug in the built routes map', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'import-exhibit-cwd-'));
  const repo = fixtureRepo();
  writeFileSync(
    join(repo, 'src', 'pages', 'entry.mdx'),
    '# Entry\n\n<a href={`${base}/entry`}>Home</a>\n',
  );
  const result = runCli(
    ['--slug', 's01g1', '--src', repo, '--entry', 'entry.mdx', '--apply'],
    cwd,
  );
  assert.equal(result.status, 0);
  const page = readFileSync(join(cwd, 'src', 'pages', 's01g1.mdx'), 'utf8');
  // Collapsed form: `${base}` is "/" at this site's base, so keeping the
  // authored separator would emit "//s01g1" (see rewrite.mjs).
  assert.match(page, /href=\{`\$\{base\}s01g1`\}/);
  assert.doesNotMatch(page, /s01g1\/entry/);
});

test('a staged global.css that differs from the umbrella copy only by CRLF line endings is treated as identical and dropped', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'import-exhibit-cwd-'));
  withUmbrellaGlobalCss(cwd, REFERENCE_GLOBAL_CSS);
  const repo = fixtureRepoWithGlobalCss(REFERENCE_GLOBAL_CSS.replace(/\n/g, '\r\n'));
  const result = runCli(
    ['--slug', 's01g1', '--src', repo, '--entry', 'entry.mdx', '--apply'],
    cwd,
  );
  assert.equal(result.status, 0);
  assert.match(result.stdout, /styles\/global\.css: identical to the umbrella copy, dropped/);
  assert.ok(
    !existsSync(join(cwd, 'src', 'styles', 's01g1', 'global.css')),
    'a CRLF-only difference must still be treated as identical',
  );
});

// --- index-squatter entry handling (defect: --entry index.mdx always
// crashed because the template-leftover cleanup step deleted pages/index.mdx
// unconditionally, before the entry-copy step could read it; separately, the
// entry-copy step always wrote src/pages/<slug>.mdx regardless of the
// entry's own extension, so an --entry index.astro silently produced an
// Astro component saved with an .mdx extension) ---

// A fixture repo whose entry page lives under whatever filename the caller
// chooses — index.mdx or index.astro for the index-squatter pattern the
// runbook documents, or a differently-named .mdx page as a regression check
// — instead of always entry.mdx the way fixtureRepo() above does.
function fixtureRepoWithEntryNamed(entryFile, content = '# Entry\n') {
  const dir = mkdtempSync(join(tmpdir(), 'import-exhibit-src-'));
  mkdirSync(join(dir, 'src', 'pages'), { recursive: true });
  // optimizeTree assumes src/assets/ exists; every fixture needs it present.
  mkdirSync(join(dir, 'src', 'assets'), { recursive: true });
  writeFileSync(join(dir, 'src', 'pages', entryFile), content);
  return dir;
}

test('--entry index.mdx survives the leftover-cleanup step and lands at src/pages/<slug>.mdx', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'import-exhibit-cwd-'));
  const repo = fixtureRepoWithEntryNamed('index.mdx', '# Index-squatter entry\n');
  const result = runCli(
    ['--slug', 's50g1', '--src', repo, '--entry', 'index.mdx', '--apply'],
    cwd,
  );
  assert.equal(result.status, 0);
  assert.ok(
    existsSync(join(cwd, '.integration-src', 's50g1-stage', 'pages', 'index.mdx')),
    'the staged index.mdx must survive the leftover-cleanup step when it is the --entry',
  );
  assert.ok(
    existsSync(join(cwd, 'src', 'pages', 's50g1.mdx')),
    'the index.mdx entry should have been copied to src/pages/<slug>.mdx',
  );
});

test('a staged index.mdx that is NOT the entry is still deleted as a leftover (regression guard)', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'import-exhibit-cwd-'));
  const repo = fixtureRepo();
  writeFileSync(join(repo, 'src', 'pages', 'index.mdx'), '# Stock template homepage\n');
  const result = runCli(
    ['--slug', 's50g2', '--src', repo, '--entry', 'entry.mdx', '--apply'],
    cwd,
  );
  assert.equal(result.status, 0);
  assert.ok(
    !existsSync(join(cwd, '.integration-src', 's50g2-stage', 'pages', 'index.mdx')),
    'a staged index.mdx that is not the entry must still be dropped as template leftover',
  );
});

test('--entry index.astro lands at src/pages/<slug>.astro, not .mdx', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'import-exhibit-cwd-'));
  const repo = fixtureRepoWithEntryNamed('index.astro', '---\n---\n<div>Astro index-squatter</div>\n');
  const result = runCli(
    ['--slug', 's50g3', '--src', repo, '--entry', 'index.astro', '--apply'],
    cwd,
  );
  assert.equal(result.status, 0);
  assert.ok(
    existsSync(join(cwd, 'src', 'pages', 's50g3.astro')),
    'an index.astro entry should be copied keeping its own .astro extension',
  );
  assert.ok(
    !existsSync(join(cwd, 'src', 'pages', 's50g3.mdx')),
    'an index.astro entry must not be silently written with a .mdx extension',
  );
});

test('--entry named.mdx still lands at src/pages/<slug>.mdx (regression guard)', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'import-exhibit-cwd-'));
  const repo = fixtureRepoWithEntryNamed('named.mdx', '# Named entry\n');
  const result = runCli(
    ['--slug', 's50g4', '--src', repo, '--entry', 'named.mdx', '--apply'],
    cwd,
  );
  assert.equal(result.status, 0);
  assert.ok(
    existsSync(join(cwd, 'src', 'pages', 's50g4.mdx')),
    'a plain-named .mdx entry should still land at src/pages/<slug>.mdx',
  );
});
