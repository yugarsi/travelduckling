# Frontend architecture

The site is served as static files from GitHub Pages. Keep the prototype dependency-light: HTML pages, page-scoped CSS, and native browser ES modules; there is no build step.

```text
index.html                         GitHub Pages entry point
pages/
  login.html
  signup.html
  my-trips.html
assets/
  css/<page>.css                   Page-specific styles
  images/                          Logos and background artwork
  js/
    config.js                      Shared API base URL
    ride-search.js                 Publish, search, and ride requests
    group-trips.js                 Group-trip prototype UI
    login.js / signup.js           Authentication page behavior
    my-trips.js                    Trip management UI
firebase-auth.js                   Shared Firebase Auth wrapper
firebase-config.js                 Firebase web-app configuration
```

When the frontend grows, keep new features in their own modules and share only small, stable helpers. Keep authorization, identity checks, ride matching, and other business rules in the API. Consider a bundler or framework only when static modules become difficult to manage or the UI needs larger shared state.

The root `index.html` stays in place as the GitHub Pages entry point. Secondary pages live in `pages/`; images live in `assets/images/`. Module imports resolve relative to their JavaScript file, and CSS image URLs resolve relative to the stylesheet. The static deploy needs no compilation step.
