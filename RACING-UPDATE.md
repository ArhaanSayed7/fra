# FRA racing tools and motion update

This update includes the complete modern redesign plus creator ordering/avatars, Map Developer and manual badges, named qualifying/race sessions, device clip uploads, page/profile transitions, the ignition loading screen, F1-style headline sparks and the improved Prevalent wheels/lights.

## Upload to your existing repository

1. Extract **fra-racing-features-update.zip**.
2. Drag the files and folders inside the extracted folder together onto **ArhaanSayed7/fra → Add file → Upload files**. Preserve the nested folders and replace matching files. Do not upload the ZIP itself or put everything inside an extra outer folder.
3. Commit to **main**. Wait for Cloudflare Pages to finish its automatic deployment, then refresh the website without cache if needed.

All five database migrations, including the new racing tools, are already applied to your existing FRA Supabase project. The creator-avatar and private lap-clip storage buckets are ready. **Do not run SQL again.** No new environment variables, email settings or Discord configuration are needed. The frontend must still be uploaded to make these controls available on the live site.

## Track developer order and avatars

Open **Admin Panel → Creators**. Use the up/down arrows to save the public listing order. This same order appears in the track directory and creator pickers. Edit a creator to set an HTTPS avatar image URL or choose a PNG, JPEG or WebP from your device (up to 5 MB). A chosen upload replaces the URL. Leave both blank for the creator’s initials.

## Give drivers badges

Open **Admin Panel → Drivers → Badges**, or open a driver’s profile and choose **Edit badges**. Developers and Admins can award **Map Developer**, **Event Winner**, **Event Pole** and **Lap Record** display badges.

Race results and approved records also award the achievement badges automatically. Removing a manual award keeps any badge still earned through results. Manual awards affect badges; driver statistics still come from event results and actual records.

**Developer** and **Admin** badges reflect website permissions. Only Rivers’ protected Developer account can appoint/remove admins through **Access**. An ordinary admin cannot grant themselves Developer ownership or promote another admin by awarding a badge.

## Enter event results

1. Create or edit the event’s details as before.
2. Under **Admin Panel → Events**, click **Results** beside the event. You can also open **Enter results** on the event page.
3. Each named qualifying lobby has a long table. Type a registered driver’s name and their lap in **M:SS.mmm** format. Add more qualifying lobbies as needed. Drivers can appear once per lobby, and can take part in several different lobbies.
4. Race tables use row order as finishing order. Enter the total race time, gap, DNF or DNS. Use the arrows to move finishers up/down. Add separate race sessions if needed.
5. Blank rows are ignored. Add five more rows at a time. **Save all results** saves every session together; an invalid row leaves the existing results intact.
6. Mark the event **Completed** in its details to award result-based badges. Each qualifying lobby awards its fastest valid driver an Event Pole badge; equal lap times use a stable driver-ID tie break. A race-session win awards Event Winner. Profile win/podium counts count distinct events, so winning two sessions in one event still counts as one event won.

Public event pages show each named session under the Qualifying/Race toggle. Existing single-session results are preserved. Event details can now be edited without erasing session results. Profiles, event history and Discord driver embeds retain their existing summary format.

## Submit a device video

On **Submit Lap**, choose **Upload clip** and select an **MP4, WebM or MOV up to 50 MB** from your computer/gallery. Complete the setup and lap time, confirm the lap is complete, and submit for review. Use **Video link** for larger files.

The upload stays private while pending/rejected: its driver and website admins can view it. After approval, viewers can open its proof from the leaderboard using an expiring signed link. Moderators see a video player in the review dialog. An Open clip link is available if the browser cannot play a particular MOV codec. A failed lap save attempts to remove its unused uploaded clip. Submitted proof cannot be deleted by the driver through the storage API.

## Motion and car

The ignition screen has a perspective grid, a gold start-light sequence and a short reveal. Profiles rise/fade into view, and navigation uses a subtle page transition. The headline uses thin sparks following your movement instead of the earlier broad liquid highlight.

The supplied Prevalent retains its holographic body, sits slightly lower, and now has matte rubber tires, metallic spoked wheels, red sidewall accents and aligned head/tail lights. Hovering the actual car activates the headlights and gives two brief high-beam lifts, then steady dipped lights. Keyboard focus also activates lighting. Pause motion stops the hero animation and spark trail and keeps lighting steady. Reduced-motion settings also disable page/profile transitions.

## Hosting and validation

Keep build **npm run build**, output **dist**, root blank and the existing public Supabase settings. Upload **dist/_headers** as well: it permits uploaded video playback while preserving the car’s blob texture support.

All **24 automated checks pass**, covering the original permissions/auth/leaderboard rules plus session validation and atomic saves, multiple lobbies, creator ordering, manual badge permissions and private uploaded proof. The production build succeeds. Desktop and mobile previews were checked with isolated sample data. A synthetic local clip was submitted and opened in the review player without creating a real submission or uploading test media to production. The Supabase security advisor has no new warnings from this update.

Fresh installations on a different Supabase project should follow **SETUP.md** and run all five migrations in order. The existing FRA project is already updated.
