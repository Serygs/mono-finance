import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { categoryQueryKeys } from './category-queries'
import { Button, SegmentedControl } from '../../components/ui/Controls'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { SearchField } from '../../components/ui/FormControls'
import { useLocalization } from '../localization/localization'
import {
  getCategorySources,
  type CustomCategory,
  type SourceCategory,
} from './categories-api'
import type { MappingFilter } from './category-source-filtering'
import { CategoryPicker } from './CategoryPicker'
import { useCategorySourceMapping } from './use-category-source-mapping'

export function CategorySourceManagement({
  categories,
  active,
}: {
  categories: CustomCategory[]
  active: boolean
}) {
  const { t } = useLocalization()
  const [query, setQuery] = useState('')
  const [mappingFilter, setMappingFilter] = useState<MappingFilter>('all')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const sources = useQuery({
    enabled: active,
    queryFn: () =>
      getCategorySources({ mapping: mappingFilter, page, pageSize, query }),
    queryKey: categoryQueryKeys.sourcesFor({ mappingFilter, page, query }),
  })
  const totalPages = Math.max(
    1,
    Math.ceil((sources.data?.totalItems ?? 0) / pageSize),
  )
  // A mapping can remove the final row of a filtered last page.
  if (sources.data !== undefined && page > totalPages) setPage(totalPages)
  function reset() {
    setQuery('')
    setMappingFilter('all')
    setPage(1)
  }
  return (
    <section
      className="category-source-management"
      aria-labelledby="category-sources-title"
    >
      <header className="categories-section-heading">
        <h2 id="category-sources-title">{t('Bank transaction types')}</h2>
      </header>
      <p className="category-management-hint">
        {t(
          'Choose the category shown in your transactions and analytics. Original bank information stays unchanged.',
        )}
      </p>
      <div className="category-source-filters">
        <SearchField
          label={t('Search MCC or name')}
          placeholder={t('Search MCC or name…')}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setPage(1)
          }}
        />
        <SegmentedControl
          label={t('Mapping status')}
          value={mappingFilter}
          onChange={(value) => {
            setMappingFilter(value)
            setPage(1)
          }}
          options={[
            { value: 'all', label: t('All transaction types') },
            { value: 'mapped', label: t('Assigned category') },
            { value: 'unmapped', label: t('Bank category') },
          ]}
        />
      </div>
      {query !== '' || mappingFilter !== 'all' ? (
        <Button
          className="category-reset-action"
          variant="quiet"
          onClick={reset}
        >
          {t('Reset filters')}
        </Button>
      ) : null}
      {sources.isPending ? (
        <Skeleton label={t('Loading transaction types…')} lines={5} />
      ) : null}
      {sources.isError ? (
        <Alert tone="danger">
          {t('Transaction types could not be loaded.')}{' '}
          <Button
            loading={sources.isFetching}
            variant="secondary"
            onClick={() => void sources.refetch()}
          >
            {t('Retry')}
          </Button>
        </Alert>
      ) : null}
      {sources.data?.sources.length === 0 ? (
        <EmptyState
          title={t(
            query !== '' || mappingFilter !== 'all'
              ? 'No matching transaction types'
              : 'No imported transaction types',
          )}
          action={
            <Button variant="secondary" onClick={reset}>
              {t('Reset filters')}
            </Button>
          }
        >
          <p>
            {t(
              query !== '' || mappingFilter !== 'all'
                ? 'Try a different search or filter.'
                : 'Synchronize transactions first, then return here to rename their types.',
            )}
          </p>
        </EmptyState>
      ) : null}
      <ul className="category-source-list">
        {(sources.data?.sources ?? []).map((source) => (
          <CategorySourceRow
            key={source.code}
            source={source}
            categories={categories}
          />
        ))}
      </ul>
      {sources.data !== undefined && sources.data.totalItems > 0 ? (
        <nav
          aria-label={t('Pagination')}
          className="category-source-pagination"
        >
          <Button
            variant="secondary"
            disabled={page === 1 || sources.isFetching}
            onClick={() => setPage(page - 1)}
          >
            {t('Previous')}
          </Button>
          <span>
            {t('Page {page} of {pages} · {count} types', {
              page: sources.data.page,
              pages: totalPages,
              count: sources.data.totalItems,
            })}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages || sources.isFetching}
            onClick={() => setPage(page + 1)}
          >
            {t('Next')}
          </Button>
        </nav>
      ) : null}
      {categories.length === 0 && (sources.data?.totalItems ?? 0) > 0 ? (
        <Alert tone="warning">
          {t(
            'Create personal categories first, then assign an imported transaction type to one of them.',
          )}
        </Alert>
      ) : null}
    </section>
  )
}

function CategorySourceRow({
  source,
  categories,
}: {
  source: SourceCategory
  categories: CustomCategory[]
}) {
  const { t, locale } = useLocalization()
  const mapping = useCategorySourceMapping(source.code)
  return (
    <li className="category-source-row" aria-busy={mapping.pending}>
      <div className="category-source-identity">
        <strong>{source.originalName || t('Not available')}</strong>
        <span>
          {t('MCC')} {source.code} ·{' '}
          {t('{count} transactions', {
            count: new Intl.NumberFormat(locale).format(
              source.transactionCount,
            ),
          })}
        </span>
      </div>
      <div className="category-source-assignment">
        <CategoryPicker
          pending={mapping.pending}
          categories={categories}
          selected={source.mappedCategory}
          bankName={source.originalName}
          label={t('Assigned category for {name}', {
            name: source.originalName,
          })}
          onChange={(id) => {
            if (id !== (source.mappedCategory?.id ?? '')) mapping.save(id)
          }}
        />
        {mapping.pending ? (
          <span className="category-row-feedback" role="status">
            {t('Saving…')}
          </span>
        ) : null}
        {mapping.failed ? (
          <Alert tone="danger">
            {t('Transaction type could not be updated.')}{' '}
            <Button
              disabled={mapping.pending}
              variant="quiet"
              onClick={mapping.retry}
            >
              {t('Retry')}
            </Button>
          </Alert>
        ) : null}
        {mapping.succeeded ? (
          <span className="category-row-feedback" role="status">
            {t('Changes saved.')}
          </span>
        ) : null}
      </div>
    </li>
  )
}
