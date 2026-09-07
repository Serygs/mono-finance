import { describe, expect, it, vi } from 'vitest'

import { HttpMonobankClient } from './client'
import { MonobankApiError } from './errors'
import type { MonobankRequestGate } from './rate-limit'

class RecordingRequestGate implements MonobankRequestGate {
  readonly acquiredScopes: string[] = []
  readonly deferrals: Array<{ retryAfterSeconds: number; scope: string }> = []

  acquire(scope: string): Promise<void> {
    this.acquiredScopes.push(scope)
    return Promise.resolve()
  }

  defer(scope: string, retryAfterSeconds: number): Promise<void> {
    this.deferrals.push({ scope, retryAfterSeconds })
    return Promise.resolve()
  }
}

describe('HttpMonobankClient successful requests', () => {
  it('calls a runtime fetch function without rebinding its receiver', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(function (
      this: unknown,
    ) {
      if (this !== undefined) {
        return Promise.reject(new TypeError('Illegal invocation'))
      }

      return Promise.resolve(
        Response.json({
          clientId: 'client-1',
          name: 'Owner',
          accounts: [],
        }),
      )
    })
    const client = new HttpMonobankClient({
      token: 'not-a-real-token',
      fetcher,
      requestGate: new RecordingRequestGate(),
    })

    await expect(client.getClientInfo()).resolves.toMatchObject({
      providerClientId: 'client-1',
    })
  })

  it('retrieves and maps client account information through the rate-limit gate', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        clientId: 'client-1',
        name: 'Іван Мазепа',
        webHookUrl: '',
        permissions: 'psfj',
        accounts: [
          {
            id: 'account-1',
            sendId: 'send-1',
            balance: 123_456,
            creditLimit: 50_000,
            type: 'black',
            currencyCode: 980,
            cashbackType: 'UAH',
            maskedPan: ['537541******1234'],
            iban: 'UA733220010000026201234567890',
          },
        ],
        jars: [],
        managedClients: [],
      }),
    )
    const requestGate = new RecordingRequestGate()
    const client = new HttpMonobankClient({
      token: 'not-a-real-token',
      fetcher,
      requestGate,
    })

    const result = await client.getClientInfo()

    expect(result.accounts[0]).toEqual({
      providerAccountId: 'account-1',
      providerSendId: 'send-1',
      accountType: 'black',
      currencyNumericCode: '980',
      balanceMinor: 123_456,
      creditLimitMinor: 50_000,
      cashbackType: 'UAH',
      maskedPans: ['537541******1234'],
      iban: 'UA733220010000026201234567890',
    })
    expect(requestGate.acquiredScopes).toEqual(['client-info'])

    const [request] = fetcher.mock.calls[0] ?? []
    expect(request).toBeInstanceOf(Request)
    expect((request as Request).url).toBe(
      'https://api.monobank.ua/personal/client-info',
    )
    expect((request as Request).headers.has('X-Token')).toBe(true)
  })

  it('removes invalid surrounding whitespace from a server-side token', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        clientId: 'client-1',
        name: 'Owner',
        accounts: [],
      }),
    )
    const client = new HttpMonobankClient({
      token: '\u000bvalid-token\u000b',
      fetcher,
      requestGate: new RecordingRequestGate(),
    })

    await expect(client.getClientInfo()).resolves.toMatchObject({
      providerClientId: 'client-1',
    })
    const [request] = fetcher.mock.calls[0] ?? []
    expect((request as Request).headers.get('X-Token')).toBe('valid-token')
  })

  it('retrieves and maps a bounded statement without exposing provider DTOs', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json([
        {
          id: 'transaction-1',
          time: 1_554_466_347,
          description: 'Покупка щастя',
          mcc: 7997,
          originalMcc: 7997,
          hold: false,
          amount: -95_000,
          operationAmount: -95_000,
          currencyCode: 980,
          commissionRate: 0,
          cashbackAmount: 1_900,
          balance: 10_050_000,
        },
      ]),
    )
    const requestGate = new RecordingRequestGate()
    const client = new HttpMonobankClient({
      token: 'not-a-real-token',
      fetcher,
      requestGate,
    })

    const result = await client.getStatement({
      accountId: 'account/with-special-character',
      fromEpochSeconds: 1_554_466_000,
      toEpochSeconds: 1_554_467_000,
    })

    expect(result[0]?.providerTransactionId).toBe('transaction-1')
    expect(result[0]?.accountAmountMinor).toBe(-95_000)
    expect(result[0]?.operationAmountMinor).toBe(-95_000)
    expect(requestGate.acquiredScopes).toEqual(['statement'])

    const [request] = fetcher.mock.calls[0] ?? []
    expect((request as Request).url).toBe(
      'https://api.monobank.ua/personal/statement/account%2Fwith-special-character/1554466000/1554467000',
    )
  })

  it('rejects statement periods longer than the provider maximum before making a request', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const requestGate = new RecordingRequestGate()
    const client = new HttpMonobankClient({
      token: 'not-a-real-token',
      fetcher,
      requestGate,
    })

    const result = client.getStatement({
      accountId: 'account-1',
      fromEpochSeconds: 1_000,
      toEpochSeconds: 2_683_001,
    })

    await expect(result).rejects.toMatchObject<Partial<MonobankApiError>>({
      code: 'invalid_request',
      retryable: false,
    })
    expect(fetcher).not.toHaveBeenCalled()
    expect(requestGate.acquiredScopes).toEqual([])
  })
})

describe('HttpMonobankClient error handling', () => {
  it('classifies rejected credentials without returning the provider payload', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { errorDescription: 'Sensitive upstream diagnostic' },
          { status: 403 },
        ),
      )
    const client = new HttpMonobankClient({
      token: 'not-a-real-token',
      fetcher,
      requestGate: new RecordingRequestGate(),
    })

    const result = client.getClientInfo()

    await expect(result).rejects.toMatchObject<Partial<MonobankApiError>>({
      code: 'unauthorized_token',
      retryable: false,
      status: 403,
    })
    await expect(result).rejects.not.toThrow('Sensitive upstream diagnostic')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('persists Retry-After after a remote rate-limit response', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 429,
        headers: { 'Retry-After': '120' },
      }),
    )
    const requestGate = new RecordingRequestGate()
    const client = new HttpMonobankClient({
      token: 'not-a-real-token',
      fetcher,
      requestGate,
    })

    const result = client.getClientInfo()

    await expect(result).rejects.toMatchObject<Partial<MonobankApiError>>({
      code: 'rate_limit',
      retryable: true,
      retryAfterSeconds: 120,
      status: 429,
    })
    expect(requestGate.deferrals).toEqual([
      { scope: 'client-info', retryAfterSeconds: 120 },
    ])
  })

  it('marks a remote 5xx response retryable but does not automatically repeat it', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 503 }))
    const client = new HttpMonobankClient({
      token: 'not-a-real-token',
      fetcher,
      requestGate: new RecordingRequestGate(),
    })

    const result = client.getClientInfo()

    await expect(result).rejects.toMatchObject<Partial<MonobankApiError>>({
      code: 'remote_api_error',
      retryable: true,
      status: 503,
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('rejects a malformed success payload at the provider boundary', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ clientId: 'client-1', name: 'Іван' }))
    const client = new HttpMonobankClient({
      token: 'not-a-real-token',
      fetcher,
      requestGate: new RecordingRequestGate(),
    })

    const result = client.getClientInfo()

    await expect(result).rejects.toMatchObject<Partial<MonobankApiError>>({
      code: 'malformed_response',
      retryable: false,
    })
  })

  it('rejects malformed statement items before returning internal records', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json([{ id: 'transaction-1' }]))
    const client = new HttpMonobankClient({
      token: 'not-a-real-token',
      fetcher,
      requestGate: new RecordingRequestGate(),
    })

    const result = client.getStatement({
      accountId: 'account-1',
      fromEpochSeconds: 1_000,
      toEpochSeconds: 2_000,
    })

    await expect(result).rejects.toMatchObject<Partial<MonobankApiError>>({
      code: 'malformed_response',
      retryable: false,
    })
  })

  it('classifies an aborted request as a retryable timeout', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation((request) => {
      const signal = (request as Request).signal
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Request timed out', 'AbortError'))
        })
      })
    })
    const client = new HttpMonobankClient({
      token: 'not-a-real-token',
      fetcher,
      requestGate: new RecordingRequestGate(),
      timeoutMilliseconds: 1,
    })

    const result = client.getClientInfo()

    await expect(result).rejects.toMatchObject<Partial<MonobankApiError>>({
      code: 'timeout',
      retryable: true,
    })
  })

  it('keeps the timeout active while reading the response body', async () => {
    vi.useFakeTimers()
    let requestSignal: AbortSignal | undefined
    try {
      const fetcher = vi.fn<typeof fetch>().mockImplementation((request) => {
        requestSignal = (request as Request).signal
        const body = new ReadableStream({
          start(controller) {
            requestSignal?.addEventListener('abort', () => {
              controller.error(
                new DOMException('Request timed out', 'AbortError'),
              )
            })
          },
        })
        return Promise.resolve(
          new Response(body, {
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      })
      const client = new HttpMonobankClient({
        token: 'not-a-real-token',
        fetcher,
        requestGate: new RecordingRequestGate(),
        timeoutMilliseconds: 10,
      })

      const result = client.getClientInfo()
      const rejection = expect(result).rejects.toMatchObject<
        Partial<MonobankApiError>
      >({
        code: 'timeout',
        retryable: true,
      })
      await vi.advanceTimersByTimeAsync(10)

      expect(requestSignal?.aborted).toBe(true)
      await rejection
    } finally {
      vi.useRealTimers()
    }
  })

  it('classifies a transport failure without exposing its diagnostic message', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('internal transport diagnostic'))
    const client = new HttpMonobankClient({
      token: 'not-a-real-token',
      fetcher,
      requestGate: new RecordingRequestGate(),
    })

    const result = client.getClientInfo()

    await expect(result).rejects.toMatchObject<Partial<MonobankApiError>>({
      code: 'remote_api_error',
      retryable: true,
    })
    await expect(result).rejects.not.toThrow('internal transport diagnostic')
  })
})
