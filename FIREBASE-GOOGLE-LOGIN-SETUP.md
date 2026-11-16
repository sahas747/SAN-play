# SAN Player – Firebase Google Login Setup

The project uses the Firebase Web SDK (modular v10.12.2) and the Firebase web configuration supplied for project `san-play`.

## 1. Enable Google provider
1. Open Firebase Console: https://console.firebase.google.com/project/san-play/authentication/providers
2. Open **Google** under Sign-in providers.
3. Enable it, select a support email, and save.

## 2. Authorize the hosting domain
1. Open Authentication → Settings → Authorized domains.
2. Add `sahas747.github.io`.
3. If you use a custom domain, add that exact hostname too (without `https://` or a path).
4. For local development, add `localhost`.

## 3. Deploy
Upload the complete contents of this folder to the GitHub Pages repository and ensure `index.html` is at the published root. Open the site over HTTPS and test **Continue with Google**.

## Login behavior
- Desktop browsers use Google popup sign-in.
- Mobile browsers and installed PWAs use redirect sign-in.
- If a desktop popup is blocked, the app falls back to redirect.
- Auth state is persisted locally and restored on refresh.

## Important
The Firebase web config (including apiKey) identifies the web app; it is not an Admin SDK credential. Keep Firestore/Storage security rules and Admin custom claims enforced. Never publish a service-account private key.

If login still fails, check the exact Firebase error shown by SAN Player. `auth/unauthorized-domain` means the current hostname is missing from Authorized domains; `auth/operation-not-allowed` means Google provider is not enabled.
