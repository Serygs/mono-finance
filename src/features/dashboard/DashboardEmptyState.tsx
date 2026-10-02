import {
  useLocalization,
  type TranslationKey,
} from '../localization/localization'

export function DashboardEmptyState({
  message = 'No data in this period.',
}: {
  message?: TranslationKey
}) {
  const { t } = useLocalization()
  return <p className="chart-empty">{t(message)}</p>
}
