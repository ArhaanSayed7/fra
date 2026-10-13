# FRA on Cloudflare Pages

The website is already deployed at **https://fra-hub.pages.dev/** from **ArhaanSayed7/fra**. For the modern redesign update, follow **REDESIGN-UPDATE.md**. No hosting settings need changing.

For a fresh repository, extract **fra-website-cloudflare-pages.zip** and upload the contents of the inner `fortnite-racing-association` folder. Keep `package.json`, `src`, `dist` and `scripts` at the repository root. Upload folders through Finder drag-and-drop to preserve their contents.

Connect the repository to a Cloudflare **Pages** project with:

| Setting | Value |
| --- | --- |
| Production branch | main |
| Framework preset | None |
| Build command | npm run build |
| Build output directory | dist |
| Root directory | blank |
| NODE_VERSION | 22 |

Set the public Supabase build variables shown in **YOUR-FRA-SETUP.md** for Production. Keep the entire `dist` directory in Git, including `index.html`, `styles.css`, `modern.css`, `_headers` and all assets. The build regenerates `app.js` and `config.js`. Any change to build variables takes effect on the next deployment.

The existing FRA database and login settings are ready. Fresh installations on another Supabase project must follow **SETUP.md**, including all four migrations and the correct OAuth return URLs. Do not run the migrations again on the existing FRA project.

For login at a new domain, set Supabase’s Site URL and exact allowed Redirect URL to the final website root with a trailing slash. Discord’s OAuth callback remains the Supabase `/auth/v1/callback` URL. Use a separate development database for previews that need to write test data.

- Build cannot find package.json: move the inner folder contents to the repository root or set the correct Root directory.
- Old styling after deployment: verify modern.css and its index.html link were uploaded, then refresh without cache.
- Registration unavailable: verify public Supabase build variables and redeploy.
- Login returns to localhost: update Supabase Site URL and allowed Redirect URL.
- Missing car/fonts: upload the complete dist/assets folder and keep dist/_headers.

Official references: [Cloudflare Pages Git setup](https://developers.cloudflare.com/pages/get-started/git-integration/) and [build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/).
