# FRA setup: Supabase, Discord and Cloudflare Pages

The website files are ready. Registration becomes live after these steps. You need a Supabase project and a Discord application. A bot installation is a separate feature and is not required for website login.

## 1. Create the FRA Supabase project

1. Open https://supabase.com/dashboard and choose **New project**.
2. Choose your organization and name the project **Fortnite Racing Association**.
3. Choose a region close to your drivers. Canada Central is a reasonable starting point for a Canadian community.
4. Create and save the database password privately. Review the plan/cost shown by Supabase before creating the project.
5. Wait until the project is ready.

If working with Codex, reconnect the Supabase plugin to the correct account and share the project name or project URL. Do not send a database password, Discord secret, bot token or Supabase secret/service-role key in chat. Codex can apply the included migration to the selected project.

## 2. Create the database

In the new FRA project, open **SQL Editor** → **New query**. Copy the complete contents of:

`supabase/migrations/202610120001_fra.sql`

Run it once. Then run `supabase/migrations/202610120002_access_indexes.sql` in a second query, followed by `supabase/migrations/20261012224350_fra_email_registration.sql` in a third query. Then run `supabase/migrations/20261013013150_fra_developer_roles.sql` in a fourth query. Finally run `supabase/migrations/20261013024405_fra_racing_management.sql` in a fifth query. Together they create drivers for Discord and email accounts, creators, tracks, events, event entries/results, lap submissions, country choices, computed statistics/history, admin permission checks and the driver-media, creator-media and private lap-clips storage buckets. They also support ordered creator avatars, manual display badges and named qualifying/race result sessions. They do not add sample drivers or events. Use a fresh FRA project; do not run them against another application's existing database. All five have already been applied to the owner's FRA project; do not rerun them there.

If the query fails, the transaction rolls back. Fix the reported issue before rerunning. After a successful run, do not rerun the same migration: it is a one-time schema setup, not an update script.

## 3. Create the FRA Discord application

1. Open https://discord.com/developers/applications and choose **New Application**.
2. Name it **Fortnite Racing Association** and add your FRA logo.
3. In Supabase, open **Authentication → Sign In / Providers → Discord** and copy the displayed callback URL. It has this format:

   `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

4. In Discord, open the FRA application's **OAuth2** settings. Under **Redirects**, add that exact Supabase callback URL and save.
5. Copy the Discord **Client ID** and **Client Secret** into Supabase's Discord provider settings. Enable the provider and save. Enter the secret directly in Supabase; it never goes into your repository or Cloudflare build variables.

The callback registered with Discord points to Supabase, even when testing the website on localhost. The website's return URL is configured in Supabase in the next steps.

Users will see the FRA application consent screen when they register. Supabase's Discord provider uses Discord identity/email authentication. The app does not request server administration or message-reading permissions. Website registration does not install a bot, join a server or grant a Discord server role. A future FRA bot can handle those separately with its own server-side setup.

## 4. Upload the files to GitHub

Unzip the source package. Upload the **contents** of its `fortnite-racing-association` folder to your repository root, so `package.json`, `src`, `dist`, `scripts` and `supabase` appear at the top level.

Keep `.env.example`, `.gitignore`, the lockfile and setup files. Do not upload `node_modules` or a private `.env` file. The archive excludes both.

## 5. Connect Cloudflare Pages

In Cloudflare, choose **Workers & Pages → Create → Pages → Connect to Git**, select the GitHub repository and use:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Repository root (leave blank if uploaded as above) |
| Node version environment variable | `NODE_VERSION=22` |

In the Pages environment variables add:

| Variable | Value |
| --- | --- |
| `PUBLIC_SUPABASE_URL` | Supabase project URL, e.g. `https://YOUR_PROJECT_REF.supabase.co` |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (`sb_publishable_...`) or legacy **anon** key |
| `PUBLIC_DEMO_MODE` | `false` |

Find the URL/key in your Supabase project's Connect dialog or Settings/API Keys. These two values are designed to be public. The database access rules protect writes. Never use an `sb_secret_...` or service-role key here; the build rejects them.

Deploy and copy your final `https://YOUR_SITE.pages.dev` URL. Configure production variables for the production deployment. For previews, use a separate development database or leave them unconfigured; previews connected to production share its data.

## 6. Allow the website to return from Discord

In Supabase, open **Authentication → URL Configuration**:

- **Site URL**: your final website root URL, with trailing slash, e.g. `https://YOUR_SITE.pages.dev/`.
- **Redirect URLs**: add that same exact root URL. Also add `http://localhost:4174/` if testing locally.
- If you add a custom domain, add its exact root URL and update Site URL to it.

No `#account` hash is needed in these settings. The website handles the callback at its root and then opens the appropriate page. Avoid allowing arbitrary preview domains to redirect to your production database.

In Supabase **Authentication → Sign In / Providers**, leave new-user signups enabled, enable **Email** and keep **Discord** enabled. Turn **Confirm email** off and save. Drivers can then enter an email and a password of at least eight characters, sign in immediately, and complete their driver profile. This flow needs no SMTP service. The website also provides email/password login. No password-reset email flow is included.

## 7. Register yourself and enable developer ownership

1. Open your website → **REGISTER NOW**.
2. Choose **Create account** and enter an email/password, or **Continue with Discord** and authorize the FRA application. Finish the driver profile with a name and country. Upload a profile picture if desired; the banner is optional.
3. In Supabase **Authentication → Users**, find your own user and copy its **User UID**. Match the account carefully.
4. In Supabase **SQL Editor**, replace the placeholder below with your actual User UID and run:

```sql
insert into private.developer_users(user_id)
select id from public.drivers
where id = 'YOUR_USER_UID_HERE'::uuid
  and is_registered and is_active
on conflict do nothing;
```

5. Reload the website. **Admin Panel** appears in the header (or mobile menu). Your profile has the Developer badge. The owner’s Rivers account already has this protected role; do not repeat this setup on the existing FRA project.

Only the project owner or someone with database administrator access can assign Developer ownership. Drivers cannot edit it, and the website cannot create another Developer. Open **Admin Panel → Access** to make other active, registered drivers admins or remove their admin access. Inactive drivers must first be activated under **Drivers**. The Developer cannot be demoted from the website. Admins can manage racing content and driver profiles, but cannot appoint other admins.

For emergency admin removal outside the site, the project owner can run:

```sql
delete from private.admin_users
where user_id = 'USER_UID_TO_REMOVE'::uuid;
```

The role takes effect at the database immediately; reload the website to update visible controls. Admins use the same email/password or Discord sign-in as drivers. An existing Discord driver can set a password from **My profile → Email sign-in** to use their current account's email without creating another profile.

## 8. Build the real calendar

1. In the Admin Panel, add **Creators**.
2. Add **Tracks** under each creator with the real map code, release date, hero image URL, description, supported weather and car classes.
3. Choose whether the track offers tires. If enabled, tick one or more of Ultrasoft, Soft, Medium, Hard, Ultrahard, Intermediate and Wet.
4. Add an event and select a track from the list. Set the date, qualifying/race times, lap count and registration status.
5. After a race, use Events → Results to enter named qualifying lobbies and race sessions in the tables, then mark the event completed. Qualifying lobbies sort by lap time; race rows are finishing order. Their stats/history and earned Event Winner/Event Pole badges update automatically. Current approved overall track record holders receive the Lap Record badge.
6. Review video clips under **Submissions** before approving or rejecting laps. A rejection requires a note.

Drivers register themselves using email/password or Discord. In the Admin Panel you can edit their profile information and set them inactive. Inactive drivers retain past results but cannot enter events or submit laps. Authentication accounts are managed separately in Supabase; the website intentionally does not delete accounts/history. Creator order/avatars are managed under Creators; manual display badges under Drivers → Badges. See RACING-UPDATE.md for the full workflow.

## 9. Verify before opening registration to everyone

Use your admin account and a separate ordinary email account:

- Complete the second driver's profile with a country chosen by typing into the dropdown. Check avatar/banner uploads.
- Confirm the ordinary driver cannot open the Admin Panel or edit another driver.
- Create a track with tires and enter an upcoming event from the second account. Check its entry appears on the profile.
- Submit a lap with a video link, then check a private device clip upload (MP4/WebM/MOV up to 50 MB). Check it stays off the public leaderboard until an admin approves it.
- Approve it and confirm the leaderboard, track lap record and driver lap-record count update.
- Complete an event and add results. Check entered/won/podium counts and scrollable event history.
- Sign out and verify public profiles, approved laps, tracks and events remain visible.
- Sign back in with that email/password and verify the same profile and history return. Also check Discord login still works for the existing Discord driver.

Automated database access tests are included (`npm ci`, then `npm test`). They run locally without connecting to your project. Live Discord authorization, storage upload behavior and Cloudflare deployment need this final account-based check.

## Troubleshooting

- **Discord redirect error**: Discord's redirect must be the Supabase `/auth/v1/callback` URL; Supabase's allowed redirect must be your website root URL, including its trailing slash.
- **Email account awaits confirmation**: disable **Confirm email** in Supabase Authentication → Sign In / Providers. If a test account was created before switching it off, that account may still need confirmation in Supabase; new signups use the new setting.
- **Login returns without signing in**: use the same browser throughout the flow. A PKCE verifier is stored by that browser. Start a fresh sign-in if the callback link is old or already used.
- **Paddock temporarily unavailable**: check the migration ran, the project is awake, and Cloudflare's URL/key point to that same project. Check browser console/network errors for the detailed connection error.
- **Admin Panel missing**: check your UID in `private.admin_users` or `private.developer_users`, then reload. Editing profile metadata cannot grant admin access.
- **Image upload rejected**: use PNG/JPEG/WebP under 5 MB and check the `driver-media` bucket and its policies exist.
- **Country rejected**: choose a complete country name or its two-letter code from the supplied country list.
- **A track cannot be removed**: it is referenced by lap submissions or events. Edit it to preserve those records.
- **A driver name already exists**: choose a different name; names are unique without regard to case.

## Official references

- [Supabase: email/password authentication](https://supabase.com/docs/guides/auth/passwords)
- [Supabase: Discord sign-in](https://supabase.com/docs/guides/auth/social-login/auth-discord)
- [Supabase: redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase: database access policies](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: storage access policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Discord: OAuth2 and separate bot authorization](https://docs.discord.com/developers/topics/oauth2)
- [Cloudflare Pages: static deployment](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)
