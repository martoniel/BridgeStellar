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
3. Backend validates and stores in PostgreSQL (status `PENDING`)
4. Backend builds and simulates `create_invoice`, returning an unsigned
   prepared XDR (storage footprint + resource fee attached)
5. The SME signs it in Freighter; the frontend submits it through Soroban RPC
6. Contract emits `invoice_created`; the indexer records the on-chain id

### Funding / Share Purchase
1. Liquidity provider browses the marketplace
2. Selects an invoice and either enters an amount or a share count
3. Backend returns a prepared `fund_invoice` / `purchase_shares` XDR
4. The funder signs in Freighter
5. Contract calls the SEP-41 token and moves the principal **to the SME**
   (the contract never custodies funding capital)
6. Contract records the funder's `Position { contributed, shares }`
7. Once `funded_amount == funding_target` the invoice becomes `Funded`

### Settlement
1. Buyer calls `settle_invoice` after maturity (buyer auth required)
2. Contract transfers the full face value from the buyer to itself
3. Contract loops over funders and pays each `face_value * contributed / funded`
   pro-rata; the final funder absorbs rounding so the sum is exact
4. `settlement_distributed` is emitted per funder, then `invoice_settled`
5. Backend updates invoice status and creates the settlement record

## Smart Contract Architecture

```
factbridge contract
├── Storage (persistent, TTL-extended)
│   ├── Invoice(u64)          -> InvoiceToken
│   ├── InvoiceCount          -> u64
│   ├── InvoiceList           -> Vec<u64>
│   ├── Position(u64, Address)-> Position { contributed, shares }
│   └── Funders(u64)          -> Vec<Address>
├── Functions
│   ├── create_invoice
│   ├── fund_invoice
│   ├── purchase_shares
│   ├── settle_invoice
│   ├── default_invoice
│   ├── get_invoice
│   ├── get_position
│   ├── get_funders
│   ├── get_invoice_list
│   └── get_invoice_count
└── Events
    ├── invoice_created
    ├── invoice_funded
    ├── shares_purchased
    ├── invoice_settled
    ├── settlement_distributed
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
