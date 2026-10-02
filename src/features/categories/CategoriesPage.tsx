import { PageHeader, PageSurface } from '../../components/ui/Page'
import { useLocalization } from '../localization/localization'
import { useCategoriesQuery } from './category-queries'
import { CategoryManagement } from './CategoryManagement'
import { CategorySourceManagement } from './CategorySourceManagement'

export function CategoriesPage() {
  const { t } = useLocalization()
  const categories = useCategoriesQuery()
  return (
    <PageSurface className="categories-page">
      <PageHeader
        description={
          <p>
            {t(
              'Use these for personal analytics. Imported Monobank and MCC categories remain unchanged.',
            )}
          </p>
        }
        id="categories-title"
        title={t('Categories')}
      />
      <section
        aria-labelledby="categories-title"
        className="category-management categories-management"
      >
        <CategoryManagement categories={categories} />
        <CategorySourceManagement categories={categories.data ?? []} />
      </section>
    </PageSurface>
  )
}
