import { useQuery } from '@tanstack/react-query'

import { Alert, Skeleton } from '../../components/ui/Feedback'
import { PageHeader, PageSurface } from '../../components/ui/Page'
import { getOfflineStatus } from '../offline/offline-api'
import { getSystemStatus } from './system-status-api'

export function SystemStatusPage() {
  const status = useQuery({
    queryFn: getSystemStatus,
    queryKey: ['system-status'],
    staleTime: 30_000,
  })
  const offline = getOfflineStatus()

  return (
    <PageSurface className="system-status-page">
      <PageHeader
        description={
          <p>Private operational signals. No financial records appear here.</p>
        }
        eyebrow="System"
        id="system-status-title"
        title="System status"
      />
      {status.isLoading ? (
        <Skeleton label="Loading system status" lines={5} />
      ) : null}
      {status.isError ? (
        <Alert title="Status unavailable" tone="warning">
          Refresh this page after the connection is restored.
        </Alert>
      ) : null}
      {status.data === undefined ? null : (
        <dl className="system-status-grid">
          <StatusItem
            label="Frontend version"
            value={status.data.frontendVersion}
          />
          <StatusItem
            label="Worker version"
            value={status.data.workerVersion}
          />
          <StatusItem label="Database" value={status.data.database} />
          <StatusItem
            label="Monobank connectivity"
            value={status.data.monobankConnectivity}
          />
          <StatusItem
            label="Last account sync"
            value={formatTime(status.data.lastAccountSyncAt)}
          />
          <StatusItem
            label="Last transaction sync"
            value={formatTime(status.data.lastTransactionSyncAt)}
          />
          <StatusItem
            label="Local offline cache"
            value={
              offline.cachedAt === null
                ? 'No cache recorded this session'
                : `${offline.source ?? 'cached'} at ${formatMilliseconds(offline.cachedAt)}`
            }
          />
        </dl>
      )}
    </PageSurface>
  )
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function formatTime(value: number | null): string {
  return value === null
    ? 'Not available'
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(value * 1_000)
}

function formatMilliseconds(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}
