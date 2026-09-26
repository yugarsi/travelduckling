# travelduckling
travelduckling


## Authentication setup

The static website uses Firebase Authentication directly from its browser modules in `firebase-auth.js`; the Firebase web configuration lives in `firebase-config.js`. That configuration is public client configuration and does not contain a service-account key. Firebase Console is configured for the `travelduckling` Google Cloud project with Email/Password sign-in and `travelduckling.com` as an authorized domain.

The login and signup pages support email/password, email verification, password reset, and safe same-origin return URLs. The home page sends a Firebase ID token as `Authorization: Bearer …` to the API. The API must verify that token before search or publish requests are accepted. Never put ride-matching or authorization decisions in browser code.

Ride publishing requires a verified email and a server-managed identity-verification claim, except for any individual UID deliberately placed in the API’s private prototype bypass configuration. That exception is enforced only by the API and is not an identity verification. Do not add account authorization or ride-matching rules to browser code.

The home page can publish and search rides using the API. Successful publishing shows a confirmation with a link to `pages/my-trips.html`. Search results show driver profile summaries and can send ride requests. The signed-in My trips page shows upcoming and past rides in driver and rider roles, lets drivers respond to requests and start a trip near departure, and provides a simple first-name/about profile editor. These features require the corresponding API revision and an allowlisted Firebase account.

The home page address fields use Google Places Autocomplete (US results) when a restricted Maps browser key is configured. Current-location lookup is optional and only requests browser location permission after the user clicks the button. See [Google Maps address setup](docs/google-maps-addresses.md) for required APIs, key restrictions, local origins, pricing, quotas, and attribution.

For local development, serve these files from an HTTP server (ES modules do not work reliably from `file://`). On `localhost` and `127.0.0.1`, the modules connect to the Firebase Auth Emulator at port 9099 and the local API at port 8000; allow the frontend's local origin in the API's `CORS_ALLOWED_ORIGINS`. Production domains use Firebase Auth and the deployed API. The local and deployed API URLs are centralized in `assets/js/config.js`.


## Frontend structure

This remains a static, framework-free site. Native browser ES modules keep the GitHub Pages deployment simple while dividing behavior by feature. Page markup stays in the HTML files; styles and scripts are under `assets/`. Firebase authentication is shared through `firebase-auth.js`, and the API base URL is shared through `assets/js/config.js`. See [the frontend architecture note](docs/architecture.md).

The root `index.html` stays in place as the GitHub Pages entry page. Secondary HTML pages are in `pages/`, and brand/background artwork is in `assets/images/`.

## Journey workspace

Open `pages/journeys.html` to publish a driver offer or rider request. One way is the default; round trips link two legs and can be restricted to both-direction bookings. Frontend modules live in `assets/js/journeys/` (API, form, rendering, controller), with responsive styling in `assets/css/journeys.css`. The workspace uses the existing Firebase authentication and profile API.

Matching requires the new backend journey endpoints and a server-only Google Routes key. Earlier rides remain in the original My Trips view. No payment or reward points are collected by this flow.
