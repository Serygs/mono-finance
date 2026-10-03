# Phase 4 proposal: financial semantics and synchronization

Status: technical specification for separate review. Phases 0–3 do not introduce these classifications or formulas. D1 remains authoritative; imported records remain immutable; the browser uses same-origin authenticated `/api/*`. All public contracts retain `{ data }` / `{ error: { code, message } }`.

## Verified current behavior

`worker/services/analytics-service.ts` resolves adjusted amounts, excludes excluded records, groups effective categories and keeps currencies separate unless base-currency reporting is requested. Direction is assigned at import; adjustments cannot reverse its sign (`transaction-correction-service.ts`). KPI expense totals use expense magnitude; incoming totals include all imported incoming movements. Net cash flow is their difference, not savings. Compensation links affect the separate personal expense summary, not primary cash-flow totals. Refunds, own transfers and credit movements do not have verified domain classification.

`analytics-repository.ts` and `transactions-repository.ts` resolve category precedence as transaction override → owner source mapping → original code/name. Transaction lists now support exact effective category IDs and explicit uncategorized queries. Short display labels never supply identity.

`currency-conversion.ts` uses integer/rational conversion against stored historical rates, retains missing-rate amounts in original currencies and reports missing-rate counts. A stored-rate report is distinct from an original-currency ledger. Existing rate-selection and rounding behavior must be characterized before any revision. Some existing averages/projections use Number division and Math.round; replacing this with checked integer/rational rounding needs dedicated boundary tests and a versioned compatibility decision, not an incidental UI edit.

`transaction-sync-window.ts` processes one account window per attempt, up to 2,682,000 seconds. It backfills toward a stored start cursor, then incrementally refreshes with overlap. A maximum transaction timestamp is an incremental cursor, not coverage evidence. No-transaction history may reach a no-op; long outages can leave unverified gaps. Existing synchronization does not prove unlimited history completeness.

The phase 3 migration starts balance timestamps and interval evidence without inferring legacy facts. Each new successful account snapshot updates only returned accounts' `balance_updated_at`; marking an absent account unavailable does not refresh its balance time. Statement intervals are committed with sync metadata after successful validation/import. Empty successful provider responses may establish an interval; a no-op or failure cannot. Gaps remain distinct; existing transaction min/max and old `updated_at` never fill them.

## Classification contract

Introduce a separate classification projection:

- `purchase`: verified outgoing payment for consumption, with an evidence source.
- `income`: verified incoming economic income, distinct from generic incoming cash.
- `internal_transfer`: confirmed movement between accounts belonging to this owner.
- `refund`: confirmed return linked to an earlier purchase or an explicitly classified standalone refund.
- `credit_movement`: verified borrowing, repayment or other debt movement, with a specific subtype.
- `unknown`: insufficient evidence. Sign, MCC or equal amount alone cannot establish the other types.

Keep original transaction facts and imported direction unchanged. Store owner classification revisions in a separate table with transaction ID, type/subtype, rule/version or manual origin, evidence reference, created/updated revision, actor and optional note. Never copy a current heuristic classification into immutable source columns.

Precedence: explicit manual classification → owner-approved deterministic rule at a recorded version → verified provider fact if supported → unknown. Existing category overrides are orthogonal: category identity does not automatically classify transfers/refunds. A manual choice survives rule changes. Removing a manual classification restores the next supported resolution with a preview; undo restores the exact previous revision.

## Own-transfer links

A link stores both source IDs, owner/account identity, source amounts/currencies, timestamps, any fee/FX evidence, proposed/confirmed/rejected status and confirmation audit revision. Require two owner accounts and independent supporting evidence (counterparty details when available, provider reference, temporal relationship); equal amount is only candidate ranking evidence. Require explicit owner confirmation for uncertain candidates. Conflicting/partial links require review. Reject duplicate allocation and cross-owner references. Unknown remains unknown until sufficient evidence exists.

Cash-flow reporting may show both legs as bank movements. An optional owner-wide external-cash-flow view excludes only confirmed own-transfer legs; an account-scoped view still exposes account movement. Fees remain separate consumption expense if verified. Cross-currency legs require historical FX evidence; matching by current FX is prohibited.

## Cash flow and consumption expense

Expose an explicit typed `reportingView` and version (`cash-flow-v1`, proposed `consumption-v1`), alongside amount mode, exclusion policy, account IDs, UTC epoch boundaries, currency mode and conversion revision. Every aggregate and its paginated contributor endpoint must accept the same semantics.

Cash flow preserves effective signed bank movements. Consumption expense includes verified purchases and their specifically linked refunds/compensations, excludes confirmed transfer principal and separately identified debt principal, and exposes unknown outgoing amounts as an explicit unresolved group. Interest/fees must not be guessed from credit limit. Do not apply balance minus creditLimit to calculate own funds; debt/available funds need verified provider definitions and separate facts first.

For compensation, retain the expense and incoming originals. Allocation remains an explicit relationship, with per-link minor units and currency compatibility validation. Limit allocation to available amounts; prevent the same incoming amount from explaining multiple expenses twice. A compensation is reimbursement, not automatically a purchase refund or own transfer. Personal expense must clearly state whether linked incoming movements are removed from its incoming side and how out-of-period reimbursements are attributed.

Refunds require links or explicit manual classification. Separate `cashDate` (bank movement date) from `consumptionAttributionDate` (chosen original-purchase attribution). Default compatibility must preserve current cash-date behavior. Specify full/partial refunds, multiple refunds, excluded legs, out-of-period legs and disputes before enabling net consumption totals. No silent netting of unrelated incoming transactions.

## Reproducible conversion

Store immutable rate revisions (source/target currency, numerator/denominator, minor-unit scales, effective date, provider/source, retrieval time and revision ID). Converted reports must identify rate-selection policy, rate revision and rounding policy. Choose the supported historical rate at the transaction date according to the reviewed contract; never substitute today's rate for missing history. Amounts remain signed checked integers; use BigInt rational arithmetic and a specified tie-breaking rule for divisions. Aggregate after per-record conversion only if that is the documented contract. Never mix converted and original values in an apparently single-currency total; missing rates must remain separately visible.

Provide a contributors endpoint returning original, effective, report amount, currency, conversion revision and allocation contributions. This is the prerequisite for exact drill-down from converted or consumption aggregates. The current UI intentionally explains that original-currency lists cannot exactly reconcile a converted total.

## Migration, compatibility and audit

Add classifications, relationship revisions and conversion snapshots through additive migrations. Existing records default to unknown classification; the default view remains current effective cash flow. Do not recalculate saved reports or reassign user categories. Persist report semantics/version in preferences and URLs only once introduced; preserve old query behavior. Introduce dual-run comparisons on controlled fixtures before switching any default.

Audit every classification/link/rule/conversion change with before/after revision references, actor, timestamp and operation ID. Undo appends a compensating revision rather than deleting audit history. Reject stale edits using revision checks and report a safe conflict envelope. Use transactions/batches to make multi-record relationship edits atomic. Undo must restore resolved totals and classification without modifying source records. Secrets and provider credentials never enter the audit export.

## Synchronization follow-up

Official documentation checked 2026-10-02: [Monobank Personal API](https://api.monobank.ua/docs/) documents statement windows of 31 days + one hour (2,682,000 seconds), client-info and statement request limits of one request per 60 seconds, and webhook registration. [D1 database API](https://developers.cloudflare.com/d1/worker-api/d1-database/) confirms transactional batch semantics. Recheck official documentation before any integration change; do not infer undocumented delivery guarantees or limits.

Model a durable requested interval and its attempts: pending/running/failed/succeeded, lease owner/expiry, request boundaries, completion time, failure category, resume cursor and provider evidence. Normalize the union of successful intervals without filling gaps; preserve completion-time provenance separately so old successful windows can be shown as old observations. Period coverage requires every selected account to cover all requested bounds. Future bounds and legacy gaps stay unverified. Coverage means successful imports of requested windows, not proof that the bank will never amend a historical statement.

Backfill must use controlled bounded windows and a user-visible requested range. Separate backfill cursor, last attempted interval and newest successful window. Resume the same failed interval; never advance through failure. After a long outage, queue missing intervals rather than clipping to the newest maximum window and calling it complete. Empty successful windows advance coverage; a no-op does not. Add bounded retention/compaction for interval metadata to avoid an indefinitely growing status response. Retain gap evidence and audit data in D1; do not compress min/max into continuous coverage.

Preserve the existing durable shared Personal API request gate; honor Retry-After, cap retries, use bounded exponential backoff/jitter and store next attempt time. Release/renew leases predictably; cover crash-after-import-before-completion using idempotent immutable source IDs and repeatable completion. Query contributor pagination must remain independent of import cursor pagination.

Webhook ingestion is optional future work. Registration and credentials remain Worker-only; a protected endpoint validates supported payloads, owner/account identity, deduplicates provider transaction IDs, responds promptly and records ingestion status. Do not claim provider signatures or exactly-once delivery unless the official contract provides them. A webhook cannot populate old history and cannot by itself prove interval coverage. Periodic statement reconciliation remains necessary. Reconciliation must report source discrepancies for review rather than overwriting immutable imported records.

## Acceptance gates for a later implementation

Controlled fixtures must cover unknown classification, two unrelated equal payments, ambiguous transfers, partial and cross-period reimbursements/refunds, credit principal versus verified fee, duplicate webhook/statement arrival, empty intervals, failure/resume/crash, gap unions, multiple accounts/currencies, missing historical rates and rounding boundaries. Compare aggregate contributions against full cursor queries using identical semantics. Verify undo and migration preserve current totals/preferences. No new classification or default formula is authorized by this specification alone.
