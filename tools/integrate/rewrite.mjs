import { posix } from 'node:path';

const { join, dirname, relative, normalize } = posix;

const SPECIFIER = /(["'`])(\.\.?\/[^"'`]+)\1/g;

// A route or public-asset name must be followed by a quote/backtick, a path
// separator, a query/fragment marker, or the end of the string — never by a
// hyphen, letter, digit, or dot. Without this, 'references' would splice into
// 'references-appendix' and 'simulator' into 'simulator2'.
const TRAILING_BOUNDARY = '(?=[`\'"/#?]|$)';

// The umbrella site's own base (astro.config.mjs's `base:`). Fixed for this
// project, so a constant is simpler than threading a config read through
// every call site; rewriteFile still takes it as an overridable option below
// rather than baking the literal into the regex, so a caller can pass a
// different value instead of forking this file if that ever stops being true.
// The site is served at root (astro.config.mjs `base: '/'`). Empty means
// "no base segment"; joinUmbrella collapses it correctly.
const UMBRELLA_BASE = '';

// With the site served at root, umbrellaBase is '' and a naive
// `/${base}/${rest}` emits `//rest` — a protocol-relative URL, which the
// browser resolves against a HOST rather than the site root. Collapse the
// empty case instead of interpolating it. A caller may also pass a base
// copied straight out of an astro.config `base:` value, conventionally
// written with a leading (and sometimes trailing) slash - e.g. '/csarch2' -
// so run it through normalizeBase first, the same normalization already
// applied to sourceBase below, or a decorated base reintroduces the exact
// '//' defect this helper exists to prevent.
function joinUmbrella(base, rest) {
  const normalized = normalizeBase(base);
  return normalized ? `/${normalized}/${rest}` : `/${rest}`;
}

// A source repo's own astro.config `base:` shows up in the wild as
// '/CSARCH2-Group-6/', 'virtual-exhibit-template', '/', or '' — leading and
// trailing slashes are noise, and a bare '/' or empty string both mean "this
// repo never set its own base" rather than naming a real path segment.
export function normalizeBase(base) {
  if (!base) return '';
  return base.replace(/^\/+/, '').replace(/\/+$/, '');
}

export function remapSpecifier(spec, { fromDir, toDir, pathMap }) {
  if (!spec.startsWith('.')) return spec;

  // Vite import suffixes ('?url', '?raw', '?w=400&format=webp', ...) are not
  // part of the filesystem path and are never keys in pathMap, so they must
  // be split off before the lookup (and before the extensionless-import
  // fallback below, which walks pathMap the same way) and re-attached
  // byte-for-byte to whatever path the lookup produces.
  const queryIndex = spec.indexOf('?');
  const suffix = queryIndex === -1 ? '' : spec.slice(queryIndex);
  const specPath = queryIndex === -1 ? spec : spec.slice(0, queryIndex);

  const oldTarget = normalize(join(fromDir, specPath));

  let newTarget = pathMap.get(oldTarget);
  if (!newTarget) {
    // Try extensionless imports: "../components/Foo" -> "components/Foo.jsx"
    for (const [from, to] of pathMap) {
      if (from.slice(0, from.lastIndexOf('.')) === oldTarget) {
        newTarget = to;
        break;
      }
    }
  }
  if (!newTarget) return spec;

  // Preserve an extensionless import style if that is how it was written.
  if (!specPath.includes(posix.extname(oldTarget)) && posix.extname(oldTarget)) {
    newTarget = newTarget.slice(0, newTarget.lastIndexOf('.'));
  }

  let out = relative(toDir, newTarget);
  if (!out.startsWith('.')) out = `./${out}`;
  return out + suffix;
}

export function rewriteFile(
  content,
  {
    fromDir, toDir, pathMap, slug, routes = [], publicAssets = [],
    sourceBase = '', umbrellaBase = UMBRELLA_BASE,
  },
) {
  let out = content.replace(SPECIFIER, (match, quote, spec) => {
    const remapped = remapSpecifier(spec, { fromDir, toDir, pathMap });
    return `${quote}${remapped}${quote}`;
  });

  // A route may be given as a bare array of names (backward compatible: the
  // loop below then treats each name as mapping to itself under the slug,
  // exactly as this pass always behaved) or as a Map (canonical) of old
  // route key -> full new route. Only a Map can express what a flat array
  // cannot: the entry page's key must map to the bare slug rather than
  // "<slug>/<key>" (see import-exhibit.mjs's routes map), and a sub-page is
  // reachable under two distinct old keys — its own bare name (a sibling
  // page links to it that way) AND the combined "<subdir>/<name>" form (a
  // link written against the source repo's own route structure) — that must
  // both resolve to the SAME "<slug>/<name>", since <subdir> itself does not
  // survive the move (flattened away by the orchestrator's copy step).
  const routeEntries = routes instanceof Map
    ? [...routes]
    : routes.map((name) => [name, `${slug}/${name}`]);

  // Longer keys first, so "<subdir>/<name>" is tried before the bare
  // "<name>" that is its own suffix. Each pattern below is anchored (right
  // after "${base}"/an optional slash, or right after a quote+slash), so in
  // practice only one key can ever match a given occurrence — but this
  // ordering is the cheap defensive guarantee that a match is always
  // consumed as a whole route, never leaving a stray sub-directory segment
  // behind from a partial rewrite.
  const sortedRoutes = [...routeEntries].sort(([a], [b]) => b.length - a.length);

  for (const [key, value] of sortedRoutes) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // ${base}route/  ->  ${base}<value>/
    // ${base}/route/ -> ${base}<value>/
    // Student code writes both shapes (with and without a single separating
    // slash between the base template literal and the route name). The
    // captured slash is DROPPED, not echoed back: `${base}` renders as
    // `import.meta.env.BASE_URL`, which at this site's `base: '/'` is "/",
    // so echoing the slash emitted "//<route>" - a protocol-relative URL the
    // browser resolves against a HOST. Collapsing makes both shapes converge
    // on the separator-free form, the same one the no-slash branch has always
    // produced. Replaced via a function (not a "$1$2..." template) for the
    // same reason as publicAssets below: a `value` containing a literal "$"
    // must never be misread as a backreference.
    out = out.replace(
      new RegExp('(\\$\\{base[A-Za-z]*\\})(/?)(' + escaped + ')' + TRAILING_BOUNDARY, 'g'),
      (match, baseLit) => `${baseLit}${value}`,
    );
    // The root-absolute form ("/08-shader-lab") resolves at the browser
    // root, so — like a root-absolute public-asset reference below — it
    // needs the umbrella site's own base spliced in ahead of `value` too.
    out = out.replace(
      new RegExp('(["\'`])/(' + escaped + ')' + TRAILING_BOUNDARY, 'g'),
      (match, quote) => `${quote}${joinUmbrella(umbrellaBase, value)}`,
    );
  }

  // Files served from public/ move to public/<slug>/, so both the base-relative
  // and the root-absolute reference shapes need the slug inserted. The media
  // optimizer may ALSO have renamed the file on disk before this ever runs
  // (Clock.png -> Clock.webp, original deleted) — so the name to search for
  // in the source text (what the exhibit's own code still says) and the name
  // to write into the rewritten reference (what actually exists on disk) can
  // differ. publicAssets is therefore a mapping of original name -> final
  // name, not just a list: a Map is canonical; a plain array is also
  // accepted for backward compatibility and treated as an identity mapping
  // (every name maps to itself, i.e. "the optimizer left it alone"). Names
  // may include a subdirectory ("S04_Group3_images/grass-tile.png"), which
  // needs no special handling here since the forward slash is not a regex
  // metacharacter.
  const assetEntries = publicAssets instanceof Map
    ? publicAssets
    : publicAssets.map((name) => [name, name]);
  for (const [original, final] of assetEntries) {
    const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Same optional-slash blind spot as routes above: ${base}/logo.png and
    // ${base}logo.png both occur in the wild, and the captured slash is
    // dropped for the same reason - `${base}` is "/" at this site's base, so
    // keeping it emitted "//<slug>/<asset>". Replaced via a function (not a
    // "$1$2..." template) so that a `final` name containing a literal "$"
    // can never be misread as a backreference.
    out = out.replace(
      new RegExp('(\\$\\{base[A-Za-z]*\\})(/?)(' + escaped + ')' + TRAILING_BOUNDARY, 'g'),
      (match, baseLit) => `${baseLit}${slug}/${final}`,
    );
    // The root-absolute form ("/Clock.png") resolves at the browser root, so
    // it needs both the umbrella site's own base AND the slug spliced in:
    // "/Clock.png" -> "/s40g1/Clock.webp" (or "/<umbrellaBase>/s40g1/Clock.webp"
    // when umbrellaBase is set, e.g. for a non-root future deploy). This is
    // unlike the ${base}-prefixed form just above, whose ${base} already
    // supplies the umbrella base at runtime - adding it there too would
    // double it, so only this root-absolute branch gets umbrellaBase.
    out = out.replace(
      new RegExp('(["\'`])/(' + escaped + ')' + TRAILING_BOUNDARY, 'g'),
      (match, quote) => `${quote}${joinUmbrella(umbrellaBase, `${slug}/${final}`)}`,
    );
  }

  // Some repos hardcoded their OWN astro.config base into src/ instead of
  // using ${base} or a relative path — a route like
  // "/CSARCH2-G8-GPU-WARS-FORKED-/01-main" or a public asset like
  // "/CSARCH2-G9-Exhibit/astronauts.png". Both routes and public assets end
  // up living under the umbrella's base plus this exhibit's slug once
  // merged, so both are fixed by the same substitution: swap the leading
  // "/<sourceBase>/" for "/<umbrellaBase>/<slug>/" and leave the rest of the
  // path (and the rest of the string) untouched.
  //
  // Runs last, after the ${base}-prefixed template-literal passes above,
  // because it targets a structurally different, disjoint shape: those
  // passes only ever touch a literal "${base...}" prefix, while this one
  // only touches a literal quote immediately followed by "/<sourceBase>/".
  // Neither pass's output can ever contain the other's trigger text, so
  // ordering can't cause a reference to be rewritten twice — this is simply
  // the last independent pass, standing in for the fact that, unlike routes/
  // publicAssets, it does not need a per-name loop.
  const normalizedSourceBase = normalizeBase(sourceBase);
  if (normalizedSourceBase) {
    const escapedBase = normalizedSourceBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // The base may be followed by '/' (a path under it) or by the closing
    // quote (a bare root link to the exhibit's own home). Both must rewrite;
    // requiring the slash silently missed the bare form and shipped a 404.
    out = out.replace(
      new RegExp('(["\'`])/' + escapedBase + '(/|(?=["\'`]))', 'g'),
      (_m, q, tail) => `${q}${joinUmbrella(umbrellaBase, slug)}${tail === '/' ? '/' : ''}`,
    );
  }

  return out;
}
