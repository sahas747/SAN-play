# SAN Player (v2)

A Spotify-style music web app with a glass UI. Visitors can listen without logging in. Logging in with Google is only needed to save likes. Admins publish music from an in-app dashboard.

## What it does
- Home, Search, Your Library, Liked Songs, full-screen Now Playing with lyrics.
- Songs can be uploaded (MP3, WAV, OGG, M4A, AAC, FLAC; max 50 MB) or added as a direct audio URL, YouTube, Spotify or SoundCloud link.
- Every song has a Share button that creates a `?song=` link.
- Install as an app from the Install button (Android/PC) or Share → Add to Home Screen (iPhone).
- Admin dashboard: Add song, Bulk upload, Library (edit/delete), Storage & stats.

## Files
- `index.html` — app shell
- `app.css` — glass UI
- `app.js` — UI, playback, admin dashboard
- `cloud.js` — Firebase login, songs sync, uploads, likes
- `sources.js` — detects YouTube / Spotify / SoundCloud links
- `firebase-config.js` — your Firebase web config (public identifiers)
- `firestore.rules`, `storage.rules` — who can read and write
- `sw.js`, `manifest.webmanifest` — app install and offline shell
- `scripts/set-admin.js` — grants the admin claim (run once, locally)

## Run locally
`python3 -m http.server 5500`, then open http://localhost:5500 (add `localhost` to Firebase Authorized domains).

## Deploy
Follow `CLOUDFLARE-R2-SETUP.md` to connect R2, then follow `DEPLOY.md` to deploy Firebase rules and hosting and grant the admin claim.

## Limits and rules to know
- Only upload music you own or have a licence to distribute.
- YouTube audio cannot be extracted; YouTube plays only where the owner allows embedding.
- Spotify and SoundCloud embeds use their own player controls; SAN controls cannot drive them.
- Play counts are recorded for signed-in listeners only.
- Storage sizes in the dashboard are estimates. Use the Firebase console for exact usage.
