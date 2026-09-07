import { MonobankApiError } from './errors'

export const MONOBANK_MINIMUM_REQUEST_INTERVAL_SECONDS = 60

export interface MonobankRequestGate {
  acquire(scope: string, minimumIntervalSeconds: number): Promise<void>
  defer(scope: string, retryAfterSeconds: number): Promise<void>
}

export interface MonobankRateLimitReservation {
  acquired: boolean
  nextAllowedAtEpochSeconds: number
}

export interface MonobankRateLimitStore {
  reserve(
    scope: string,
    nowEpochSeconds: number,
    minimumIntervalSeconds: number,
  ): Promise<MonobankRateLimitReservation>
  defer(scope: string, nextAllowedAtEpochSeconds: number): Promise<void>
}

type EpochSecondsClock = () => number

const systemEpochSeconds: EpochSecondsClock = () =>
  Math.floor(Date.now() / 1_000)

export class PersistentMonobankRequestGate implements MonobankRequestGate {
  private readonly store: MonobankRateLimitStore
  private readonly nowEpochSeconds: EpochSecondsClock

  constructor(
    store: MonobankRateLimitStore,
    nowEpochSeconds: EpochSecondsClock = systemEpochSeconds,
  ) {
    this.store = store
    this.nowEpochSeconds = nowEpochSeconds
  }

  async acquire(scope: string, minimumIntervalSeconds: number): Promise<void> {
    const now = this.nowEpochSeconds()
    const reservation = await this.store.reserve(
      scope,
      now,
      minimumIntervalSeconds,
    )
    if (!reservation.acquired) {
      throw new MonobankApiError(
        'rate_limit',
        'A Monobank request is already rate limited.',
        {
          retryable: true,
          retryAfterSeconds: Math.max(
            1,
            reservation.nextAllowedAtEpochSeconds - now,
          ),
        },
      )
    }
  }

  async defer(scope: string, retryAfterSeconds: number): Promise<void> {
    await this.store.defer(
      scope,
      this.nowEpochSeconds() + Math.max(0, retryAfterSeconds),
    )
  }
}
