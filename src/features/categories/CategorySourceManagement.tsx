import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { Select } from '../../components/ui/FormControls'
import { useLocalization } from '../localization/localization'
import {
  getCategories,
  getSourceCategories,
  resetSourceCategory,
  saveSourceCategory,
} from './categories-api'

export function CategorySourceManagement() {
  const { t } = useLocalization()
  const client = useQueryClient()
  const categories = useQuery({
    queryFn: getCategories,
    queryKey: ['categories'],
  })
  const sources = useQuery({
    queryFn: getSourceCategories,
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
        ? resetSourceCategory(sourceCode)
        : saveSourceCategory(sourceCode, categoryId),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['category-sources'] }),
        client.invalidateQueries({ queryKey: ['transactions'] }),
        client.invalidateQueries({ queryKey: ['dashboard-analytics'] }),
      ])
    },
  })

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
      {sources.isPending || categories.isPending ? (
        <Skeleton label={t('Loading transaction types…')} lines={3} />
      ) : null}
      {sources.isError || categories.isError ? (
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
      <ul className="category-source-list">
        {sources.data?.map((source) => {
          const inputId = `category-source-${source.code}`
          return (
            <li key={source.code}>
              <div className="category-source-copy">
                <strong>{source.originalName}</strong>
                <span>
                  {source.code} · {source.transactionCount} {t('transactions')}
                </span>
              </div>
              <label className="ui-field" htmlFor={inputId}>
                <span className="ui-field-label">{t('Display name')}</span>
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
                  {categories.data?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </label>
            </li>
          )
        })}
      </ul>
      {categories.data?.length === 0 && (sources.data?.length ?? 0) > 0 ? (
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
