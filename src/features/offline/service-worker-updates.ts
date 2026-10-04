export type UpdateStatus =
  'current' | 'available' | 'waiting' | 'activating' | 'failed'

interface UpdateSnapshot {
  status: UpdateStatus
  editing: boolean
  online: boolean
}

/** Only activity flags live here. Financial drafts remain in their owning editors. */
export class ServiceWorkerUpdates {
  private snapshot: UpdateSnapshot = {
    status: 'current',
    editing: false,
    online: true,
  }
  private listeners = new Set<() => void>()
  private editors = new Set<symbol>()
  private worker: Pick<ServiceWorker, 'postMessage'> | null = null
  private pendingMutations = false
  private online = true
  private requested = false
  private activated = false
  private activating = false
  private reloading = false
  private activationTimeout: ReturnType<typeof setTimeout> | undefined
  private readonly reload: () => void

  constructor(reload: () => void) {
    this.reload = reload
  }

  getSnapshot = (): UpdateSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  blockForEditor(): () => void {
    const editor = Symbol()
    this.editors.add(editor)
    this.publish(this.snapshot.status)
    return () => {
      this.editors.delete(editor)
      this.publish(this.snapshot.status)
      this.advance()
    }
  }

  setPendingMutations(pending: boolean): void {
    this.pendingMutations = pending
    this.advance()
  }

  setOnline(online: boolean): void {
    this.online = online
    this.publish(this.snapshot.status)
    this.advance()
  }

  updateAvailable(worker: Pick<ServiceWorker, 'postMessage'>): void {
    if (this.worker === worker) return
    clearTimeout(this.activationTimeout)
    this.worker = worker
    this.activated = false
    this.activating = false
    this.requested = false
    this.publish('available')
  }

  controllerChanged(): void {
    clearTimeout(this.activationTimeout)
    this.worker = null
    this.activated = true
    this.activating = false
    // Another tab can activate the worker. This tab still requires consent.
    this.publish(this.requested ? 'waiting' : 'available')
    this.advance()
  }

  requestUpdate = (): void => {
    if (
      !this.online ||
      this.editors.size > 0 ||
      (!this.activated && this.worker === null)
    )
      return
    this.requested = true
    this.advance()
  }

  private advance(): void {
    if (!this.requested || this.reloading) return
    if (!this.online || this.editors.size > 0 || this.pendingMutations) {
      this.publish('waiting')
      return
    }
    if (this.activated) {
      this.reloading = true
      this.publish('activating')
      this.reload()
      return
    }
    if (this.activating || this.worker === null) return
    this.activating = true
    this.publish('activating')
    try {
      this.worker.postMessage({ type: 'SKIP_WAITING' })
      this.activationTimeout = setTimeout(() => this.activationFailed(), 15_000)
    } catch {
      this.activationFailed()
    }
  }

  private activationFailed(): void {
    this.activating = false
    this.requested = false
    this.publish('failed')
  }

  private publish(status: UpdateStatus): void {
    const editing = this.editors.size > 0
    if (
      this.snapshot.status === status &&
      this.snapshot.editing === editing &&
      this.snapshot.online === this.online
    )
      return
    this.snapshot = { status, editing, online: this.online }
    for (const listener of this.listeners) listener()
  }
}

export const serviceWorkerUpdates = new ServiceWorkerUpdates(() =>
  window.location.reload(),
)
