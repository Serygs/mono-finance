# Analytics boundary

Analytics queries read persisted D1 data only and return typed aggregates, never a ledger export. The Phase 12 service resolves effective amounts, exclusions, category overrides, and compensation links before aggregation; it keeps currencies separate until historical exchange rates are available for a reproducible base-currency view.
