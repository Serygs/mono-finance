# Phase 13: dashboard and charts

The authenticated overview route renders aggregate D1 analytics with the same
date range and account selection used by the dashboard. It requests the three
Phase 12 aggregate endpoints concurrently, then shows KPI cards, time series,
category and distribution charts, forecasts, merchant rankings, and recent
adjustment/compensation evidence.

The initial range is 90 days so the first provider-supported historical
backfill windows remain visible; the user can narrow it to 7 or 30 days.

The dashboard never combines original currencies. With “All original
currencies,” KPI values remain grouped by currency; charts use a single focused
currency. No current exchange rate is applied because the exchange-rate
read-model has not yet been implemented.

The account selection remains stored locally under the existing versioned
account-filter key. Dashboard data is always reloaded from same-origin private
API endpoints; no financial data is cached as an authoritative browser store.
