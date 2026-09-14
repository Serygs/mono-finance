import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CategoryChip } from '../../components/ui/Chips'
import { CompactList } from '../../components/ui/Collections'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { Button } from '../../components/ui/Controls'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { FormField, Select } from '../../components/ui/FormControls'
import { Dialog } from '../../components/ui/Overlay'
import { Popover } from '../../components/ui/Popover'
import { useLocalization } from '../localization/localization'
import {
  createCategory,
  deleteCategory,
  getCategories,
  mergeCategories,
  type CategoryInput,
  updateCategory,
} from './categories-api'
import { CategorySourceManagement } from './CategorySourceManagement'
import { CategoryAppearanceFields } from './CategoryAppearanceFields'

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
      className="category-management"
      id="categories"
      aria-labelledby="categories-title"
    >
      <header className="section-heading">
        <h2 id="categories-title">{t('Custom categories')}</h2>
        <p>
          {t(
            'Use these for personal analytics. Imported Monobank and MCC categories remain unchanged.',
          )}
        </p>
      </header>
      {!isCreating && editing === null ? (
        <Button
          className="category-add-action"
          onClick={() => {
            mutation.reset()
            setIsCreating(true)
          }}
          type="button"
          variant="secondary"
        >
          + {t('Add category')}
        </Button>
      ) : null}
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
              name="name"
              defaultValue={editing?.input.name ?? EMPTY.name}
              maxLength={80}
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
            <>
              <Button
                type="button"
                onClick={() => {
                  mutation.reset()
                  setEditing(null)
                  setIsCreating(false)
                }}
                variant="secondary"
              >
                {t('Cancel')}
              </Button>
            </>
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
      <CompactList className="category-list category-list--compact">
        {categories.data?.map((category) => (
          <li key={category.id}>
            <CategoryChip
              color={category.colorToken}
              icon={<CategoryIcon token={category.icon} />}
              label={category.name}
            />
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
              if (pendingMerge !== null && mergeTargetId !== '')
                merge.mutate({
                  sourceCategoryId: pendingMerge.id,
                  targetCategoryId: mergeTargetId,
                })
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
  const actions = (
    <CategoryActionButtons
      canMerge={categoryCount > 1}
      deletePending={deletePending}
      onDelete={onDelete}
      onEdit={onEdit}
      onMerge={onMerge}
      translate={translate}
    />
  )

  return (
    <>
      <div className="category-list-actions category-list-actions--direct">
        {actions}
      </div>
      <Popover
        className="category-list-actions--overflow"
        content={<span className="category-action-menu">{actions}</span>}
        label={translate('Category actions')}
      >
        <span aria-hidden="true">•••</span>
      </Popover>
    </>
  )
}

interface CategoryActionButtonsProps {
  canMerge: boolean
  deletePending: boolean
  onDelete(): void
  onEdit(): void
  onMerge(): void
  translate: ReturnType<typeof useLocalization>['t']
}

function CategoryActionButtons({
  canMerge,
  deletePending,
  onDelete,
  onEdit,
  onMerge,
  translate,
}: CategoryActionButtonsProps) {
  return (
    <>
      <Button onClick={onEdit} size="small" type="button" variant="secondary">
        {translate('Edit')}
      </Button>
      <Button
        disabled={!canMerge}
        onClick={onMerge}
        size="small"
        type="button"
        variant="secondary"
      >
        {translate('Merge')}
      </Button>
      <Button
        disabled={deletePending}
        onClick={onDelete}
        size="small"
        type="button"
        variant="danger"
      >
        {translate('Delete')}
      </Button>
    </>
  )
}
