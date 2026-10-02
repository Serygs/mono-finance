import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import './app/app-shell.css'
import { AppRouter } from './app/AppRouter'
import './components/ui/ui.css'
import './features/accounts/accounts.css'
import './features/auth/auth.css'
import './features/categories/categories.css'
import './features/dashboard/dashboard.css'
import './features/localization/language-switcher.css'
import './features/offline/offline.css'
import { registerServiceWorker } from './features/offline/service-worker-registration'
import './features/settings/settings.css'
import './features/system/system-status.css'
import './features/transactions/transactions.css'
import './styles/index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

registerServiceWorker(
  'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
)
