# FundiPro P0 Gaps — Design

## Architecture Overview
All features extend the existing Express + JSON-store backend and React/Vite frontend. No new dependencies required for most features. PDF export uses the existing `pdfkit` package.

---

## 1. Password Reset & Account Recovery

### Backend
- `POST /api/auth/change-password` — authenticated, requires `{ current_password, new_password }`
- Admin route: `PATCH /api/admin/users/:id/reset-password` — sets a new password, logs the action

### Frontend
- `Settings.jsx` — add "Change Password" section with current/new/confirm fields
- `Login.jsx` — add "Forgot password?" link that shows a message: "Contact admin on WhatsApp to reset your password" (since there's no email/SMS yet — pragmatic for MVP)
- Admin `AdminFundis.jsx` — add "Reset Password" action per user

### Data
- No new tables. Uses existing `users` table with `password_hash`.
- Audit log entry on password change.

---

## 2. Account Suspension & Deletion

### Backend
- `PATCH /api/admin/users/:id/status` — `{ status: "active" | "suspended" | "deleted" }`
- Auth middleware checks `user.status !== "suspended"` on every request
- Deleted users: set `status: "deleted"`, exclude from all queries

### Frontend
- `AdminFundis.jsx` — Suspend / Reactivate / Delete buttons per fundi
- `Login.jsx` — show "Account suspended. Contact support." if login returns 403
- `Settings.jsx` — "Request account deletion" button sends a support ticket

### Data
- `users.status` already exists. Add `"deleted"` as a valid value.
- Audit log entry on status change.

---

## 3. Audit Logs

### Backend
- New table: `audit_logs` — `{ id, event_type, actor_id, actor_name, target_id, target_name, metadata, created_at }`
- `auditLog(event_type, actor, target, metadata)` helper function in `server/lib/audit.js`
- Events to log: `login`, `password_change`, `account_suspended`, `account_deleted`, `tier_changed`, `admin_action`
- `GET /api/admin/audit-logs?page=1&limit=20` — paginated, admin only

### Frontend
- New page: `AdminAuditLog.jsx`
- Shows table: timestamp, event, actor, target, details
- Linked from Admin sidebar

### Data
```json
{
  "id": "...",
  "event_type": "account_suspended",
  "actor_id": "admin_id",
  "actor_name": "Andrew Wekesa",
  "target_id": "fundi_id",
  "target_name": "John Mose",
  "metadata": {},
  "created_at": "2026-08-10T..."
}
```

---

## 4. Sales Module

### Backend
- New table: `sales` — `{ id, user_id, amount, description, customer_id, customer_name, payment_method, date, created_at }`
- `GET /api/sales` — list fundi's sales, supports `?from=&to=` filters
- `POST /api/sales` — create sale
- `PATCH /api/sales/:id` — edit sale
- `DELETE /api/sales/:id` — delete sale
- New route file: `server/routes/sales.js`

### Frontend
- New page: `client/src/pages/fundi/Sales.jsx`
- List of sales with total at top
- "Add Sale" modal/form
- Date filter bar (Today / This Week / This Month / Custom)
- Linked in `AppShell.jsx` sidebar and `App.jsx` routes

---

## 5. Expenses Module

### Backend
- New table: `expenses` — `{ id, user_id, amount, category, description, date, created_at }`
- Categories: `materials`, `tools`, `transport`, `rent`, `utilities`, `labour`, `marketing`, `other`
- `GET /api/expenses` — list fundi's expenses, supports `?from=&to=&category=` filters
- `POST /api/expenses` — create expense
- `PATCH /api/expenses/:id` — edit expense
- `DELETE /api/expenses/:id` — delete expense
- New route file: `server/routes/expenses.js`

### Frontend
- New page: `client/src/pages/fundi/Expenses.jsx`
- List with category badges and total
- "Add Expense" modal/form
- Date + category filter
- Linked in sidebar and routes

---

## 6. Profit Reports

### Backend
- `GET /api/reports/profit?from=&to=` — aggregates sales + job income vs expenses
- Returns: `{ total_income, total_expenses, gross_profit, margin_pct, income_by_source, expenses_by_category }`
- `GET /api/reports/profit/pdf?from=&to=` — streams a PDF using pdfkit

### Frontend
- Enhance existing `Stats.jsx` or create new `Reports.jsx`
- Date range selector (preset + custom)
- Summary cards: Income / Expenses / Profit / Margin
- Breakdown tables
- "Download PDF" button

---

## 7. Subscription Enforcement

### Backend
- Middleware `server/middleware/checkTier.js` — accepts required tier, returns 403 with upgrade info if not met
- `enforceTier("pro")` and `enforceTier("business")` applied to relevant routes
- Cron-like check on login: if `tier_status === "active"` and subscription expired > 7 days → downgrade to free
- `PATCH /api/admin/users/:id/tier` — admin manual override

### Frontend
- `ProtectedRoute.jsx` — add tier check, show `<UpgradePrompt/>` if feature is locked
- New component: `UpgradePrompt.jsx` — shows current plan, what's locked, CTA to billing
- `Dashboard.jsx` — add plan status card showing tier, expiry, upgrade CTA
- `Billing.jsx` — show current plan clearly with feature comparison table

---

## Implementation Order
1. Audit log infrastructure (needed by all others)
2. Account suspension & deletion
3. Password change (self-service)
4. Subscription enforcement
5. Sales module
6. Expenses module
7. Profit reports
