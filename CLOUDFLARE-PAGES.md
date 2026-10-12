# Publish the FRA website

This website-only package contains the source, logo, car model, compiled website and database reference files. Your existing FRA Supabase database and Discord website login are connected. Rivers already has website admin access. The Discord server bot can be set up separately later.

## Upload to GitHub

1. Unzip `fra-website-cloudflare-pages.zip`.
2. Open the extracted `fortnite-racing-association` folder.
3. Upload **the contents inside that folder** into your GitHub repository root, then commit them. Upload the files, rather than the ZIP itself.
4. Confirm `package.json`, `package-lock.json`, `src`, `scripts` and `dist` are at the top level. Keep the full `dist` folder, including its HTML, CSS and assets, in Git.

Only public Supabase settings are included. No private keys, OAuth Client Secrets or Bot Tokens are included.

## Create the Cloudflare Pages project

In Cloudflare → **Workers & Pages**, create a **Pages** project by connecting Git. Connect GitHub and select your FRA repository. Choose Pages rather than a Worker project.

| Setting | Value |
|---|---|
| Production branch | Your main branch, usually `main` |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Leave blank if `package.json` is at the repository root |

Cloudflare installs dependencies before running the build. Add these build environment variables for **Production** before deploying. Set the same values for Preview if using preview builds.

| Variable | Value |
|---|---|
| `NODE_VERSION` | `22` |
| `PUBLIC_SUPABASE_URL` | `https://jvarfwhhfpytpskghuky.supabase.co` |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_nJYrdAem-_vTeHQ5BuQtcQ_x_cWQsQV` |
| `PUBLIC_DEMO_MODE` | `false` |

Uploading `.env.example` alone does not configure Cloudflare's variables. If you add variables after deployment, trigger a new deployment.

Click **Save and Deploy**. Cloudflare will give you an address ending in `.pages.dev`.

## Enable Discord login on the public address

Open [FRA Supabase Authentication URL Configuration](https://supabase.com/dashboard/project/jvarfwhhfpytpskghuky/auth/url-configuration).

1. Set **Site URL** to the final Pages address, with a trailing slash, such as `https://your-fra-project.pages.dev/`.
2. Add that same exact address under **Redirect URLs**.
3. Keep `http://localhost:4174/` as an additional Redirect URL if you want local testing.
4. Save.

Discord Developer Portal's existing OAuth redirect stays:

```text
https://jvarfwhhfpytpskghuky.supabase.co/auth/v1/callback
```

No database reinstall or new Discord application is needed. If you later add a custom domain, update Supabase's Site URL and Redirect URLs to that domain.

## Check the live site

Open your Pages address and sign in with Discord as Rivers. Confirm you return to the public website and can open **Race control**. Events, tracks and drivers use the existing FRA database.

- **Build cannot find package.json:** upload the inner folder contents to the repository root, or set Root directory to the folder containing package.json.
- **Registration unavailable:** confirm both public Supabase build variables and redeploy.
- **Login returns to localhost:** update Supabase's Site URL and exact Redirect URL.
- **Missing styling, fonts or car:** commit the entire `dist/assets` folder and `dist/styles.css`.

Official references: [Cloudflare Pages Git setup](https://developers.cloudflare.com/pages/get-started/git-integration/) and [build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/).
