import { normalizeBase } from '../integrate/rewrite.mjs';

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
  // 'from' and 'to' name a path SEGMENT. They are written both ways in the
  // wild — 'csarch2', '/csarch2', '/csarch2/' — all meaning the same segment,
  // so run both through the same normalization the import rewriter uses. An
  // un-normalized `to: '/csarch2'` produced '//csarch2/a.webp': a
  // protocol-relative URL the browser resolves against a HOST.
  const fromSegment = normalizeBase(from);
  const toSegment = normalizeBase(to);

  // An empty 'from' would make the needle a bare '/', matching EVERY slash in
  // the file: "/s01g8/diagram.webp" came out as
  // "/csarch2s01g8/csarch2diagram.webp". There is no segment to key on when
  // the site is already at root, so this is not a rewrite this tool can do —
  // refuse it rather than corrupting the tree. See README 14.
  if (!fromSegment) {
    throw new Error(
      "rewriteBaseRefs: 'from' must name a base path segment. " +
        'An empty (or "/") from would match every slash in the file and ' +
        'corrupt every path. To move a site that is already at root UNDER a ' +
        'base, see README 14 - this tool cannot express that direction.',
    );
  }

  const needle = `/${fromSegment}`;
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
    } else if (toSegment) {
      text += `/${toSegment}`;
      changed++;
    } else {
      // an empty 'to' means "rewrite to root". A bare reference — the needle is
      // the whole path, with nothing (or a non-'/' character, e.g. '?' or
      // '#') immediately after it — must still resolve to "/", the root
      // path, not "" (RFC 3986: an empty URI reference resolves to the
      // CURRENT document, not the root). Only when the next character is
      // '/' does dropping the needle outright leave a correct path, because
      // that '/' is still there in the remainder of the source.
      const nextChar = source[at + needle.length];
      text += nextChar === '/' ? '' : '/';
      changed++;
    }
    i = at + needle.length;
  }

  return { text, changed };
}
