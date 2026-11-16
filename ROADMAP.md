# SAN Player – Product Roadmap

## Phase 1 – Core playback and account sync (current build)
- Shared Firestore song library with live updates.
- User-scoped Likes and listening history.
- PC / phone device handoff and remote playback controls.
- YouTube IFrame Player API transport controls where embedding is allowed.
- Shared queue with add, remove, reorder and clear.
- Responsive player, volume and full-screen controls.

## Phase 2 – Premium listening experience
- Queue persistence and richer drag-and-drop queue.
- Visualizer and audio equalizer for supported audio sources.
- Crossfade and gapless playback where browser/source support permits.
- Timed lyrics and richer Now Playing view.
- Mini-player, keyboard shortcuts and sleep timer.

## Phase 3 – Discovery and catalogue
- First-class Artist and Album records in Firestore.
- Genre and mood collections, editorial playlists and radio.
- Search filters, recommendations and recently played.
- Qualified play events and protected chart aggregation.

## Phase 4 – Community
- Shared listening rooms (SAN Jam), invite links and QR join.
- Collaborative playlists and friend activity.
- Monthly listening recap (SAN Wrapped).

## Phase 5 – Mobile app experience
- Offline downloads for content the user is authorized to download.
- Lock-screen controls and background playback where supported.
- Installable PWA improvements and notifications.

## Important limitations
- Browser autoplay restrictions can require a user gesture on the receiving device.
- YouTube videos with embedding disabled cannot be played inside SAN Player.
- Third-party Spotify/SoundCloud iframe players do not expose all transport controls to SAN Player.
- Offline audio caching, background playback and output-device switching vary by browser and operating system.
