# FundiPro P0 Gap Requirements

## Overview
Implement the missing P0 (must-have) features identified in the FundiPro New System Requirements Specification v2.0. These gaps must be closed before FundiPro can be considered a production-ready MVP.

## Requirements

### 1. Password Reset & Account Recovery
**User Story:** As a fundi, I want to reset my password if I forget it, so I can regain access to my account.

**Acceptance Criteria:**
- A fundi can request a password reset from the login page using their phone number
- Admin can manually reset any user's password from the admin dashboard
- A fundi can change their own password from the Settings page while logged in
- Password must be at least 6 characters
- Old password is required to set a new one (self-service change)

### 2. Account Suspension & Deletion
**User Story:** As an admin, I want to suspend or delete fundi accounts, so I can moderate the platform.

**Acceptance Criteria:**
- Admin can suspend a fundi account — suspended accounts cannot log in
- Admin can reactivate a suspended account
- Admin can delete an account — deleted accounts are removed from the platform
- A suspended fundi sees a clear "account suspended" message on login attempt
- Fundi can request account deletion from their Settings page

### 3. Audit Logs
**User Story:** As an admin, I want to see a log of important system events, so I can audit security and operational actions.

**Acceptance Criteria:**
- The system records: login, password change, account suspension/deletion, tier upgrade/downgrade, admin actions
- Each log entry has: event type, actor (who did it), target (who it affected), timestamp
- Admin can view the audit log in the admin dashboard
- Logs are read-only — no editing or deleting entries
- Logs are paginated (20 per page)

### 4. Sales Module (separate from Jobs)
**User Story:** As a fundi, I want to record sales independently from jobs, so I can track all income including walk-in sales and quick transactions.

**Acceptance Criteria:**
- Fundi can add a sale with: amount, description, customer (optional), date, payment method (cash/M-Pesa)
- Sales are listed with date, amount, description and customer name
- Sales total is shown on the dashboard
- Sales can be filtered by date range (today, this week, this month, custom)
- Sales can be linked to an existing customer record
- Sales can be edited or deleted by the fundi who created them

### 5. Expenses Module (separate from Jobs)
**User Story:** As a fundi, I want to record business expenses independently, so I can track all costs and see true profit.

**Acceptance Criteria:**
- Fundi can add an expense with: amount, category, description, date
- Expense categories: Materials, Tools/Equipment, Transport, Rent, Utilities, Labour, Marketing, Other
- Expenses are listed with date, category, amount and description
- Expenses total is shown on the dashboard
- Expenses can be filtered by date range and category
- Expenses can be edited or deleted

### 6. Profit Reports with Date Ranges
**User Story:** As a fundi, I want to see profit reports for any time period, so I can understand my business performance.

**Acceptance Criteria:**
- Report shows: total sales/income, total expenses, gross profit, profit margin %
- Pre-set ranges: Today, This Week, This Month, Last Month, This Year
- Custom date range picker (from date → to date)
- Report breaks down income by source (jobs vs direct sales)
- Report breaks down expenses by category
- Report can be printed or saved as PDF
- Dashboard shows a summary card with current month profit

### 7. Subscription Enforcement (Feature Gating)
**User Story:** As the platform, I want to restrict paid features to active subscribers, so the business model is enforced.

**Acceptance Criteria:**
- Free tier: max 3 jobs per month, storefront not publicly verified, no client management
- Pro tier: unlimited jobs, verified storefront, no client management
- Business tier: unlimited jobs, verified storefront, client management, SMS reminders
- When a fundi's paid subscription expires, they are downgraded to Free tier after 7-day grace period
- Attempting to use a restricted feature shows a clear upgrade prompt
- Dashboard shows current plan, expiry date and upgrade CTA
- Admin can manually override a fundi's tier

## Out of Scope for This Spec
- M-Pesa STK push (P1 — separate spec)
- SMS notifications (P1 — separate spec)
- Staff accounts (P2)
- Mobile apps (P3)
