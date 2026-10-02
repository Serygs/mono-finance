import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { getOfflineStatus, subscribeOfflineStatus } from './offline-api'
import { type Translate, useLocalization } from '../localization/localization'
import { dashboardQueryKeys } from '../dashboard/dashboard-query-keys'
import { transactionQueryKeys } from '../transactions/transaction-queries'

export function OfflineStatus() {
  const queryClient = useQueryClient()
  const { locale, t } = useLocalization()
  const status = useSyncExternalStore(
    subscribeOfflineStatus,
    getOfflineStatus,
    getOfflineStatus,
  )
  const online = useOnlineState()
  const wasOnline = useRef(online)

  useEffect(() => {
    const reconnected = online && !wasOnline.current
    wasOnline.current = online
    if (!reconnected) return
    void queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.analytics,
    })
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.recent })
    void queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all })
  }, [online, queryClient])

  if (online && status.source !== 'offline-cache') return null

  return (
    <p className="offline-status" role="status">
      {online
        ? t('Connection restored. Refreshing data from D1…')
        : t('Offline — showing encrypted data saved {date}.', {
            date: formatCachedAt(status.cachedAt, locale, t),
          })}
    </p>
  )
}

function useOnlineState(): boolean {
  const subscribe = (listener: () => void) => {
    window.addEventListener('online', listener)
    window.addEventListener('offline', listener)
    return () => {
      window.removeEventListener('online', listener)
      window.removeEventListener('offline', listener)
    }
  }
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
}

function formatCachedAt(
  cachedAt: number | null,
  locale: string,
  t: Translate,
): string {
  if (cachedAt === null) return t('before this offline session')
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(cachedAt)
}
