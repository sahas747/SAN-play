# SAN Player — Cloudflare R2 media setup

The app keeps Firebase Authentication and Firestore for Google sign-in, the public song catalogue, likes and play counts. **Cloudflare R2 stores the uploaded audio and cover files.** The existing glass UI is unchanged.

## 1. Create the R2 bucket

1. Open the Cloudflare dashboard → **R2 Object Storage** → Create bucket.
2. Name it exactly `san-player-media` (or update `bucket_name` in `cloudflare-worker/wrangler.toml`).
3. Open the bucket → Settings → enable public access using an `r2.dev` subdomain for initial testing, or connect a custom media domain (recommended for production).
4. Copy the public base URL. It must point directly to the bucket, for example `https://media.example.com` (no trailing slash).

## 2. Deploy the upload Worker

Install Node.js, then from this project's `cloudflare-worker` folder run:

```bash
npm install
npx wrangler login
```

Edit `wrangler.toml`:
- `FIREBASE_PROJECT_ID` must be the Firebase project ID (`san-play` for the supplied Firebase config).
- `PUBLIC_BASE_URL` must be the R2 public domain from step 1.
- `ALLOWED_ORIGIN` must be the exact website origin where SAN Player is hosted, e.g. `https://your-site.pages.dev` (no path and no trailing slash). For local testing use `http://localhost:5500`.

Then deploy:

```bash
npx wrangler deploy
```

Copy the deployed Worker URL, e.g. `https://san-player-media.your-account.workers.dev`.

## 3. Connect the website to the Worker

Open the root `r2-config.js` and paste the Worker URL:

```js
window.SAN_R2_CONFIG = {
  workerUrl: 'https://san-player-media.your-account.workers.dev'
};
```

Keep the Firebase web config in `firebase-config.js`. Do not put Cloudflare API tokens, R2 access keys, service-account JSON files, or other secrets in the website.

## 4. Firebase admin permission

The Worker checks the Firebase ID token signature and requires the `admin: true` custom claim and a verified email. Grant the claim using the existing secure local script in `scripts/` as described in `DEPLOY.md`. Never upload the service-account key to the website or GitHub.

## 5. Deploy and test

Deploy the Firebase Firestore rules and site as usual:

```bash
firebase deploy --only firestore:rules,hosting
```

Sign in using the admin account → Admin dashboard → Add song or Bulk upload. Supported audio: MP3, WAV, OGG, M4A, AAC and FLAC (up to 50 MB each). Covers: JPEG, PNG, WEBP or GIF (up to 5 MB). Published songs remain listed in Firestore; media files are stored in R2. Editing a song with a replacement file and deleting a song both attempt to remove the old R2 object.

## Security notes

- The browser sends a Firebase ID token to the Worker. The Worker validates Google's Firebase token signature, issuer, audience, expiry, verified email and admin claim before accepting uploads or deletes.
- Only the R2 bucket's public media domain serves playback files. The R2 bucket itself is not given browser write credentials.
- Restrict the Worker origin using `ALLOWED_ORIGIN`; use your exact HTTPS site origin.
- The R2 public domain must be enabled for public read access. The Worker remains the only write/delete path.
- Firebase remains responsible for the song catalogue and authentication. Continue deploying `firestore.rules`.
