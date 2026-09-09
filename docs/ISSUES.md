# FactBridge Issues

This document contains all tracked issues for the FactBridge project. Issues span smart contracts, frontend, and backend.

---

## Smart Contract Issues

### Issue #1: Implement invoice dispute resolution mechanism
**Labels:** `smart-contract`, `enhancement`, `priority:high`
**Milestone:** v1.0

**Description:** The current contract has a `Disputed` status in the `InvoiceStatus` enum but no function to trigger or resolve disputes. Need a `dispute_invoice` function callable by the buyer and a `resolve_dispute` function callable only by an admin oracle address.

**Acceptance Criteria:**
- [ ] `dispute_invoice(env, buyer, invoice_id)` - buyer can flag an invoice as disputed before maturity
- [ ] `resolve_dispute(env, oracle, invoice_id, in_favor_of_creator)` - admin oracle resolves
- [ ] Disputed invoices cannot be settled or defaulted until resolved
- [ ] Events emitted: `invoice_disputed`, `invoice_dispute_resolved`
- [ ] Tests covering dispute flow and edge cases

---

### Issue #2: Add share transfer/secondary trading functionality
**Labels:** `smart-contract`, `enhancement`, `priority:high`
**Milestone:** v1.0

**Description:** Liquidity providers currently cannot transfer or sell their shares to other parties. Need a `transfer_shares` function that allows share holders to sell shares on the secondary market before settlement.

**Acceptance Criteria:**
- [ ] `transfer_shares(env, from, to, invoice_id, share_count)` - transfer shares between addresses
- [ ] Validate that `from` owns at least `share_count` shares
- [ ] Emit `shares_transferred` event with from, to, invoice_id, share_count
- [ ] Storage tracks share ownership per address (not just aggregate)
- [ ] Tests for valid transfer, insufficient shares, self-transfer

---

### Issue #3: Implement dynamic interest rate calculation based on risk score
**Labels:** `smart-contract`, `enhancement`, `priority:medium`
**Milestone:** v1.1

**Description:** Currently all invoices have a fixed funding amount. Need a risk-based pricing mechanism where the expected return (discount rate) is calculated based on invoice amount, maturity duration, and creator's on-chain reputation.

**Acceptance Criteria:**
- [ ] Add `discount_rate` field to InvoiceToken (basis points, e.g., 500 = 5%)
- [ ] Risk scoring function: `calculate_discount(amount, days_to_maturity, creator_reputation)`
- [ ] Higher risk = higher discount rate = better return for liquidity providers
- [ ] Reputation stored in contract as `CreatorProfile` struct
- [ ] Tests with various risk scenarios

---

### Issue #4: Add batch invoice creation for enterprise users
**Labels:** `smart-contract`, `enhancement`, `priority:medium`
**Milestone:** v1.1

**Description:** Enterprise users need to create multiple invoices in a single transaction to reduce gas costs. Implement a `batch_create_invoices` function that accepts a vector of invoice parameters.

**Acceptance Criteria:**
- [ ] `batch_create_invoices(env, creator, invoices: Vec<InvoiceParams>)` creates multiple invoices
- [ ] Returns vector of created invoice IDs
- [ ] All-or-nothing: if any invoice fails validation, entire batch fails
- [ ] Event emitted for each invoice in the batch
- [ ] Gas cost benchmark: batch of 10 should cost less than 10 individual transactions

---

### Issue #5: Implement early settlement with penalty calculation
**Labels:** `smart-contract`, `enhancement`, `priority:medium`
**Milestone:** v1.0

**Description:** Buyers should be able to settle invoices before the maturity date with a small penalty fee distributed to shareholders as incentive. The penalty decreases linearly as maturity approaches.

**Acceptance Criteria:**
- [ ] `early_settle(env, buyer, invoice_id)` callable before maturity
- [ ] Penalty formula: `penalty = base_penalty * (days_remaining / total_days)` capped at `max_penalty`
- [ ] Penalty distributed proportionally to shareholders
- [ ] Remaining principal + penalty sent to shareholders
- [ ] Emit `invoice_early_settled` event with penalty amount
- [ ] Tests verifying penalty calculation at various time points

---

### Issue #6: Add contract upgrade mechanism using Soroban upgradeable contracts
**Labels:** `smart-contract`, `infrastructure`, `priority:high`
**Milestone:** v1.0

**Description:** The contract needs a safe upgrade mechanism for bug fixes and feature additions. Implement using Soroban's upgradeable contract pattern with an admin-controlled upgrade function.

**Acceptance Criteria:**
- [ ] Admin address stored in contract storage during initialization
- [ ] `upgrade_wasm(env, admin, new_wasm_hash)` - only admin can trigger upgrade
- [ ] `transfer_admin(env, current_admin, new_admin)` - admin transfer with 24h timelock
- [ ] Events emitted: `contract_upgraded`, `admin_transferred`
- [ ] Tests for admin-only access, upgrade flow, unauthorized attempts

---

### Issue #7: Implement partial share purchase with minimum share threshold
**Labels:** `smart-contract`, `bug`, `priority:high`
**Milestone:** v1.0

**Description:** Currently `purchase_shares` has no minimum share count validation. A buyer could purchase 0 shares, or purchase shares worth less than the minimum transaction fee, creating dust attacks.

**Acceptance Criteria:**
- [ ] Add `MIN_SHARES_PER_PURCHASE` constant (e.g., 10 shares minimum)
- [ ] Validate `share_count >= MIN_SHARES_PER_PURCHASE` in `purchase_shares`
- [ ] Validate `share_count <= shares_total - shares_sold` (cannot exceed available)
- [ ] Return clear error for each validation failure
- [ ] Tests for minimum threshold and overflow cases

---

### Issue #8: Add invoice metadata hash verification
**Labels:** `smart-contract`, `security`, `priority:medium`
**Milestone:** v1.0

**Description:** The `metadata_uri` field is stored as a plain string. Add a `metadata_hash` field (SHA-256) to ensure the off-chain metadata cannot be tampered with after invoice creation.

**Acceptance Criteria:**
- [ ] Add `metadata_hash: BytesN<32>` to InvoiceToken
- [ ] `create_invoice` requires both `metadata_uri` and `metadata_hash`
- [ ] `verify_metadata(env, invoice_id, provided_hash)` returns bool
- [ ] Event includes metadata_hash for indexer verification
- [ ] Tests for hash matching and mismatch scenarios

---

### Issue #9: Implement invoice cancellation by creator before funding
**Labels:** `smart-contract`, `enhancement`, `priority:medium`
**Milestone:** v1.0

**Description:** Creators need to cancel invoices that haven't received any funding yet. Once funded, cancellation should not be allowed (must go through dispute or default flow).

**Acceptance Criteria:**
- [ ] `cancel_invoice(env, creator, invoice_id)` - only creator can cancel
- [ ] Only invoices with `funded_amount == 0` and status `Created` can be cancelled
- [ ] Status changes to `Defaulted` (repurposed as "cancelled") or add new `Cancelled` status
- [ ] Emit `invoice_cancelled` event
- [ ] Tests: cancel unfunded, reject cancel funded, reject non-creator cancel

---

### Issue #10: Add configurable platform fee mechanism
**Labels:** `smart-contract`, `enhancement`, `priority:high`
**Milestone:** v1.0

**Description:** The protocol needs a platform fee on successful settlements to fund development. Implement a configurable fee (in basis points) taken from the settlement amount, sent to a treasury address.

**Acceptance Criteria:**
- [ ] `set_platform_fee(env, admin, fee_bps)` - admin sets fee (max 1000 = 10%)
- [ ] `set_treasury(env, admin, treasury_address)` - admin sets fee recipient
- [ ] On settlement: `platform_fee = settlement_amount * fee_bps / 10000`
- [ ] Fee deducted before shareholder distribution
- [ ] Emit `fee_collected` event
- [ ] Tests for fee calculation, max cap, zero fee scenario

---

### Issue #11: Implement invoice maturity extension mechanism
**Labels:** `smart-contract`, `enhancement`, `priority:medium`
**Milestone:** v1.1

**Description:** Buyers and creators should be able to jointly agree to extend the maturity date of an invoice. Both parties must sign off on the extension.

**Acceptance Criteria:**
- [ ] `request_maturity_extension(env, requester, invoice_id, new_maturity_date)` - either party can request
- [ ] `approve_maturity_extension(env, approver, invoice_id)` - other party approves
- [ ] Both must agree; new_maturity_date must be > current maturity_date
- [ ] Max extension: 90 days from original maturity
- [ ] Emit `maturity_extended` event
- [ ] Tests for both-party approval, single-party rejection, max extension limit

---

### Issue #12: Add event indexing support with sequential event IDs
**Labels:** `smart-contract`, `infrastructure`, `priority:medium`
**Milestone:** v1.0

**Description:** Events need sequential IDs for reliable off-chain indexing. Implement an event counter in storage that increments with each emitted event.

**Acceptance Criteria:**
- [ ] Storage key `event_counter: u64` initialized to 0
- [ ] Each event emission increments counter and includes `event_id` in event data
- [ ] Event ID is part of the event topic for filtering
- [ ] Counter persists across calls (persistent storage)
- [ ] Tests verifying sequential IDs and persistence

---

### Issue #13: Implement time-locked fund withdrawal for creators
**Labels:** `smart-contract`, `security`, `priority:high`
**Milestone:** v1.0

**Description:** When a creator receives funds from share purchases, there should be a time-lock before they can withdraw. This prevents rug-pull scenarios where a creator receives funds and immediately disappears.

**Acceptance Criteria:**
- [ ] Add `withdrawal_lock_period: u64` constant (e.g., 604800 = 7 days in seconds)
- [ ] `withdraw_funds(env, creator, invoice_id)` only succeeds if `current_time >= created_at + lock_period`
- [ ] Funds are tracked per-invoice in storage
- [ ] Emit `funds_withdrawn` event with unlock timestamp
- [ ] Tests for locked withdrawal, unlocked withdrawal, time manipulation

---

### Issue #14: Add multi-currency support with Stellar Asset Contracts
**Labels:** `smart-contract`, `enhancement`, `priority:high`
**Milestone:** v1.1

**Description:** Currently invoices are denominated in a single currency string. Need to support actual Stellar Asset Contracts (SAC) for USDC, EURC, and custom tokens, with payments routed through the appropriate asset contract.

**Acceptance Criteria:**
- [ ] Add `asset_contract: Address` field to InvoiceToken
- [ ] Fund and settle operations use the specified asset contract
- [ ] Support for native XLM (Address::default()) and custom SAC tokens
- [ ] Cross-asset validation: funded asset must match invoice asset
- [ ] Tests with different asset types

---

### Issue #15: Implement invoice freezing by admin for compliance
**Labels:** `smart-contract`, `security`, `priority:medium`
**Milestone:** v1.0

**Description:** A compliance admin should be able to freeze suspicious invoices, preventing any further operations (funding, share purchase, settlement) until unfrozen.

**Acceptance Criteria:**
- [ ] `freeze_invoice(env, compliance_admin, invoice_id, reason)` - freeze with reason
- [ ] `unfreeze_invoice(env, compliance_admin, invoice_id)` - unfreeze
- [ ] Frozen invoices reject: fund, purchase_shares, settle, dispute
- [ ] Frozen status stored separately from InvoiceStatus (parallel flag)
- [ ] Emit `invoice_frozen` / `invoice_unfrozen` events
- [ ] Tests for freeze blocking operations and admin-only access

---

## Frontend Issues

### Issue #16: Implement real-time invoice status polling with WebSocket
**Labels:** `frontend`, `enhancement`, `priority:high`
**Milestone:** v1.0

**Description:** The invoice detail page currently requires manual refresh to see status changes. Implement WebSocket connection to receive real-time updates when invoice status changes on-chain.

**Acceptance Criteria:**
- [ ] WebSocket connection established on dashboard and invoice detail pages
- [ ] Invoice status updates push to UI without page refresh
- [ ] Connection auto-reconnects with exponential backoff
- [ ] Visual indicator showing WebSocket connection status
- [ ] Cleanup on component unmount (no memory leaks)
- [ ] Fallback to polling if WebSocket unavailable

---

### Issue #17: Add dark mode support across all components
**Labels:** `frontend`, `enhancement`, `priority:medium`
**Milestone:** v1.1

**Description:** The application only supports light mode. Add dark mode with system preference detection and manual toggle. All components need dark variant styling.

**Acceptance Criteria:**
- [ ] Dark mode toggle in settings and navbar
- [ ] System preference detection via `prefers-color-scheme`
- [ ] Theme persisted in localStorage
- [ ] All UI components have dark mode variants
- [ ] Charts and status badges have appropriate dark colors
- [ ] No flash of unstyled content on page load

---

### Issue #18: Implement responsive mobile navigation with hamburger menu
**Labels:** `frontend`, `enhancement`, `priority:high`
**Milestone:** v1.0

**Description:** The navbar doesn't collapse on mobile devices. Need a responsive hamburger menu that provides access to all navigation links on screens < 768px.

**Acceptance Criteria:**
- [ ] Hamburger icon appears on screens < 768px
- [ ] Slide-out drawer with all nav links
- [ ] Close on link click or overlay tap
- [ ] Wallet button remains accessible in mobile nav
- [ ] Smooth animation (slide from left)
- [ ] Focus trap when drawer is open (accessibility)

---

### Issue #19: Add invoice creation multi-step form progress indicator
**Labels:** `frontend`, `enhancement`, `priority:medium`
**Milestone:** v1.0

**Description:** The CreateInvoiceForm has 3 steps but no visual progress indicator. Users don't know which step they're on or how many steps remain. Add a step progress bar.

**Acceptance Criteria:**
- [ ] Horizontal step indicator showing Step 1/2/3 with labels
- [ ] Current step highlighted, completed steps show checkmark
- [ ] Clickable completed steps for navigation back
- [ ] Smooth transition animation between steps
- [ ] Step labels: "Details" -> "Metadata" -> "Review"

---

### Issue #20: Implement invoice filtering by date range with calendar picker
**Labels:** `frontend`, `enhancement`, `priority:medium`
**Milestone:** v1.0

**Description:** The Invoices page has status filtering but no date range filter. Add a date range picker that filters invoices by creation date or maturity date.

**Acceptance Criteria:**
- [ ] Date range picker component with start/end date inputs
- [ ] Filter by: Created Date, Maturity Date
- [ ] Quick presets: "This Week", "This Month", "Last 3 Months", "Custom"
- [ ] URL query params sync for shareable filtered views
- [ ] Clear filter button

---

### Issue #21: Add portfolio value chart with time range selector
**Labels:** `frontend`, `enhancement`, `priority:medium`
**Milestone:** v1.0

**Description:** The Dashboard PortfolioChart shows a static chart. Need to add time range selection (1W, 1M, 3M, 6M, 1Y, All) and make the chart data-driven from actual portfolio history.

**Acceptance Criteria:**
- [ ] Time range selector buttons above chart
- [ ] Chart updates with selected time range data
- [ ] Tooltip showing exact value on hover
- [ ] Loading skeleton while data fetches
- [ ] Empty state when no data for selected range

---

### Issue #22: Implement toast notification system with undo capability
**Labels:** `frontend`, `enhancement`, `priority:medium`
**Milestone:** v1.0

**Description:** The Toast component exists but needs undo capability for destructive actions (e.g., cancelling invoice creation). Also needs proper stacking when multiple toasts appear.

**Acceptance Criteria:**
- [ ] Toast stack: newest on top, max 3 visible
- [ ] Undo button on destructive action toasts (5s countdown)
- [ ] Auto-dismiss after 5s for success, 10s for errors
- [ ] Swipe-to-dismiss on mobile
- [ ] Toast persistence across route changes

---

### Issue #23: Add wallet connection onboarding flow for new users
**Labels:** `frontend`, `enhancement`, `priority:high`
**Milestone:** v1.0

**Description:** New users who connect their wallet for the first time see an empty dashboard with no guidance. Need an onboarding flow that explains FactBridge, helps them create their first invoice, or browse the marketplace.

**Acceptance Criteria:**
- [ ] Onboarding modal shown on first wallet connection
- [ ] 3-step guide: "What is FactBridge", "Create your first invoice", "Browse marketplace"
- [ ] Skip option that doesn't show again
- [ ] "Create Invoice" and "Browse Marketplace" CTA buttons
- [ ] Onboarding completion flag stored in localStorage

---

### Issue #24: Implement invoice share allocation visualization
**Labels:** `frontend`, `enhancement`, `priority:medium`
**Milestone:** v1.0

**Description:** When viewing an invoice detail, users need to see how shares are allocated. Add a pie chart or progress visualization showing shares sold vs available, and top shareholders.

**Acceptance Criteria:**
- [ ] Donut chart showing shares_sold vs shares_remaining
- [ ] Top 5 shareholders listed with addresses and share counts
- [ ] Total value funded displayed prominently
- [ ] Loading state while share data fetches
- [ ] Empty state when no shares sold

---

### Issue #25: Add search functionality across invoices and marketplace
**Labels:** `frontend`, `enhancement`, `priority:medium`
**Milestone:** v1.0

**Description:** Users need to search across invoices by creator address, buyer address, amount range, or metadata. Implement a global search with keyboard shortcut (Ctrl+K).

**Acceptance Criteria:**
- [ ] Search bar in navbar, triggered by Ctrl+K / Cmd+K
- [ ] Search results show matching invoices with status badges
- [ ] Search by: address, amount range, status, date
- [ ] Keyboard navigation of results (arrow keys + enter)
- [ ] Recent searches saved in localStorage
- [ ] Empty state for no results

---

### Issue #26: Add responsive data tables with sorting and pagination
**Labels:** `frontend`, `enhancement`, `priority:medium`
**Milestone:** v1.0

**Description:** The invoices list and settlements tables need proper responsive behavior. On mobile, tables should convert to card layout. Add server-side sorting and cursor-based pagination.

**Acceptance Criteria:**
- [ ] Desktop: full data table with sortable column headers
- [ ] Mobile (<768px): card layout with key fields
- [ ] Sort by: date, amount, status (ascending/descending)
- [ ] "Load more" pagination with loading indicator
- [ ] URL query params sync for sort/pagination state

---

### Issue #27: Implement optimistic UI updates for invoice actions
**Labels:** `frontend`, `enhancement`, `priority:medium`
**Milestone:** v1.0

**Description:** When users fund an invoice or purchase shares, the UI waits for blockchain confirmation before updating. Implement optimistic updates that show the change immediately, then revert if the transaction fails.

**Acceptance Criteria:**
- [ ] Invoice funding progress bar updates immediately on fund action
- [ ] Share count updates immediately on share purchase
- [ ] Rollback UI state if transaction fails
- [ ] Toast notification on success/failure
- [ ] Loading state during transaction confirmation

---

### Issue #28: Add WCAG 2.1 AA accessibility compliance
**Labels:** `frontend`, `accessibility`, `priority:high`
**Milestone:** v1.0

**Description:** The application needs to meet WCAG 2.1 AA standards. This includes keyboard navigation, screen reader support, focus management, color contrast, and ARIA labels.

**Acceptance Criteria:**
- [ ] All interactive elements reachable via keyboard (Tab, Enter, Escape)
- [ ] Focus indicators visible (2px outline, 2px offset)
- [ ] Color contrast ratios meet 4.5:1 for text, 3:1 for large text
- [ ] All images and icons have alt text or aria-label
- [ ] Modals trap focus and return focus on close
- [ ] Screen reader announces page changes and status updates
- [ ] `prefers-reduced-motion` respected for animations

---

### Issue #29: Add skeleton loading states for all data-dependent components
**Labels:** `frontend`, `enhancement`, `priority:medium`
**Milestone:** v1.0

**Description:** Components that load data from the API show nothing or a generic spinner. Replace with skeleton loading states that match the final layout for better perceived performance.

**Acceptance Criteria:**
- [ ] Skeleton for invoice cards (matching InvoiceCard layout)
- [ ] Skeleton for dashboard stats (matching StatsCard layout)
- [ ] Skeleton for data tables (matching table rows)
- [ ] Skeleton for chart (matching PortfolioChart area)
- [ ] Smooth fade transition from skeleton to content
- [ ] Consistent skeleton animation (shimmer effect)

---

### Issue #30: Implement invoice detail page transaction history timeline
**Labels:** `frontend`, `enhancement`, `priority:medium`
**Milestone:** v1.0

**Description:** The InvoiceDetail component shows basic info but no timeline of events. Add a vertical timeline showing all state transitions (created, funded, shares purchased, settled) with timestamps and transaction links.

**Acceptance Criteria:**
- [ ] Vertical timeline with connected dots/lines
- [ ] Each event shows: timestamp, event type, actor address, amount (if applicable)
- [ ] Stellar transaction link for each on-chain event
- [ ] Color-coded: green for positive, amber for pending, red for negative
- [ ] Scrollable for invoices with many events

---

### Issue #31: Add unit tests for all utility functions and hooks
**Labels:** `frontend`, `testing`, `priority:high`
**Milestone:** v1.0

**Description:** The frontend has minimal test coverage. Add comprehensive unit tests for utility functions (format, validate), custom hooks (useWallet, useInvoices), and key components.

**Acceptance Criteria:**
- [ ] Tests for all functions in `src/utils/format.ts`
- [ ] Tests for all Zod schemas in `src/utils/validate.ts`
- [ ] Tests for useWallet hook (connect, disconnect, sign)
- [ ] Tests for useInvoices hooks (CRUD operations)
- [ ] Tests for key components: InvoiceCard, StatusBadge, WalletButton
- [ ] Minimum 80% code coverage for utils and hooks

---

## Backend Issues

### Issue #32: Implement invoice event indexing from Soroban contract
**Labels:** `backend`, `enhancement`, `priority:high`
**Milestone:** v1.0

**Description:** The backend currently relies on client-side contract calls for state. Need a background service that polls Soroban RPC for contract events and indexes them into the PostgreSQL database for fast queries.

**Acceptance Criteria:**
- [ ] `SorobanIndexerService` polls RPC every 30 seconds for new events
- [ ] Events parsed and stored: invoice_created, funded, shares_purchased, settled, defaulted
- [ ] Cursor tracking to avoid re-processing events
- [ ] Health check endpoint: `GET /api/v1/indexer/health`
- [ ] Graceful shutdown on SIGTERM (finish current batch)
- [ ] Tests for event parsing and cursor management

---

### Issue #33: Add rate limiting per user with Redis-backed sliding window
**Labels:** `backend`, `security`, `priority:high`
**Milestone:** v1.0

**Description:** Current rate limiting is global. Need per-user rate limiting using a Redis-backed sliding window algorithm. Different limits for different endpoint categories.

**Acceptance Criteria:**
- [ ] Sliding window rate limiter using Redis sorted sets
- [ ] Limits: Read endpoints: 100/min, Write endpoints: 20/min, Auth endpoints: 5/min
- [ ] Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- [ ] 429 Too Many Requests response with Retry-After header
- [ ] Unauthenticated requests limited by IP, authenticated by user ID

---

### Issue #34: Implement webhook system for invoice status notifications
**Labels:** `backend`, `enhancement`, `priority:medium`
**Milestone:** v1.1

**Description:** External systems (accounting software, CRMs) need to receive notifications when invoice status changes. Implement webhook registration and delivery with HMAC signing.

**Acceptance Criteria:**
- [ ] `POST /api/v1/webhooks` - register webhook URL with event types
- [ ] `DELETE /api/v1/webhooks/:id` - unregister webhook
- [ ] `GET /api/v1/webhooks` - list registered webhooks
- [ ] Webhook delivery with HMAC-SHA256 signature in X-Signature header
- [ ] Retry failed deliveries (3 attempts with exponential backoff)
- [ ] Webhook event log: `GET /api/v1/webhooks/:id/events`

---

### Issue #35: Add API versioning with v1/v2 prefix strategy
**Labels:** `backend`, `infrastructure`, `priority:medium`
**Milestone:** v1.0

**Description:** All API routes currently use `/api/v1/` prefix. Need a proper versioning strategy that allows parallel v1 and v2 routes during transitions, with deprecation headers.

**Acceptance Criteria:**
- [ ] Routes organized under `/api/v1/` and `/api/v2/` prefixes
- [ ] Deprecation header `Deprecation: true` and `Sunset:` date on v1 responses
- [ ] Shared middleware between versions
- [ ] v2 routes can override v1 behavior without breaking existing clients
- [ ] API version documented in Swagger/OpenAPI

---

### Issue #36: Implement comprehensive request validation with Zod schemas
**Labels:** `backend`, `security`, `priority:high`
**Milestone:** v1.0

**Description:** Some endpoints lack proper input validation. All API endpoints need comprehensive Zod validation for request body, query params, and path params with detailed error messages.

**Acceptance Criteria:**
- [ ] Every endpoint has Zod schema for its input
- [ ] Validation errors return structured format: `{ errors: [{ field, message, code }] }`
- [ ] Max string length limits on all string fields
- [ ] Max numeric bounds on amount fields
- [ ] Email format validation on registration
- [ ] Stellar address format validation (starts with G, 56 chars)

---

### Issue #37: Add database indexing for common query patterns
**Labels:** `backend`, `performance`, `priority:medium`
**Milestone:** v1.0

**Description:** Invoice and settlement queries are slow at scale. Add database indexes for the most common query patterns used by the API endpoints.

**Acceptance Criteria:**
- [ ] Index on `Invoice.creatorId` for user invoice queries
- [ ] Index on `Invoice.status` for filtered lists
- [ ] Index on `Invoice.createdAt` for date range queries
- [ ] Composite index on `(status, createdAt)` for filtered+sorted queries
- [ ] Index on `Share.invoiceId` for share lookups
- [ ] Index on `Settlement.invoiceId` for settlement lookups
- [ ] Benchmark: list endpoint < 50ms for 10k records

---

### Issue #38: Implement graceful shutdown and health check endpoints
**Labels:** `backend`, `infrastructure`, `priority:medium`
**Milestone:** v1.0

**Description:** The backend needs proper lifecycle management for zero-downtime deployments. Implement health checks, graceful shutdown, and readiness probes.

**Acceptance Criteria:**
- [ ] `GET /health/live` - liveness probe (always 200)
- [ ] `GET /health/ready` - readiness probe (checks DB + Redis connectivity)
- [ ] Graceful shutdown on SIGTERM: finish in-flight requests, close DB/Redis connections
- [ ] Maximum shutdown timeout: 30 seconds
- [ ] Docker healthcheck configuration

---

### Issue #39: Add structured logging with request tracing
**Labels:** `backend`, `infrastructure`, `priority:medium`
**Milestone:** v1.0

**Description:** Current logging is basic morgan output. Need structured JSON logging with request IDs for tracing, user context, and performance metrics.

**Acceptance Criteria:**
- [ ] JSON structured logging with pino
- [ ] Request ID (X-Request-Id) propagated through all log entries
- [ ] User ID included in logs for authenticated requests
- [ ] Log levels: error, warn, info, debug
- [ ] Sensitive data masking (passwords, tokens, keys)
- [ ] Performance logging for slow queries (>500ms)

---

### Issue #40: Implement Redis caching layer for frequently accessed data
**Labels:** `backend`, `performance`, `priority:medium`
**Milestone:** v1.0

**Description:** Frequently accessed data (invoice lists, user profiles, settlement stats) hits the database on every request. Implement Redis caching with cache-aside pattern and TTL.

**Acceptance Criteria:**
- [ ] Cache-aside helper: `cacheGet<T>(key, ttl, fetchFn)`
- [ ] Cache invoice list queries (TTL: 30s)
- [ ] Cache user profiles (TTL: 5min)
- [ ] Cache settlement stats (TTL: 1min)
- [ ] Cache invalidation on write operations
- [ ] Cache hit/miss metrics logged

---

### Issue #41: Add comprehensive API integration tests
**Labels:** `backend`, `testing`, `priority:high`
**Milestone:** v1.0

**Description:** The backend has basic tests but needs comprehensive integration tests covering all API endpoints with realistic scenarios, error cases, and edge cases.

**Acceptance Criteria:**
- [ ] Tests for all auth endpoints (register, login, verify, me)
- [ ] Tests for all invoice endpoints (CRUD, fund, shares, settle)
- [ ] Tests for settlement endpoints (list, detail, stats)
- [ ] Tests for user endpoints (profile, update, invoices)
- [ ] Tests for error cases: unauthorized, not found, validation errors, conflicts
- [ ] Tests for pagination and filtering
- [ ] Mock Stellar service for deterministic tests

---

### Issue #42: Implement export functionality for invoices and settlements
**Labels:** `backend`, `enhancement`, `priority:low`
**Milestone:** v1.1

**Description:** Users need to export their invoice and settlement data for accounting purposes. Add CSV and PDF export endpoints.

**Acceptance Criteria:**
- [ ] `GET /api/v1/invoices/export?format=csv` - export invoices as CSV
- [ ] `GET /api/v1/settlements/export?format=csv` - export settlements as CSV
- [ ] `GET /api/v1/invoices/:id/export?format=pdf` - export single invoice as PDF
- [ ] Export respects user permissions (only own data)
- [ ] Streaming for large exports (no memory overflow)
- [ ] Rate limit: 5 exports per minute

---

### Issue #43: Add Docker Compose configuration for full local development
**Labels:** `backend`, `infrastructure`, `priority:medium`
**Milestone:** v1.0

**Description:** Developers need a one-command setup for the full local development environment. Create Docker Compose configuration with all services.

**Acceptance Criteria:**
- [ ] `docker-compose.yml` with: backend, frontend, postgres, redis
- [ ] Volume mounts for hot reload in development
- [ ] Environment variable configuration
- [ ] Health checks for all services
- [ ] `make dev` or `npm run dev:docker` shortcut
- [ ] Documentation in README

---

### Issue #44: Implement idempotent invoice creation to prevent duplicates
**Labels:** `backend`, `security`, `priority:medium`
**Milestone:** v1.0

**Description:** If a user submits the invoice creation form twice quickly, duplicate invoices could be created. Implement idempotency keys to prevent duplicate creation.

**Acceptance Criteria:**
- [ ] Client generates UUID idempotency key per creation attempt
- [ ] Backend stores idempotency key with result for 24 hours
- [ ] Duplicate key returns original result without creating new invoice
- [ ] Idempotency key in request header: `X-Idempotency-Key`
- [ ] Tests for duplicate submission scenarios

---

### Issue #45: Add stellar address verification using SEP-10 challenge-response
**Labels:** `backend`, `security`, `priority:medium`
**Milestone:** v1.0

**Description:** The auth system uses JWT but stellar address verification is a stub. Implement proper SEP-10 challenge-response authentication for Stellar wallet verification.

**Acceptance Criteria:**
- [ ] `GET /api/v1/auth/challenge?address=G...` - returns SEP-10 challenge transaction
- [ ] `POST /api/v1/auth/verify` - verifies signed challenge transaction
- [ ] Challenge expires after 5 minutes
- [ ] nonce stored in Redis with TTL
- [ ] Verified address linked to user account
- [ ] Tests for valid verification, expired challenge, invalid signature
