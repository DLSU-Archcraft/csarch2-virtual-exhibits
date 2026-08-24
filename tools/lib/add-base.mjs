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
