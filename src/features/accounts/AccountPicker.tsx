import type { ComponentProps } from 'react'
import { FormField, MultiSelect } from '../../components/ui/FormControls'
import { useLocalization } from '../localization/localization'
import type { AccountSummary } from './account-types'

interface AccountPickerProps extends Pick<
  ComponentProps<typeof MultiSelect>,
  'value' | 'onChange' | 'triggerLabel' | 'selectAllLabel' | 'menuLabel'
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
    <FormField className={className ?? ''} label={t('Accounts')}>
      <MultiSelect
        {...selection}
        ariaLabel={t('Accounts')}
        options={accounts.map((account) => ({
          label: `${account.type} · ${account.currency.code}`,
          value: account.id,
        }))}
      />
    </FormField>
  )
}
