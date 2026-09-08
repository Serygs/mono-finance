import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormEvent } from 'react'

import { Button } from '../../components/ui/Controls'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { FormField, Select } from '../../components/ui/FormControls'
import {
  getCategorySources,
  resetCategorySourceMapping,
  saveCategorySourceMapping,
  type CustomCategory,
  type SourceCategory,
} from './categories-api'

interface CategorySourceManagementProps {
  categories: CustomCategory[]
}

export function CategorySourceManagement({
  categories,
}: CategorySourceManagementProps) {
  const queryClient = useQueryClient()
  const sourceCategories = useQuery({
    queryFn: getCategorySources,
    queryKey: ['category-sources'],
  })

  async function refreshEffectiveCategories(): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['category-sources'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-analytics'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-recent'] }),
    ])
  }

  return (
    <section
      className="category-source-management"
      aria-labelledby="source-categories-title"
    >
      <header className="section-heading">
        <h2 id="source-categories-title">Bank categories</h2>
        <p>
          Replace labels such as MCC 5411 for every matching current and future
          transaction. Imported bank values remain unchanged.
        </p>
      </header>
      {categories.length === 0 ? (
        <Alert tone="info" title="Create a custom category first">
          Then assign one or more MCC categories to it.
        </Alert>
      ) : null}
      {sourceCategories.isPending ? (
        <Skeleton label="Loading bank categoriesвЂ¦" lines={3} />
      ) : null}
      {sourceCategories.isError ? (
        <Alert tone="danger">Bank categories could not be loaded.</Alert>
      ) : null}
      {sourceCategories.data?.length === 0 ? (
        <EmptyState title="No imported categories">
          Synchronize transactions before configuring category names.
        </EmptyState>
      ) : null}
      <ul className="category-source-list">
        {sourceCategories.data?.map((sourceCategory) => (
          <CategorySourceRow
            categories={categories}
            key={`${sourceCategory.code}:${sourceCategory.mappedCategory?.id ?? 'original'}`}
            onUpdated={refreshEffectiveCategories}
            sourceCategory={sourceCategory}
          />
        ))}
      </ul>
    </section>
  )
}

interface CategorySourceRowProps extends CategorySourceManagementProps {
  onUpdated(): Promise<void>
  sourceCategory: SourceCategory
}

function CategorySourceRow({
  categories,
  onUpdated,
  sourceCategory,
}: CategorySourceRowProps) {
  const mapping = useMutation({
    mutationFn: (categoryId: string) =>
      categoryId === ''
        ? resetCategorySourceMapping(sourceCategory.code)
        : saveCategorySourceMapping(sourceCategory.code, categoryId),
    onSuccess: () => void onUpdated(),
  })

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    mapping.mutate(String(data.get('categoryId') ?? ''))
  }

  return (
    <li>
      <div className="category-source-identity">
        <strong>{sourceCategory.originalName ?? sourceCategory.code}</strong>
        <span>
          Source {sourceCategory.code} В· {sourceCategory.transactionCount}{' '}
          transactions
        </span>
      </div>
      <form className="category-source-form" onSubmit={submit}>
        <FormField label={`Display category for ${sourceCategory.code}`}>
          <Select
            defaultValue={sourceCategory.mappedCategory?.id ?? ''}
            disabled={mapping.isPending || categories.length === 0}
            name="categoryId"
          >
            <option value="">Use imported name</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon ? `${category.icon} ` : ''}
                {category.name}
              </option>
            ))}
          </Select>
        </FormField>
        <Button
          disabled={categories.length === 0}
          loading={mapping.isPending}
          size="small"
          type="submit"
        >
          Apply to all
        </Button>
      </form>
      {sourceCategory.mappedCategory !== null ? (
        <p className="category-source-effective">
          Effective category: {sourceCategory.mappedCategory.name}
        </p>
      ) : null}
      {mapping.isError ? (
        <Alert tone="danger">Category mapping could not be saved.</Alert>
      ) : null}
    </li>
  )
}
