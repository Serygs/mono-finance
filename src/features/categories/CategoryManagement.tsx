import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { CompactList } from '../../components/ui/Collections'
import { Button } from '../../components/ui/Controls'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import {
  FormField,
  SearchField,
  Select,
} from '../../components/ui/FormControls'
import { Dialog } from '../../components/ui/Overlay'
import { OverflowMenu } from '../../components/ui/Popover'
import { useLocalization } from '../localization/localization'
import {
  createCategory,
  deleteCategory,
  getCategories,
  mergeCategories,
  type CategoryInput,
  updateCategory,
} from './categories-api'
import { CategoryAppearanceFields } from './CategoryAppearanceFields'
import { CategorySourceManagement } from './CategorySourceManagement'

const EMPTY: CategoryInput = { colorToken: null, icon: null, name: '' }

export function CategoryManagement() {
  const { t } = useLocalization()
  const client = useQueryClient()
  const categories = useQuery({
    queryFn: getCategories,
    queryKey: ['categories'],
  })
  const [editing, setEditing] = useState<{
    id: string
    input: CategoryInput
  } | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{
    id: string
    name: string
  } | null>(null)
  const [pendingMerge, setPendingMerge] = useState<{
    id: string
    name: string
  } | null>(null)
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [query, setQuery] = useState('')

  const mutation = useMutation({
    mutationFn: async (input: CategoryInput) =>
      editing === null
        ? createCategory(input)
        : updateCategory(editing.id, input),
    onSuccess: () => {
      setEditing(null)
      setIsCreating(false)
      void refreshCategoryData()
    },
  })
  const removal = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      setPendingDelete(null)
      void refreshCategoryData()
    },
  })
  const merge = useMutation({
    mutationFn: (input: {
      sourceCategoryId: string
      targetCategoryId: string
    }) => mergeCategories(input.sourceCategoryId, input.targetCategoryId),
    onSuccess: () => {
      setPendingMerge(null)
      setMergeTargetId('')
      void refreshCategoryData()
    },
  })

  const visibleCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (normalizedQuery === '') return categories.data ?? []
    return (categories.data ?? []).filter((category) =>
      category.name.toLocaleLowerCase().includes(normalizedQuery),
    )
  }, [categories.data, query])

  function refreshCategoryData(): Promise<unknown[]> {
    return Promise.all([
      client.invalidateQueries({ queryKey: ['categories'] }),
      client.invalidateQueries({ queryKey: ['category-sources'] }),
      client.invalidateQueries({ queryKey: ['transactions'] }),
      client.invalidateQueries({ queryKey: ['dashboard-analytics'] }),
      client.invalidateQueries({ queryKey: ['dashboard-recent'] }),
    ])
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    mutation.mutate({
      name: String(form.get('name')).trim(),
      icon: optional(String(form.get('icon'))),
      colorToken: optional(String(form.get('colorToken'))),
    })
  }

  return (
    <section
      aria-labelledby="categories-title"
      className="category-management categories-management--v4"
    >
      <header className="categories-section-heading">
        <h2>{t('Custom categories')}</h2>
        {!isCreating && editing === null ? (
          <Button
            className="category-add-action"
            onClick={() => {
              mutation.reset()
              setIsCreating(true)
            }}
            type="button"
          >
            + {t('Add category')}
          </Button>
        ) : null}
      </header>
      {isCreating || editing !== null ? (
        <form
          className="category-form"
          key={editing?.id ?? 'new'}
          onSubmit={submit}
        >
          <h3>{t(editing === null ? 'Add category' : 'Edit category')}</h3>
          <FormField label={t('Name')}>
            <input
              autoComplete="off"
              defaultValue={editing?.input.name ?? EMPTY.name}
              maxLength={80}
              name="name"
              required
            />
          </FormField>
          <CategoryAppearanceFields
            colorToken={editing?.input.colorToken ?? EMPTY.colorToken}
            icon={editing?.input.icon ?? EMPTY.icon}
            translate={t}
          />
          <div className="transaction-correction-actions">
            <Button loading={mutation.isPending} type="submit">
              {mutation.isPending
                ? t('Saving…')
                : editing === null
                  ? t('Add category')
                  : t('Save category')}
            </Button>
            <Button
              onClick={() => {
                mutation.reset()
                setEditing(null)
                setIsCreating(false)
              }}
              type="button"
              variant="secondary"
            >
              {t('Cancel')}
            </Button>
          </div>
          {mutation.isError ? (
            <Alert tone="danger">{t('Category could not be saved.')}</Alert>
          ) : null}
        </form>
      ) : null}
      {categories.isPending ? (
        <Skeleton label={t('Loading categories…')} lines={2} />
      ) : null}
      {categories.isError ? (
        <Alert tone="danger">{t('Categories could not be loaded.')}</Alert>
      ) : null}
      {categories.data?.length === 0 ? (
        <EmptyState title={t('No custom categories')}>
          <p>{t('Add a category to personalize transaction analytics.')}</p>
        </EmptyState>
      ) : null}
      {(categories.data?.length ?? 0) > 0 ? (
        <div className="categories-list-panel">
          <div className="categories-list-panel__toolbar">
            <h2>{t('Custom categories')}</h2>
            <SearchField
              label={t('Search categories')}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('Search categories…')}
              value={query}
            />
          </div>
          <div aria-hidden="true" className="categories-list-columns">
            <span>{t('Category')}</span>
            <span>{t('Type')}</span>
            <span>{t('Actions')}</span>
          </div>
          {visibleCategories.length === 0 ? (
            <EmptyState title={t('No matching categories')}>
              <p>{t('Try a different search or filter.')}</p>
            </EmptyState>
          ) : (
            <CompactList className="category-list category-list--v4">
              {visibleCategories.map((category) => (
                <li key={category.id}>
                  <div className="category-list-row__identity">
                    <span
                      aria-hidden="true"
                      className={`category-list-row__icon category-list-row__icon--${category.colorToken ?? 'slate'}`}
                    >
                      <CategoryIcon token={category.icon} />
                    </span>
                    <span className="category-list-row__name">
                      {category.name}
                    </span>
                  </div>
                  <span className="category-list-row__type">
                    {t('Custom category')}
                  </span>
                  <CategoryRowActions
                    categoryCount={categories.data?.length ?? 0}
                    deletePending={removal.isPending}
                    onDelete={() => {
                      removal.reset()
                      setPendingDelete({ id: category.id, name: category.name })
                    }}
                    onEdit={() => {
                      mutation.reset()
                      setIsCreating(false)
                      setEditing({
                        id: category.id,
                        input: {
                          name: category.name,
                          icon: category.icon,
                          colorToken: category.colorToken,
                        },
                      })
                    }}
                    onMerge={() => {
                      merge.reset()
                      setMergeTargetId('')
                      setPendingMerge({ id: category.id, name: category.name })
                    }}
                    translate={t}
                  />
                </li>
              ))}
            </CompactList>
          )}
        </div>
      ) : null}
      <CategorySourceManagement categories={categories.data ?? []} />
      <Dialog
        onClose={() => {
          if (!removal.isPending) {
            removal.reset()
            setPendingDelete(null)
          }
        }}
        open={pendingDelete !== null}
        title={t('Delete category?')}
      >
        <p>
          {t(
            '{name} will be permanently removed. Categories currently used by transactions cannot be deleted.',
            { name: pendingDelete?.name ?? t('This category') },
          )}
        </p>
        {removal.isError ? (
          <Alert tone="danger" title={t('Category is still in use')}>
            {t(
              'Reset or reassign its transaction overrides and imported type mappings first.',
            )}
          </Alert>
        ) : null}
        <div className="transaction-correction-actions">
          <Button
            disabled={removal.isPending}
            onClick={() => setPendingDelete(null)}
            variant="secondary"
          >
            {t('Cancel')}
          </Button>
          <Button
            loading={removal.isPending}
            onClick={() => {
              if (pendingDelete !== null) removal.mutate(pendingDelete.id)
            }}
            variant="danger"
          >
            {t('Delete category')}
          </Button>
        </div>
      </Dialog>
      <Dialog
        onClose={() => {
          if (!merge.isPending) {
            merge.reset()
            setPendingMerge(null)
            setMergeTargetId('')
          }
        }}
        open={pendingMerge !== null}
        title={t('Merge category?')}
      >
        <p>{t('Merge category explanation')}</p>
        <FormField label={t('Merge into')}>
          <Select
            onChange={(event) => setMergeTargetId(event.target.value)}
            value={mergeTargetId}
          >
            <option value="">{t('Select target category')}</option>
            {(categories.data ?? [])
              .filter((category) => category.id !== pendingMerge?.id)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </Select>
        </FormField>
        {merge.isError ? (
          <Alert tone="danger">{t('Categories could not be merged.')}</Alert>
        ) : null}
        <div className="transaction-correction-actions">
          <Button
            disabled={merge.isPending}
            onClick={() => setPendingMerge(null)}
            variant="secondary"
          >
            {t('Cancel')}
          </Button>
          <Button
            disabled={mergeTargetId === ''}
            loading={merge.isPending}
            onClick={() => {
              if (pendingMerge !== null && mergeTargetId !== '') {
                merge.mutate({
                  sourceCategoryId: pendingMerge.id,
                  targetCategoryId: mergeTargetId,
                })
              }
            }}
            variant="danger"
          >
            {t('Merge categories')}
          </Button>
        </div>
      </Dialog>
    </section>
  )
}

function optional(value: string): string | null {
  return value.trim() || null
}

interface CategoryRowActionsProps {
  categoryCount: number
  deletePending: boolean
  onDelete(): void
  onEdit(): void
  onMerge(): void
  translate: ReturnType<typeof useLocalization>['t']
}

function CategoryRowActions({
  categoryCount,
  deletePending,
  onDelete,
  onEdit,
  onMerge,
  translate,
}: CategoryRowActionsProps) {
  return (
    <div className="category-list-actions">
      <div className="category-list-actions--direct">
        <Button onClick={onEdit} size="small" type="button" variant="secondary">
          {translate('Edit')}
        </Button>
        <Button
          disabled={categoryCount <= 1}
          onClick={onMerge}
          size="small"
          type="button"
          variant="secondary"
        >
          {translate('Merge')}
        </Button>
      </div>
      <OverflowMenu
        className="category-list-actions--overflow"
        content={
          <span className="category-action-menu">
            <Button
              disabled={deletePending}
              onClick={onDelete}
              size="small"
              type="button"
              variant="danger"
            >
              {translate('Delete')}
            </Button>
          </span>
        }
        label={translate('Category actions')}
      >
        {translate('Category actions')}
      </OverflowMenu>
    </div>
  )
}
