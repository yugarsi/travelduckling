# travelduckling
travelduckling


## Authentication setup

The static website uses Firebase Authentication directly from its browser modules in `firebase-auth.js`; the Firebase web configuration lives in `firebase-config.js`. That configuration is public client configuration and does not contain a service-account key. Firebase Console is configured for the `travelduckling` Google Cloud project with Email/Password sign-in and `travelduckling.com` as an authorized domain.

The login and signup pages support email/password, email verification, password reset, and safe same-origin return URLs. The home page sends a Firebase ID token as `Authorization: Bearer …` to the API. The API must verify that token before search or publish requests are accepted. Never put ride-matching or authorization decisions in browser code.

Ride publishing additionally requires the API-verified email and a server-managed Firebase custom claim named `identity_verified: true`. The website currently tells users that ID verification is a separate future step; no verification vendor or trusted claim-issuing workflow is integrated yet, so publishing will be denied until that work is completed.

For local development, serve these files from an HTTP server (ES modules do not work reliably from `file://`). On `localhost` and `127.0.0.1`, the modules connect to the Firebase Auth Emulator at port 9099 and the local API at port 8000; allow the frontend's local origin in the API's `CORS_ALLOWED_ORIGINS`. Production domains use Firebase Auth and the deployed API. The deployed API URL is configured in `index.html`.
