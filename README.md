# Fortnite Racing Association

Modern black-and-yellow FRA racing hub, ready for GitHub and Cloudflare Pages, with Supabase authentication, database and profile image storage.

**Start with [YOUR-FRA-SETUP.md](YOUR-FRA-SETUP.md)** for this already-created project, or [SETUP.md](SETUP.md) for a fresh installation. The package contains the public FRA connection settings. Email/password and Discord both use Supabase Auth. Private secrets are not included.

## Included

- Floating interactive 3D Prevalent, cursor-local liquid headline highlights, gradient buttons, true black backgrounds and locally hosted Manrope fonts. Motion respects reduced-motion preferences and the pause control.
- Upcoming events, completed event archive, qualifying/race toggles and event entries.
- Compact track cards grouped by creator, with small image headers, map codes, release dates, setup summaries and approved lap-record times. Full descriptions and record details are on each track’s detail page.
- Track-specific weather, car classes and optional tires: Ultrasoft, Soft, Medium, Hard, Ultrahard, Intermediate and Wet.
- Time-trial leaderboard with track-specific filter choices. Unsupported tires and fixed single-choice weather/car filters are hidden; incompatible selections reset when switching tracks. Mandatory HTTPS video-proof links.
- Email/password or Discord registration and login, editable driver profiles, avatar and optional banner uploads, searchable country selector. Email signup signs in immediately when Supabase's Confirm email setting is off.
- Compact driver list rows and profile popups with shorter landscape banners, events entered/won/podiums, lap records and scrollable event history. Developer/Admin role badges and earned Event Winner, Event Pole and Lap Record badges.
- Admin Panel with database-controlled access, driver editing/deactivation, creator/track/event management, results and lap moderation. Only the protected Developer can grant/revoke other registered drivers’ admin access from its Access tab.

## Local development

Use Node.js 22 or later.

```sh
npm ci
cp .env.example .env
# Set your project URL and publishable key in .env
npm run build
npm run dev
```

Open http://localhost:4174. Rebuild and reload after source edits. Production builds use the same command: `npm run build`, output `dist`.

For an isolated design preview, leave the Supabase variables blank and set `PUBLIC_DEMO_MODE=true` in your local `.env`. Demo data is stored only in that browser and is never copied into your database. Account login is unavailable in demo mode. Use `PUBLIC_DEMO_MODE=false` for deployment.

## Project layout

- `src/app.js`: pages, forms and interactions.
- `src/backend.js`: Supabase authentication and database adapter.
- `src/ui.js`: accessible dropdowns, searchable suggestions and headline interaction.
- `src/leaderboard-filters.js`: catalogue-scoped filter choices and selection normalization.
- `src/driver-badges.js`: role lookup and result-based achievement rules.
- `src/countries.js`: searchable country names and codes, sourced from i18n-iso-countries.
- `src/car.js`: Three.js car animation.
- `src/data.js`: lap formatting, escaping and optional demo data.
- `dist/`: static HTML, CSS, local assets and generated bundles. Keep its HTML/CSS/assets in Git; the build updates `app.js` and `config.js`.
- `scripts/`: build and local preview server.
- `supabase/migrations/`: ordered database migrations, schema, country catalogue, access rules, functions and storage bucket.
- `tests/`: build safety and PostgreSQL tests using PGlite with mocked Supabase auth/storage schemas.

## Database behavior

An email signup or first Discord sign-in creates an incomplete driver automatically. Choosing a valid country and a driver name finishes registration. Incomplete profiles cannot enter events or submit laps. Driver names are unique without regard to case. Inactive drivers retain public history but cannot enter or submit.

For immediate email signup, enable Email and disable Confirm email in Supabase Authentication → Sign In / Providers. No SMTP setup is needed for this flow. Passwords are handled by Supabase Auth; they are never stored in driver records. Signed-in drivers with an email can set or update their password under My profile → Email sign-in. Existing Discord drivers can use this option to add email login to their current profile. This version does not include a password-reset email flow.

Drivers own their profile edits, media uploads, event entries and lap submissions. Only admins can change catalogues/results or review laps. Drivers cannot assign roles, change driver IDs, write registration timestamps, or approve their own submissions. Admins also cannot promote other users. Only a protected Developer can grant or revoke admin membership through the checked database function; Developer ownership can only be assigned by the project owner in SQL. Database policies enforce these restrictions even if someone changes the browser code.

A lap record is the fastest approved lap on a track across all setups. Equal times use submission time and ID as a stable tie-break. Time-trial rankings compare track, weather, car class, custom car name and tire compound. Each driver contributes their best approved time for each setup.

Events entered counts current event registrations, including historical result entries. Wins and podiums count only events marked completed. Event Winner badges require a completed race win; Event Pole badges require the fastest valid qualifying time in a completed event, with a stable driver-ID tie break. Lap Record badges require a current approved overall track record. Losing a record removes that badge unless the driver still holds another record. The admin event save function writes event details and classification together; invalid results roll back the entire save. Historical results automatically create matching event entries. Cancelling an upcoming entry removes it from the driver's entered count and history.

Video proof uses a link to an external video host, rather than uploading video files to Supabase. Custom car names are free-text suggestions collected from existing laps until an official list is supplied. Event sessions use America/Toronto. The site loads shared data on page load and after writes; reload to see changes made by another user.

## Checks and deployment limits

```sh
npm test
npm run build
```

Database tests exercise all four migrations, email profile creation/backfill, profile permissions, catalogue permissions, lap ownership/setup validation/moderation, event entries, transactional results/statistics and media ownership, protected developer/admin management, and earned badge rules. Auth tests use the installed Supabase SDK with simulated responses to check immediate signup, password login, errors, password updates and the confirmation-enabled fallback. These tests do not create production accounts. The included build is connected to the owner’s FRA project using its public publishable key. Set the documented Cloudflare environment variables when rebuilding.

The site is a static Cloudflare Pages deployment. Supabase handles identity, database access and uploads directly; no Cloudflare functions or private API key are required. Configure database backups and usage limits for your own project as it grows.

## Assets

The FRA logo and Prevalent model were supplied by the project owner. The circuit images are illustrative placeholders, and the map codes in demo mode are fictional. Replace them with real tracks through the Admin Panel. This is an independent community website, not an Epic Games product.

## Supabase advisor notes

The public RPC entry points use SECURITY INVOKER. Their privileged implementations live in the unexposed `private` schema, set an empty search path and check the caller's admin membership before writing. The private admin and developer role tables have RLS enabled and no browser table grants; their deliberate lack of access policies prevents direct client access. A read function exposes only the public driver ID and badge role for registered drivers. Supabase may show an informational [RLS enabled without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) notice for these tables. Do not grant clients direct access to the private tables. PostgreSQL tests verify that ordinary users cannot run the admin operations successfully.
