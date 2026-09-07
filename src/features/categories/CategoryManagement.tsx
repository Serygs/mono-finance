import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ['categories'] }),
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
      <div>
        <p className="eyebrow">Classification</p>
        <h1 id="categories-title">Custom categories</h1>
        <p className="page-description">
          Use these for personal analytics. Imported Monobank and MCC categories
          remain unchanged.
        </p>
      </div>
      <form
        className="category-form"
        key={editing?.id ?? 'new'}
        onSubmit={submit}
      >
        <h2>{editing === null ? 'Add category' : 'Edit category'}</h2>
        <label>
          Name
          <input
            name="name"
            defaultValue={editing?.input.name ?? EMPTY.name}
            maxLength={80}
            required
          />
        </label>
        <label>
          Icon <span>(letters, numbers, hyphen)</span>
          <input
            name="icon"
            defaultValue={editing?.input.icon ?? ''}
            maxLength={32}
            pattern="[A-Za-z0-9-]+"
          />
        </label>
        <label>
          Color token <span>(letters, numbers, hyphen)</span>
          <input
            name="colorToken"
            defaultValue={editing?.input.colorToken ?? ''}
            maxLength={32}
            pattern="[A-Za-z0-9-]+"
          />
        </label>
        <div className="transaction-correction-actions">
          <button disabled={mutation.isPending} type="submit">
            {mutation.isPending
              ? 'Saving…'
              : editing === null
                ? 'Add category'
                : 'Save category'}
          </button>
          {editing !== null ? (
            <button
              className="secondary-action"
              type="button"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          ) : null}
        </div>
        {mutation.isError ? (
          <p className="transaction-correction-error" role="alert">
            Category could not be saved.
          </p>
        ) : null}
      </form>
      {categories.isPending ? (
        <p className="transaction-state">Loading categories…</p>
      ) : null}
      {categories.isError ? (
        <p className="transaction-state transaction-state-error" role="alert">
          Categories could not be loaded.
        </p>
      ) : null}
      {categories.data?.length === 0 ? (
        <p className="transaction-state">No custom categories yet.</p>
      ) : null}
      <ul className="category-list">
        {categories.data?.map((category) => (
          <li key={category.id}>
            <span
              className={
                category.colorToken === null
                  ? 'category-swatch'
                  : `category-swatch category-swatch-${category.colorToken}`
              }
              aria-hidden="true"
            />
            <div>
              <strong>
                {category.icon ? `${category.icon} ` : ''}
                {category.name}
              </strong>
              <span>{category.colorToken ?? 'Default color'}</span>
            </div>
            <div className="transaction-correction-actions">
              <button
                className="secondary-action"
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
              >
                Edit
              </button>
              <button
                className="danger-action"
                disabled={removal.isPending}
                type="button"
                onClick={() => removal.mutate(category.id)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      {removal.isError ? (
        <p className="transaction-correction-error" role="alert">
          This category cannot be deleted while transactions use it. Reset or
          reassign their overrides first.
        </p>
      ) : null}
    </section>
  )
}
function optional(value: string): string | null {
  return value.trim() || null
}
