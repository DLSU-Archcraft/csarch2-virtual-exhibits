# Base Path Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the site's live base from root (`base: '/'`, set in Phase 0a) to `/csarch2-virtual-exhibits`, matching where GitHub Pages actually serves a project repo under the `DLSU-Archcraft` org — the frontend-hosting decision made after Phase 0a shipped. `tools/rewrite-base.mjs` cannot express this direction (it refuses an empty `--from` — see commit `8f943ff` and README §14); this plan builds the missing complementary tool.

**Architecture:** Root → subpath is not the mirror image of Phase 0a's subpath → root rewrite. Phase 0a's codemod matched a known literal prefix (`virtual-exhibit-template`) and stripped it — a safe, unambiguous needle. Going the other way, a root-relative reference like `/s01g8/diagram.webp` has no marker distinguishing it from any other `/`-leading string in the tree, so blanket string-matching is unsafe by construction (README §14 documents exactly this: an empty `--from` turned `/s01g8/diagram.webp` into `/csarch2s01g8/csarch2diagram.webp`). The only safe rule is the one README §14 already prescribes: key on the **known set of 53 slugs** from `exhibits.json`, not on any string pattern. `addBaseToSlugRefs()` is a new pure function, sibling to `rewriteBaseRefs()`, that only ever prefixes a match immediately following a known slug's own boundary.

**Tech Stack:** Node 26.7.0, Astro 5.18.2, plain ESM `.mjs` tooling under `tools/`, same `node --test` style as the rest of the suite.

**Spec:** `docs/superpowers/specs/2026-08-22-virtual-exhibit-social-design.md` (background only — this correction is downstream of decisions made after that spec, recorded in `docs/superpowers/plans/2026-08-22-phase-0a-base-path.md` and this session's plan-mode approval). Primary reference for the mechanics: `README.md` §13 (s02g7 rebuild recipe) and §14 (the base path, including "Moving the site under a path").

## Global Constraints

- **Never modify anything in `src/layouts/`.** No task in this plan needs to.
- **Never touch `src/data/exhibits.json`.** Same 25-external-URL guard as Phase 0a; reuse the existing `EXCLUDE` set.
- **No shell text tools on built HTML.** `dist/s03g8/index.html` contains NUL bytes. All tooling here operates on `src/` (plain text, no NUL concern) or drives `astro build`/`node tools/check-links.mjs`, never `grep`/`sed` on `dist/`.
- **Tests run with `npm test`** = `node --test tools/test/*.mjs`.
- **Branch:** `feat/social-features` (same branch as Phase 0a — PR #1 stays open, gets updated, not replaced). Commit after every task.
- The target base is `csarch2-virtual-exhibits` (no leading/trailing slash — `normalizeBase()` handles either form, but tasks below write it unnormalized as `/csarch2-virtual-exhibits` in config values, matching the existing `astro.config.mjs` convention of a leading slash).
- Node 26.7.0, npm 12.0.2.

## File Structure

| File | Responsibility |
|---|---|
| `tools/lib/add-base.mjs` (create) | `addBaseToSlugRefs(source, {slugs, base})` — the reverse rewrite rule. Pure, no file I/O. |
| `tools/test/add-base.test.mjs` (create) | Tests for the above, mirroring `base-path.test.mjs`'s structure. |
| `tools/add-base.mjs` (create) | CLI. Walks `src/`, applies `addBaseToSlugRefs` using the 53 slugs from `exhibits.json`, honors `--dry-run`. |
| `astro.config.mjs` (modify) | `base: '/'` → `base: '/csarch2-virtual-exhibits'`; `site: 'https://jrgo7.github.io'` → `site: 'https://dlsu-archcraft.github.io'` (stale — predates the repo's move to the `DLSU-Archcraft` org). |
| `.integration-src/s02g7/x86-history/next.config.mjs`, `.../src/lib/basePath.ts` (modify, gitignored source) | `basePath: '/s02g7'` → `basePath: '/csarch2-virtual-exhibits/s02g7'` in both (Next only auto-prefixes `next/link`/`next/image`; the hand-maintained mirror needs the same edit or 34 files silently point at the wrong base — see README §13). |
| `public/s02g7/**` (replace) | Rebuilt Next.js export reflecting the new `basePath`. |
| `.github/workflows/astro.yml` (modify) | Re-enable `push:` (removed in `b97355d`); drop the dynamic `--base "${{ steps.pages.outputs.base_path }}"` override — the target is now fixed and known, and the override never fixed hardcoded markup literals anyway (see the file's own header comment); upload path stays plain `dist` (no adapter in this repo, no `dist/client` split). |
| `README.md` §13, §14 (modify) | §13: the "deferred to Phase 0b" line about capturing `.integration-src/s02g7`'s local patches as a portable diff is now stale phrasing (Phase 0b as originally scoped no longer exists) — soften to a plain "not yet captured as a patch," no phase reference. §14: remove "Phase 0b moves this site to Render at a root domain, so this is not expected to be needed" (false); document the live base as `/csarch2-virtual-exhibits`, not root. |
| `tools/test/no-hardcoded-base.test.mjs` (modify) | Add a completeness guard: `addBaseToSlugRefs` (via the CLI's tree-walk) reports zero pending changes across `src/` — i.e. nothing is left un-prefixed. |

---

### Task 1: The reverse rewrite rule

**Files:**
- Create: `tools/lib/add-base.mjs`
- Test: `tools/test/add-base.test.mjs`

**Interfaces:**
- Consumes: `normalizeBase` from `tools/integrate/rewrite.mjs` (already exported, already used by `tools/lib/base-path.mjs` the same way).
- Produces: `addBaseToSlugRefs(source: string, opts: {slugs: string[], base: string}) => {text: string, changed: number}`. Task 2's CLI consumes this.

- [ ] **Step 1: Write the failing test**

Create `tools/test/add-base.test.mjs`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/test/add-base.test.mjs`
Expected: FAIL — `Cannot find module '../lib/add-base.mjs'`

- [ ] **Step 3: Write minimal implementation**

Create `tools/lib/add-base.mjs`:

```javascript
import { normalizeBase } from '../integrate/rewrite.mjs';

// The complementary rule to rewriteBaseRefs() in base-path.mjs, for the
// direction that tool refuses to express: adding a base segment where there
// is none. That direction cannot key on a literal prefix the way stripping
// one can (there is nothing to search for at root — every '/' looks the
// same), so this keys on the known SET OF SLUGS from exhibits.json instead.
// A match only counts when a '/' is immediately followed by one of those
// slugs, and the slug is immediately followed by a real boundary (another
// '/', end of string, a quote, a closing paren, ...) rather than more
// identifier characters — so '/s01g8x' is correctly left alone even though
// '/s01g8' is a real slug and a literal prefix of it.

const BOUNDARY = new Set([
  undefined, '/', '.', '?', '#', "'", '"', '`', ')', ' ', '\n', '\t', ',', ';', '}', ']',
]);

export function addBaseToSlugRefs(source, { slugs, base }) {
  const baseSegment = normalizeBase(base);
  if (!baseSegment) {
    throw new Error(
      "addBaseToSlugRefs: 'base' must name a non-empty segment. There is " +
        'nothing to add a root-relative reference under.',
    );
  }

  // Longest first: if slugs ever shared a prefix, the longer one must win
  // the match, not the first one alphabetically.
  const sorted = [...new Set(slugs)].sort((a, b) => b.length - a.length);

  let text = '';
  let changed = 0;
  let i = 0;

  while (true) {
    const at = source.indexOf('/', i);
    if (at === -1) {
      text += source.slice(i);
      break;
    }

    const slug = sorted.find((s) => source.startsWith(s, at + 1));
    const after = slug ? at + 1 + slug.length : -1;
    const nextChar = slug ? source[after] : undefined;

    if (!slug || !BOUNDARY.has(nextChar)) {
      text += source.slice(i, at + 1);
      i = at + 1;
      continue;
    }

    // Walk back over the current token to see whether this '/' sits inside
    // a scheme://host URL — read from the ORIGINAL source so earlier
    // rewrites in this same pass cannot change how a later match reads.
    const token = source.slice(0, at).match(/[^\s"'`(){}[\],;]*$/)[0];
    const insideUrl = /^[a-z][a-z0-9+.-]*:\/\/\S*$/i.test(token) || token.endsWith(':/');

    text += source.slice(i, at);
    if (insideUrl) {
      text += source.slice(at, after);
    } else {
      text += `/${baseSegment}/${slug}`;
      changed++;
    }
    i = after;
  }

  return { text, changed };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/test/add-base.test.mjs`
Expected: PASS, 10 tests

- [ ] **Step 5: Commit**

```bash
git add tools/lib/add-base.mjs tools/test/add-base.test.mjs
git commit -m "feat: add the reverse base-path rewrite rule

rewriteBaseRefs() strips a known literal prefix and cannot express
adding one — there is no needle to key on at root, only the slug set
from exhibits.json. addBaseToSlugRefs() is the complementary rule
README 14 already prescribes: key on the 53 known slugs, requiring a
real boundary on both sides so '/s01g8x' cannot be matched as '/s01g8'."
```

---

### Task 2: The CLI, applied to `src/`

**Files:**
- Create: `tools/add-base.mjs`
- Modify: `tools/test/no-hardcoded-base.test.mjs` (add the completeness guard)

**Interfaces:**
- Consumes: `addBaseToSlugRefs` from Task 1; `loadExhibits` from `tools/lib/exhibits.mjs` (existing, `loadExhibits(path = 'src/data/exhibits.json')`).
- Produces: `addBaseToTree(root: string, opts: {slugs, base, dryRun, exclude?}) => Array<{file, changed}>`. Task 6's verification and the new regression-guard test both consume this.

- [ ] **Step 1: Write the CLI and tree-walker**

Create `tools/add-base.mjs`:

```javascript
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { addBaseToSlugRefs } from './lib/add-base.mjs';
import { loadExhibits } from './lib/exhibits.mjs';

// Same exclusion as tools/rewrite-base.mjs: every match in exhibits.json is
// an external URL to another group's repo/deployment, never our own site.
const EXCLUDE = new Set(['src/data/exhibits.json']);

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
```

- [ ] **Step 2: Dry-run against the real tree and review the report**

Run: `node tools/add-base.mjs --base csarch2-virtual-exhibits --dry-run`

Expected: a report listing every file Phase 0a's codemod touched (the same ~33 files, roughly the same ~109-reference count, since this is that operation's mirror image). Read the report. Two things to specifically check before writing:
- The two CSS files flagged in the original Phase 0a plan (`src/styles/s03g2/theme.css`, `src/styles/s04g3/exhibit-theme.css`) — if Phase 0a resolved their `url()` case via a CSS custom property set by the owning Astro component rather than a literal path, this dry run will show 0 changes for the `.css` files and instead show the change landing in the `.astro` component that sets the property. Confirm the report's shape matches whichever mechanism is actually in the file before proceeding — do not assume.
- Zero changes reported for `src/data/exhibits.json` (it's excluded, but confirm the exclude guard actually fired rather than the file simply having no matches).

- [ ] **Step 3: Apply for real**

Run: `node tools/add-base.mjs --base csarch2-virtual-exhibits`

Expected: same file list as the dry run, now written.

- [ ] **Step 4: Add the completeness regression guard**

In `tools/test/no-hardcoded-base.test.mjs`, add (after the existing tests, imports adjusted at the top):

```javascript
import { addBaseToTree } from '../add-base.mjs';
import { loadExhibits } from '../lib/exhibits.mjs';

test('no source file has a bare, un-prefixed slug reference', () => {
  const slugs = loadExhibits().map((e) => e.slug);
  const report = addBaseToTree('src', { slugs, base: 'csarch2-virtual-exhibits', dryRun: true });
  assert.deepEqual(
    report.map((r) => r.file),
    [],
    'these files have a bare slug reference that needs the base prefix; run: node tools/add-base.mjs --base csarch2-virtual-exhibits',
  );
});
```

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all tests pass, including the new guard (it should now report zero pending changes, since Step 3 already applied them).

- [ ] **Step 6: Commit**

```bash
git add tools/add-base.mjs tools/test/no-hardcoded-base.test.mjs src
git commit -m "feat: prefix every internal reference with /csarch2-virtual-exhibits

Applies addBaseToSlugRefs() across src/ via the new CLI. Adds a
permanent regression guard alongside the existing one: no source file
may carry a bare, un-prefixed slug reference going forward."
```

---

### Task 3: Flip the config, rebuild s02g7

**Files:**
- Modify: `astro.config.mjs`
- Modify (gitignored source): `.integration-src/s02g7/x86-history/next.config.mjs`, `.integration-src/s02g7/x86-history/src/lib/basePath.ts`
- Replace: `public/s02g7/**`

- [ ] **Step 1: Flip `astro.config.mjs`**

Change:
```javascript
  site: 'https://jrgo7.github.io',
  base: '/',
```
to:
```javascript
  site: 'https://dlsu-archcraft.github.io',
  base: '/csarch2-virtual-exhibits',
```

`site` was already stale (predates the repo's move to the `DLSU-Archcraft` org under its current name) — fixed in the same step since it's the same "where does this site actually live" config, and Astro uses both together to build canonical/sitemap URLs.

- [ ] **Step 2: Update s02g7's basePath in both required places**

In `.integration-src/s02g7/x86-history/next.config.mjs`:
```javascript
  basePath: '/s02g7',
```
becomes
```javascript
  basePath: '/csarch2-virtual-exhibits/s02g7',
```

In `.integration-src/s02g7/x86-history/src/lib/basePath.ts`:
```typescript
export const BASE_PATH = '/s02g7';
```
becomes
```typescript
export const BASE_PATH = '/csarch2-virtual-exhibits/s02g7';
```

`trailingSlash: true` and `output: 'export'` are unaffected — leave them as-is.

- [ ] **Step 3: Rebuild and replace**

```bash
cd .integration-src/s02g7/x86-history
npm run build
cd -
rm -rf public/s02g7
cp -r .integration-src/s02g7/x86-history/out public/s02g7
git add -A public/s02g7
```

`git add -A` (not plain `add`) on this specific path — the hashed chunk filenames change between builds, so deletions of the old hashes must be staged too, same as README §13 warns for the original rebuild.

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs
git commit -m "feat: move the live base from root to /csarch2-virtual-exhibits

Reflects the frontend-hosting decision made after Phase 0a shipped:
GitHub Pages serves this project repo under DLSU-Archcraft at
/csarch2-virtual-exhibits, not root. site: was also stale, predating
the repo's move to that org. s02g7 rebuilt at the matching basePath
per README 13's recipe — its own gitignored source tree in
.integration-src/ carries this change but isn't part of this commit."
```

---

### Task 4: Re-enable the Pages workflow

**Files:**
- Modify: `.github/workflows/astro.yml`

- [ ] **Step 1: Restore the push trigger, drop the dynamic base override**

Replace the `on:` block and its surrounding comment:
```yaml
# MANUAL FALLBACK ONLY - this does not run on its own.
#
# The site is moving to Render at a root domain in Phase 0b. ...
# [full comment block]

on:
  # Manual only, from the Actions tab. See the note above before adding `push:`.
  workflow_dispatch:
```
with:
```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

Replace the build step:
```yaml
      - name: Build with Astro
        run: |
          ${{ steps.detect-package-manager.outputs.runner }} astro build \
            --site "${{ steps.pages.outputs.origin }}" \
            --base "${{ steps.pages.outputs.base_path }}"
        working-directory: ${{ env.BUILD_PATH }}
```
with:
```yaml
      - name: Build with Astro
        run: ${{ steps.detect-package-manager.outputs.runner }} astro build
        working-directory: ${{ env.BUILD_PATH }}
```

`astro.config.mjs`'s own `site`/`base` are now the fixed, correct values for this deployment — the dynamic `configure-pages` override was a generic-template default that (per the file's own prior comment) never fixed the hardcoded markup literals in the first place, only what Astro auto-generates. One authoritative source of truth (the config file) is simpler and matches what Task 2/3 just baked into the markup.

The `Setup Pages` step (`actions/configure-pages@v5`) and the upload step (`path: ${{ env.BUILD_PATH }}/dist`) stay as they are — this repo has no adapter, so `dist/` is never split into `dist/client`/`dist/server`.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/astro.yml
git commit -m "feat: re-enable Pages auto-deploy on push to main

Phase 0a disabled this specifically because the site was heading to
Render's root-domain hosting; that plan changed. The dynamic
--site/--base override is dropped too — astro.config.mjs now carries
the real, fixed values directly, and the override never covered
hardcoded markup literals anyway."
```

---

### Task 5: Documentation

**Files:**
- Modify: `README.md` §13, §14

- [ ] **Step 1: Fix §13's stale phase reference**

Change:
> The source tree this was built from lives in the gitignored `.integration-src/` and carries local modifications that do **not** exist upstream — `src/lib/basePath.ts` plus nine call-site edits — so a fresh clone of `JoseBryanPerez/CSARCH2_Group_7` is *not* on its own sufficient to reproduce `public/s02g7/`; capturing those changes as a patch is deferred to Phase 0b.

to:
> The source tree this was built from lives in the gitignored `.integration-src/` and carries local modifications that do **not** exist upstream — `src/lib/basePath.ts` plus nine call-site edits — so a fresh clone of `JoseBryanPerez/CSARCH2_Group_7` is *not* on its own sufficient to reproduce `public/s02g7/`; those changes have not yet been captured as a portable patch.

- [ ] **Step 2: Correct §14**

Change the opening:
> The site is served at the root of its domain (`base: '/'` in `astro.config.mjs`). Never hardcode a base path segment in an exhibit — write root-relative paths like `/s01g8/diagram.webp` and they will work.

to:
> The site is served at `/csarch2-virtual-exhibits` (`base: '/csarch2-virtual-exhibits'` in `astro.config.mjs`), matching where GitHub Pages serves this project repo under the `DLSU-Archcraft` org. Never hardcode the base segment by hand in an exhibit — every internal reference already carries it, applied by `tools/add-base.mjs`.

Remove the final line of the file:
> Phase 0b moves this site to Render at a root domain, so this is not expected to be needed.

(replace with nothing, or a short note that the site now targets Pages directly, whichever reads more naturally in context once editing — read the surrounding paragraph before finalizing the exact wording).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README 13/14 reflect the corrected base and hosting target"
```

---

### Task 6: Full verification and PR update

- [ ] **Step 1: Full local verify**

```bash
npm run verify
```

Expected: `node --test tools/test/*.mjs` all pass (including both base-path regression guards); build succeeds; `node tools/verify-site.mjs` reports 53/53 exhibits live; `node tools/check-links.mjs` reports 0 dead links and 0 protocol-relative refs, all resolved under `/csarch2-virtual-exhibits`.

- [ ] **Step 2: Spot-check the built output directly**

```bash
node -e "
const fs = require('fs');
const html = fs.readFileSync('dist/index.html', 'utf8');
console.log(html.includes('/csarch2-virtual-exhibits/s01g8') ? 'OK: homepage links carry the base' : 'MISSING base prefix on homepage links');
"
```

- [ ] **Step 3: Update PR #1's description**

```bash
gh pr edit 1 --repo DLSU-Archcraft/csarch2-virtual-exhibits \
  --title "Phase 0a: de-hardcode the base path, target /csarch2-virtual-exhibits" \
  --body "..."
```

New body should explain the correction plainly: Phase 0a's codemod and link-checker are unchanged in spirit; the *target* base changed from root to `/csarch2-virtual-exhibits` once the frontend-hosting decision (GitHub Pages, not Render) was made after the original PR was opened. Do not silently rewrite history — the PR's commit log should still show both the original root-path work and this session's correction commits in sequence; that is the honest record of what happened, not something to squash away.

- [ ] **Step 4: Push**

```bash
git push
```

## Self-Review

**Spec coverage:** every item in the harness plan's Task Set A maps to a task here — the reverse rewrite rule (Task 1), applying it (Task 2), the config flip and s02g7 rebuild (Task 3), the workflow (Task 4), docs (Task 5), verification and PR update (Task 6).

**Placeholder scan:** no TBD/TODO. Task 6 Step 3's PR body is deliberately left as prose guidance rather than a canned string, since the actual PR description should reflect the real commit list once it exists — that is a judgment call for whoever runs this step, not a placeholder.

**Type consistency:** `addBaseToSlugRefs(source, {slugs, base}) => {text, changed}` (Task 1) is consumed with the identical shape by `addBaseToTree` (Task 2) and by the new regression-guard test (Task 2, Step 4).
