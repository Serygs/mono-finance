import { useLayoutEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router'
import { PageHeader, PageSurface } from '../../components/ui/Page'
import { useLocalization } from '../localization/localization'
import { useCategoriesQuery } from './category-queries'
import { CategoryAnalysis } from './CategoryAnalysis'
import { CategoryManagement } from './CategoryManagement'
import { CategorySourceManagement } from './CategorySourceManagement'

type CategoryView = 'analysis' | 'manage' | 'bank-types'

export function CategoriesPage() {
  const { t } = useLocalization()
  const categories = useCategoriesQuery()
  const location = useLocation()
  const parameters = new URLSearchParams(location.search)
  const requested = parameters.get('categoryView')
  const view: CategoryView =
    requested === 'manage' || requested === 'bank-types'
      ? requested
      : 'analysis'
  const scroll = useRef<Partial<Record<CategoryView, number>>>({})
  const currentView = useRef(view)
  const rememberScroll = () => {
    scroll.current[currentView.current] = window.scrollY
  }
  useLayoutEffect(() => {
    currentView.current = view
    const frame = requestAnimationFrame(() =>
      window.scrollTo({ top: scroll.current[view] ?? 0, behavior: 'instant' }),
    )
    const remember = () => {
      scroll.current[view] = window.scrollY
    }
    window.addEventListener('popstate', remember)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('popstate', remember)
    }
  }, [view])
  function destination(next: CategoryView) {
    const search = new URLSearchParams(location.search)
    if (next === 'analysis') search.delete('categoryView')
    else search.set('categoryView', next)
    return {
      pathname: location.pathname,
      search: search.toString(),
      hash: location.hash,
    }
  }
  return (
    <PageSurface className="categories-page">
      <PageHeader id="categories-title" title={t('Categories')} />
      <nav
        className="categories-subnavigation"
        aria-label={t('Category views')}
      >
        <Link
          to={destination('analysis')}
          onClick={rememberScroll}
          aria-current={view === 'analysis' ? 'page' : undefined}
        >
          {t('Analysis')}
        </Link>
        <Link
          to={destination('manage')}
          onClick={rememberScroll}
          aria-current={view !== 'analysis' ? 'page' : undefined}
        >
          {t('Manage')}
        </Link>
      </nav>
      <div hidden={view !== 'analysis'}>
        <CategoryAnalysis
          active={view === 'analysis'}
          categories={categories.data ?? []}
        />
      </div>
      <section
        className="categories-management"
        hidden={view !== 'manage'}
        aria-label={t('Manage')}
      >
        <Link
          className="category-mapping-link"
          to={destination('bank-types')}
          onClick={rememberScroll}
        >
          <strong>{t('Bank transaction types')}</strong>
          <span>{t('Assign display categories to bank types')}</span>
        </Link>
        <CategoryManagement categories={categories} />
      </section>
      <div hidden={view !== 'bank-types'}>
        <Link
          className="category-return-link"
          to={destination('manage')}
          onClick={rememberScroll}
        >
          {t('Back to category management')}
        </Link>
        <CategorySourceManagement
          active={view === 'bank-types'}
          categories={categories.data ?? []}
        />
      </div>
    </PageSurface>
  )
}
