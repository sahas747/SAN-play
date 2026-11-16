# SAN Player: Firebase setup, deployment and testing

## 1. Firebase console (project `san-play`)
1. Build > Authentication > Sign-in method: enable **Google** and **Email/Password**. In Authentication > Settings > Authorized domains, add the exact hosting domain (for example, your GitHub Pages or custom domain). For local testing, add `localhost`.
2. Build > Firestore Database: create (production mode). Uploaded media is stored in Cloudflare R2; follow `CLOUDFLARE-R2-SETUP.md`.
3. Project settings > Your apps > Web app: copy the web config into `firebase-config.js` and confirm it belongs to the `san-play` Firebase project.

## 2. Rules and hosting
```
npm i -g firebase-tools && firebase login
firebase use san-play
firebase deploy --only firestore:rules,hosting
```

## 3. Admin setup (server-side custom claim)
1. Open the site and sign in once with the Google account you want to grant administrator access to.
2. Console > Project settings > Service accounts > Generate new private key; save as `scripts/serviceAccountKey.json` (never commit or upload it).
3. `cd scripts && npm i firebase-admin && ADMIN_EMAIL=you@example.com node set-admin.js` (PowerShell: `$env:ADMIN_EMAIL="you@example.com"; node set-admin.js`)
4. Sign out and in again. The Admin buttons appear only when the token carries `admin: true`. Rules enforce it on the server, so hiding the button is cosmetic only.

## 4. Run locally
`python3 -m http.server 5500` then open http://localhost:5500 (add `localhost` to Authorized domains).

## 5. Test checklist
- Sign in with Google on two devices/browsers: both appear under the 🔊 button.
- Play on device A; on B open 🔊 and select A: B becomes a remote (play/pause/next/seek/volume/shuffle/repeat). Select B: playback transfers; tap "Start playback" if the browser blocks autoplay.
- Close one device: it shows Offline after about 45 s.
- Create a playlist, add songs with ＋, reorder, share, open the link in a private window.
- As admin: upload an audio file and a cover; as a normal user, confirm writes to `songs` are denied.

## Streaming notes and tests
- Audio is played through one HTML5 `<audio preload="metadata">` element pointed at the Storage download URL, so the browser requests byte ranges (HTTP 206) as it buffers and seeks. The app never fetches whole files, and the service worker (`sw.js`) caches cover images only.
- **Verify Range support on your bucket** (I could not run this from here): `./scripts/check-range.sh "<audio URL>"` should print `206`, `Accept-Ranges: bytes`, `Content-Range` and an `audio/*` content type. If it does not, put an authenticated media endpoint in front of Storage.
- No-full-download check: DevTools > Network > filter Media, play and seek; requests should show 206 with partial sizes. Throttle to "Slow 3G" to see the buffering ring and the buffered bar; toggle Offline then Online to watch it resume from the same position.
- YouTube/Spotify/SoundCloud songs play in their official embedded player and are labelled "Embedded". YouTube playback supports SAN Player play/pause/seek/volume controls through the official IFrame API. Other third-party embeds remain interactive inside their own player because their APIs do not expose full remote controls.


## SAN Player app installation and mobile Google sign-in
- Deploy over HTTPS (Firebase Hosting provides HTTPS). Install support is enabled through `manifest.webmanifest` and `sw.js`. On Android/Chrome use the **Install** button or browser menu > Install app. On iPhone/iPad use Safari > Share > Add to Home Screen. Desktop Chrome/Edge also offer Install.
- In Firebase Console > Authentication > Settings > Authorized domains, add the exact domain users visit (including the custom hosting domain). Keep the Firebase `authDomain` correct for the same project.
- Google sign-in now uses browser-local persistence and attempts a popup first, falling back to redirect when the browser blocks popups. If a redirect still fails on a custom domain, follow Firebase's redirect best practices for third-party storage restrictions: https://firebase.google.com/docs/auth/web/redirect-best-practices
- For reliable mobile Google sign-in, open the site in Chrome/Safari rather than an embedded browser inside another app.
- YouTube playback uses the official IFrame Player API. SAN Player hides the embedded player's controls and uses its own controls; videos whose owners disable embedding cannot be played in an embedded player.


## Shared data and device sync
- Admin-added songs are stored in the shared Firestore `songs` collection and every open device listens for live changes. Sign in with the same Firebase account on the PC and phone to enable the shared device-control session.
- Keep both devices online and SAN Player open. Browsers may require one tap on the destination device before audio starts; this is a browser autoplay restriction.
- Firestore listeners use `onSnapshot()` so changes are delivered to connected clients as they happen. See https://firebase.google.com/docs/firestore/query-data/listen


## SAN Player roadmap – Phase 1 core playback and sync
- Sign in to the same Firebase account on both devices. Both browser tabs must remain open and online. The active device is the one that produces sound; the other device sends controls through Firestore.
- Device handoff now carries the active playback position for both native audio and YouTube IFrame playback. YouTube is controlled through the official IFrame Player API; videos whose owners disable embedding cannot be played inside SAN Player.
- Use the queue button to view, reorder, remove, clear, or add tracks to the queue. Queue updates are sent to the active device.
- Likes and listening history are read from the signed-in user's Firestore library document and synced between their devices.
- Browser autoplay restrictions may require one tap on the target device after a device handoff. This is imposed by browsers and cannot be bypassed by website code.
- Firestore session updates are sent while playback is active; do not deploy the Admin SDK service account key to GitHub Pages or any public hosting.
