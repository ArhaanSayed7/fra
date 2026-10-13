# FRA modern redesign update

The existing website is https://fra-hub.pages.dev/. Email/password and Discord registration already work. All four database migrations have been applied to the FRA project, and Rivers has protected Developer ownership. No database queries, new environment variables or Discord changes are needed for this update.

## Upload the update

1. Extract **fra-modern-redesign-update.zip**.
2. Open the extracted folder in Finder. Select the files and folders **inside it**, then drag them together onto GitHub’s **Add file → Upload files** page in **ArhaanSayed7/fra**. Preserve the nested `src`, `dist`, `licenses`, `supabase` and `tests` folders; do not flatten them or upload the ZIP itself.
3. Commit the replacements to **main**. Cloudflare Pages automatically builds and deploys the commit.
4. Wait for a successful deployment, then refresh the FRA website. If the old appearance remains, refresh without cache (**⌘⇧R** in Chrome).

The update ZIP has files at its root. `package.json` already in your repository stays at the root. The full website ZIP is also available for a complete fresh copy; upload the contents of its inner `fortnite-racing-association` folder.

## New look and navigation

True black pages, locally hosted Manrope fonts, yellow-to-orange gradients, rounded panels, cleaner tables and dropdowns, button hover highlights, and a cursor-local liquid highlight on **FIND YOUR LIMIT**. The Prevalent model remains interactive. Reduced-motion preferences and the motion pause control are respected.

**REGISTER NOW** opens account creation for unregistered visitors. Registered drivers see **MY PROFILE**, which opens their editable account. **Submit Lap** sits immediately to its left. **Admin Panel** replaces Race control, with its link in the header or mobile menu for authorized users.

The driver directory uses compact list rows with avatars, badges and statistics. Profile popups have a shorter, wider banner with a rounded outer frame; the image uses a landscape crop on desktop and adapts on mobile. The track directory shows compact cards with small image headers, map codes, release dates, supported setups and lap-record times. Full information is available under View track. Your existing pictures, banner, country, profile information and racing data are preserved.

## Give another driver admin access

1. Sign in as **Rivers** and refresh the page after deployment.
2. Open **Admin Panel → Access**.
3. Find an active registered driver and click **MAKE ADMIN**. Their profile gains the Admin badge. Use **REMOVE ADMIN** to revoke access.

Only Rivers’ protected Developer role can use these controls. Admins can manage racing content and driver profiles but cannot appoint admins or assign Developer ownership. Inactive drivers must be activated in the **Drivers** tab first. Discord server roles and website admin roles are separate.

## Badges

- **Developer**: Rivers’ protected website ownership.
- **Admin**: registered drivers granted website admin access.
- **Event Winner**: at least one race win in a completed event.
- **Event Pole**: fastest valid qualifying lap in a completed event; equal times use a stable driver-ID tie break.
- **Lap Record**: currently holds at least one approved overall track record. Pending laps do not count. Losing every record removes the badge.

These achievement badges come from actual event results and approved laps. Admins maintain those results and approve lap proof as before.

## Existing hosting settings

Build command **npm run build**, output **dist**, root directory blank. Keep the existing Production build variables:

```text
NODE_VERSION=22
PUBLIC_SUPABASE_URL=https://jvarfwhhfpytpskghuky.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_nJYrdAem-_vTeHQ5BuQtcQ_x_cWQsQV
PUBLIC_DEMO_MODE=false
```

The database migration in the ZIP is a reference for fresh installations. It is already applied to your FRA project; do not run it again. Your working login and redirect settings stay the same.

## Verification

All 19 automated checks pass, including driver permissions, developer-only admin grants/revocation, protected ownership, achievement rules, email authentication, event results, lap moderation and media ownership. The production build succeeds. Desktop and 390px mobile previews were inspected, including profile/history dialogs, compact driver lists and track cards, country search, keyboard dropdown selection, event session toggles and admin controls. Leaderboard filters use only the selected track’s available weather, cars and tires; fixed single choices and unavailable tire controls are hidden. Switching tracks clears incompatible old selections. Automated tests cover these transitions. Admin grant/revoke browser checks used an isolated local fixture, without changing real drivers’ permissions. Rivers’ live Developer role was verified separately.

After uploading, confirm the new appearance, your Developer badge and the Access tab on the live site. No real event results or lap submissions were added during testing.
