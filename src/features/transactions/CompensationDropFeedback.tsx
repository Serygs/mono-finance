import { Button } from '../../components/ui/Controls'
import { Alert } from '../../components/ui/Feedback'
import { useLocalization } from '../localization/localization'
import { formatMinorAmount } from './transaction-formatting'
import {
  NothingToLinkError,
  type CompensationDrop,
} from './use-compensation-drop'

export function CompensationDropFeedback({ drop }: { drop: CompensationDrop }) {
  const { locale, t } = useLocalization()
  const { linkError, result, undoError } = drop
  if (linkError !== null)
    return (
      <Alert className="transactions-drop-feedback" tone="danger">
        <div className="transactions-drop-feedback__actions">
          <span>
            {t(
              linkError instanceof NothingToLinkError
                ? 'This incoming transaction is already linked or the expense is fully compensated.'
                : 'Compensation could not be saved. Try again later.',
            )}
          </span>
          <Button
            onClick={drop.dismiss}
            size="small"
            type="button"
            variant="quiet"
          >
            {t('Close')}
          </Button>
        </div>
      </Alert>
    )
  if (result === null) return null
  return (
    <Alert
      className="transactions-drop-feedback"
      tone={undoError === null ? 'success' : 'danger'}
    >
      <div className="transactions-drop-feedback__actions">
        <span>
          {undoError === null
            ? t('Linked {amount}: {income} → {expense}.', {
                amount: formatMinorAmount(
                  result.amountMinor,
                  result.expense,
                  locale,
                ).replace(/^[+−]/, ''),
                expense: result.expense.originalDescription,
                income: result.income.originalDescription,
              })
            : t('Compensation could not be saved. Try again later.')}
        </span>
        <Button
          disabled={drop.undoPending}
          loading={drop.undoPending}
          onClick={drop.undo}
          size="small"
          type="button"
          variant="quiet"
        >
          {t('Undo')}
        </Button>
        <Button
          disabled={drop.undoPending}
          onClick={drop.dismiss}
          size="small"
          type="button"
          variant="quiet"
        >
          {t('Close')}
        </Button>
      </div>
    </Alert>
  )
}
