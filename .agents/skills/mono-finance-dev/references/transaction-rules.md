# Transaction rules

## Immutability and corrections

Imported bank data is immutable. Never overwrite an imported transaction’s original amount, currency, description, MCC, timestamp, or Monobank transaction ID. Store adjustments, exclusions, category overrides, compensation links, notes, and audit metadata in separate records.

Resolve the adjusted amount centrally:

```ts
effectiveAmount = adjustedAmount ?? originalAmount
```

An exclusion is a separate user decision. Excluded transactions must not contribute to normal analytics; retain them so they can be displayed, audited, and restored.

## Compensation

A compensation connects one expense transaction with one or more incoming transactions. It does not mutate either original bank record.

```text
Expense:       -4000 UAH
Compensations: +1000 +1000 +1000 UAH
Personal effective expense: -1000 UAH
```

Model each link explicitly, preserve both source transactions, and support partial compensation. Do not silently equate an adjustment with a compensation: an adjustment resolves `effectiveAmount`; compensation calculates a separately visible personal-expense view.

## Money and currency

Store all monetary amounts in integer minor units. Never persist or compute stored money with floating-point values.

Always retain the original amount and original currency. When persisting a converted value, retain its target currency, exchange rate, and rate date/source so historical analytics can be reproduced. Do not silently rewrite historic amounts using the current exchange rate.
