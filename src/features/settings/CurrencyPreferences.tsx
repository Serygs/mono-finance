import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import {
  settingsQueryKeys,
  refreshCurrencyAnalytics,
} from './settings-query-keys'
import { Button } from '../../components/ui/Controls'
import { Alert, Skeleton } from '../../components/ui/Feedback'
import { FormField } from '../../components/ui/FormControls'
import { Icon } from '../../components/ui/Icon'
import { Popover } from '../../components/ui/Popover'
import { useOnlineState } from '../../lib/use-online-state'
import { useLocalization } from '../localization/localization'
import { UpdateProtectedEditor } from '../offline/UpdateProtectedEditor'
import {
  getCurrencyPreferences,
  saveCurrencyPreferences,
  synchronizeExchangeRates,
} from './currency-preferences-api'
import { SettingsRowContent } from './SettingsSections'

export function CurrencyPreferences() {
  const client = useQueryClient()
  const { t } = useLocalization()
  const online = useOnlineState()
  const [invalid, setInvalid] = useState(false)
  const preferences = useQuery({
    queryFn: getCurrencyPreferences,
    queryKey: settingsQueryKeys.currency,
  })
  const save = useMutation({
    mutationFn: saveCurrencyPreferences,
    retry: false,
    onSuccess: async (next) => {
      await client.cancelQueries({ queryKey: settingsQueryKeys.currency })
      client.setQueryData(settingsQueryKeys.currency, next)
      await refreshCurrencyAnalytics(client)
    },
  })
  const rates = useMutation({
    mutationFn: synchronizeExchangeRates,
    retry: false,
    onSuccess: () => refreshCurrencyAnalytics(client),
  })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (save.isPending || !online) return
    const code = String(
      new FormData(event.currentTarget).get('baseCurrencyCode'),
    )
      .trim()
      .toUpperCase()
    setInvalid(!/^[A-Z]{3}$/.test(code))
    if (/^[A-Z]{3}$/.test(code)) save.mutate(code)
  }
  const currency =
    preferences.data?.baseCurrencyCode ??
    t(preferences.isError ? 'Unavailable' : 'Loading…')
  return (
    <Popover
      className="settings-row-popover"
      label={t('Base currency')}
      mobileSheet
      content={
        <UpdateProtectedEditor className="settings-popover-form">
          <p>
            {t(
              'Analytics currency only. Account and original transaction currencies stay unchanged.',
            )}
          </p>
          {preferences.isPending ? (
            <Skeleton label={t('Loading…')} lines={2} />
          ) : null}
          {preferences.isError ? (
            <Alert tone="danger">
              {t('Currency settings could not be loaded.')}
              <Button
                variant="secondary"
                loading={preferences.isFetching}
                disabled={!online}
                onClick={() => void preferences.refetch()}
              >
                {t('Retry')}
              </Button>
            </Alert>
          ) : null}
          {!online ? (
            <p role="status">
              {t('Connect to the internet to update settings.')}
            </p>
          ) : null}
          {preferences.data === undefined ? null : (
            <form
              className="settings-popover-form"
              onSubmit={submit}
              noValidate
            >
              <FormField label={t('Base currency (ISO 4217)')}>
                <input
                  autoComplete="off"
                  defaultValue={preferences.data.baseCurrencyCode}
                  maxLength={3}
                  name="baseCurrencyCode"
                  required
                  aria-invalid={invalid || undefined}
                  aria-describedby={invalid ? 'currency-code-error' : undefined}
                  onChange={() => setInvalid(false)}
                />
              </FormField>
              {invalid ? (
                <p role="alert" id="currency-code-error">
                  {t('Enter a three-letter currency code.')}
                </p>
              ) : null}
              <div className="settings-form-actions">
                <Button
                  loading={save.isPending}
                  disabled={!online}
                  type="submit"
                >
                  {t(save.isPending ? 'Saving…' : 'Save base currency')}
                </Button>
                <Button
                  variant="quiet"
                  data-popover-dismiss
                  disabled={save.isPending || rates.isPending}
                  type="button"
                >
                  {t('Cancel')}
                </Button>
              </div>
              <Button
                variant="secondary"
                loading={rates.isPending}
                disabled={!online}
                onClick={() => {
                  if (!rates.isPending && online) rates.mutate()
                }}
                type="button"
              >
                {t(rates.isPending ? 'Updating…' : 'Update exchange rates')}
              </Button>
              {save.isError || rates.isError ? (
                <Alert tone="danger">
                  {t('Currency settings could not be updated.')}
                </Alert>
              ) : null}
              {save.isSuccess && !save.isPending ? (
                <p role="status">{t('Currency settings updated.')}</p>
              ) : null}
              {rates.isSuccess && !rates.isPending ? (
                <p role="status">{t('Exchange rates updated.')}</p>
              ) : null}
            </form>
          )}
        </UpdateProtectedEditor>
      }
    >
      <SettingsRowContent
        icon="currency"
        title={t('Base currency')}
        trailing={
          <>
            <span>{currency}</span>
            <Icon name="chevron" />
          </>
        }
      />
    </Popover>
  )
}
