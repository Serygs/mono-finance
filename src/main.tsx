import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import './styles/index.css'
import './components/ui/ui.css'
import './app/app-shell.css'
import { AppRouter } from './app/AppRouter'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { MotionProvider } from './components/ui/MotionProvider'
import { LocalizationProvider } from './features/localization/localization'
import './features/accounts/accounts.css'
import './features/auth/auth.css'
import './features/categories/categories.css'
import './features/dashboard/dashboard.css'
import './features/localization/language-switcher.css'
import './features/offline/offline.css'
import { registerServiceWorker } from './features/offline/service-worker-registration'
import { serviceWorkerUpdates } from './features/offline/service-worker-updates'
import './features/settings/settings.css'
import './features/system/system-status.css'
import './features/transactions/transactions.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
})

queryClient.getMutationCache().subscribe(() => {
  serviceWorkerUpdates.setPendingMutations(queryClient.isMutating() > 0)
})

const updateConnectivity = () =>
  serviceWorkerUpdates.setOnline(navigator.onLine)
updateConnectivity()
window.addEventListener('online', updateConnectivity)
window.addEventListener('offline', updateConnectivity)

createRoot(document.getElementById('root')!, {
  onCaughtError: () => console.error('Application render failed.'),
}).render(
  <StrictMode>
    <LocalizationProvider>
      <AppErrorBoundary>
        <MotionProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <AppRouter />
            </BrowserRouter>
          </QueryClientProvider>
        </MotionProvider>
      </AppErrorBoundary>
    </LocalizationProvider>
  </StrictMode>,
)

registerServiceWorker(
  'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
)
