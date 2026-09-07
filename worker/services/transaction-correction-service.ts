export type TransactionCorrectionDirection = 'income' | 'expense'

export interface OwnedTransactionForCorrection {
  adjustmentAmountMinor: number | null
  direction: TransactionCorrectionDirection
  id: string
  isExcluded: boolean
  originalAmountMinor: number
  originalCurrencyCode: string
  originalDescription: string
  originalMcc: number | null
  originalTimestamp: number
  providerTransactionId: string
}

export interface TransactionCorrectionRepository {
  findOwnedTransaction(
    transactionId: string,
    userId: string,
  ): Promise<OwnedTransactionForCorrection | null>
  removeAdjustment(transactionId: string, userId: string): Promise<void>
  setExcluded(
    transactionId: string,
    userId: string,
    reason: string | null,
    updatedAt: number,
  ): Promise<void>
  setRestored(
    transactionId: string,
    userId: string,
    updatedAt: number,
  ): Promise<void>
  upsertAdjustment(input: {
    adjustedAmountMinor: number
    note: string | null
    transactionId: string
    updatedAt: number
    userId: string
  }): Promise<void>
}

export interface TransactionCorrectionResult {
  effectiveAmountMinor: number
  hasAdjustment: boolean
  id: string
  isExcluded: boolean
}

export class TransactionCorrectionError extends Error {
  readonly code: 'invalid_correction' | 'transaction_not_found'

  constructor(code: 'invalid_correction' | 'transaction_not_found') {
    super(code)
    this.code = code
  }
}

export class TransactionCorrectionService {
  private readonly repository: TransactionCorrectionRepository
  private readonly now: () => number

  constructor(
    repository: TransactionCorrectionRepository,
    now: () => number = () => Math.floor(Date.now() / 1_000),
  ) {
    this.repository = repository
    this.now = now
  }

  async saveAdjustment(
    userId: string,
    transactionId: string,
    input: { adjustedAmountMinor: number; note: string | null },
  ): Promise<TransactionCorrectionResult> {
    const transaction = await this.requiredTransaction(transactionId, userId)
    assertCompatibleDirection(transaction.direction, input.adjustedAmountMinor)
    await this.repository.upsertAdjustment({
      ...input,
      transactionId,
      updatedAt: this.now(),
      userId,
    })
    return toCorrectionResult(transaction, input.adjustedAmountMinor)
  }

  async resetAdjustment(
    userId: string,
    transactionId: string,
  ): Promise<TransactionCorrectionResult> {
    const transaction = await this.requiredTransaction(transactionId, userId)
    await this.repository.removeAdjustment(transactionId, userId)
    return toCorrectionResult(transaction, null)
  }

  async exclude(
    userId: string,
    transactionId: string,
    reason: string | null,
  ): Promise<TransactionCorrectionResult> {
    const transaction = await this.requiredTransaction(transactionId, userId)
    await this.repository.setExcluded(transactionId, userId, reason, this.now())
    return { ...toCorrectionResult(transaction), isExcluded: true }
  }

  async restore(
    userId: string,
    transactionId: string,
  ): Promise<TransactionCorrectionResult> {
    const transaction = await this.requiredTransaction(transactionId, userId)
    await this.repository.setRestored(transactionId, userId, this.now())
    return { ...toCorrectionResult(transaction), isExcluded: false }
  }

  resolveForAnalytics(
    transaction: Pick<
      OwnedTransactionForCorrection,
      'adjustmentAmountMinor' | 'isExcluded' | 'originalAmountMinor'
    >,
  ): { effectiveAmountMinor: number; isIncludedInNormalAnalytics: boolean } {
    return {
      effectiveAmountMinor: resolveEffectiveAmount(transaction),
      isIncludedInNormalAnalytics: !transaction.isExcluded,
    }
  }

  private async requiredTransaction(transactionId: string, userId: string) {
    const transaction = await this.repository.findOwnedTransaction(
      transactionId,
      userId,
    )
    if (transaction === null) {
      throw new TransactionCorrectionError('transaction_not_found')
    }
    return transaction
  }
}

export function resolveEffectiveAmount(
  transaction: Pick<
    OwnedTransactionForCorrection,
    'adjustmentAmountMinor' | 'originalAmountMinor'
  >,
): number {
  return transaction.adjustmentAmountMinor ?? transaction.originalAmountMinor
}

function assertCompatibleDirection(
  direction: TransactionCorrectionDirection,
  adjustedAmountMinor: number,
): void {
  if (
    !Number.isSafeInteger(adjustedAmountMinor) ||
    (direction === 'expense' && adjustedAmountMinor > 0) ||
    (direction === 'income' && adjustedAmountMinor < 0)
  ) {
    throw new TransactionCorrectionError('invalid_correction')
  }
}

function toCorrectionResult(
  transaction: OwnedTransactionForCorrection,
  adjustmentAmountMinor: number | null = transaction.adjustmentAmountMinor,
): TransactionCorrectionResult {
  return {
    effectiveAmountMinor:
      adjustmentAmountMinor ?? transaction.originalAmountMinor,
    hasAdjustment: adjustmentAmountMinor !== null,
    id: transaction.id,
    isExcluded: transaction.isExcluded,
  }
}
