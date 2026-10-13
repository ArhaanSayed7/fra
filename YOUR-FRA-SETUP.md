# FRA: email and Discord registration

The website is live at https://fra-hub.pages.dev/. Discord login and Rivers' administrator access are already connected. All three included database migrations, including email driver registration, have been applied to the FRA project. Do not run them again.

## Install this update

1. Extract `fra-email-registration-update.zip`.
2. Upload its contents into the existing **ArhaanSayed7/fra** GitHub repository, preserving the `src`, `dist`, `supabase` and `tests` folders. Replace the matching files and commit. Do not upload the ZIP itself. Cloudflare Pages builds and deploys the commit automatically.
3. Open [FRA Authentication providers](https://supabase.com/dashboard/project/jvarfwhhfpytpskghuky/auth/providers). Keep **Email** and **Discord** enabled. Switch **Confirm email** off and save. Keep new-user signups enabled.
4. Wait for the Cloudflare deployment to finish, then open the website's **Register / Log in** page. **Create account** asks for an email and a password of at least eight characters. The driver is signed in immediately and chooses their driver name and country on the profile page.

No new Cloudflare environment variables, Discord application changes, SMTP service or database queries are needed. Supabase's Confirm email setting was still on when this package was prepared; immediate signup requires step 3.

## Existing drivers

Drivers can sign in with **Email/password** or **Continue with Discord**. An existing Discord driver can open **My profile → Email sign-in** while signed in and save a password for the email shown there. They can then sign in with that email/password to the same driver profile, with the same history and permissions. They should use this option instead of creating another account. The email appears only in their own account settings, not their public driver profile.

## Existing Cloudflare settings

Build command: `npm run build`. Output directory: `dist`. Repository root: blank. Keep these existing Production build variables:

```text
NODE_VERSION=22
PUBLIC_SUPABASE_URL=https://jvarfwhhfpytpskghuky.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_nJYrdAem-_vTeHQ5BuQtcQ_x_cWQsQV
PUBLIC_DEMO_MODE=false
```

These are public website settings. Do not add a Supabase secret/service-role key, Discord Client Secret or Bot Token to the website repository.

Supabase Site URL and exact allowed Redirect URL stay `https://fra-hub.pages.dev/`. Discord's OAuth redirect stays `https://jvarfwhhfpytpskghuky.supabase.co/auth/v1/callback`. Keep `http://localhost:4174/` allowed if testing locally.

## What was checked

All 13 automated website checks pass, covering the real Supabase SDK with simulated signup/login responses, email driver creation/backfill, ownership, admin permissions, event entries/results, lap moderation and image ownership. The production build succeeds. The new login and registration forms were inspected on desktop and mobile with no browser errors. The live database supports email profiles without giving new users admin access.

No production email test account was created. A live signup check remains after turning off Confirm email and deploying the files. Test account creation, profile completion, sign-out and sign-in. No password-reset email flow is included in this simple version.

See **SETUP.md** for a fresh installation and troubleshooting.
