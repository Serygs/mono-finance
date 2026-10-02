import { BottomSheet } from '../../components/ui/Overlay'
import { useLocalization } from '../localization/localization'
import { TransactionDetails } from './TransactionDetails'
import type { useTransactionSelection } from './use-transaction-selection'

export function TransactionDetailsSheet({
  selection,
}: {
  selection: ReturnType<typeof useTransactionSelection>
}) {
  const { t } = useLocalization()
  const {
    selectedTransaction,
    setSelectedTransaction,
    updateSelectedTransaction,
  } = selection
  return (
    <BottomSheet
      onClose={() => setSelectedTransaction(null)}
      open={selectedTransaction !== null}
      title={
        selectedTransaction?.originalDescription ?? t('Transaction details')
      }
    >
      <TransactionDetails
        onTransactionUpdated={updateSelectedTransaction}
        transaction={selectedTransaction}
      />
    </BottomSheet>
  )
}
