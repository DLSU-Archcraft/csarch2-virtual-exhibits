import { test } from 'node:test';
import assert from 'node:assert/strict';
import { remapSpecifier, rewriteFile, normalizeBase } from '../integrate/rewrite.mjs';

const pathMap = new Map([
  ['components/Foo.jsx', 'components/s01g7/Foo.jsx'],
  ['assets/pic.png', 'assets/s01g7/pic.webp'],
  ['styles/theme.css', 'styles/s01g7/theme.css'],
]);

test('an entry page keeps its depth and gains the namespace', () => {
  const out = remapSpecifier('../components/Foo.jsx', {
    fromDir: 'pages', toDir: 'pages', pathMap,
  });
  assert.equal(out, '../components/s01g7/Foo.jsx');
});

test('a sub-page one level deeper gets an extra ../', () => {
  const out = remapSpecifier('../components/Foo.jsx', {
    fromDir: 'pages', toDir: 'pages/s01g7', pathMap,
  });
  assert.equal(out, '../../components/s01g7/Foo.jsx');
});

test('a component gains a level when it moves into its namespace', () => {
  const out = remapSpecifier('../assets/pic.png', {
    fromDir: 'components', toDir: 'components/s01g7', pathMap,
  });
  assert.equal(out, '../../assets/s01g7/pic.webp');
});

test('an unmapped specifier is left alone', () => {
  const out = remapSpecifier('../lib/util.js', {
    fromDir: 'pages', toDir: 'pages', pathMap,
  });
  assert.equal(out, '../lib/util.js');
});

test('bare package imports are never touched', () => {
  const out = remapSpecifier('react', { fromDir: 'pages', toDir: 'pages/s01g7', pathMap });
  assert.equal(out, 'react');
});

// --- Vite import-suffix handling (defect 1) ---

test('a query-suffixed specifier is remapped and keeps its suffix, even across an extension change', () => {
  const suffixMap = new Map([['assets/pattern.png', 'assets/s05g8/pattern.webp']]);
  const out = remapSpecifier('../assets/pattern.png?url', {
    fromDir: 'pages', toDir: 'pages', pathMap: suffixMap,
  });
  assert.equal(out, '../assets/s05g8/pattern.webp?url');
});

test('a multi-parameter query suffix is preserved byte-for-byte', () => {
  const suffixMap = new Map([['assets/pattern.png', 'assets/s05g8/pattern.webp']]);
  const out = remapSpecifier('../assets/pattern.png?w=400&format=webp', {
    fromDir: 'pages', toDir: 'pages', pathMap: suffixMap,
  });
  assert.equal(out, '../assets/s05g8/pattern.webp?w=400&format=webp');
});

test('a specifier with no suffix behaves exactly as it did before suffix handling was added', () => {
  const out = remapSpecifier('../assets/pic.png', {
    fromDir: 'pages', toDir: 'pages', pathMap,
  });
  assert.equal(out, '../assets/s01g7/pic.webp');
});

test('rewriteFile updates import statements', () => {
  const src = 'import Foo from "../components/Foo.jsx";\nimport "../styles/theme.css";\n';
  const out = rewriteFile(src, { fromDir: 'pages', toDir: 'pages/s01g7', pathMap, slug: 's01g7', routes: [] });
  assert.match(out, /"\.\.\/\.\.\/components\/s01g7\/Foo\.jsx"/);
  assert.match(out, /"\.\.\/\.\.\/styles\/s01g7\/theme\.css"/);
});

test('base-relative internal links gain the slug', () => {
  const src = 'href={`${base}shared-bus-problem/`}';
  const out = rewriteFile(src, {
    fromDir: 'pages', toDir: 'pages', pathMap, slug: 's04g4', routes: ['shared-bus-problem'],
  });
  assert.match(out, /\$\{base\}s04g4\/shared-bus-problem\//);
});

test('references to a public asset gain the slug in both link shapes', () => {
  const out = rewriteFile('<img src="/moon.svg"> and href={`${base}moon.svg`}', {
    fromDir: 'pages', toDir: 'pages', pathMap, slug: 's03g9',
    routes: [], publicAssets: ['moon.svg'],
  });
  assert.match(out, /src="\/s03g9\/moon\.svg"/);
  assert.match(out, /\$\{base\}s03g9\/moon\.svg/);
});

test('a base-relative link to a route the exhibit does not own is untouched', () => {
  const src = 'href={`${base}`}';
  const out = rewriteFile(src, {
    fromDir: 'pages', toDir: 'pages', pathMap, slug: 's04g4', routes: ['shared-bus-problem'],
  });
  assert.equal(out, 'href={`${base}`}');
});

test('a route that is a hyphen-prefix of another route is not spliced', () => {
  const out = rewriteFile('href={`${base}references-appendix/`}', {
    fromDir: 'pages', toDir: 'pages', pathMap, slug: 's04g4', routes: ['references'],
  });
  assert.equal(out, 'href={`${base}references-appendix/`}');
});

test('the exact route is still rewritten when a longer route shares its prefix', () => {
  const out = rewriteFile('href={`${base}references/`}', {
    fromDir: 'pages', toDir: 'pages', pathMap, slug: 's04g4', routes: ['references'],
  });
  assert.match(out, /\$\{base\}s04g4\/references\//);
});

test('a route that is a digit-prefix of another route is not spliced', () => {
  const out = rewriteFile('href={`${base}simulator2/`}', {
    fromDir: 'pages', toDir: 'pages', pathMap, slug: 's01g1', routes: ['simulator'],
  });
  assert.equal(out, 'href={`${base}simulator2/`}');
});

test('a public asset name that is a prefix of another filename is not spliced', () => {
  const out = rewriteFile('<img src="/logo.png.bak">', {
    fromDir: 'pages', toDir: 'pages', pathMap, slug: 's03g9', routes: [], publicAssets: ['logo.png'],
  });
  assert.equal(out, '<img src="/logo.png.bak">');
});

test('the exact public asset is still rewritten when a longer filename shares its prefix', () => {
  const out = rewriteFile('<img src="/logo.png">', {
    fromDir: 'pages', toDir: 'pages', pathMap, slug: 's03g9', routes: [], publicAssets: ['logo.png'],
  });
  assert.match(out, /src="\/s03g9\/logo\.png"/);
});

// --- root-absolute public-asset references gain the umbrella base (defect 2) ---

test('a root-absolute public asset reference gains both the umbrella base and the slug', () => {
  const out = rewriteFile('<img src="/Clock.png">', {
    fromDir: 'pages', toDir: 'pages', pathMap: new Map(), slug: 's40g1',
    routes: [], publicAssets: ['Clock.png'],
  });
  assert.equal(out, '<img src="/s40g1/Clock.png">');
});

test('the ${base}-prefixed form is untouched by the umbrella-base fix - ${base} already supplies it', () => {
  const out = rewriteFile('href={`${base}Clock.png`}', {
    fromDir: 'pages', toDir: 'pages', pathMap: new Map(), slug: 's40g1',
    routes: [], publicAssets: ['Clock.png'],
  });
  assert.equal(out, 'href={`${base}s40g1/Clock.png`}');
});

test('the trailing-boundary protection still holds for the root-absolute form', () => {
  const out = rewriteFile('<img src="/logo.png.bak">', {
    fromDir: 'pages', toDir: 'pages', pathMap: new Map(), slug: 's40g1',
    routes: [], publicAssets: ['logo.png'],
  });
  assert.equal(out, '<img src="/logo.png.bak">');
});

test('a route reference with no trailing slash before the closing backtick still rewrites', () => {
  const out = rewriteFile('href={`${base}silicon-minds`}', {
    fromDir: 'pages', toDir: 'pages', pathMap, slug: 's01g5', routes: ['silicon-minds'],
  });
  assert.match(out, /\$\{base\}s01g5\/silicon-minds`/);
});

test('a slash-separated base link is rewritten and DROPS its leading slash', () => {
  // Was asserted the other way round - "keeps its leading slash" - which
  // locked in the shape that renders as "//s01g7/..." once BASE_URL is "/",
  // i.e. the next import would have reintroduced the protocol-relative
  // defect by design. The slash is now collapsed instead.
  const out = rewriteFile('href={`${baseUrl}/S01_Group7_fullcapacity/`}', {
    fromDir: 'pages', toDir: 'pages', pathMap, slug: 's01g7', routes: ['S01_Group7_fullcapacity'],
  });
  assert.match(out, /\$\{baseUrl\}s01g7\/S01_Group7_fullcapacity\//);
  assert.doesNotMatch(out, /\$\{baseUrl\}\//);
});

test('a no-separator base link is rewritten and gains no slash', () => {
  const out = rewriteFile('href={`${base}shared-bus-problem/`}', {
    fromDir: 'pages', toDir: 'pages', pathMap, slug: 's04g4', routes: ['shared-bus-problem'],
  });
  assert.match(out, /\$\{base\}s04g4\/shared-bus-problem\//);
  assert.doesNotMatch(out, /\$\{base\}\/s04g4/);
});

test('the boundary still holds for the slash-separated form: a hyphen-prefix route is not spliced', () => {
  const out = rewriteFile('href={`${base}/references-appendix/`}', {
    fromDir: 'pages', toDir: 'pages', pathMap, slug: 's04g4', routes: ['references'],
  });
  assert.equal(out, 'href={`${base}/references-appendix/`}');
});

test('a slash-separated public asset reference is rewritten and DROPS its leading slash', () => {
  // Same correction as the route case above: the old expectation
  // "${base}/s03g9/moon.svg" renders as "//s03g9/moon.svg" at BASE_URL "/".
  const out = rewriteFile('href={`${base}/moon.svg`}', {
    fromDir: 'pages', toDir: 'pages', pathMap, slug: 's03g9', routes: [], publicAssets: ['moon.svg'],
  });
  assert.match(out, /\$\{base\}s03g9\/moon\.svg/);
  assert.doesNotMatch(out, /\$\{base\}\//);
});

test('an imported ${base}-prefixed reference cannot render as // at a root base', () => {
  // The end-to-end statement of the two corrections above: take the emitted
  // text, substitute what `import.meta.env.BASE_URL` actually is when
  // astro.config.mjs says `base: '/'`, and no reference may begin with "//".
  const out = rewriteFile(
    'href={`${base}/moon.svg`} img={`${base}moon.svg`} ' +
      'a={`${base}/simulator/`} b={`${base}simulator/`}',
    {
      fromDir: 'pages', toDir: 'pages', pathMap, slug: 's03g9',
      routes: ['simulator'], publicAssets: ['moon.svg'],
    },
  );
  const rendered = out.replace(/\$\{base[A-Za-z]*\}/g, '/');
  assert.doesNotMatch(rendered, /\/\//, `rendered protocol-relative URL: ${rendered}`);
  assert.match(rendered, /href=\{`\/s03g9\/moon\.svg`\}/);
  assert.match(rendered, /a=\{`\/s03g9\/simulator\/`\}/);
});

// --- source-repo's-own-base rewriting (correction 1) ---

test('a hardcoded reference to the source repo\'s own base gains the umbrella base and slug', () => {
  const out = rewriteFile('<img src="/CSARCH2-G9-Exhibit/astronauts.png">', {
    fromDir: 'pages', toDir: 'pages', pathMap, slug: 's03g9', sourceBase: 'CSARCH2-G9-Exhibit',
  });
  assert.equal(out, '<img src="/s03g9/astronauts.png">');
});

test('the same rewrite applies inside a CSS url() reference', () => {
  const out = rewriteFile("@font-face { src: url('/CSARCH2-G9-Exhibit/astronauts.png'); }", {
    fromDir: 'styles', toDir: 'styles', pathMap, slug: 's03g9', sourceBase: 'CSARCH2-G9-Exhibit',
  });
  assert.match(out, /url\('\/s03g9\/astronauts\.png'\)/);
});

test('a reference to a different repo\'s base is left untouched', () => {
  const src = '<img src="/CSARCH2-G8-GPU-WARS-FORKED-/01-main.png">';
  const out = rewriteFile(src, {
    fromDir: 'pages', toDir: 'pages', pathMap, slug: 's03g9', sourceBase: 'CSARCH2-G9-Exhibit',
  });
  assert.equal(out, src);
});

test('an empty sourceBase causes no rewriting', () => {
  const src = '<img src="/CSARCH2-G9-Exhibit/astronauts.png">';
  const out = rewriteFile(src, {
    fromDir: 'pages', toDir: 'pages', pathMap, slug: 's03g9', sourceBase: '',
  });
  assert.equal(out, src);
});

test('a bare-slash sourceBase causes no rewriting', () => {
  const src = '<img src="/CSARCH2-G9-Exhibit/astronauts.png">';
  const out = rewriteFile(src, {
    fromDir: 'pages', toDir: 'pages', pathMap, slug: 's03g9', sourceBase: '/',
  });
  assert.equal(out, src);
});

test('a sourceBase that is only a hyphen-prefix of the actual base is not spliced', () => {
  const src = '<img src="/CSARCH2-G9-Exhibit/x.png">';
  const out = rewriteFile(src, {
    fromDir: 'pages', toDir: 'pages', pathMap, slug: 's03g9', sourceBase: 'CSARCH2-G9',
  });
  assert.equal(out, src);
});

// --- publicAssets as an original -> final rename map (defect 3) ---
//
// The media optimizer converts-and-deletes public/ originals (Clock.png ->
// Clock.webp) before rewriteFile ever runs. publicAssets must therefore be
// able to carry that rename: the name to search for in source text (the
// original) can differ from the name to write into the rewritten reference
// (the final, on-disk name).

test('a Map rename is applied to the root-absolute form: search old extension, write new', () => {
  const out = rewriteFile('<img src="/Clock.png">', {
    fromDir: 'pages', toDir: 'pages', pathMap: new Map(), slug: 's40g1',
    routes: [], publicAssets: new Map([['Clock.png', 'Clock.webp']]),
  });
  assert.equal(out, '<img src="/s40g1/Clock.webp">');
});

test('the same Map rename is applied to the ${base}-prefixed form without doubling the umbrella base', () => {
  const out = rewriteFile('href={`${base}Clock.png`}', {
    fromDir: 'pages', toDir: 'pages', pathMap: new Map(), slug: 's40g1',
    routes: [], publicAssets: new Map([['Clock.png', 'Clock.webp']]),
  });
  assert.equal(out, 'href={`${base}s40g1/Clock.webp`}');
  assert.doesNotMatch(out, /virtual-exhibit-template/);
});

test('an asset that maps to itself is re-pointed but keeps its extension', () => {
  const out = rewriteFile('<img src="/model.glb">', {
    fromDir: 'pages', toDir: 'pages', pathMap: new Map(), slug: 's40g1',
    routes: [], publicAssets: new Map([['model.glb', 'model.glb']]),
  });
  assert.equal(out, '<img src="/s40g1/model.glb">');
});

test('a nested (subdirectory) name is renamed correctly', () => {
  const out = rewriteFile('<img src="/imgs/tile.png">', {
    fromDir: 'pages', toDir: 'pages', pathMap: new Map(), slug: 's40g1',
    routes: [], publicAssets: new Map([['imgs/tile.png', 'imgs/tile.webp']]),
  });
  assert.equal(out, '<img src="/s40g1/imgs/tile.webp">');
});

test('a plain array still works exactly as before (backward-compat guard)', () => {
  const out = rewriteFile('<img src="/Clock.png"> and href={`${base}Clock.png`}', {
    fromDir: 'pages', toDir: 'pages', pathMap: new Map(), slug: 's40g1',
    routes: [], publicAssets: ['Clock.png'],
  });
  assert.match(out, /src="\/s40g1\/Clock\.png"/);
  assert.match(out, /\$\{base\}s40g1\/Clock\.png/);
});

test('the trailing-boundary protection still holds when publicAssets renames the extension', () => {
  const out = rewriteFile('<img src="/logo.png.bak">', {
    fromDir: 'pages', toDir: 'pages', pathMap: new Map(), slug: 's40g1',
    routes: [], publicAssets: new Map([['logo.png', 'logo.webp']]),
  });
  assert.equal(out, '<img src="/logo.png.bak">');
});

// --- routes as an old-key -> new-route map, covering the entry page and
// sub-pages under --subdir (this fix) ---

test('the entry page maps to the bare slug, not slug/<its-old-name>', () => {
  const routeMap = new Map([['01-main', 's01g8']]);
  const out = rewriteFile('href={`${baseUrl}/01-main`}', {
    fromDir: 'pages', toDir: 'pages', pathMap: new Map(), slug: 's01g8', routes: routeMap,
  });
  // Expectation corrected with the ${base}-slash collapse: the old
  // '${baseUrl}/s01g8' renders as '//s01g8' at BASE_URL '/'.
  assert.equal(out, 'href={`${baseUrl}s01g8`}');
  assert.doesNotMatch(out, /s01g8\/01-main/);
});

test('a sub-page\'s bare-name key rewrites the ${base}/ form to slug/name', () => {
  const routeMap = new Map([['08-shader-lab', 's01g8/08-shader-lab']]);
  const out = rewriteFile('href={`${base}/08-shader-lab`}', {
    fromDir: 'pages', toDir: 'pages', pathMap: new Map(), slug: 's01g8', routes: routeMap,
  });
  assert.equal(out, 'href={`${base}s01g8/08-shader-lab`}');
});

test('the combined subdir/name form is rewritten and the sub-directory segment is dropped', () => {
  const routeMap = new Map([['S01_Group8_subpages/02-introduction', 's01g8/02-introduction']]);
  const out = rewriteFile('href={`${base}/S01_Group8_subpages/02-introduction`}', {
    fromDir: 'pages', toDir: 'pages', pathMap: new Map(), slug: 's01g8', routes: routeMap,
  });
  assert.equal(out, 'href={`${base}s01g8/02-introduction`}');
});

test('longest key wins: the combined form is rewritten exactly once, not nested or doubled', () => {
  const routeMap = new Map([
    ['S01_Group8_subpages/02-introduction', 's01g8/02-introduction'],
    ['02-introduction', 's01g8/02-introduction'],
  ]);
  const out = rewriteFile('href={`${base}/S01_Group8_subpages/02-introduction`}', {
    fromDir: 'pages', toDir: 'pages', pathMap: new Map(), slug: 's01g8', routes: routeMap,
  });
  assert.equal(out, 'href={`${base}s01g8/02-introduction`}');
});

test('a root-absolute route reference gains the umbrella base and the mapped value', () => {
  const routeMap = new Map([['08-shader-lab', 's01g8/08-shader-lab']]);
  const out = rewriteFile('<a href="/08-shader-lab">Lab</a>', {
    fromDir: 'pages', toDir: 'pages', pathMap: new Map(), slug: 's01g8', routes: routeMap,
  });
  assert.equal(out, '<a href="/s01g8/08-shader-lab">Lab</a>');
});

test('the boundary guard still holds with a route map: references does not match references-appendix', () => {
  const routeMap = new Map([['references', 's04g4/references']]);
  const out = rewriteFile('href={`${base}/references-appendix/`}', {
    fromDir: 'pages', toDir: 'pages', pathMap: new Map(), slug: 's04g4', routes: routeMap,
  });
  assert.equal(out, 'href={`${base}/references-appendix/`}');
});

test('a plain array of route names still behaves as before (backward-compat guard)', () => {
  const out = rewriteFile('href={`${base}shared-bus-problem/`}', {
    fromDir: 'pages', toDir: 'pages', pathMap: new Map(), slug: 's04g4', routes: ['shared-bus-problem'],
  });
  assert.equal(out, 'href={`${base}s04g4/shared-bus-problem/`}');
});

test('normalizeBase strips leading and trailing slashes and treats "/" and "" as no base', () => {
  assert.equal(normalizeBase('/CSARCH2-Group-6/'), 'CSARCH2-Group-6');
  assert.equal(normalizeBase('virtual-exhibit-template'), 'virtual-exhibit-template');
  assert.equal(normalizeBase('/'), '');
  assert.equal(normalizeBase(''), '');
  assert.equal(normalizeBase(undefined), '');
});

test('a bare root link to the source base is rewritten, not only paths under it', () => {
  // Regression: the sourceBase pass required a trailing slash, so
  // <a href="/CSARCH2-Group-7"> was silently missed and shipped a 404.
  const opts = {
    fromDir: 'pages', toDir: 'pages', pathMap: new Map(),
    slug: 's05g7', routes: new Map(), publicAssets: new Map(),
    sourceBase: 'CSARCH2-Group-7',
  };
  assert.equal(
    rewriteFile('<a href="/CSARCH2-Group-7">home</a>', opts),
    '<a href="/s05g7">home</a>',
  );
  // paths under the base still work
  assert.equal(
    rewriteFile('<img src="/CSARCH2-Group-7/logo.png">', opts),
    '<img src="/s05g7/logo.png">',
  );
  // a longer base that merely starts with it must NOT match
  assert.equal(
    rewriteFile('<a href="/CSARCH2-Group-77">x</a>', opts),
    '<a href="/CSARCH2-Group-77">x</a>',
  );
});

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

test('an umbrella base with a leading slash is normalized, not doubled', () => {
  const out = rewriteFile('<img src="/Clock.png">', {
    slug: 's40g1',
    publicAssets: ['Clock.png'],
    umbrellaBase: '/csarch2',
  });
  assert.equal(out, '<img src="/csarch2/s40g1/Clock.png">');
  assert.doesNotMatch(out, /\/\//, 'emitted a protocol-relative URL');
});

test('an umbrella base with a trailing slash is normalized, not doubled', () => {
  const out = rewriteFile('<img src="/Clock.png">', {
    slug: 's40g1',
    publicAssets: ['Clock.png'],
    umbrellaBase: 'csarch2/',
  });
  assert.equal(out, '<img src="/csarch2/s40g1/Clock.png">');
});

test('an umbrella base with both leading and trailing slashes is normalized', () => {
  const out = rewriteFile('<img src="/Clock.png">', {
    slug: 's40g1',
    publicAssets: ['Clock.png'],
    umbrellaBase: '/csarch2/',
  });
  assert.equal(out, '<img src="/csarch2/s40g1/Clock.png">');
  assert.doesNotMatch(out, /\/\//, 'emitted a protocol-relative URL');
});
