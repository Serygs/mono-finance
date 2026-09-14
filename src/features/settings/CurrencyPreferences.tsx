import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '../../components/ui/Controls'
import { Alert } from '../../components/ui/Feedback'
import { FormField } from '../../components/ui/FormControls'
import { Popover } from '../../components/ui/Popover'
import {
  getCurrencyPreferences,
  saveCurrencyPreferences,
  synchronizeExchangeRates,
} from './currency-preferences-api'
import { useLocalization } from '../localization/localization'
import { SettingsRowContent } from './SettingsSections'

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

  const currency = preferences.data?.baseCurrencyCode ?? t('Loading…')

  return (
    <Popover
      className="settings-row-popover"
      content={
        <form
          className="settings-popover-form"
          key={preferences.data?.baseCurrencyCode ?? ''}
          onSubmit={submit}
        >
          <FormField label={t('Base currency (ISO 4217)')}>
            <input
              autoComplete="off"
              defaultValue={preferences.data?.baseCurrencyCode ?? ''}
              maxLength={3}
              name="baseCurrencyCode"
              pattern="[A-Za-z]{3}"
              required
            />
          </FormField>
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
          {save.isError || rates.isError ? (
            <Alert tone="danger">
              {t('Currency settings could not be updated.')}
            </Alert>
          ) : null}
        </form>
      }
      label={t('Base currency')}
    >
      <SettingsRowContent
        icon="¤"
        subtitle={t('Currency used for converted analytics.')}
        title={t('Base currency')}
        trailing={
          <>
            <span>{currency}</span>
            <span aria-hidden="true" className="settings-row__chevron">
              ›
            </span>
          </>
        }
      />
    </Popover>
  )
}
