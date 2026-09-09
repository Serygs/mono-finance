# Phase 15: PWA and offline cache

Mono Finance is installable from supported browser controls on iPhone, Android, Windows, and macOS. The web manifest, Apple metadata, icon, and service worker are checked in under `public/` and are served by Vite/Cloudflare as static assets.

The manifest has a stable same-origin app identity and scope. iOS uses `viewport-fit=cover` with translucent standalone status-bar integration; the application shell applies `safe-area-inset-top` below the Dynamic Island/status indicators and keeps fixed navigation and offline status above `safe-area-inset-bottom` and the home indicator.

The service worker caches only the public application shell and static files. It explicitly bypasses `/api/*`, so sensitive API payloads are never stored in Cache Storage and offline reads cannot overwrite D1. The worker script bypasses the HTTP cache, checks for an update on application startup, replaces obsolete shell caches, and reloads once when a new worker takes control; this prevents an installed PWA from continuing to render an outdated HTML/CSS shell after deployment.

Dashboard analytics and paginated transaction responses use a network-first encrypted IndexedDB cache. On a successful same-origin API response, the browser encrypts the payload using AES-GCM with a non-extractable, browser-generated `CryptoKey`; cache resource keys are SHA-256 hashes rather than readable URLs. On a `fetch` network failure only, the app may display the most recent decrypted snapshot and shows the time it was saved. HTTP failures such as an expired session never fall back to cached data.

Encrypted financial snapshots are available only while a browser session that was verified by `/api/auth/session` remains open. On a refresh or a new launch, the application requires a reachable, valid server-side session before it can read cached dashboard or transaction data. This prevents a locally retained cache from becoming an offline substitute for authentication after logout, expiry, or revocation. Reconnect validates the normal HttpOnly session and invalidates React Query data from D1. Logout deletes the IndexedDB database and its encryption key, making previous financial snapshots unreadable. D1 remains the system of record; the cache has no mutation path and is never sent back to the Worker.

Known limitation: if the browser is restarted while offline, the app must wait for connectivity to verify the server session. A user must explicitly log out on a shared device; clearing browser site data also removes the encrypted cache and offline availability.
