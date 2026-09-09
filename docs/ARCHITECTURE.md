# FactBridge Architecture

## System Overview

FactBridge is a decentralized invoice factoring protocol built on Stellar. It consists of three main layers:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                       │
│  Landing • Dashboard • Invoices • Marketplace • Settings │
└───────────────────────────┬─────────────────────────────┘
                            │ REST API + WebSocket
┌───────────────────────────▼─────────────────────────────┐
│                   Backend (Express)                       │
│  Auth • Invoices • Settlements • Users • Indexer • Cache  │
└───────────────────────────┬─────────────────────────────┘
                            │ Stellar SDK / Soroban RPC
┌───────────────────────────▼─────────────────────────────┐
│              Stellar Blockchain Layer                     │
│     Soroban Contracts • Horizon API • Asset Contracts    │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Invoice Creation
1. User connects Freighter wallet
2. Frontend sends invoice params to backend
3. Backend validates and stores in PostgreSQL
4. Backend invokes `create_invoice` on Soroban contract
5. Contract emits `invoice_created` event
6. Indexer picks up event and syncs database

### Share Purchase
1. Liquidity provider browses marketplace
2. Selects invoice and enters share count
3. Frontend calculates cost and shows return estimate
4. User signs transaction via Freighter
5. Contract validates and records share purchase
6. Funds transferred to creator (minus platform fee)
7. Backend syncs updated state

### Settlement
1. Buyer pays invoice on maturity date
2. Contract verifies payment and calculates distributions
3. Principal + returns distributed to shareholders
4. Platform fee sent to treasury
5. `invoice_settled` event emitted
6. Backend updates invoice status and creates settlement records

## Smart Contract Architecture

```
factbridge contract
├── Storage
│   ├── invoices: Map<u64, InvoiceToken>
│   ├── shares: Map<(u64, Address), u32>
│   ├── event_counter: u64
│   └── config: ContractConfig
├── Functions
│   ├── create_invoice
│   ├── fund_invoice
│   ├── purchase_shares
│   ├── settle_invoice
│   ├── default_invoice
│   └── get_invoice
└── Events
    ├── invoice_created
    ├── invoice_funded
    ├── shares_purchased
    ├── invoice_settled
    └── invoice_defaulted
```

## Database Schema

```
User ──┬── Invoice ──┬── Share
       │             └── Settlement
       └── Notification
```

## Security Model

- **Authentication**: JWT + SEP-10 Stellar challenge-response
- **Authorization**: Role-based (USER, ADMIN, LIQUIDITY_PROVIDER)
- **Contract Security**: Admin-only upgrade, time-locked withdrawals, dispute resolution
- **API Security**: Rate limiting, input validation, HMAC webhook signatures
- **Data Security**: Encrypted secrets, no keys in logs, parameterized queries
