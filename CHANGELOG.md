# Changelog

## v2 — Glass UI rebuild
- New single stylesheet `app.css` (Spotify-style layout, frosted glass panels, violet/blue lighting, SAN Player logo).
- Responsive: sidebar + bottom player on desktop; bottom tabs + mini player + full-screen Now Playing sheet on phones.
- Playback: uploaded MP3/WAV/OGG/M4A/AAC/FLAC and direct audio URLs use the native player; YouTube links use the official IFrame API with SAN controls; Spotify and SoundCloud links play in their official embedded players.
- Lock-screen / media-key controls (Media Session API) for audio tracks.
- Share button on every song: copies `?song=<id>` link, which plays that song on open.
- Admin dashboard (admin claim only): Add song, Bulk upload, Library (edit/delete, removes Storage files), Storage & stats.
- Install button (Android/PC) and Add to Home Screen instructions (iPhone). Service worker caches the app shell only.
- Removed from v1: device handoff, shared queue and playlists (they were not part of this rebuild). Firestore/Storage data format is unchanged, so existing songs still show.
- Play counts are recorded for signed-in listeners only (rules unchanged).

## Premium Glass build (v1)
- Refreshed the visual layer with a glassmorphism design layer.
- Admin dashboard tabs: Add song, Bulk upload, Library, Storage & stats.
- Firebase Auth, Firestore `songs` collection, Storage uploads, admin custom claims.

## v2.1 — reliability and Cloudflare R2
- Replaced Firebase Storage media uploads with a Cloudflare R2 Worker API; Firebase Auth and Firestore remain for sign-in and catalogue sync.
- Added Firebase ID-token verification and admin-only upload/delete enforcement in the Worker.
- Added Cloudflare R2 setup guide and deployment config.
- Fixed duplicate install prompt result handling.
