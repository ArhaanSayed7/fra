# FRA accounts, lap entry and privacy update

This update builds on the racing tools and four-track creator previews. The existing FRA Supabase project has all six migrations and the `admin-delete-driver` Edge Function deployed. No new Cloudflare variables or secrets are needed.

## Changes

- Email registration requires a username (3–32 characters) and a valid country before creating the account. Discord drivers must complete those fields in onboarding before using the website. Existing incomplete accounts also return to onboarding. Optional avatar/banner editing remains available under My profile.
- Profile usernames are synchronized to Auth's full_name/display_name metadata, including existing registered profiles, so Supabase Authentication → Users can show the FRA name. Cosmetic metadata never controls permissions.
- Admin Panel → Drivers has Delete for eligible accounts. Type the driver's exact username and confirm permanent deletion. This removes the Auth account, profile, entries, event/session results, submissions, badges and uploaded media. Remaining drivers' statistics and current lap records update automatically; finishing positions of remaining race results are retained. The Developer account and your own account are protected. Only the Developer can delete another administrator. No existing account was deleted as part of installing this update.
- Deletion blocks further writes before removing media through the Storage API and hard-deleting Auth. If cleanup fails, the account stays blocked and the dialog explains how to retry Delete. Deleted users' stale access tokens cannot write profiles, submit laps, enter events or upload media. A person may register a new account later; this is deletion rather than a permanent identity ban.
- The home headline reads HOME OF FORTNITE RACING. The submission page reads SUBMIT YOUR LAP.
- Lap time entry displays : and . automatically. Type 142381 for 1:42.381, or 1242381 for 12:42.381. Backspace, selection/replacement and pasted formatted times work. Incomplete times and invalid seconds cannot be submitted.
- Public leaderboards and track record pages no longer expose proof buttons. Both external proof URLs and uploaded object paths are stored outside public lap rows. Owners and admins can request proof through an authenticated, checked function; admin review still has its player/link. Uploaded videos remain private after approval. Previously issued signed links can remain usable until their original expiry (up to one hour); an external hosting platform controls the visibility of an externally hosted video itself.
- The driver directory now refreshes when navigated to and when its window regains focus. It previously kept data from the initial load until a local save/reload. This is refresh-on-return rather than continuous live streaming.

## Repository update

Extract `fra-accounts-privacy-update.zip` and upload its contents into the root of ArhaanSayed7/fra, preserving folders and replacing matching files. Commit to main. This keeps GitHub synchronized with the deployed website. Do not upload the ZIP as a single repository file.

For a fresh installation on a different project, follow SETUP.md and apply all six migrations in order. Then deploy the included Supabase function with JWT verification enabled:

```sh
npx supabase functions deploy admin-delete-driver --project-ref YOUR_PROJECT_REF
```

The function uses Supabase's built-in server environment. Its service-role key is never included in the frontend or repository. Deploy the function from the repository root; use the current Supabase CLI and authenticate to the intended project.

## Verification

31 automated checks pass, including required registration metadata, database display-name synchronization, proof migration/privacy, protected deletion targets, immediate/stale-token write blocking, cascading racing-data removal, numeric lap formatting and deletion error handling. Browser checks use isolated sample accounts and data. No production driver was deleted and no test password/account was created in production. The live deletion endpoint rejects unauthenticated requests. The security advisor reports no new warnings.
