# Your FRA project: next steps

The database is already installed in **Fortnite Racing Association**. Both included migrations have been applied; you do not need to run them again.

Project dashboard: https://supabase.com/dashboard/project/jvarfwhhfpytpskghuky

## Discord login is connected

The FRA Discord application is already enabled in Supabase. Rivers has completed Discord registration and has website admin access. The OAuth redirect remains:

`https://jvarfwhhfpytpskghuky.supabase.co/auth/v1/callback`

Keep the OAuth Client Secret in Supabase. This website-only package does not need a Bot Token.

## Cloudflare Pages values

Upload this folder's contents to your GitHub repository root. Connect that repository to Cloudflare Pages with **Build command: npm run build**, **Output: dist**, and these build variables:

```text
NODE_VERSION=22
PUBLIC_SUPABASE_URL=https://jvarfwhhfpytpskghuky.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_nJYrdAem-_vTeHQ5BuQtcQ_x_cWQsQV
PUBLIC_DEMO_MODE=false
```

The URL and publishable key are public website settings. The included compiled site already uses these values. Cloudflare needs the same variables to preserve that connection when it builds from source.

## Allow return URLs

After Pages gives you a website URL, open Supabase → Authentication → URL Configuration. Set Site URL to the final website root with a trailing slash. Add the same exact root under Redirect URLs. For a local test also add **http://localhost:4174/**.

Discord's redirect stays the Supabase callback above. Supabase's return URL points to your website.

## Website administrator

Rivers is already an administrator. Sign in through Discord and open Race control. Website admin membership is stored in the database; it is separate from Discord server permissions. No admin role is assigned automatically to new registrations.

## Current verification

The production build and database permission tests pass. Public database queries work. Driver stats and event-history popups have been checked in a separate local design preview. Real Discord registration is verified for Rivers. Authenticated image uploads and event/lap UI actions still need their account-based smoke test. Supabase advisors have no security warnings; the private admin-role table deliberately has no client access policies.

See **SETUP.md** for the full walkthrough and troubleshooting.
