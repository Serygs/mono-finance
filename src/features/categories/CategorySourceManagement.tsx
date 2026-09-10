import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '../../components/ui/Controls'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { FormField, Select } from '../../components/ui/FormControls'
import { useLocalization } from '../localization/localization'
import {
  getCategorySources,
  resetCategorySourceMapping,
  saveCategorySourceMapping,
  type CustomCategory,
} from './categories-api'
import type { MappingFilter } from './category-source-filtering'

export function CategorySourceManagement({
  categories,
}: {
  categories: CustomCategory[]
}) {
  const { t } = useLocalization()
  const client = useQueryClient()
  const [query, setQuery] = useState('')
  const [mappingFilter, setMappingFilter] = useState<MappingFilter>('all')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const sources = useQuery({
    queryFn: () =>
      getCategorySources({
        mapping: mappingFilter,
        page,
        pageSize,
        query,
      }),
    queryKey: ['category-sources', { mappingFilter, page, query }],
  })
  const save = useMutation({
    mutationFn: ({
      categoryId,
      sourceCode,
    }: {
      categoryId: string
      sourceCode: string
    }) =>
      categoryId === ''
        ? resetCategorySourceMapping(sourceCode)
        : saveCategorySourceMapping(sourceCode, categoryId),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['category-sources'] }),
        client.invalidateQueries({ queryKey: ['transactions'] }),
        client.invalidateQueries({ queryKey: ['dashboard-analytics'] }),
      ])
    },
  })
  const totalPages = Math.max(
    1,
    Math.ceil((sources.data?.totalItems ?? 0) / pageSize),
  )

  return (
    <section
      className="category-management"
      aria-labelledby="category-sources-title"
    >
      <header className="section-heading">
        <h2 id="category-sources-title">{t('Bank transaction types')}</h2>
        <p>
          {t(
            'Assign a clear name to every transaction with the same imported MCC type. The bank value remains unchanged.',
          )}
        </p>
      </header>
      {sources.isPending ? (
        <Skeleton label={t('Loading transaction types…')} lines={3} />
      ) : null}
      {sources.isError ? (
        <Alert tone="danger">
          {t('Transaction types could not be loaded.')}
        </Alert>
      ) : null}
      {sources.data?.totalItems === 0 &&
      query === '' &&
      mappingFilter === 'all' ? (
        <EmptyState title={t('No imported transaction types')}>
          <p>
            {t(
              'Synchronize transactions first, then return here to rename their types.',
            )}
          </p>
        </EmptyState>
      ) : null}
      {(sources.data?.totalItems ?? 0) > 0 ? (
        <>
          <div className="category-source-filters">
            <FormField label={t('Search MCC or name')}>
              <input
                onChange={(event) => {
                  setPage(1)
                  setQuery(event.target.value)
                }}
                placeholder={t('Search MCC or name…')}
                type="search"
                value={query}
              />
            </FormField>
            <FormField label={t('Mapping status')}>
              <Select
                onChange={(event) => {
                  setPage(1)
                  setMappingFilter(event.target.value as MappingFilter)
                }}
                value={mappingFilter}
              >
                <option value="all">{t('All transaction types')}</option>
                <option value="mapped">{t('Mapped')}</option>
                <option value="unmapped">{t('Unmapped')}</option>
              </Select>
            </FormField>
          </div>
          {sources.data?.sources.length === 0 ? (
            <EmptyState title={t('No matching transaction types')}>
              <p>{t('Try a different search or filter.')}</p>
            </EmptyState>
          ) : (
            <div className="category-source-table-wrap">
              <table className="category-source-table">
                <thead>
                  <tr>
                    <th scope="col">{t('MCC')}</th>
                    <th scope="col">{t('Imported name')}</th>
                    <th scope="col">{t('Transactions')}</th>
                    <th scope="col">{t('Assigned category')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.data?.sources.map((source) => {
                    const inputId = `category-source-${source.code}`
                    return (
                      <tr key={source.code}>
                        <td data-label={t('MCC')}>
                          <strong>{source.code}</strong>
                        </td>
                        <td data-label={t('Imported name')}>
                          <div className="category-source-copy">
                            <span>{source.originalName || '—'}</span>
                          </div>
                        </td>
                        <td data-label={t('Transactions')}>
                          {source.transactionCount}
                        </td>
                        <td data-label={t('Assigned category')}>
                          <Select
                            aria-label={t('Display category for {code}', {
                              code: source.code,
                            })}
                            disabled={save.isPending}
                            id={inputId}
                            onChange={(event) =>
                              save.mutate({
                                categoryId: event.target.value,
                                sourceCode: source.code,
                              })
                            }
                            value={source.mappedCategory?.id ?? ''}
                          >
                            <option value="">{t('Use imported name')}</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </Select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <nav
            aria-label={t('Pagination')}
            className="category-source-pagination"
          >
            <Button
              disabled={page === 1 || sources.isFetching}
              onClick={() => setPage((current) => current - 1)}
              size="small"
              type="button"
              variant="secondary"
            >
              {t('Previous')}
            </Button>
            <span>
              {t('Page {page} of {total}', { page, total: totalPages })} ·{' '}
              {sources.data?.totalItems ?? 0}
            </span>
            <Button
              disabled={page === totalPages || sources.isFetching}
              onClick={() => setPage((current) => current + 1)}
              size="small"
              type="button"
              variant="secondary"
            >
              {t('Next')}
            </Button>
          </nav>
        </>
      ) : null}
      {categories.length === 0 && (sources.data?.totalItems ?? 0) > 0 ? (
        <Alert tone="warning">
          {t(
            'Create personal categories first, then assign an imported transaction type to one of them.',
          )}
        </Alert>
      ) : null}
      {save.isError ? (
        <Alert tone="danger">
          {t('Transaction type could not be updated.')}
        </Alert>
      ) : null}
    </section>
  )
}
