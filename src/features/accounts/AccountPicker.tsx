import { accountDisplayLabel } from './account-formatting'
import type { ComponentProps } from 'react'
import { MultiSelect } from '../../components/ui/FormControls'
import { useLocalization } from '../localization/localization'
import type { AccountSummary } from './account-types'

interface AccountPickerProps extends Pick<
  ComponentProps<typeof MultiSelect>,
  | 'value'
  | 'onChange'
  | 'triggerLabel'
  | 'selectAllLabel'
  | 'menuLabel'
  | 'disabled'
  | 'loading'
> {
  accounts: AccountSummary[]
  className?: string
}

// Account naming and option identity are feature-owned; each page retains its
// existing all/selected semantics and trigger presentation.
export function AccountPicker({
  accounts,
  className,
  ...selection
}: AccountPickerProps) {
  const { t } = useLocalization()
  return (
    <div className={['ui-field', className].filter(Boolean).join(' ')}>
      <span className="ui-field-label">{t('Accounts')}</span>
      <MultiSelect
        {...selection}
        compactTriggerLabel={
          accounts.length > 0 &&
          accounts.every((account) => selection.value.includes(account.id))
            ? t('All accounts')
            : selection.value.length === 1
              ? t('1 account')
              : t('{count} accounts', { count: selection.value.length })
        }
        ariaLabel={t('Accounts')}
        options={accounts.map((account) => {
          const maskedPan = (
            account.cards.find((card) => card.isActive) ?? account.cards[0]
          )?.maskedPan
          return {
            label: accountDisplayLabel(
              {
                type: account.type,
                currencyCode: account.currency.code,
                maskedPan,
              },
              t('Account'),
            ),
            value: account.id,
          }
        })}
      />
    </div>
  )
}
