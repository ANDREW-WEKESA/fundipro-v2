# FundiPro P0 Gaps — Tasks

## Task 1: Audit Log Infrastructure
- [ ] Create `audit_logs` table in store.js EMPTY_DB
- [ ] Create `server/lib/audit.js` with `auditLog(event_type, actor, target, metadata)` helper
- [ ] Add `GET /api/admin/audit-logs` route (paginated, admin only)
- [ ] Create `AdminAuditLog.jsx` page with paginated table
- [ ] Add "Audit Log" link to admin sidebar in `AdminLayout.jsx`
- [ ] Add route in `App.jsx`

## Task 2: Account Suspension & Deletion
- [ ] Update auth middleware to reject `status === "suspended"` with 403
- [ ] Add `PATCH /api/admin/users/:id/status` route
- [ ] Update `AdminFundis.jsx` with Suspend / Reactivate / Delete buttons
- [ ] Update `Login.jsx` to show suspension message on 403
- [ ] Add audit log entries for suspend/delete actions
- [ ] Add "Request deletion" button in `Settings.jsx` that creates a support ticket

## Task 3: Password Change
- [ ] Add `POST /api/auth/change-password` route (requires current password)
- [ ] Add `PATCH /api/admin/users/:id/reset-password` (admin sets new password directly)
- [ ] Add "Change Password" section in `Settings.jsx`
- [ ] Add "Reset Password" button in `AdminFundis.jsx`
- [ ] Add audit log on password change
- [ ] Add "Forgot password?" note on `Login.jsx` directing to WhatsApp support

## Task 4: Subscription Enforcement
- [ ] Create `server/middleware/checkTier.js`
- [ ] Apply `checkTier("pro")` to storefront public verification route
- [ ] Apply `checkTier("business")` to client management routes
- [ ] Add subscription expiry check on login — downgrade after grace period
- [ ] Create `UpgradePrompt.jsx` component
- [ ] Update `Dashboard.jsx` with plan status card
- [ ] Update `Billing.jsx` with feature comparison table
- [ ] Add `PATCH /api/admin/users/:id/tier` admin override route

## Task 5: Sales Module
- [ ] Add `sales` table to store.js EMPTY_DB
- [ ] Create `server/routes/sales.js` with GET/POST/PATCH/DELETE
- [ ] Register sales routes in `server.js`
- [ ] Create `client/src/pages/fundi/Sales.jsx`
- [ ] Add Sales link to `AppShell.jsx` sidebar
- [ ] Add `/app/sales` route in `App.jsx`
- [ ] Add sales total to `Dashboard.jsx` summary

## Task 6: Expenses Module
- [ ] Add `expenses` table to store.js EMPTY_DB
- [ ] Create `server/routes/expenses.js` with GET/POST/PATCH/DELETE
- [ ] Register expenses routes in `server.js`
- [ ] Create `client/src/pages/fundi/Expenses.jsx`
- [ ] Add Expenses link to `AppShell.jsx` sidebar
- [ ] Add `/app/expenses` route in `App.jsx`
- [ ] Add expenses total to `Dashboard.jsx` summary

## Task 7: Profit Reports
- [ ] Create `server/routes/reports.js` profit endpoint (or extend existing)
- [ ] Aggregate sales + jobs income vs expenses for date range
- [ ] Add PDF generation endpoint using pdfkit
- [ ] Enhance `Stats.jsx` or create `Reports.jsx` with:
  - Date range selector (preset + custom)
  - Summary cards (Income / Expenses / Profit / Margin)
  - Breakdown tables
  - Download PDF button
- [ ] Add Reports link to sidebar
- [ ] Add `/app/reports` route in `App.jsx`
