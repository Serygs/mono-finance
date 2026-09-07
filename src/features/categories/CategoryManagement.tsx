import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CategoryChip } from '../../components/ui/Chips'
import { Button } from '../../components/ui/Controls'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { FormField } from '../../components/ui/FormControls'
import { Dialog } from '../../components/ui/Overlay'
import {
  createCategory,
  deleteCategory,
  getCategories,
  type CategoryInput,
  updateCategory,
} from './categories-api'

const EMPTY: CategoryInput = { colorToken: null, icon: null, name: '' }

export function CategoryManagement() {
  const client = useQueryClient()
  const categories = useQuery({
    queryFn: getCategories,
    queryKey: ['categories'],
  })
  const [editing, setEditing] = useState<{
    id: string
    input: CategoryInput
  } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{
    id: string
    name: string
  } | null>(null)
  const mutation = useMutation({
    mutationFn: async (input: CategoryInput) =>
      editing === null
        ? createCategory(input)
        : updateCategory(editing.id, input),
    onSuccess: () => {
      setEditing(null)
      void client.invalidateQueries({ queryKey: ['categories'] })
    },
  })
  const removal = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      setPendingDelete(null)
      void client.invalidateQueries({ queryKey: ['categories'] })
    },
  })
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
    <section className="category-management" aria-labelledby="categories-title">
      <header className="section-heading">
        <h2 id="categories-title">Custom categories</h2>
        <p>
          Use these for personal analytics. Imported Monobank and MCC categories
          remain unchanged.
        </p>
      </header>
      <form
        className="category-form"
        key={editing?.id ?? 'new'}
        onSubmit={submit}
      >
        <h3>{editing === null ? 'Add category' : 'Edit category'}</h3>
        <FormField label="Name">
          <input
            autoComplete="off"
            name="name"
            defaultValue={editing?.input.name ?? EMPTY.name}
            maxLength={80}
            required
          />
        </FormField>
        <FormField label="Icon" hint="Letters, numbers, or hyphen">
          <input
            autoComplete="off"
            name="icon"
            defaultValue={editing?.input.icon ?? ''}
            maxLength={32}
            pattern="[A-Za-z0-9-]+"
          />
        </FormField>
        <FormField label="Color token" hint="Letters, numbers, or hyphen">
          <input
            autoComplete="off"
            name="colorToken"
            defaultValue={editing?.input.colorToken ?? ''}
            maxLength={32}
            pattern="[A-Za-z0-9-]+"
          />
        </FormField>
        <div className="transaction-correction-actions">
          <Button loading={mutation.isPending} type="submit">
            {mutation.isPending
              ? 'Saving…'
              : editing === null
                ? 'Add category'
                : 'Save category'}
          </Button>
          {editing !== null ? (
            <Button
              type="button"
              onClick={() => setEditing(null)}
              variant="secondary"
            >
              Cancel
            </Button>
          ) : null}
        </div>
        {mutation.isError ? (
          <Alert tone="danger">Category could not be saved.</Alert>
        ) : null}
      </form>
      {categories.isPending ? (
        <Skeleton label="Loading categories…" lines={2} />
      ) : null}
      {categories.isError ? (
        <Alert tone="danger">Categories could not be loaded.</Alert>
      ) : null}
      {categories.data?.length === 0 ? (
        <EmptyState title="No custom categories">
          <p>Add a category to personalize transaction analytics.</p>
        </EmptyState>
      ) : null}
      <ul className="category-list">
        {categories.data?.map((category) => (
          <li key={category.id}>
            <CategoryChip
              color={category.colorToken}
              label={
                category.icon
                  ? `${category.icon} ${category.name}`
                  : category.name
              }
            />
            <div>
              <span>{category.colorToken ?? 'Default color'}</span>
            </div>
            <div className="transaction-correction-actions">
              <Button
                size="small"
                type="button"
                onClick={() =>
                  setEditing({
                    id: category.id,
                    input: {
                      name: category.name,
                      icon: category.icon,
                      colorToken: category.colorToken,
                    },
                  })
                }
                variant="secondary"
              >
                Edit
              </Button>
              <Button
                disabled={removal.isPending}
                size="small"
                type="button"
                onClick={() => {
                  removal.reset()
                  setPendingDelete({ id: category.id, name: category.name })
                }}
                variant="danger"
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <Dialog
        onClose={() => {
          if (!removal.isPending) {
            removal.reset()
            setPendingDelete(null)
          }
        }}
        open={pendingDelete !== null}
        title="Delete category?"
      >
        <p>
          {pendingDelete?.name ?? 'This category'} will be permanently removed.
          Categories currently used by transactions cannot be deleted.
        </p>
        {removal.isError ? (
          <Alert tone="danger" title="Category is still in use">
            Reset or reassign its transaction overrides first.
          </Alert>
        ) : null}
        <div className="transaction-correction-actions">
          <Button
            disabled={removal.isPending}
            onClick={() => setPendingDelete(null)}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            loading={removal.isPending}
            onClick={() => {
              if (pendingDelete !== null) removal.mutate(pendingDelete.id)
            }}
            variant="danger"
          >
            Delete category
          </Button>
        </div>
      </Dialog>
    </section>
  )
}
function optional(value: string): string | null {
  return value.trim() || null
}
