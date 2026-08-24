# Phase 0a — Base Path Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all 109 hardcoded `/virtual-exhibit-template` references from `src/`, move the site to `base: '/'`, and leave behind a tested codemod plus link-checker so any future base change is one command instead of a day.

**Architecture:** One uniform mechanism, not three. Because the target base is `/`, every hardcoded reference becomes correct simply by stripping the `/virtual-exhibit-template` prefix — root-relative paths, markdown link destinations, and CSS `url()` all resolve correctly at root. A pure `rewriteBaseRefs()` function does the transformation; a thin CLI applies it across `src/`; a Node link-checker verifies the result against the real build. The codemod and checker stay in the repo permanently, which is what makes the base genuinely changeable later.

**Tech Stack:** Node 26 (`node --test`, no test framework), Astro 5.18.2, plain ESM `.mjs` tooling under `tools/`.

**Spec:** `docs/superpowers/specs/2026-08-22-virtual-exhibit-social-design.md` — see the [Base path migration](../specs/2026-08-22-virtual-exhibit-social-design.md#base-path-migration) section.

## Global Constraints

- **Never modify anything in `src/layouts/`.** `ExhibitLayout.astro` carries a do-not-modify notice covering the whole directory. This holds without exception.
- **Never touch `src/data/exhibits.json`.** All 25 of its `virtual-exhibit-template` matches are inside `https://…` URLs pointing at other students' repos and Pages deployments, including one where the string is a *hostname* (`https://virtual-exhibit-template.onrender.com/usb`). Rewriting them silently breaks working external links.
- **No shell text tools on built HTML.** `dist/s03g8/index.html` contains NUL bytes; `grep` classifies it as binary and skips it silently. All tooling that reads `dist/` must be Node.
- **Tests run with `npm test`** = `node --test tools/test/*.mjs`. Follow the existing style in `tools/test/verify-site.test.mjs`: `node:test`, `node:assert/strict`, temp dirs via `mkdtempSync`.
- **Branch:** `feat/social-features`. Commit after every task.
- Node 26.7.0, npm 12.0.2.

## File Structure

| File | Responsibility |
|---|---|
| `tools/lib/base-path.mjs` (create) | Pure string transformation. `rewriteBaseRefs(source, {from, to})` — the only place the rewrite rule lives. No file I/O. |
| `tools/test/base-path.test.mjs` (create) | Tests for the above, especially the external-URL guard. |
| `tools/rewrite-base.mjs` (create) | CLI. Walks `src/`, applies `rewriteBaseRefs`, honors `--dry-run`, skips the exclusion list. |
| `tools/check-links.mjs` (create) | Walks `dist/**/*.html` in Node, extracts `href`/`src`, asserts every internal reference resolves to a real file. |
| `tools/test/check-links.test.mjs` (create) | Tests for the link checker against fixture dists. |
| `tools/test/no-hardcoded-base.test.mjs` (create) | Permanent regression guard: zero bare base refs in `src/`, and the 25 external URLs still intact. |
| `astro.config.mjs` (modify:10) | `base: 'virtual-exhibit-template'` → `base: '/'`. |
| `package.json` (modify) | Add `verify` script wiring the checkers together. |
| `README.md` (modify:§8) | The dev-server URL example loses the base segment. |
| `public/s02g7/**` (replace) | Rebuilt Next.js export with the new `basePath`. |
| 33 files under `src/` (modify) | Mechanically rewritten by the codemod. Not hand-edited. |
| `tools/integrate/rewrite.mjs` (modify:18,120,158,187) | Stop splicing a hardcoded base into newly imported exhibits. |
| `tools/test/rewrite.test.mjs`, `tools/test/import-exhibit.test.mjs` (modify) | 15 assertions that encode the old base. |

---

### Task 1: The rewrite rule

The single most important behavior in this plan is what the codemod **refuses** to touch. Write that first.

**Files:**
- Create: `tools/lib/base-path.mjs`
- Test: `tools/test/base-path.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `rewriteBaseRefs(source: string, opts: {from: string, to: string}) => {text: string, changed: number}`. `from` is a base segment without slashes (`'virtual-exhibit-template'`); `to` is a base segment or `''` for root. Task 3 and Task 7 both consume this.

- [ ] **Step 1: Write the failing test**

Create `tools/test/base-path.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rewriteBaseRefs } from '../lib/base-path.mjs';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/test/base-path.test.mjs`
Expected: FAIL — `Cannot find module '../lib/base-path.mjs'`

- [ ] **Step 3: Write minimal implementation**

Create `tools/lib/base-path.mjs`:

```javascript
// The rewrite rule for the site's base path segment. Pure string in, pure
// string out — every caller (CLI, tests, future base changes) goes through here.
//
// The subtlety is what must NOT be rewritten. `src/data/exhibits.json` and
// several exhibit pages link to OTHER students' repositories and GitHub Pages
// deployments, whose URLs contain the same segment:
//
//   https://dmdlsu.github.io/virtual-exhibit-template/journey-of-a-message
//   https://github.com/DMDLSU/virtual-exhibit-template
//   https://virtual-exhibit-template.onrender.com/usb   <- segment is the HOST
//
// Rewriting any of those silently breaks a working external link, and nothing
// in the build reports it. So a match only counts when it is a root-relative
// path: preceded by a delimiter, never by a scheme-and-host.

export function rewriteBaseRefs(source, { from, to }) {
  const needle = `/${from}`;
  let text = '';
  let changed = 0;
  let i = 0;

  while (true) {
    const at = source.indexOf(needle, i);
    if (at === -1) {
      text += source.slice(i);
      break;
    }

    // Walk back over the current token to see whether we sit inside a URL.
    // Read from the ORIGINAL source, not the rewritten output, so earlier
    // rewrites cannot change how a later match is classified.
    const token = source.slice(0, at).match(/[^\s"'`(){}[\],;]*$/)[0];
    const insideUrl = /^[a-z][a-z0-9+.-]*:\/\/\S*$/i.test(token) || token.endsWith(':/');

    text += source.slice(i, at);
    if (insideUrl) {
      text += needle;
    } else {
      text += to ? `/${to}` : '';
      changed++;
    }
    i = at + needle.length;
  }

  return { text, changed };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/test/base-path.test.mjs`
Expected: PASS, 10 tests

- [ ] **Step 5: Commit**

```bash
git add tools/lib/base-path.mjs tools/test/base-path.test.mjs
git commit -m "feat: add base-path rewrite rule with external-URL guard

The guard is the point: exhibits.json and several exhibit pages link to
other students' repos and Pages deployments whose URLs contain the same
segment, including one where it is the hostname. A blind replace breaks
25 working external links with nothing in the build to report it."
```

---

### Task 2: The link checker

Built before the rewrite so it can prove the rewrite worked. It must be Node, per the NUL-byte constraint.

**Files:**
- Create: `tools/check-links.mjs`
- Test: `tools/test/check-links.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `checkLinks(distDir: string) => {ok: boolean, errors: string[]}`. Task 5 and Task 7 consume this.

- [ ] **Step 1: Write the failing test**

Create `tools/test/check-links.test.mjs`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/test/check-links.test.mjs`
Expected: FAIL — `Cannot find module '../check-links.mjs'`

- [ ] **Step 3: Write minimal implementation**

Create `tools/check-links.mjs`:

```javascript
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Every internal href/src in the built site must resolve to a file that exists.
//
// Deliberately written in Node rather than shell: dist/s03g8/index.html
// contains NUL bytes, and grep classifies such a file as binary and skips it
// without saying so — which would make this check report a false pass.

const ATTR = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
  });
}

function isInternal(url) {
  if (!url.startsWith('/')) return false;
  return !url.startsWith('//');
}

export function checkLinks(distDir) {
  const errors = [];

  for (const file of walk(distDir)) {
    const html = readFileSync(file, 'utf8');
    for (const [, raw] of html.matchAll(ATTR)) {
      if (!isInternal(raw)) continue;

      const clean = raw.split('#')[0].split('?')[0];
      if (!clean || clean === '/') continue;

      const target = join(distDir, clean);
      const ok =
        (existsSync(target) && statSync(target).isFile()) ||
        existsSync(join(target, 'index.html'));

      if (!ok) errors.push(`${file}: dead link ${raw}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { ok, errors } = checkLinks('dist');
  for (const e of errors) console.error(`FAIL ${e}`);
  console.log(`${errors.length} dead links`);
  process.exit(ok ? 0 : 1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/test/check-links.test.mjs`
Expected: PASS, 7 tests

**Known limitation, deliberately accepted:** this checker only sees `href`/`src`
attributes present in the built HTML. It cannot see URLs that JavaScript builds at
runtime by concatenation — which is exactly how the s02g9 `assetPath()` bug in
Task 4 Step 3 escaped detection. Catching that class of bug would need a headless
browser, which is out of scope here. Task 4 Step 3 checks it by reading the source
instead.

The current build reports **0 dead links** under this checker, so any dead link
appearing after the rewrite is a real regression, not pre-existing debt.

- [ ] **Step 5: Commit**

```bash
git add tools/check-links.mjs tools/test/check-links.test.mjs
git commit -m "feat: add Node link checker for built output

Written in Node rather than shell on purpose: dist/s03g8/index.html
contains NUL bytes, which grep treats as binary and skips silently."
```

---

### Task 3: The codemod CLI

**Files:**
- Create: `tools/rewrite-base.mjs`

**Interfaces:**
- Consumes: `rewriteBaseRefs` from Task 1.
- Produces: a CLI. `node tools/rewrite-base.mjs --from virtual-exhibit-template --to '' [--dry-run]`.

- [ ] **Step 1: Write the implementation**

Create `tools/rewrite-base.mjs`:

```javascript
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { rewriteBaseRefs } from './lib/base-path.mjs';

// Files whose base-path matches are ALL external URLs pointing at other
// students' repositories and deployments. Never rewrite these.
const EXCLUDE = new Set(['src/data/exhibits.json']);

const EXTENSIONS = new Set(['.astro', '.mdx', '.md', '.jsx', '.tsx', '.js', '.ts', '.css', '.json']);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

export function rewriteTree(root, { from, to, dryRun }) {
  const report = [];

  for (const file of walk(root)) {
    if (EXCLUDE.has(file.split('\\').join('/'))) continue;
    if (!EXTENSIONS.has(extname(file))) continue;

    const before = readFileSync(file, 'utf8');
    if (!before.includes(`/${from}`)) continue;

    const { text, changed } = rewriteBaseRefs(before, { from, to });
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

  const from = get('--from', 'virtual-exhibit-template');
  const to = get('--to', '');
  const dryRun = args.includes('--dry-run');

  const report = rewriteTree('src', { from, to, dryRun });
  const total = report.reduce((n, r) => n + r.changed, 0);

  for (const { file, changed } of report) {
    console.log(`${String(changed).padStart(3)}  ${file}`);
  }
  console.log(`\n${dryRun ? '[dry run] would rewrite' : 'rewrote'} ${total} references across ${report.length} files`);
}
```

- [ ] **Step 2: Dry-run and check the numbers against the spec**

Run: `node tools/rewrite-base.mjs --dry-run`

Expected: **109 references across 33 files**, and `src/data/exhibits.json` must NOT appear in the list. The three largest entries should be:

```
 30  src/data/s02g9/rooms.ts
 12  src/components/s40g1/AliceSimulator.jsx
 11  src/components/s40g1/RabbitHoleRAM.jsx
```

If the total differs from 109 or `exhibits.json` appears, STOP — the guard in Task 1 is wrong. Do not proceed.

- [ ] **Step 3: Commit the tool**

```bash
git add tools/rewrite-base.mjs
git commit -m "feat: add base-path codemod CLI

Dry run reports 109 references across 33 files, with exhibits.json
correctly excluded."
```

---

### Task 4: Apply the rewrite

**Files:**
- Modify: 33 files under `src/` (mechanically — do not hand-edit)

**Interfaces:**
- Consumes: the CLI from Task 3.
- Produces: a `src/` tree with zero bare base references.

- [ ] **Step 1: Apply**

```bash
node tools/rewrite-base.mjs
```

Expected: `rewrote 109 references across 33 files`

- [ ] **Step 2: Verify the external URLs survived**

```bash
node -e '
const fs=require("fs");
const s=fs.readFileSync("src/data/exhibits.json","utf8");
const n=(s.match(/virtual-exhibit-template/g)||[]).length;
console.log("exhibits.json still has", n, "matches (expected 25)");
process.exit(n===25?0:1);'
```

Expected: `exhibits.json still has 25 matches (expected 25)`, exit 0

- [ ] **Step 3: Confirm the s02g9 double-prefix bug is fixed**

`src/data/s02g9/rooms.ts` defines `assetPath()`, which already prepends `import.meta.env.BASE_URL`. Its arguments previously *also* carried the base, so at runtime it requested `/virtual-exhibit-template/virtual-exhibit-template/s02g9/…` and 404'd. Stripping the prefix from the arguments fixes it.

```bash
grep -n "assetPath('/s02g9" src/data/s02g9/rooms.ts | head -3
```

Expected: paths now read `assetPath('/s02g9/rooms/new_panorama.webp')` — one leading segment, not two.

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "refactor: strip hardcoded base path from 34 source files

Applied mechanically via tools/rewrite-base.mjs. exhibits.json is
excluded and keeps all 25 external URLs intact.

Also fixes a live bug in s02g9: assetPath() already prepends
BASE_URL, so arguments that also carried the base produced a doubled
path that 404'd at runtime. Static analysis of dist/ could not see it
because the concatenation happens in the browser."
```

---

### Task 5: Flip the base to root

**Files:**
- Modify: `astro.config.mjs:10`

**Interfaces:**
- Consumes: the rewritten tree from Task 4, `checkLinks` from Task 2.
- Produces: a build served at `/`.

- [ ] **Step 1: Change the config**

In `astro.config.mjs`, change line 10:

```javascript
  base: 'virtual-exhibit-template',
```

to:

```javascript
  base: '/',
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds, 53 exhibits emitted.

- [ ] **Step 3: Verify the build is served at root**

```bash
node -e '
const fs=require("fs");
const h=fs.readFileSync("dist/s01g8/index.html","utf8");
const bad=(h.match(/\/virtual-exhibit-template/g)||[]).length;
console.log("base refs left in s01g8:", bad);
console.log("astro asset href sample:", (h.match(/href="[^"]*\.css"/)||[])[0]);
process.exit(bad===0?0:1);'
```

Expected: `base refs left in s01g8: 0`, and the CSS href starts `/_astro/`, not `/virtual-exhibit-template/_astro/`.

- [ ] **Step 4: Run the link checker over the real build**

Run: `node tools/check-links.mjs`

Expected: **282 dead links, every one under `dist/s02g7/`.** This is not a failure
of this task. `public/s02g7/` is a committed Next.js static export with the old
`basePath` baked into hashed chunk filenames and JSON payloads — it cannot be
rewritten, only rebuilt, which is Task 6. The site-wide `0 dead links` gate lives
at the end of Task 6, not here.

Confirm the breakdown is entirely `s02g7` before continuing:

```bash
node tools/check-links.mjs 2>&1 | grep '^FAIL' \
  | sed -E 's#^FAIL (dist/[^/]+)/.*#\1#' | sort | uniq -c
```

Expected: a single line, `282 dist/s02g7`. **A dead link under any other
directory is a real regression from the rewrite** — fix it before continuing
rather than relaxing the checker.

- [ ] **Step 5: Run the existing suite**

Run: `npm test`
Expected: all existing tests pass (`exhibits`, `gallery`, `homepage`, `verify-site`, `rewrite`, `prune`, `optimize`, `import-exhibit`, plus the two added here).

- [ ] **Step 6: Commit**

```bash
git add astro.config.mjs
git commit -m "feat: serve the site at root instead of /virtual-exhibit-template

GitHub Pages project routing was the only thing forcing the path
segment. On Render a base would make the bare domain 404."
```

---

### Task 6: Rebuild the s02g7 Next.js export

`public/s02g7/` is a Next.js static export with `basePath` baked into chunk filenames and JSON payloads — 99 of its 141 files contain the literal. It cannot be rewritten; it must be rebuilt.

**Files:**
- Replace: `public/s02g7/**`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: a `public/s02g7/` tree carrying no `/virtual-exhibit-template` references.

- [ ] **Step 1: Locate or re-clone the source**

The working copy is at `.integration-src/s02g7/x86-history/` but that directory is gitignored. If it is missing:

```bash
git clone https://github.com/JoseBryanPerez/CSARCH2_Group_7 .integration-src/s02g7
```

- [ ] **Step 2: Point its basePath at the new route**

In `.integration-src/s02g7/x86-history/next.config.mjs`, change:

```javascript
  basePath: '/virtual-exhibit-template/s02g7',
```

to:

```javascript
  basePath: '/s02g7',
```

- [ ] **Step 3: Build the export**

```bash
cd .integration-src/s02g7/x86-history && npm ci && npm run build && cd -
```

Expected: an `out/` directory is produced.

- [ ] **Step 4: Replace the embedded copy**

```bash
rm -rf public/s02g7
cp -r .integration-src/s02g7/x86-history/out public/s02g7
```

- [ ] **Step 5: Verify no base references remain**

```bash
node -e '
const fs=require("fs"),path=require("path");
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):[p];});
let n=0;
for(const f of walk("public/s02g7")){
  let s;try{s=fs.readFileSync(f,"utf8")}catch{continue}
  if(s.includes("/virtual-exhibit-template"))n++;
}
console.log("s02g7 files still referencing the old base:",n);
process.exit(n===0?0:1);'
```

Expected: `0`

- [ ] **Step 6: Rebuild and re-check links — this is the site-wide gate**

```bash
npm run build && node tools/check-links.mjs
```

Expected: `0 dead links`, exit 0.

This is where the whole-site zero is finally reachable. Task 5 legitimately left
282 dead links under `dist/s02g7/`, all pointing at the old baked-in `basePath`;
this rebuild is what clears them. If any dead link remains here, it is real —
fix it rather than relaxing the checker.

- [ ] **Step 7: Commit**

```bash
git add public/s02g7
git commit -m "build: rebuild s02g7 Next.js export at basePath /s02g7

Its basePath is baked into chunk filenames and JSON payloads, so the
export had to be rebuilt rather than rewritten."
```

---

### Task 7: Make the guarantee permanent

Without this task the work decays: nothing stops the next exhibit import from reintroducing a hardcoded base.

**Files:**
- Create: `tools/test/no-hardcoded-base.test.mjs`
- Modify: `tools/rewrite-base.mjs` (make `exclude` injectable — see Step 0)
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: `rewriteTree` from Task 3.
- Produces: a `npm run verify` script that Phase 0b's deploy will call.

- [ ] **Step 0: Make the exclusion provable**

Task 3's review found that `EXCLUDE` is redundant with Task 1's URL guard: every
reference in `exhibits.json` is inside an `https://…` URL, so `rewriteBaseRefs`
already returns `changed: 0`, and `if (changed === 0) continue` drops the file
from the report whether or not `EXCLUDE` matched. The exclusion is correct today
but nothing proves it, so a future regression to it would be silent.

In `tools/rewrite-base.mjs`, make the set injectable so a test can exercise the
path guard in isolation:

```javascript
export function rewriteTree(root, { from, to, dryRun, exclude = EXCLUDE }) {
```

and change the membership test to use the parameter:

```javascript
    if (exclude.has(file.split('\\').join('/'))) continue;
```

Then add this test to `tools/test/no-hardcoded-base.test.mjs`. The decoy's
reference is **bare root-relative**, a form the URL guard does not suppress, so
only the path guard can spare it — which is what makes the test load-bearing:

```javascript
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
```

This needs `mkdtempSync`, `writeFileSync`, `tmpdir` and `join` imported at the
top of the test file alongside `readFileSync`.

- [ ] **Step 1: Write the failing test**

Create `tools/test/no-hardcoded-base.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rewriteTree } from '../rewrite-base.mjs';

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
```

- [ ] **Step 2: Run it**

Run: `node --test tools/test/no-hardcoded-base.test.mjs`
Expected: PASS, 2 tests. (It passes immediately because Task 4 already cleaned the tree — this test exists to fail *later*, if someone reintroduces a hardcoded base.)

- [ ] **Step 3: Add the verify script**

In `package.json`, change the `scripts` block to:

```json
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "node --test tools/test/*.mjs",
    "verify": "npm test && npm run build && node tools/verify-site.mjs && node tools/check-links.mjs"
  },
```

- [ ] **Step 4: Run the full verification**

Run: `npm run verify`
Expected: tests pass, build succeeds, `53/53 exhibits live, 0 problems`, `0 dead links`.

- [ ] **Step 5: Update the README**

In `README.md` §8, change:

```
2. Visit your page at `localhost:4321/virtual-exhibit-template/topic_name`.
```

to:

```
2. Visit your page at `localhost:4321/topic_name`.
```

Then extend §13 ("The s02g7 Exception") with the rebuild recipe. Task 6 proved
that rebuilding s02g7 takes **three** changes, not one, and all three live in the
gitignored `.integration-src/` tree — so none of them survive a fresh clone. Add:

```markdown
### Rebuilding s02g7

Its `basePath` is baked into hashed chunk filenames and JSON payloads, so it can
only be rebuilt, never text-rewritten. Three changes are required, and missing
either of the last two produces a build that looks fine and is quietly broken:

1. `next.config.mjs` — `basePath` must match the route (`/s02g7` at the current
   root base).
2. `src/lib/basePath.ts` — an independently maintained `BASE_PATH` mirror, used
   by hand-written `<img>`/`<a>` tags. Next only auto-prefixes `next/link` and
   `next/image`, so this constant must be edited in lockstep. Skipping it left
   34 files pointing at the old base.
3. `next.config.mjs` — `trailingSlash: true`. Without it the App Router export
   emits extensionless links that depend on host-side clean-URL rewriting, which
   this static site does not do. Skipping it produced 88 dead links with an
   otherwise perfectly correct `basePath`.

Then `npm run build` in the source tree, replace `public/s02g7/` with its `out/`,
and stage with `git add -A public/s02g7` — the hashed filenames change, so
deletions must be staged too. Verify with `node tools/check-links.mjs`.
```

Then add this subsection at the end of the "Merged Site Guide", after §13:

```markdown
## 14. The Base Path

The site is served at the root of its domain (`base: '/'` in
`astro.config.mjs`). Never hardcode a base path segment in an exhibit —
write root-relative paths like `/s01g8/diagram.webp` and they will work.

`tools/test/no-hardcoded-base.test.mjs` fails the build if a hardcoded
base reappears. If the site ever needs to move under a path again, do not
hand-edit: run

    node tools/rewrite-base.mjs --from '' --to csarch2

and update `base` in `astro.config.mjs` to match. `tools/check-links.mjs`
verifies the result against the real build.
```

- [ ] **Step 6: Commit**

```bash
git add tools/test/no-hardcoded-base.test.mjs package.json README.md
git commit -m "test: guard against hardcoded base paths reappearing

Adds a regression test and an npm run verify script combining the unit
tests, the build, verify-site and the link checker. Documents the rule
in README section 14."
```

---

### Task 8: Teach the import rewriter about a root base

Found by the pre-flight scan, not present in the spec. `tools/integrate/rewrite.mjs` is the tool that imports new exhibits, and it splices the umbrella base into their references. It hardcodes the old value, so the next exhibit import would reinject exactly what Tasks 3–5 removed — and `npm test` would stay green, because the existing tests assert the old literal.

**Files:**
- Modify: `tools/integrate/rewrite.mjs:18`, and its three splice sites at lines 120, 158, 187
- Modify: `tools/test/rewrite.test.mjs` (14 occurrences)
- Modify: `tools/test/import-exhibit.test.mjs:158` (1 occurrence)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `rewriteFile` output that carries no base segment when `umbrellaBase` is `''`, and still carries one when it is not.

- [ ] **Step 1: Write the failing test**

Append to `tools/test/rewrite.test.mjs`:

```javascript
test('a root umbrella base produces a single leading slash, not //', () => {
  const out = rewriteFile('<img src="/Clock.png">', {
    slug: 's40g1',
    publicAssets: ['Clock.png'],
    umbrellaBase: '',
  });
  assert.equal(out, '<img src="/s40g1/Clock.png">');
  assert.doesNotMatch(out, /\/\//, 'emitted a protocol-relative URL');
});

test('a non-empty umbrella base is still spliced in', () => {
  const out = rewriteFile('<img src="/Clock.png">', {
    slug: 's40g1',
    publicAssets: ['Clock.png'],
    umbrellaBase: 'csarch2',
  });
  assert.equal(out, '<img src="/csarch2/s40g1/Clock.png">');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/test/rewrite.test.mjs`
Expected: FAIL — the first new test emits `<img src="//s40g1/Clock.png">`.

- [ ] **Step 3: Add the join helper**

In `tools/integrate/rewrite.mjs`, immediately after the `UMBRELLA_BASE` declaration, add:

```javascript
// With the site served at root, umbrellaBase is '' and a naive
// `/${base}/${rest}` emits `//rest` — a protocol-relative URL, which the
// browser resolves against a HOST rather than the site root. Collapse the
// empty case instead of interpolating it.
function joinUmbrella(base, rest) {
  return base ? `/${base}/${rest}` : `/${rest}`;
}
```

- [ ] **Step 4: Change the constant and the three splice sites**

Change line 18:

```javascript
const UMBRELLA_BASE = 'virtual-exhibit-template';
```

to:

```javascript
// The site is served at root (astro.config.mjs `base: '/'`). Empty means
// "no base segment"; joinUmbrella collapses it correctly.
const UMBRELLA_BASE = '';
```

Then replace each of the three splice expressions:

```javascript
      (match, quote) => `${quote}/${umbrellaBase}/${value}`,
```
becomes
```javascript
      (match, quote) => `${quote}${joinUmbrella(umbrellaBase, value)}`,
```

```javascript
      (match, quote) => `${quote}/${umbrellaBase}/${slug}/${final}`,
```
becomes
```javascript
      (match, quote) => `${quote}${joinUmbrella(umbrellaBase, `${slug}/${final}`)}`,
```

```javascript
      (_m, q, tail) => `${q}/${umbrellaBase}/${slug}${tail === '/' ? '/' : ''}`,
```
becomes
```javascript
      (_m, q, tail) => `${q}${joinUmbrella(umbrellaBase, slug)}${tail === '/' ? '/' : ''}`,
```

- [ ] **Step 5: Update the existing assertions**

In `tools/test/rewrite.test.mjs`, every expected output of the form
`/virtual-exhibit-template/<rest>` becomes `/<rest>`. For example:

```javascript
  assert.match(out, /src="\/virtual-exhibit-template\/s03g9\/moon\.svg"/);
```
becomes
```javascript
  assert.match(out, /src="\/s03g9\/moon\.svg"/);
```

Leave the one negative assertion (`assert.doesNotMatch(out, /virtual-exhibit-template/)`) exactly as it is — it remains true and still guards the right thing.

In `tools/test/import-exhibit.test.mjs:158`:

```javascript
  assert.match(page, /src="\/virtual-exhibit-template\/s03g9\/astronauts\.png"/);
```
becomes
```javascript
  assert.match(page, /src="\/s03g9\/astronauts\.png"/);
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all tests pass, including the two new ones.

- [ ] **Step 7: Commit**

```bash
git add tools/integrate/rewrite.mjs tools/test/rewrite.test.mjs tools/test/import-exhibit.test.mjs
git commit -m "fix: teach the import rewriter that the site is served at root

rewrite.mjs spliced a hardcoded base into every imported exhibit's
references, so the next import would have reinjected the segment Tasks
3-5 removed — and the suite would have stayed green, because the tests
asserted the old literal.

Setting the constant to '' alone emits '//path', a protocol-relative
URL the browser resolves against a host. joinUmbrella collapses the
empty case, and a test now covers both it and the non-empty base."
```

---

## Self-Review

**Spec coverage** — every requirement in the spec's [Base path migration](../specs/2026-08-22-virtual-exhibit-social-design.md#base-path-migration) section maps to a task:

| Spec requirement | Task |
|---|---|
| De-hardcode 109 occurrences | 3, 4 |
| Never rewrite the 25 external URLs | 1 (guard + tests), 3 (exclusion), 4 (verification), 7 (regression test) |
| CSS `url()` handled | 1, 4 — absorbed into the uniform rewrite; no separate mechanism needed at root |
| Markdown links handled | 1, 4 — same; the rehype plugin the spec anticipated is unnecessary at `base: '/'` |
| Rebuild `s02g7` | 6 |
| `base: '/'` | 5 |
| Link-checker added, Node not shell | 2 |
| Tooling must not use grep on built HTML | 2 (implementation comment + NUL-byte test) |
| Import tooling must not reinject the base | 8 (found by pre-flight scan; not in the spec) |

**Two spec deviations, both simplifications**, recorded here so the spec can be amended: the spec anticipated a separate mechanism for CSS `url()` and a rehype plugin for markdown links. At `base: '/'` both resolve correctly as plain root-relative paths, so the uniform codemod covers them. If the base ever becomes non-root, both need revisiting — which is why README §14 documents the codemod as the supported path.

**Placeholder scan** — no TBD/TODO; every code step carries runnable code; no task references an undefined function.

**Type consistency** — `rewriteBaseRefs(source, {from, to}) => {text, changed}` is defined in Task 1 and consumed with that exact shape in Tasks 3 and 7. `rewriteTree(root, {from, to, dryRun}) => [{file, changed}]` is defined in Task 3 and consumed with that shape in Task 7. `checkLinks(distDir) => {ok, errors}` is defined in Task 2 and matches the existing `verifySite` convention in `tools/verify-site.mjs`.

**One risk worth flagging to the reviewer:** Task 4 rewrites 33 files of independently-authored exhibit code in one commit. The verification in Task 5 (build + link check + full test suite) is what makes that safe, and the commit is isolated so a revert is clean.
