export function registerServiceWorker(
  serviceWorker: ServiceWorkerContainer | undefined,
  reload: () => void = () => window.location.reload(),
): void {
  if (serviceWorker === undefined) return

  let reloading = false
  if (serviceWorker.controller !== null) {
    serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return
      reloading = true
      reload()
    })
  }

  void serviceWorker
    .register('/service-worker.js', { updateViaCache: 'none' })
    .then((registration) => registration.update())
    .catch(() => {
      /* The online application remains usable when PWA registration fails. */
    })
}
