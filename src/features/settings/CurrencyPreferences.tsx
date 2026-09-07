import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getCurrencyPreferences,
  saveCurrencyPreferences,
  synchronizeExchangeRates,
} from './currency-preferences-api'

export function CurrencyPreferences() {
  const client = useQueryClient()
  const preferences = useQuery({
    queryFn: getCurrencyPreferences,
    queryKey: ['currency-preferences'],
  })
  const save = useMutation({
    mutationFn: saveCurrencyPreferences,
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ['currency-preferences'] }),
  })
  const rates = useMutation({ mutationFn: synchronizeExchangeRates })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    save.mutate(
      String(new FormData(event.currentTarget).get('baseCurrencyCode'))
        .trim()
        .toUpperCase(),
    )
  }

  return (
    <section
      aria-labelledby="currency-settings-title"
      className="category-management"
    >
      <div>
        <p className="eyebrow">Analytics</p>
        <h1 id="currency-settings-title">Base currency</h1>
        <p className="page-description">
          Base-currency totals use saved historical rates. Original transaction
          amounts always remain unchanged.
        </p>
      </div>
      <form
        className="category-form"
        key={preferences.data?.baseCurrencyCode ?? 'UAH'}
        onSubmit={submit}
      >
        <label>
          Base currency (ISO 4217)
          <input
            defaultValue={preferences.data?.baseCurrencyCode ?? 'UAH'}
            maxLength={3}
            name="baseCurrencyCode"
            pattern="[A-Za-z]{3}"
            required
          />
        </label>
        <div className="transaction-correction-actions">
          <button disabled={save.isPending} type="submit">
            {save.isPending ? 'Saving…' : 'Save base currency'}
          </button>
          <button
            className="secondary-action"
            disabled={rates.isPending}
            onClick={() => rates.mutate()}
            type="button"
          >
            {rates.isPending ? 'Updating…' : 'Update exchange rates'}
          </button>
        </div>
        {save.isError || rates.isError ? (
          <p className="transaction-correction-error" role="alert">
            Currency settings could not be updated.
          </p>
        ) : null}
      </form>
    </section>
  )
}
