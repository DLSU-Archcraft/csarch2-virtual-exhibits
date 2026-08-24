import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
