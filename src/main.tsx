import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AppRouter } from './app/AppRouter'
import { registerServiceWorker } from './features/offline/service-worker-registration'
import './styles/index.css'
import './styles/design-system.css'
import './styles/screen-layouts.css'
import './styles/overview.css'

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
