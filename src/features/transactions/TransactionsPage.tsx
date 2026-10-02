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
  const selection = useTransactionSelection(ledger.selectionScope)
  const { selectedTransaction, setSelectedTransaction } = selection
  const requestError = (
    <Alert tone="danger" title={t('Transactions could not be loaded')}>
      <p>
        {t(
          transactionsQuery.isFetchNextPageError
            ? 'More transactions could not be loaded. Shown transactions are preserved.'
            : 'Try again when the connection is available.',
        )}
      </p>
      <Button
        variant="secondary"
        disabled={transactionsQuery.isFetching}
        loading={transactionsQuery.isFetching}
        onClick={() =>
          void (transactionsQuery.isFetchNextPageError
            ? transactionsQuery.fetchNextPage()
            : transactionsQuery.refetch())
        }
      >
        {t('Retry')}
      </Button>
    </Alert>
  )
  return (
    <PageSurface className="transactions-page transactions-page--ledger">
      <PageHeader id="transactions-title" title={t('Transactions')} />

      <TransactionFilters ledger={ledger} />

      {transactionsQuery.isPending || ledger.searchPending ? (
        <Skeleton label={t('Loading transactions…')} lines={5} />
      ) : null}
      {transactionsQuery.isError && !transactionsQuery.isFetchNextPageError
        ? requestError
        : null}
      {!transactionsQuery.isPending &&
      !ledger.searchPending &&
      !transactionsQuery.isError &&
      transactions.length === 0 ? (
        <EmptyState
          title={t(
            ledger.activeFilterCount > 0
              ? 'No matching transactions'
              : 'No transactions in this period.',
          )}
          action={
            ledger.activeFilterCount > 0 ? (
              <Button variant="secondary" onClick={ledger.resetFilters}>
                {t('Reset filters')}
              </Button>
            ) : undefined
          }
        >
          <p>
            {t(
              ledger.activeFilterCount > 0
                ? 'No transactions match these filters.'
                : 'Choose another period to see imported transactions.',
            )}
          </p>
        </EmptyState>
      ) : null}
      {transactions.length > 0 && !ledger.searchPending ? (
        <div aria-busy={transactionsQuery.isFetching}>
          {transactionsQuery.isFetching &&
          !transactionsQuery.isFetchingNextPage ? (
            <p className="transactions-refresh-status" role="status">
              {t('Refreshing transactions…')}
            </p>
          ) : null}
          <TransactionLedger
            transactions={transactions}
            selectedTransaction={selectedTransaction}
            onSelect={setSelectedTransaction}
            categories={ledger.customCategoriesQuery.data ?? []}
          />
        </div>
      ) : null}
      <TransactionDetailsSheet selection={selection} />
      {transactionsQuery.hasNextPage && !ledger.searchPending ? (
        <nav className="transactions-pagination" aria-label={t('Pagination')}>
          {transactionsQuery.isFetchNextPageError ? requestError : null}
          <Button
            disabled={transactionsQuery.isFetching}
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
