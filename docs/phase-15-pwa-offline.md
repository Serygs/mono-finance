# Phase 15: PWA and offline cache

Mono Finance is installable from supported browser controls on iPhone, Android, Windows, and macOS. The web manifest, Apple metadata, icon, and service worker are checked in under `public/` and are served by Vite/Cloudflare as static assets.

The service worker caches only the public application shell and static files. It explicitly bypasses `/api/*`, so sensitive API payloads are never stored in Cache Storage and offline reads cannot overwrite D1.

Dashboard analytics and paginated transaction responses use a network-first encrypted IndexedDB cache. On a successful same-origin API response, the browser encrypts the payload using AES-GCM with a non-extractable, browser-generated `CryptoKey`; cache resource keys are SHA-256 hashes rather than readable URLs. On a `fetch` network failure only, the app may display the most recent decrypted snapshot and shows the time it was saved. HTTP failures such as an expired session never fall back to cached data.

The offline session marker is encrypted with the same device-local key, which permits opening an already unlocked installed app while disconnected. It is not a replacement for server authentication: reconnect validates the normal HttpOnly session and invalidates React Query data from D1. Logout deletes the IndexedDB database and its encryption key, making previous financial snapshots unreadable. D1 remains the system of record; the cache has no mutation path and is never sent back to the Worker.

Known limitation: browser profile protection is the offline unlock boundary. A user must explicitly log out on a shared device; clearing browser site data also removes the encrypted cache and offline availability.
