# FactBridge

> Decentralized invoice factoring for African SMEs on Stellar

**FactBridge** is a protocol that lets small and medium enterprises tokenize unpaid invoices on the Stellar blockchain, sell fractional shares to global liquidity providers, and receive instant stablecoin payouts. Smart contracts handle automated settlement when buyers pay, eliminating intermediaries and reducing financing costs from weeks to seconds.

## Why Stellar?

- **Near-zero fees**: Factoring micro-transactions are viable at $0.00001 per operation
- **3-5 second finality**: Invoice tokenization and settlement confirmed instantly
- **Soroban contracts**: Expressive Rust smart contracts for complex escrow and share logic
- **Native assets**: XLM and custom stablecoins flow without bridges
- **Global reach**: Designed for emerging markets where traditional factoring is inaccessible

## The Problem

African SMEs face a **$1.5 trillion trade finance gap**. They have confirmed purchase orders and unpaid invoices but cannot access working capital because:

- Traditional banks require collateral SMEs don't have
- Invoice factoring fees range from 15-30% through intermediaries
- Cross-border settlements take 5-14 days
- Documentation requirements are prohibitive

## How It Works

```
SME creates invoice on FactBridge (face value, discount, maturity)
        |
Soroban contract stores the InvoiceToken and computes the funding target
        |
Invoice listed on marketplace
        |
Liquidity providers fund it with a SEP-41 token (XLM or stablecoin)
        |
The token transfer pays the SME immediately; each funder gets a position
        |
Buyer repays the face value on maturity
        |
Contract distributes the face value pro-rata to every funder
```

Funding and settlement are real asset movements, not bookkeeping. The contract
calls the Stellar Asset Contract for every transfer, enforces auth on each party
(`creator`, `funder`, `buyer`), and settles atomically in a single transaction.

### Economics

An invoice with a 1,000 XLM face value and a 500 bps (5%) discount has a
**950 XLM funding target**. Funders contribute 950 XLM, the SME receives that
working capital immediately, and on maturity the buyer pays 1,000 XLM which is
distributed to funders pro-rata. The 50 XLM spread is the funders' yield.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Rust + Soroban |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Express.js + TypeScript + Prisma |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Blockchain | Stellar Network |
| Wallet | Freighter + Stellar Wallets Kit |
| CI/CD | GitHub Actions |

## Repository Structure

```
FactBridge/
├── contracts/              # Soroban smart contracts (Rust)
│   ├── src/
│   │   ├── lib.rs          # Contract entry point
│   │   ├── invoice.rs      # InvoiceToken data model
│   │   ├── storage.rs      # Persistent storage
│   │   ├── events.rs       # Contract events
│   │   ├── errors.rs       # Error types
│   │   ├── validation.rs   # Input validation
│   │   └── tests.rs        # Unit tests
│   └── Cargo.toml
├── frontend/               # React web application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-level pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Stellar SDK + API client
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Formatting + validation
│   └── package.json
├── backend/                # Express API server
│   ├── src/
│   │   ├── modules/        # Feature modules (auth, invoices, settlements, users)
│   │   ├── services/       # Stellar, Redis, Notifications
│   │   └── middleware/     # Auth, validation, error handling
│   ├── prisma/             # Database schema + seed
│   └── package.json
├── docs/                   # Documentation
├── scripts/                # Deployment scripts
└── .github/workflows/      # CI pipelines
```

## Quick Start

### Prerequisites

- Node.js 18+
- Rust toolchain + Soroban CLI
- PostgreSQL 16+
- Redis 7+

### Smart Contracts

```bash
cd contracts
rustup target add wasm32v1-none   # required by Soroban SDK 25
cargo build --target wasm32v1-none --release
cargo test
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev
```

## Smart Contract: `factbridge`

The Soroban smart contract manages the full invoice lifecycle. All amounts are
`i128` in the token's smallest unit (stroops for XLM), and every write path
requires the acting party to authorize the invocation.

| Function | Description |
|----------|-------------|
| `create_invoice(creator, buyer, token, amount, denom, shares_total, maturity_date, metadata_uri, discount_bps)` | Tokenize an invoice and compute its funding target |
| `fund_invoice(funder, invoice_id, amount)` | Transfer SEP-41 tokens from the funder to the SME and record a position |
| `purchase_shares(investor, invoice_id, share_count)` | Buy a specific number of shares at the pro-rata principal cost |
| `settle_invoice(buyer, invoice_id)` | Buyer pays the face value; the contract distributes it pro-rata |
| `default_invoice(caller, invoice_id)` | Flag a past-maturity invoice after the 7-day grace period |
| `get_invoice`, `get_position`, `get_funders`, `get_invoice_list`, `get_invoice_count` | Read-only views |

### Events

| Event | Trigger |
|-------|---------|
| `invoice_created` | New invoice recorded |
| `invoice_funded` | Funder contributes principal |
| `shares_purchased` | Investor buys shares |
| `invoice_settled` | Buyer repays the invoice |
| `settlement_distributed` | Per-funder payout during settlement |
| `invoice_defaulted` | Invoice past maturity + grace period |

### Verified on testnet

The full flow — deploy, tokenize, two funders, maturity, settlement — runs
against Stellar testnet with real transactions. See
[docs/EVIDENCE.md](docs/EVIDENCE.md) for transaction hashes, balance deltas and
the reproducible script (`scripts/e2e-testnet.mjs`).

## Testing

```bash
# Contract unit tests (18 tests)
cd contracts && cargo test

# End-to-end testnet run (deploys, funds from two LPs, settles)
cd scripts && npm install && npm run e2e:testnet

# Application builds
cd frontend && npm run typecheck && npm run build
cd backend && npm run build
```

Recorded results and transaction links live in
[docs/EVIDENCE.md](docs/EVIDENCE.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Stellar Development Foundation](https://stellar.org) for the blockchain infrastructure
- [Soroban](https://soroban.stellar.org) for the smart contract platform
- All contributors and the Stellar community
