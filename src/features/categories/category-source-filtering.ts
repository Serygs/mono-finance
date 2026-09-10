import type { SourceCategory } from './categories-api'

export type MappingFilter = 'all' | 'mapped' | 'unmapped'

export function filterCategorySources(
  sources: readonly SourceCategory[],
  query: string,
  mappingFilter: MappingFilter,
): SourceCategory[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()

  return sources.filter((source) => {
    const matchesMapping =
      mappingFilter === 'all' ||
      (mappingFilter === 'mapped'
        ? source.mappedCategory !== null
        : source.mappedCategory === null)
    const matchesQuery =
      normalizedQuery === '' ||
      source.code.toLocaleLowerCase().includes(normalizedQuery) ||
      source.originalName.toLocaleLowerCase().includes(normalizedQuery)

    return matchesMapping && matchesQuery
  })
}
