import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, extname, relative, posix } from "node:path";
import {
  findOrphans,
  TEMPLATE_LEFTOVERS,
  GLOB_REPOS,
} from "../assets/prune.mjs";
import { optimizeTree } from "../assets/optimize.mjs";
import { rewriteFile, normalizeBase } from "./rewrite.mjs";

// Assets that are referenced in ways findOrphans can't see (e.g. dynamic
// paths, CSS url(), non-relative imports) and must never be pruned even
// though the static scan reports them as orphaned. Matched by basename,
// since these were observed to 404 after being silently deleted in step 3.
const ALWAYS_KEEP = new Set(["dlsu.png", "ccs.jpg", "logo.png"]);

// Recursively lists every file under dir (relative to nothing in particular —
// callers relativize as they see fit), depth-first, files only. Kept at
// module scope (not just inside the CLI body below) because
// buildPublicAssetMap needs it too and both are meant to be importable as a
// library — e.g. by tests — without running the CLI section's side effects.
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

// Public assets move verbatim from a source repo's public/ into
// public/<slug>/, but by the time this runs the media optimizer (step 4
// below) may already have renamed some of them ON DISK — Clock.png
// converted to Clock.webp, original deleted. rewriteFile needs to search a
// referencing file's source text for the ORIGINAL name (that's what the
// exhibit's own code still says) while writing the FINAL name into the
// rewritten reference (that's what actually exists under public/<slug>/
// after step 8), so this builds that original -> final mapping.
//
// Every file currently on disk under stagePublicDir defaults to mapping to
// itself — covers both "the optimizer never considered this extension" and
// "the optimizer considered it but skipped or failed it, so the final name
// still equals the original". Each SUCCESSFUL optimizeTree result then
// overrides that default with the name the file actually had before
// conversion; its now-stale self-mapped entry (keyed by the final name,
// which no source file ever references literally) is deleted so the map
// doesn't carry a dead key alongside the real one.
export function buildPublicAssetMap(stagePublicDir, publicResults) {
  const map = new Map();
  for (const f of walk(stagePublicDir)) {
    const rel = relative(stagePublicDir, f).split(/[\\/]/).join("/");
    map.set(rel, rel);
  }
  for (const r of publicResults) {
    if (r.failed || r.skipped || r.from === r.to) continue;
    const from = relative(stagePublicDir, r.from).split(/[\\/]/).join("/");
    const to = relative(stagePublicDir, r.to).split(/[\\/]/).join("/");
    map.delete(to);
    map.set(from, to);
  }
  return map;
}

// Everything below is the CLI's own side-effecting body — argv parsing,
// filesystem writes, process.exit — and must run only when this file is
// executed directly (as every real integration run and every existing
// subprocess-spawning test does), never when it is merely imported for its
// exported functions (as the mapping test below does).
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const arg = (name) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? undefined : args[i + 1];
  };
  const slug = arg("slug");
  const srcRepo = arg("src");
  const entry = arg("entry");
  const subdir = arg("subdir");
  const apply = args.includes("--apply");
  const forceGlobRepo = args.includes("--force-glob-repo");

  // The source repo's OWN astro.config declares its OWN GitHub Pages base
  // (e.g. base: '/CSARCH2-G9-Exhibit'). Some repos hardcode that base into
  // src/ instead of using ${base} or a relative path; after merging, those
  // references point at a path that no longer exists (see rewrite.mjs). Read
  // whichever config file the repo actually has — Astro accepts any of the
  // three extensions — and normalize away the slash noise ('/', '', 'x/',
  // '/x') so that "no base set" and "default base" both collapse to ''.
  const readSourceBase = (repoDir) => {
    for (const name of [
      "astro.config.mjs",
      "astro.config.js",
      "astro.config.ts",
    ]) {
      const configPath = join(repoDir, name);
      if (!existsSync(configPath)) continue;
      const match = readFileSync(configPath, "utf8").match(
        /\bbase\s*:\s*(['"])((?:(?!\1).)*)\1/,
      );
      if (match) return match[2];
    }
    return "";
  };
  const sourceBase = normalizeBase(readSourceBase(srcRepo));
  console.log(`source base: ${sourceBase || "(none — no rewriting needed)"}`);

  // findOrphans's basename/stem scan can't see references an import.meta.glob
  // call builds at runtime, so its report for these seven repos warrants a
  // human look before anything is deleted — the same reasoning that makes
  // prune.mjs's own CLI refuse under this condition. That refusal lives only
  // in prune.mjs's CLI block, not in the exported findOrphans function this
  // orchestrator calls as a library, so the guard has to be repeated here.
  // Matched on the --slug argument (not the resolved path) because the slug
  // is already passed explicitly on this CLI.
  const refuseGlobRepo = apply && GLOB_REPOS.includes(slug) && !forceGlobRepo;

  const SRC = "src";
  const stage = join(".integration-src", `${slug}-stage`);

  // 1. Stage a copy so the clone stays pristine and re-runnable.
  rmSync(stage, { recursive: true, force: true });
  cpSync(join(srcRepo, "src"), stage, { recursive: true });

  // public/ is served verbatim and must move to public/<slug>/ or its assets
  // are silently lost. 16 exhibits ship 113 MB there.
  const stagePublic = join(".integration-src", `${slug}-stage-public`);
  const hasPublic = existsSync(join(srcRepo, "public"));
  rmSync(stagePublic, { recursive: true, force: true });
  if (hasPublic)
    cpSync(join(srcRepo, "public"), stagePublic, { recursive: true });

  // Every student repo inherited this template's src/styles/global.css. It is
  // not a media file, so findOrphans/prune.mjs never considers it, yet when an
  // exhibit never touched it, copying it into styles/<slug>/ just duplicates
  // class names for no reason. Drop it ONLY when it is byte-identical (line
  // endings normalized first — several repos ship a CRLF copy of an otherwise
  // untouched file) to the umbrella's own copy; an exhibit that genuinely
  // customized global.css keeps its staged copy, since that content is
  // handled per-exhibit by the runbook's style-scoping step (moved to
  // src/styles/<slug>/base.css and wrapped so it cannot escape the exhibit).
  const stagedGlobalCss = join(stage, "styles", "global.css");
  const umbrellaGlobalCss = join(SRC, "styles", "global.css");
  if (existsSync(stagedGlobalCss)) {
    const normalizeEol = (s) => s.replace(/\r\n/g, "\n");
    const staged = normalizeEol(readFileSync(stagedGlobalCss, "utf8"));
    const umbrella = existsSync(umbrellaGlobalCss)
      ? normalizeEol(readFileSync(umbrellaGlobalCss, "utf8"))
      : null;
    if (staged === umbrella) {
      rmSync(stagedGlobalCss, { force: true });
      console.log("styles/global.css: identical to the umbrella copy, dropped");
    } else {
      console.log(
        "styles/global.css: differs from the umbrella copy, kept for manual style-scoping",
      );
    }
  }

  // 2. Drop template leftovers.
  for (const dir of ["pages", "components", "assets", "layouts", "styles"]) {
    const d = join(stage, dir);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) {
      if (TEMPLATE_LEFTOVERS.includes(f))
        rmSync(join(d, f), { recursive: true, force: true });
    }
  }
  // The stock template's own homepage is template leftover and must not be
  // merged — EXCEPT when an "index-squatter" exhibit left its actual content
  // in this exact file and is being integrated via --entry index.mdx (the
  // runbook documents this pattern). In that case index.mdx IS the entry
  // this run is about to copy in step 7, not leftover, and deleting it here
  // unconditionally destroys it before that copy can happen (ENOENT).
  if (entry !== "index.mdx") {
    rmSync(join(stage, "pages", "index.mdx"), { force: true });
  }

  // 3. Prune orphans (report only for the import.meta.glob repos).
  const orphans = findOrphans(stage).filter(
    (o) => !ALWAYS_KEEP.has(o.path.split(/[\\/]/).pop()),
  );
  console.log(
    `orphans: ${orphans.length} files, ` +
      `${(orphans.reduce((n, o) => n + o.bytes, 0) / 1048576).toFixed(1)} MB`,
  );
  for (const o of orphans) console.log(`  ${o.reason.padEnd(12)} ${o.path}`);
  if (apply && !refuseGlobRepo)
    for (const o of orphans) rmSync(o.path, { force: true });

  // 4. Optimize what remains, in src/assets and in public/.
  let publicOrphans = [];
  if (hasPublic) {
    publicOrphans = findOrphans(stagePublic, { haystackDir: stage }).filter(
      (o) => !ALWAYS_KEEP.has(o.path.split(/[\\/]/).pop()),
    );
    console.log(`public orphans: ${publicOrphans.length} files`);
    for (const o of publicOrphans)
      console.log(`  ${o.reason.padEnd(12)} ${o.path}`);
    if (apply && !refuseGlobRepo)
      for (const o of publicOrphans) rmSync(o.path, { force: true });
  }

  // Refuse before any deletion, optimization, or copy has run (all of the
  // above was read-only reporting plus staging into the disposable
  // .integration-src/ copy) so a re-run after manual review starts clean
  // instead of resuming a half-applied import.
  if (refuseGlobRepo) {
    console.log(
      `\nrefusing to delete or copy: '${slug}' uses import.meta.glob, so references built at ` +
        "runtime are invisible to the orphan report above and it cannot be trusted automatically. " +
        "Review the list by hand, then re-run with --force-glob-repo to proceed.",
    );
    process.exitCode = 2;
    process.exit(2);
  }

  const results = apply
    ? await optimizeTree(join(stage, "assets"), { apply: true })
    : [];
  const publicResults =
    apply && hasPublic ? await optimizeTree(stagePublic, { apply: true }) : [];
  const all = [...results, ...publicResults];
  const before = all.reduce((n, r) => n + r.beforeBytes, 0);
  const after = all.reduce((n, r) => n + (r.afterBytes ?? r.beforeBytes), 0);
  console.log(
    `assets: ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB`,
  );

  // 5. Build the old -> new path map.
  const pathMap = new Map();

  // Every top-level src/ directory except pages/ and layouts/ gets namespaced
  // the same way components/, assets/ and styles/ always have. Repos are free
  // to keep code or assets anywhere else under src/ — a fonts/ directory, a
  // zustand store/, or (for at least one repo) the exhibit's entire component
  // tree under its own directory name — and skipping those directories would
  // silently drop them from the site while the build stayed green. Computed
  // from the staged tree (post-prune) rather than hardcoded, so nothing new
  // needs to be taught to this script by name.
  const NAMESPACED_KINDS = readdirSync(stage, { withFileTypes: true })
    .filter(
      (e) => e.isDirectory() && e.name !== "pages" && e.name !== "layouts",
    )
    .map((e) => e.name)
    .sort();

  // Files sitting directly at the root of src/ (e.g. content.config.ts) are not
  // namespaced into a per-exhibit directory: unlike components/assets/styles/
  // etc. they are not referenced by relative import from the exhibit's own
  // code, they define project-wide Astro configuration (e.g. content
  // collections) that Astro only reads from src/'s root, and more than one
  // repo ships one. Blindly copying or merging one over the umbrella site's
  // own src/content.config.ts (or over another already-integrated exhibit's)
  // risks silently breaking every exhibit, not just this one — the opposite of
  // "fail loudly". They are left in place in the stage for a human to
  // reconcile by hand; flagged here so that review can't be skipped silently.
  const rootFiles = readdirSync(stage, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort();
  if (rootFiles.length) {
    console.log(
      `\nWARNING: ${rootFiles.length} loose file(s) at the root of src/ were NOT imported: ` +
        `${rootFiles.join(", ")}`,
    );
    console.log(
      "  These likely define project-wide Astro config (e.g. content collections) and must be " +
        `reconciled by hand against the umbrella src/. They remain at ${stage}/ for review.`,
    );
  }

  for (const kind of NAMESPACED_KINDS) {
    for (const file of walk(join(stage, kind))) {
      const rel = relative(stage, file).split(/[\\/]/).join("/");
      const [top, ...rest] = rel.split("/");
      pathMap.set(rel, [top, slug, ...rest].join("/"));
    }
  }
  for (const r of results) {
    if (r.from === r.to) continue;
    const from = relative(stage, r.from).split(/[\\/]/).join("/");
    const to = relative(stage, r.to).split(/[\\/]/).join("/");
    const [top, ...rest] = to.split("/");
    pathMap.set(from, [top, slug, ...rest].join("/"));
  }

  // 6. Routes the exhibit used to own, for ${base}/root-absolute link
  // rewriting. A Map, not a bare list: the entry page moves to
  // src/pages/<slug>.{mdx,astro} (no sub-directory), so its OLD name must map to
  // the bare slug, not "<slug>/<its-old-name>" — every other page keeps the
  // "<slug>/<name>" shape the flat list always produced. A sub-page under
  // --subdir is reachable under two distinct old keys that must resolve to
  // the SAME destination: its own bare name (the way a sibling sub-page
  // links to it) and the combined "<subdir>/<name>" form (the way a page
  // outside the sub-directory, e.g. the entry page, links to it) — because
  // <subdir> itself does not survive the move: the copy loop below flattens
  // src/pages/<subdir>/<name> straight into src/pages/<slug>/<name>.
  const stripExt = (f) => f.replace(/\.(mdx|astro|md)$/, "");
  const routes = new Map();
  routes.set(stripExt(entry), slug);

  for (const f of readdirSync(join(stage, "pages"))) {
    if (!/\.(mdx|astro|md)$/.test(f) || f === entry) continue;
    const name = stripExt(f);
    if (name === "index") continue;
    routes.set(name, `${slug}/${name}`);
  }

  if (subdir) {
    for (const file of walk(join(stage, "pages", subdir))) {
      const rel = relative(join(stage, "pages", subdir), file)
        .split(/[\\/]/)
        .join("/");
      const name = stripExt(rel);
      routes.set(name, `${slug}/${name}`);
      routes.set(`${subdir}/${name}`, `${slug}/${name}`);
    }
  }
  console.log(
    `routes to re-point: ${[...routes.keys()].join(", ") || "(none)"}`,
  );

  // Public asset original -> final name map, for rewriting /foo.png and
  // ${base}foo.png references. Built AFTER optimizeTree above has already run
  // over stagePublic, from its own from/to result records, so a rename the
  // optimizer made (Clock.png -> Clock.webp) is reflected here rather than
  // rediscovered by re-walking the (already-renamed) directory, which would
  // only ever see the final name and could never recover the original one a
  // source file's reference still uses. See buildPublicAssetMap above.
  const publicAssets = hasPublic
    ? buildPublicAssetMap(stagePublic, publicResults)
    : new Map();
  console.log(`public assets to re-point: ${publicAssets.size}`);

  // The entry keeps its own extension rather than always landing as .mdx: an
  // index-squatter's entry may be index.astro just as easily as index.mdx
  // (or a named page of either kind), and src/pages/<slug>.astro routes
  // identically to src/pages/<slug>.mdx, so there is no reason — and no safe
  // way, short of actually transpiling — to force one format into the other.
  const entryExt = extname(entry);
  const entryDest = `${slug}${entryExt}`;
  console.log(`\nentry page: ${entry} -> src/pages/${entryDest}`);
  if (subdir) console.log(`sub-pages : ${subdir}/ -> src/pages/${slug}/`);
  if (hasPublic) console.log(`public    : -> public/${slug}/`);
  for (const kind of NAMESPACED_KINDS) {
    console.log(`${kind.padEnd(10)}: -> src/${kind}/${slug}/`);
  }
  if (!apply) {
    console.log("\ndry run — pass --apply to write into src/");
    process.exit(0);
  }

  // 7. Copy into place, rewriting as we go.
  const copyRewritten = (fromPath, toPath, fromDir, toDir) => {
    mkdirSync(join(SRC, toDir), { recursive: true });
    const isText = /\.(mdx|md|astro|js|jsx|ts|tsx|css|scss|json)$/.test(
      fromPath,
    );
    if (!isText) {
      cpSync(fromPath, toPath);
      return;
    }
    const content = readFileSync(fromPath, "utf8");
    writeFileSync(
      toPath,
      rewriteFile(content, {
        fromDir,
        toDir,
        pathMap,
        slug,
        routes,
        publicAssets,
        sourceBase,
      }),
    );
  };

  for (const kind of NAMESPACED_KINDS) {
    for (const file of walk(join(stage, kind))) {
      const rel = relative(stage, file).split(/[\\/]/).join("/");
      const to = pathMap.get(rel);
      copyRewritten(file, join(SRC, to), posix.dirname(rel), posix.dirname(to));
    }
  }

  copyRewritten(
    join(stage, "pages", entry),
    join(SRC, "pages", entryDest),
    "pages",
    "pages",
  );

  if (subdir) {
    for (const file of walk(join(stage, "pages", subdir))) {
      const rel = relative(join(stage, "pages", subdir), file)
        .split(/[\\/]/)
        .join("/");
      copyRewritten(
        file,
        join(SRC, "pages", slug, rel),
        `pages/${subdir}`,
        `pages/${slug}`,
      );
    }
  }

  // 8. Move public/ into its namespace.
  if (hasPublic) {
    mkdirSync(join("public", slug), { recursive: true });
    cpSync(stagePublic, join("public", slug), { recursive: true });
    console.log(`public/: ${publicAssets.size} files -> public/${slug}/`);
  }

  console.log(
    "\ndone. Now: set the layout import, set status live, build, verify, commit.",
  );
}
