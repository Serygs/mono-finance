export function registerServiceWorker(
  serviceWorker: ServiceWorkerContainer | undefined,
): void {
  if (serviceWorker === undefined) return
  void serviceWorker.register('/service-worker.js')
}
