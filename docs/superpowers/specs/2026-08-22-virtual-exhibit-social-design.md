# Virtual Exhibit Social Features — Design

- **Date:** 2026-08-22
- **Status:** Approved design, pre-implementation
- **Author:** Justin Rainier Go (with Claude)
- **Supersedes nothing.** Builds on `2026-08-19-virtual-exhibit-full-merge-design.md`.

## Goal

Add likes, comments, page-visit counts, and Google SSO accounts to the merged
53-exhibit site, and move it from GitHub Pages to server-side hosting on Render,
staying portable to the university-hosted Postgres and server the course is
committed to moving to this term or next.

Two constraints hold throughout:

- **Nothing in `src/layouts/` is modified**, honoring the notice in
  `ExhibitLayout.astro`. This holds without exception.
- **No feature in this design modifies exhibit source.** The social features reach
  the exhibits entirely through post-build injection. The one exception is
  [Phase 0a](#base-path-migration), which mechanically replaces hardcoded base-path
  literals in 33 files — it changes no exhibit's content, markup, or behavior, and
  is isolated into its own phase precisely so that claim stays auditable.

## Non-goals

- Feeding likes or visits into exhibit ranking. `src/data/rankings.json` stays
  hand-curated (see [Decision 2](#decisions-locked-in)).
- Replacing or re-deriving `exhibits.votes` — historical judging data, preserved
  and renamed, never written by this feature.
- Threaded/nested comments. Flat only.
- A full analytics product. A public view counter, nothing more.
- Redesigning any exhibit's content or visuals.

## Decisions locked in

1. **Scope:** one design covering all four features; implementation phased.
2. **Likes are engagement signal only.** Rankings remain manually curated, so
   vote-integrity work (ballot-stuffing resistance, audit trails) is out of scope.
3. **Supabase is a dumb Postgres host.** No Supabase client, no Supabase Auth, no
   PostgREST, no RLS dependency, no Supabase CLI. Portability is a hard
   requirement because the university move is committed.
4. **Access is DLSU-only** via Google SSO.
5. **Rendering:** Astro stays `output: 'static'` with the Node adapter; only
   `src/pages/api/*` opts into on-demand rendering. All 53 exhibits keep
   prerendering exactly as they do today.
6. **Schema lives in the repo** as plain `.sql` migrations, not in the dashboard.
7. **Empty tables are dropped and rebuilt**; populated tables altered in place.
8. **The base path is de-hardcoded and the site moves to root (`base: '/'`)**, as
   the first step of Phase 0. See [Base path migration](#base-path-migration).

## Verified context

Established by inspecting the repo and the live database on 2026-08-22.

### Repo

- Astro 5.18.2, no adapter, default `output: 'static'`. No API routes, no
  `prerender = false`, no server-side data access anywhere.
- 53 exhibits, 1,063 built files (135 of them HTML), ~133 MB `dist/`.
- **No single insertion point exists for shared UI.** Of the 52 entry pages in
  `src/pages/`: 33 use the shared `src/layouts/ExhibitLayout.astro`, 16 ship their
  own layout under `src/components/<slug>/`, and 3 (`s02g6`, `s02g9`, `s03g4`) use
  no layout at all. The 53rd exhibit, `s02g7`, is a Next.js static export in
  `public/s02g7/` that never enters the Astro build.

### Built-output anomalies

Verified by sweeping all 135 built HTML files. Both findings constrain the
injector design directly.

- **Two files are bare fragments with no `<html>` and no `</body>`:**
  `dist/s03g4/index.html` (a layout-less MDX entry page) and
  `dist/s02g4/exhibit/index.html` (a sub-page). A naive "insert before `</body>`"
  strategy silently does nothing on these two.
- **`dist/s03g8/index.html` contains NUL bytes.** Node reads it correctly as UTF-8,
  but `grep` classifies the file as binary and skips it silently. Any shell-based
  verification of injection coverage would therefore report a false pass on this
  file. Tooling that inspects built HTML must be written in Node, not shell.
- `src/layouts/ExhibitLayout.astro` carries a "do NOT modify this file, or any of
  the files in the layouts/ directory" notice. Honored: this design modifies
  nothing in `src/layouts/`.
- `src/components/ExhibitCard.astro` is the umbrella's own component and is not on
  README §11's protected list. It may be modified.

### Database (project `nbpprysfltqhmxqmmkgh`, Postgres 17.6, ap-northeast-2)

| Table | Rows | Notes |
|---|---|---|
| `exhibits` | 53 | `section`, `group`, `title` (unique), `description`, `github_link`, `web_deployment_link`, `votes` |
| `keywords` | 120 | FK → `exhibits(id)` |
| `users` | 0 | `id`, `created_at`, `email` only |
| `likes` | 0 | Surrogate `id` PK, **no unique constraint on (user, exhibit)** |
| `comments` | 0 | Table comment reads "This is a duplicate of likes" |

- `auth.users` is **empty** — Supabase Auth was never used. Nothing to migrate.
- **RLS is enabled on all five tables with zero policies.** Via PostgREST this
  denies everything to `anon`/`authenticated`; only `service_role` passes. This
  posture is kept deliberately as a guard against a leaked anon key.
- **Migration history contains only `insert_exhibits_data` and
  `insert_keywords_data`.** All DDL was applied through the dashboard, so no
  reproducible schema definition exists. Fixing this is a precondition for the
  university move.
- All PKs are `smallint` (max 32,767). Too small for `likes`/`comments`:
  53 exhibits × ~265 students is ~14k likes before churn.
- Slugs reconcile perfectly: `lower(section) || 'g' || "group"` yields exactly the
  53 slugs in `src/data/exhibits.json`, with no drift in either direction.
- `exhibits.votes` (574 total) is the frozen Judges+Students total from
  `docs/ARCH MUSEUM RANKINGS.xlsx`. `rankings.json` was derived from it; the two
  differ only in how a 16-vote tie between `s01g8` and `s03g7` was broken. It is
  **historical data unrelated to the new likes feature** and is renamed to
  `museum_vote_total` so the two can never be confused.

## Architecture

**Astro static + Node adapter; API routes only on-demand; widget injected at
build time.**

Astro 5 permits `output: 'static'` with an adapter, with individual routes opting
into server rendering via `export const prerender = false`. Only `src/pages/api/*`
does so. Every exhibit keeps prerendering byte-identically to today, which means
53 independently-authored codebases carry zero regression risk from this work.

Shared UI reaches the exhibits through a post-build step that rewrites
`dist/**/*.html`, not through any layout edit. This is what lets the design honor
the `layouts/` prohibition while still covering `s02g7`, whose output never
passes through Astro at all.

### Alternatives rejected

- **Full SSR (`output: 'server'`).** Requires editing the protected shared layout
  plus 16 custom layouts plus 3 layout-less pages, still misses `s02g7`, and
  re-renders heavy WebGL exhibits per request for no benefit.
- **Static site + separate API origin.** Forces session cookies cross-origin
  (`SameSite=None; Secure`), which is on the wrong side of third-party-cookie
  deprecation; the `localStorage` fallback is worse for XSS. Same-origin is worth
  more than the separation.

Approach A also produces the most portable artifact: one Node process plus one
Postgres connection string — which is what a university sysadmin can actually run.
Serverless functions or Supabase Edge Functions would not port.

## Data model

Plain SQL under `db/migrations/`, applied by `db/migrate.mjs` (see
[Deployment](#deployment)). Migration `0001` both baselines the existing
dashboard-created schema and reshapes it.

### Altered in place (has data)

```sql
alter table public.exhibits add column slug text;
update public.exhibits set slug = lower(section) || 'g' || "group";
alter table public.exhibits
  alter column slug set not null,
  add constraint exhibits_slug_key unique (slug);

alter table public.exhibits rename column votes to museum_vote_total;
comment on column public.exhibits.museum_vote_total is
  'Frozen Judges+Students total from the museum judging event. Unrelated to likes.';

alter table public.keywords add column exhibit_slug text;
update public.keywords k set exhibit_slug = e.slug
  from public.exhibits e where e.id = k.exhibit_id;
alter table public.keywords
  alter column exhibit_slug set not null,
  drop constraint keyword_exhibit_id_fkey,
  drop column exhibit_id,
  add constraint keywords_exhibit_slug_fkey
    foreign key (exhibit_slug) references public.exhibits(slug) on update cascade;
create index on public.keywords (exhibit_slug);
```

### Dropped and rebuilt (all empty)

```sql
drop table if exists public.likes, public.comments, public.users cascade;

create table public.users (
  id           bigint      generated always as identity primary key,
  google_sub   text        not null unique,
  email        text        not null unique,
  name         text        not null,
  avatar_url   text,
  role         text        not null default 'student'
                 check (role in ('student','instructor')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.sessions (
  token_hash bytea       primary key,
  user_id    bigint      not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index on public.sessions (expires_at);

create table public.likes (
  user_id      bigint      not null references public.users(id) on delete cascade,
  exhibit_slug text        not null references public.exhibits(slug) on update cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, exhibit_slug)
);
create index on public.likes (exhibit_slug);

create table public.comments (
  id           bigint      generated always as identity primary key,
  exhibit_slug text        not null references public.exhibits(slug) on update cascade,
  user_id      bigint      not null references public.users(id) on delete cascade,
  body         text        not null check (length(btrim(body)) between 1 and 2000),
  created_at   timestamptz not null default now(),
  edited_at    timestamptz,
  deleted_at   timestamptz,
  hidden_at    timestamptz,
  hidden_by    bigint references public.users(id) on delete set null
);
create index on public.comments (exhibit_slug, created_at desc);

create table public.view_events (
  exhibit_slug text  not null references public.exhibits(slug) on update cascade,
  visitor_hash bytea not null,
  day          date  not null,
  primary key (exhibit_slug, visitor_hash, day)
);

create table public.exhibit_view_counts (
  exhibit_slug text   primary key references public.exhibits(slug) on update cascade,
  count        bigint not null default 0
);

create view public.exhibit_stats as
select e.slug,
       coalesce(v.count, 0) as view_count,
       (select count(*) from public.likes l
         where l.exhibit_slug = e.slug) as like_count,
       (select count(*) from public.comments c
         where c.exhibit_slug = e.slug
           and c.deleted_at is null and c.hidden_at is null) as comment_count
from public.exhibits e
left join public.exhibit_view_counts v on v.exhibit_slug = e.slug;
```

RLS is enabled on every new table with no policies, matching the existing posture.
The application connects as an owner role and bypasses it; the setting exists so a
leaked anon key still exposes nothing.

### Rationale

- **Identity keys on `google_sub`, not email.** Institutional addresses get
  reassigned between students; the Google subject id does not.
- **Sessions store `sha256(token)`, not the token.** A database leak then does not
  hand over live sessions.
- **`likes` has no surrogate key.** The composite PK makes liking idempotent by
  construction — a double-click or a retry converges instead of duplicating.
- **Every exhibit reference is by `slug`.** Slug is what the routes,
  `exhibits.json`, and the injected widget already speak, so handlers insert
  straight from the request with no lookup, and tables stay readable when
  debugging by hand.
- **Views need both tables.** `view_events` provides daily-unique deduplication;
  `exhibit_view_counts` holds the permanent total. Without the second, retention
  pruning and accurate lifetime counts are mutually exclusive. A view does
  `insert … on conflict do nothing`, and the counter increments only when a row
  actually inserted.
- **Likes and comments are counted by aggregate, not denormalized.** At this scale
  that is nowhere near needing optimization.
- `visitor_hash` is `sha256(ip ‖ user_agent ‖ VIEW_SALT ‖ date)`. The date makes
  the salt rotate daily, so visitors cannot be correlated across days and the
  value cannot be reversed to an IP.
- **`exhibits.json` remains the single source of truth** per README §10. The
  database `exhibits` row set is a synced projection; slugs are validated at the
  API boundary with the foreign key as backstop.

## Authentication

Google OAuth 2.0 authorization-code flow with PKCE, run entirely server-side.
`arctic` handles protocol mechanics; sessions are hand-rolled against the
`sessions` table. No Supabase Auth, no Auth.js adapters.

**The OAuth consent screen is configured as Internal** within DLSU's Google
Workspace organization, so Google itself refuses non-DLSU accounts before a
request reaches the application.

### Flow

1. Widget performs a full-page navigation to
   `/api/auth/google?returnTo=<same-origin path>` — a navigation, not `fetch`,
   because OAuth requires real redirects.
2. Server generates `state` and a PKCE `code_verifier`, stores both in 10-minute
   HttpOnly cookies, validates `returnTo` is a same-origin path (open-redirect
   guard), and redirects to Google with `scope=openid email profile`,
   `code_challenge_method=S256`, `prompt=select_account`, `hd=dlsu.edu.ph`.
3. Google redirects to `/api/auth/google/callback?code=…&state=…`.
4. Server verifies `state` against the cookie, exchanges `code` + `code_verifier`
   server-to-server, then verifies the ID token: signature against Google's JWKS,
   `iss` among the two accepted values, `aud` equal to the client id, `exp`
   unexpired.
5. Access check: `hd === 'dlsu.edu.ph'` **and** `email_verified === true`, both
   read from the verified token.
6. Upsert the user on `google_sub`, refreshing `email` / `name` / `avatar_url`.
7. Mint 32 random bytes as the session token, store `sha256(token)`, set the
   cookie, redirect to `returnTo`.

### Security notes

- **The `hd` request parameter is a UX hint, not a security control.** It
  pre-filters Google's account chooser and a user can strip it. Enforcement is
  step 5, against the signature-verified ID token. With an Internal consent screen
  this is defense-in-depth; the check is implemented regardless, so the app stays
  correct if the project ever has to move out of the DLSU organization.
- Session cookie: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=30d`. `Lax` is
  correct because the OAuth callback is a top-level GET navigation — the payoff
  for choosing a same-origin architecture.
- Sessions slide: past half-life, `expires_at` is extended. Expired rows are swept
  opportunistically on login.
- Instructor role comes from the `INSTRUCTOR_EMAILS` env var, applied at upsert, so
  it survives a database rebuild and needs no SQL access. Instructors gain the
  comment hide/unhide power and nothing else.

## API surface

All under `src/pages/api/`, each with `export const prerender = false`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/auth/google` | — | Start OAuth |
| `GET` | `/api/auth/google/callback` | — | Complete sign-in |
| `POST` | `/api/auth/logout` | session | End session |
| `GET` | `/api/auth/me` | — | Current user or `null` |
| `GET` | `/api/stats` | — | Counts for all 53 exhibits |
| `GET` | `/api/exhibits/:slug` | optional | Everything the widget needs, one round trip |
| `POST` | `/api/exhibits/:slug/view` | — | Record a view (beacon) |
| `PUT` | `/api/exhibits/:slug/like` | session | Like — idempotent |
| `DELETE` | `/api/exhibits/:slug/like` | session | Unlike |
| `GET` | `/api/exhibits/:slug/comments?before=` | optional | Page older comments |
| `POST` | `/api/exhibits/:slug/comments` | session | Post a comment |
| `PATCH` | `/api/comments/:id` | owner | Edit own — sets `edited_at` |
| `DELETE` | `/api/comments/:id` | owner | Soft-delete own |
| `POST` | `/api/comments/:id/hide` | instructor | Hide |
| `DELETE` | `/api/comments/:id/hide` | instructor | Unhide |

`GET /api/exhibits/:slug` returns counts, `likedByViewer`, the first page of
comments, and viewer identity, so the widget renders from one request:

```jsonc
{ "slug": "s01g8", "viewCount": 1204, "likeCount": 37,
  "likedByViewer": true, "commentCount": 12,
  "comments": [ { "id": 91, "body": "…", "createdAt": "…", "editedAt": null,
                  "author": { "name": "…", "avatarUrl": "…" }, "isOwn": true } ],
  "hasMore": false,
  "viewer": { "name": "…", "avatarUrl": "…", "role": "student" } }
```

Soft-deleted comments are omitted entirely — with no replies, there is nothing to
orphan, so tombstones add noise for no benefit. Hidden comments are omitted for
everyone except instructors, who see them flagged so they can unhide.

### Design notes

- **Views are `POST`, deliberately.** Incrementing inside the `GET` would make a
  safe method mutate state, and every crawler, link preview, and prefetch would
  inflate counts. As a `navigator.sendBeacon` call, only real browsers count.
- **Likes are `PUT`/`DELETE`, not a toggle.** Both idempotent, so retries converge
  rather than flip.
- **CSRF:** `SameSite=Lax` already blocks cross-site mutating requests from
  carrying the cookie. Every mutating handler additionally checks `Origin` against
  `PUBLIC_SITE_ORIGIN`.
- **Rate limits** (in-memory token buckets): comments 1 per 10s and 20/hour per
  user; likes 30/min per user; views capped per visitor hash. *Known limitation:*
  in-memory state is per-process, so running more than one instance makes limits
  per-instance. A single instance is correct at this scale; moving buckets to
  Postgres later is contained to `http.ts`.
- **Caching:** `/api/stats` is `public, max-age=30` — gallery counts need not be
  to-the-second, and this keeps the homepage cheap during a judging rush.
  `/api/exhibits/:slug` is `private, no-store` because `likedByViewer` is
  viewer-specific.
- Errors are uniform `{ "error": { "code", "message" } }` with real statuses: 401
  unauthenticated, 403 forbidden, 404 unknown slug, 422 validation, 429
  rate-limited.

### Module layout

```
src/lib/server/
  db.ts            postgres.js client; the ONLY file aware of the connection string
  session.ts       createSession / readSession / destroySession / requireUser
  google.ts        auth URL, token exchange, ID-token verification, hd check
  http.ts          json(), fail(), requireOrigin(), rateLimit()
  repo/
    exhibits.ts    stats queries
    likes.ts       like / unlike / count
    comments.ts    CRUD + visibility rules
    views.ts       record + count
src/pages/api/…    thin handlers: parse → authorize → call repo → serialize
```

Route handlers contain no SQL and no connection awareness; `repo/` contains no HTTP
awareness. Moving to the university Postgres touches exactly one file — `db.ts` —
and in practice only one environment variable.

## Widget and build-time injection

### Exhibit pages

`tools/inject-social.mjs` runs after `astro build`
(`"build": "astro build && node tools/inject-social.mjs"`). It walks
`dist/**/*.html`, derives the slug from the first path segment, and injects before
`</body>`:

```html
<exhibit-social slug="s01g8"></exhibit-social>
<script type="module" src="/exhibit-social.<hash>.js"></script>
```

(Shown at `base: '/'` per Phase 0a. The injector reads the base from the Astro
config rather than hardcoding it, so the emitted `src` follows any future base.)

| Path in `dist/` | Slug | Note |
|---|---|---|
| `s01g8/index.html` | `s01g8` | Exhibit entry |
| `s01g8/03-before-gpus/index.html` | `s01g8` | Sub-page → parent exhibit |
| `s02g7/…/index.html` | `s02g7` | The Next.js export is covered |
| `index.html` | — | Homepage; different script |
| anything else | — | Skipped |

Slugs are validated against `exhibits.json`, so a stray directory cannot produce a
bogus widget. Injection is idempotent via a marker comment. The script filename
carries a content hash for cache invalidation, and the base path is read from the
Astro config rather than hardcoded, so it survives a future base-path change.

### Insertion rule

Insertion point is chosen per file, in this order:

1. Immediately before the **last** `</body>` if present.
2. Otherwise **append at end of file**.

The fallback is not defensive padding — it is required by two files that exist
today. `dist/s03g4/index.html` and `dist/s02g4/exhibit/index.html` are bare
fragments with no `<html>` and no `</body>` (see
[Built-output anomalies](#built-output-anomalies)), so rule 1 alone would skip
them silently. Appending is safe for fragments: browsers hoist a trailing custom
element and `<script>` into the implied body during tag-soup recovery, and the
widget is fixed-position so it does not disturb surrounding content either way.

All file reads and writes are UTF-8 via Node's `fs`. **No part of this tooling may
use `grep` or other shell text utilities on built HTML**, because
`dist/s03g8/index.html` contains NUL bytes and would be silently skipped as binary.

Sub-pages resolving to the parent exhibit is intended: likes and comments belong to
the exhibit, not to page 3 of it. Combined with the `(slug, visitor_hash, day)` key,
someone reading five sub-pages of `s01g8` counts as one visit that day.

### The widget

A vanilla custom element using **Shadow DOM**. No framework.

- **Style isolation is mandatory, not cosmetic.** One shared UI is dropped into 53
  independently-authored global CSS regimes — aggressive resets, scoped Tailwind,
  full-page custom themes. Shadow DOM guarantees neither side can damage the other.
- **No framework, because the pages already carry too much.** Several exhibits ship
  React 18, three.js, Photo Sphere Viewer, Leaflet. Vanilla + Shadow DOM lands
  around 10–15 KB, loaded `type="module"` so it never blocks render.
- **Presentation: a floating action bar, bottom-right.** Collapsed it shows
  view/like/comment counts; clicking expands the thread panel. This is the only
  placement that works across the whole corpus — inline bottom-of-`<body>` content
  sits below the fold on long MDX articles and breaks on full-screen WebGL and
  panorama exhibits. Fixed positioning also guarantees **zero layout shift**.
- Signed out → counts render read-only with a "Sign in with DLSU account"
  affordance. API unreachable → the widget removes itself rather than showing a
  broken box on someone's exhibit. On mount it fires the view beacon once.
- Honors `prefers-reduced-motion` and `prefers-color-scheme`.

### Homepage

The gallery gets a real Astro integration instead. `src/components/ExhibitCard.astro`
gains a `data-exhibit-slug` attribute and count placeholders; the injector adds only
a small `gallery-stats.js` to `dist/index.html`, which performs one `GET /api/stats`
and fills all 53 cards.

The homepage script arrives by injection specifically so that
`src/layouts/HomepageLayout.astro` is not modified — the `layouts/` prohibition is
respected end to end, as is every exhibit's own source.

### Known cost

Build-time HTML rewriting is machinery, and machinery must be maintained. If an
exhibit were ever served by a path that skips the injector, it would silently lose
its widget — which is why the `verify-site.mjs` assertion below matters more than it
appears. The alternative was editing a protected layout plus 16 custom ones plus three
layout-less pages while still missing `s02g7`.

## Deployment

`@astrojs/node` in **standalone** mode, deployed as a Render **Web Service**.
Build `npm ci && npm run build`; start `node ./dist/server/entry.mjs`; Node version
pinned via `.node-version`. Migrations run as Render's pre-deploy command:
`node db/migrate.mjs`.

`db/migrate.mjs` is ~60 lines — reads `db/migrations/*.sql` in filename order,
records applied versions in `schema_migrations`, wraps each in a transaction. No
migration framework, so it runs identically against the university's Postgres.

### Operational risks

- **Supabase direct connections are IPv6-only** without the IPv4 add-on, and
  `db.nbpprysfltqhmxqmmkgh.supabase.co` is a direct host. Connect instead through
  the **Supavisor pooler in session mode**
  (`aws-0-ap-northeast-2.pooler.supabase.com:5432`), which is IPv4 and behaves like
  an ordinary Postgres connection. Avoid transaction mode (port 6543): it disables
  prepared statements, which `postgres.js` uses by default, and would mean tuning
  for a constraint that disappears on the university box.
- **Render free-tier web services spin down after ~15 minutes idle**, with a cold
  start of tens of seconds. Budget for a paid instance at least across the judging
  window.
- Set `Cache-Control: public, max-age=31536000, immutable` on `/_astro/*`. Those
  filenames are content-hashed, and it is what keeps a Node process serving ~133 MB
  of media from feeling like one.

### Environment variables

```
DATABASE_URL          # pooler now, university Postgres later — the only thing that changes
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
VIEW_SALT             # secret input to visitor_hash
INSTRUCTOR_EMAILS     # comma-separated
PUBLIC_SITE_ORIGIN    # Origin checks + OAuth redirect construction
```

Committed to `.env.example` by name with empty values. Real values live in `.env`
locally (already gitignored) and Render's environment settings.

**Redirect URIs** must be registered in Google Cloud Console per environment, with
exact matching — no wildcards. Because Phase 0a moves the site to `base: '/'`, the
callback path is `/api/auth/google/callback`, giving:

```
http://localhost:4321/api/auth/google/callback
https://<render-service>.onrender.com/api/auth/google/callback
```

The university host is added when known. Registering these only after Phase 0a
lands is the reason that phase runs first.

## Base path migration

Runs first, inside Phase 0, because the OAuth callback path inherits Astro's
`base` and must be settled before production redirect URIs are registered.

**Target: `base: '/'`.** On GitHub Pages the base was forced by project-page
routing. Nothing on Render forces it, and with a base set, `https://<host>/` has
no page and 404s — every visitor arriving at the bare domain gets nothing without
a redirect shim.

The durable goal is not the value but the **removability of the hardcoding**. The
university move will raise this a third time; once every reference goes through
`import.meta.env.BASE_URL`, any future base is a one-line config change.

### Scope, measured

**109 real base-path occurrences across 33 files.**

| Form | Count | Fix |
|---|---|---|
| Bare string literals in JS/JSX (asset maps) | 91 | Prefix with `import.meta.env.BASE_URL` |
| `href=` / `src=` attributes | 25 | Same |
| Markdown links in MDX | 15 | Same |
| `url()` in CSS | 3 | Separate mechanism — see below |

Counts overlap where one line carries both an attribute and a literal; the
authoritative total is 109 occurrences over 33 files.

### The trap: 25 occurrences must NOT be rewritten

A further 25 matches of the string `virtual-exhibit-template` are inside
`https://…` URLs pointing at **other students' repositories and GitHub Pages
deployments** — for example `https://dmdlsu.github.io/virtual-exhibit-template/`.
Every match in `src/data/exhibits.json` is of this kind, so that file must not be
touched at all.

A blind `sed -i 's|/virtual-exhibit-template||g'` therefore corrupts 25 working
external links into broken relative paths, and **nothing in the build would
report it**. The rewrite must skip any match preceded by a scheme and host.

### CSS is the one awkward case

`src/styles/s03g2/theme.css` and `src/styles/s04g3/exhibit-theme.css` reference the
base inside `url()`. Plain CSS has no build-time env access, so these cannot use
`import.meta.env.BASE_URL`. Fix by having the owning Astro component set a CSS
custom property (e.g. `--base-url`) that the rule consumes, or by moving those
specific declarations inline.

### s02g7 must be rebuilt, not rewritten

`public/s02g7/` is a Next.js static export with
`basePath: '/virtual-exhibit-template/s02g7'` baked into chunk filenames and JSON
payloads — 99 of its 141 files contain the literal. It must be rebuilt with the new
`basePath` and re-committed. Source is re-clonable from
`https://github.com/JoseBryanPerez/CSARCH2_Group_7`, so the gitignored working copy
in `.integration-src/` is not a single point of failure.

### Verification

- Extend `tools/verify-site.mjs` with a Node link-checker over `dist/` asserting
  every internal `href`/`src` resolves to a file that exists. Worth keeping
  permanently — it would have caught the dead links repaired in `ce77b5e`.
- Assert zero remaining bare `/virtual-exhibit-template` occurrences in `src/`,
  while confirming the 25 external URLs are still intact.
- Per [Built-output anomalies](#built-output-anomalies), this checker must be Node,
  not shell.

## Phasing

Each phase is independently deployable and independently useful.

| Phase | Ships | Rationale |
|---|---|---|
| **0a — Base path** | De-hardcode 109 occurrences, fix the 2 CSS files, rebuild `s02g7`, set `base: '/'`, add the link-checker. | Must precede OAuth redirect URI registration, and is the only step that touches exhibit source — kept isolated so a regression is unambiguous. |
| **0b — Foundation** | Node adapter, `/api/health`, `db.ts`, migration runner, migration `0001`. No user-visible change. | Retires the largest risk: proving the static→SSR hosting swap renders all 53 exhibits identically, with no other variable in flight. |
| **1 — View counts** | `view_events`, view beacon, `/api/stats`, the injector, widget showing views only, homepage card counts. | Proves the novel machinery — injection across all four path shapes including `s02g7` — using the one feature needing no auth. |
| **2 — Auth** | Google OAuth, sessions, `/api/auth/*`, sign-in/out in the widget. | Lands against a widget that already works. |
| **3 — Likes** | `likes`, `PUT`/`DELETE`, heart in the widget. | Small once 1 and 2 exist. |
| **4 — Comments** | Comments CRUD, edit/soft-delete, instructor hide, thread panel. | Largest UI surface, and the requirements most likely to shift once people use it. |

Phase 0 deliberately ships nothing visible. If a static-to-SSR migration is going to
break one of 53 independently-authored exhibits, that should surface while it is the
only thing that changed.

## Testing

Extends the existing `node --test tools/test/*.mjs` pattern. Built test-first — the
authorization rules and visibility matrix are exactly where tests written afterward
tend to merely confirm whatever the code already does.

- **Unit** — slug derivation across all four path shapes, injection idempotency,
  ID-token verification including the `hd` rejection path, rate-limit buckets.
- **Injector edge cases**, each pinned to a real file in the corpus so a
  regression is caught rather than theorised:
  - a fragment with no `</body>` is still injected (fixtures modelled on
    `dist/s03g4/index.html` and `dist/s02g4/exhibit/index.html`);
  - a file containing NUL bytes is read, injected, and written back with the NULs
    intact (fixture modelled on `dist/s03g8/index.html`);
  - a document with more than one `</body>` in its text injects at the last one;
  - a fixture resembling `s02g7`'s Next.js output is injected correctly.
- **Repo layer**, against a real Postgres (Supabase branch or local Docker), since
  the interesting logic is in SQL: like idempotency under concurrent double-click,
  view dedup across sub-pages and across a day boundary, comment visibility for
  author / other student / instructor.
- **Endpoint** — auth-required routes reject anonymous; owner-only routes reject
  non-owners; instructor-only routes reject students.
- **Build gate** — `tools/verify-site.mjs` extended to assert every `live` and
  `external` exhibit's built `index.html` contains the widget marker, so a future
  exhibit import that changes output shape fails the build rather than silently
  losing its widget.

## Open items

All items from the initial draft are resolved: the `.env` key is renamed, the
Workspace domain is confirmed, and the base path is settled as Phase 0a above.

- **Render service name: `csarch2-virtual-exhibits`.** Fixes production
  `PUBLIC_SITE_ORIGIN` (`https://csarch2-virtual-exhibits.onrender.com`) and the
  second OAuth redirect URI
  (`https://csarch2-virtual-exhibits.onrender.com/api/auth/google/callback`). If
  the name is unavailable when the Render service is actually created, both
  values change to match whatever subdomain Render assigns instead.

Remaining, to confirm during implementation:

- Whether a paid Render instance is provisioned before judging, per the cold-start
  risk in [Operational risks](#operational-risks).
