import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '../../components/ui/Controls'
import { Alert } from '../../components/ui/Feedback'
import { FormField } from '../../components/ui/FormControls'
import {
  getCurrencyPreferences,
  saveCurrencyPreferences,
  synchronizeExchangeRates,
} from './currency-preferences-api'
import { useLocalization } from '../localization/localization'

export function CurrencyPreferences() {
  const client = useQueryClient()
  const { t } = useLocalization()
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
      <header className="section-heading">
        <h2 id="currency-settings-title">{t('Base currency')}</h2>
        <p>
          {t(
            'Base-currency totals use saved historical rates. Original transaction amounts always remain unchanged.',
          )}
        </p>
      </header>
      <form
        className="category-form"
        key={preferences.data?.baseCurrencyCode ?? 'UAH'}
        onSubmit={submit}
      >
        <FormField label={t('Base currency (ISO 4217)')}>
          <input
            autoComplete="off"
            defaultValue={preferences.data?.baseCurrencyCode ?? 'UAH'}
            maxLength={3}
            name="baseCurrencyCode"
            pattern="[A-Za-z]{3}"
            required
          />
        </FormField>
        <div className="transaction-correction-actions">
          <Button loading={save.isPending} type="submit">
            {save.isPending ? t('Saving…') : t('Save base currency')}
          </Button>
          <Button
            disabled={rates.isPending}
            loading={rates.isPending}
            onClick={() => rates.mutate()}
            type="button"
            variant="secondary"
          >
            {rates.isPending ? t('Updating…') : t('Update exchange rates')}
          </Button>
        </div>
        {save.isError || rates.isError ? (
          <Alert tone="danger">
            {t('Currency settings could not be updated.')}
          </Alert>
        ) : null}
      </form>
    </section>
  )
}
