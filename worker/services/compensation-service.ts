export type CompensationDirection = 'expense' | 'income'

export interface CompensationTransaction {
  direction: CompensationDirection
  id: string
  originalAmountMinor: number
  originalCurrencyCode: string
  originalDescription: string
  originalTimestamp: number
}

export interface CompensationLinkRecord {
  compensatedAmountMinor: number
  compensationTransactionId: string
  createdAt: number
  description: string
  expenseTransactionId: string
  id: string
  originalAmountMinor: number
  originalTimestamp: number
}

export interface CompensationRepository {
  createLink(input: {
    compensatedAmountMinor: number
    compensationTransactionId: string
    currencyCode: string
    expenseTransactionId: string
    userId: string
  }): Promise<void>
  deleteLink(
    linkId: string,
    expenseTransactionId: string,
    userId: string,
  ): Promise<void>
  findExpenseLinks(
    expenseTransactionId: string,
    userId: string,
  ): Promise<CompensationLinkRecord[]>
  findIncomeLinks(
    compensationTransactionId: string,
    userId: string,
  ): Promise<CompensationLinkRecord[]>
  findIncomeCandidates(
    userId: string,
    currencyCode: string,
  ): Promise<CompensationTransaction[]>
  findOwnedTransaction(
    transactionId: string,
    userId: string,
  ): Promise<CompensationTransaction | null>
}

export interface CompensationDetails {
  links: CompensationLinkRecord[]
  suggestions: CompensationSuggestion[]
  summary: CompensationSummary
}
export interface CompensationSummary {
  compensatedAmountMinor: number
  currencyCode: string
  originalExpenseAmountMinor: number
  remainingPersonalExpenseMinor: number
}
export interface CompensationSuggestion {
  availableAmountMinor: number
  confidenceScore: number
  description: string
  originalAmountMinor: number
  originalTimestamp: number
  transactionId: string
}
export class CompensationError extends Error {
  readonly code:
    'invalid_compensation' | 'link_not_found' | 'transaction_not_found'
  constructor(code: CompensationError['code']) {
    super(code)
    this.code = code
  }
}

export class CompensationService {
  private readonly repository: CompensationRepository

  constructor(repository: CompensationRepository) {
    this.repository = repository
  }

  async getDetails(
    userId: string,
    expenseTransactionId: string,
  ): Promise<CompensationDetails> {
    const expense = await this.requiredTransaction(userId, expenseTransactionId)
    this.assertExpense(expense)
    const links = await this.repository.findExpenseLinks(expense.id, userId)
    return {
      links,
      suggestions: await this.suggest(userId, expense, links),
      summary: summary(expense, links),
    }
  }

  async link(
    userId: string,
    expenseTransactionId: string,
    input: {
      compensatedAmountMinor: number
      compensationTransactionId: string
    },
  ): Promise<CompensationDetails> {
    const expense = await this.requiredTransaction(userId, expenseTransactionId)
    const income = await this.requiredTransaction(
      userId,
      input.compensationTransactionId,
    )
    this.assertExpense(expense)
    if (
      income.direction !== 'income' ||
      income.originalCurrencyCode !== expense.originalCurrencyCode ||
      !Number.isSafeInteger(input.compensatedAmountMinor) ||
      input.compensatedAmountMinor <= 0
    )
      throw new CompensationError('invalid_compensation')
    const expenseLinks = await this.repository.findExpenseLinks(
      expense.id,
      userId,
    )
    if (
      expenseLinks.some((link) => link.compensationTransactionId === income.id)
    )
      throw new CompensationError('invalid_compensation')
    const allIncomeLinks = await this.repository.findIncomeLinks(
      income.id,
      userId,
    )
    const usedByIncome = allIncomeLinks.reduce(
      (total, link) => total + link.compensatedAmountMinor,
      0,
    )
    const remainingExpense =
      -expense.originalAmountMinor -
      expenseLinks.reduce(
        (total, link) => total + link.compensatedAmountMinor,
        0,
      )
    if (
      input.compensatedAmountMinor > remainingExpense ||
      input.compensatedAmountMinor > income.originalAmountMinor - usedByIncome
    )
      throw new CompensationError('invalid_compensation')
    await this.repository.createLink({
      ...input,
      currencyCode: expense.originalCurrencyCode,
      expenseTransactionId,
      userId,
    })
    return this.getDetails(userId, expenseTransactionId)
  }

  async unlink(
    userId: string,
    expenseTransactionId: string,
    linkId: string,
  ): Promise<CompensationDetails> {
    const expense = await this.requiredTransaction(userId, expenseTransactionId)
    this.assertExpense(expense)
    const links = await this.repository.findExpenseLinks(expense.id, userId)
    if (!links.some((link) => link.id === linkId))
      throw new CompensationError('link_not_found')
    await this.repository.deleteLink(linkId, expense.id, userId)
    return this.getDetails(userId, expenseTransactionId)
  }

  private async suggest(
    userId: string,
    expense: CompensationTransaction,
    links: CompensationLinkRecord[],
  ): Promise<CompensationSuggestion[]> {
    const candidates = await this.repository.findIncomeCandidates(
      userId,
      expense.originalCurrencyCode,
    )
    const linkedIds = new Set(
      links.map((link) => link.compensationTransactionId),
    )
    const remaining = summary(expense, links).remainingPersonalExpenseMinor * -1
    const usable = candidates.filter(
      (candidate) =>
        !linkedIds.has(candidate.id) &&
        candidate.id !== expense.id &&
        candidate.originalAmountMinor > 0,
    )
    const exactSumExists = hasExactSum(
      usable.map((candidate) => candidate.originalAmountMinor),
      remaining,
    )
    return usable
      .map((candidate) => ({
        availableAmountMinor: candidate.originalAmountMinor,
        confidenceScore: score(expense, candidate, remaining, exactSumExists),
        description: candidate.originalDescription,
        originalAmountMinor: candidate.originalAmountMinor,
        originalTimestamp: candidate.originalTimestamp,
        transactionId: candidate.id,
      }))
      .filter((candidate) => candidate.confidenceScore >= 35)
      .sort(
        (left, right) =>
          right.confidenceScore - left.confidenceScore ||
          right.originalTimestamp - left.originalTimestamp ||
          left.transactionId.localeCompare(right.transactionId),
      )
      .slice(0, 12)
  }
  private async requiredTransaction(userId: string, id: string) {
    const transaction = await this.repository.findOwnedTransaction(id, userId)
    if (transaction === null)
      throw new CompensationError('transaction_not_found')
    return transaction
  }
  private assertExpense(transaction: CompensationTransaction) {
    if (
      transaction.direction !== 'expense' ||
      transaction.originalAmountMinor >= 0
    )
      throw new CompensationError('invalid_compensation')
  }
}

function summary(
  expense: CompensationTransaction,
  links: CompensationLinkRecord[],
): CompensationSummary {
  const compensatedAmountMinor = links.reduce(
    (total, link) => total + link.compensatedAmountMinor,
    0,
  )
  return {
    compensatedAmountMinor,
    currencyCode: expense.originalCurrencyCode,
    originalExpenseAmountMinor: expense.originalAmountMinor,
    remainingPersonalExpenseMinor:
      expense.originalAmountMinor + compensatedAmountMinor,
  }
}
function score(
  expense: CompensationTransaction,
  income: CompensationTransaction,
  remaining: number,
  exactSumExists: boolean,
): number {
  const amountScore =
    remaining > 0
      ? Math.max(
          0,
          Math.round(
            30 *
              (1 -
                Math.min(
                  Math.abs(remaining - income.originalAmountMinor) / remaining,
                  1,
                )),
          ),
        )
      : 0
  const timeScore = Math.max(
    0,
    20 -
      Math.floor(
        Math.abs(income.originalTimestamp - expense.originalTimestamp) /
          86_400 /
          3,
      ),
  )
  const words = expense.originalDescription
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 3)
  const descriptionScore = words.some((word) =>
    income.originalDescription.toLowerCase().includes(word),
  )
    ? 15
    : 0
  return Math.min(
    100,
    35 +
      amountScore +
      timeScore +
      descriptionScore +
      (exactSumExists && income.originalAmountMinor <= remaining ? 10 : 0),
  )
}
function hasExactSum(amounts: number[], target: number): boolean {
  if (target <= 0) return false
  const sums = new Set([0])
  for (const amount of amounts.slice(0, 20)) {
    for (const sum of [...sums]) {
      const next = sum + amount
      if (next === target) return true
      if (next < target) sums.add(next)
    }
  }
  return false
}
