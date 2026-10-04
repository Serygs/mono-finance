import {
  serviceWorkerUpdates,
  type ServiceWorkerUpdates,
} from './service-worker-updates'

export function registerServiceWorker(
  serviceWorker: ServiceWorkerContainer | undefined,
  updates: ServiceWorkerUpdates = serviceWorkerUpdates,
): void {
  if (serviceWorker === undefined) return

  // Initial installation/claim must never reload a newly opened application.
  let controlled = serviceWorker.controller !== null
  serviceWorker.addEventListener('controllerchange', () => {
    if (controlled) updates.controllerChanged()
    controlled = true
  })

  void serviceWorker
    .register('/service-worker.js', { updateViaCache: 'none' })
    .then((registration) => {
      const inspectWaiting = () => {
        if (registration.waiting !== null && serviceWorker.controller !== null)
          updates.updateAvailable(registration.waiting)
      }
      const inspectInstalling = () => {
        const worker = registration.installing
        if (worker === null) return
        worker.addEventListener('statechange', inspectWaiting)
        inspectWaiting()
      }
      registration.addEventListener('updatefound', inspectInstalling)
      inspectWaiting()
      inspectInstalling()
      return registration.update()
    })
    .catch(() => {
      /* The online application remains usable when PWA registration fails. */
    })
}
