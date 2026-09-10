import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { FormField, Select } from '../../components/ui/FormControls'
import { useLocalization } from '../localization/localization'
import {
  getCategorySources,
  resetCategorySourceMapping,
  saveCategorySourceMapping,
  type CustomCategory,
} from './categories-api'
import {
  filterCategorySources,
  type MappingFilter,
} from './category-source-filtering'

export function CategorySourceManagement({
  categories,
}: {
  categories: CustomCategory[]
}) {
  const { t } = useLocalization()
  const client = useQueryClient()
  const [query, setQuery] = useState('')
  const [mappingFilter, setMappingFilter] = useState<MappingFilter>('all')
  const sources = useQuery({
    queryFn: getCategorySources,
    queryKey: ['category-sources'],
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
  const visibleSources = useMemo(
    () => filterCategorySources(sources.data ?? [], query, mappingFilter),
    [mappingFilter, query, sources.data],
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
      {sources.data?.length === 0 ? (
        <EmptyState title={t('No imported transaction types')}>
          <p>
            {t(
              'Synchronize transactions first, then return here to rename their types.',
            )}
          </p>
        </EmptyState>
      ) : null}
      {(sources.data?.length ?? 0) > 0 ? (
        <>
          <div className="category-source-filters">
            <FormField label={t('Search MCC or name')}>
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('Search MCC or name…')}
                type="search"
                value={query}
              />
            </FormField>
            <FormField label={t('Mapping status')}>
              <Select
                onChange={(event) =>
                  setMappingFilter(event.target.value as MappingFilter)
                }
                value={mappingFilter}
              >
                <option value="all">{t('All transaction types')}</option>
                <option value="mapped">{t('Mapped')}</option>
                <option value="unmapped">{t('Unmapped')}</option>
              </Select>
            </FormField>
          </div>
          {visibleSources.length === 0 ? (
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
                    <th scope="col">{t('Assigned category')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSources.map((source) => {
                    const inputId = `category-source-${source.code}`
                    return (
                      <tr key={source.code}>
                        <td data-label={t('MCC')}>
                          <strong>{source.code}</strong>
                        </td>
                        <td data-label={t('Imported name')}>
                          <div className="category-source-copy">
                            <span>{source.originalName || '—'}</span>
                            <small>
                              {source.transactionCount} {t('transactions')}
                            </small>
                          </div>
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
        </>
      ) : null}
      {categories.length === 0 && (sources.data?.length ?? 0) > 0 ? (
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
