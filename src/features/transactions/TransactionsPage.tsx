import { Button } from '../../components/ui/Controls'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { PageHeader, PageSurface } from '../../components/ui/Page'
import { useLocalization } from '../localization/localization'
import { TransactionDetailsSheet } from './TransactionDetailsSheet'
import { TransactionFilters } from './TransactionFilters'
import { TransactionLedger } from './TransactionLedger'
import { useTransactionLedger } from './use-transaction-ledger'
import { useTransactionSelection } from './use-transaction-selection'

export function TransactionsPage() {
  const { t } = useLocalization()
  const ledger = useTransactionLedger()
  const { transactionsQuery, transactions } = ledger
  const selection = useTransactionSelection()
  const { selectedTransaction, setSelectedTransaction } = selection
  return (
    <PageSurface className="transactions-page transactions-page--ledger">
      <PageHeader
        description={
          <p>
            {t(
              'Imported transactions, shaped by your adjustments and compensation links.',
            )}
          </p>
        }
        id="transactions-title"
        title={t('Transactions')}
      />

      <TransactionFilters ledger={ledger} />

      {transactionsQuery.isPending ? (
        <Skeleton label={t('Loading transactions…')} lines={5} />
      ) : null}
      {transactionsQuery.isError ? (
        <Alert tone="danger" title={t('Transactions could not be loaded')}>
          {t('Try again when the connection is available.')}
        </Alert>
      ) : null}
      {!transactionsQuery.isPending &&
      !transactionsQuery.isError &&
      transactions.length === 0 ? (
        <EmptyState title={t('No matching transactions')}>
          <p>{t('Import a transaction window or broaden the filters.')}</p>
        </EmptyState>
      ) : null}
      {transactions.length > 0 ? (
        <TransactionLedger
          transactions={transactions}
          selectedTransaction={selectedTransaction}
          onSelect={setSelectedTransaction}
        />
      ) : null}
      <TransactionDetailsSheet selection={selection} />
      {transactionsQuery.hasNextPage ? (
        <nav className="transactions-pagination" aria-label={t('Pagination')}>
          <Button
            disabled={transactionsQuery.isFetchingNextPage}
            loading={transactionsQuery.isFetchingNextPage}
            onClick={() => void transactionsQuery.fetchNextPage()}
            type="button"
            variant="secondary"
          >
            {t(transactionsQuery.isFetchingNextPage ? 'Loading…' : 'Load more')}
          </Button>
        </nav>
      ) : null}
    </PageSurface>
  )
}
