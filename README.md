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
SME creates invoice on FactBridge
        |
Soroban contract mints InvoiceToken (NFT)
        |
Invoice listed on marketplace
        |
Liquidity provider purchases shares
        |
SME receives instant stablecoin payout
        |
Buyer pays invoice on maturity date
        |
Smart contract auto-settles to shareholders
```

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
cargo build --target wasm32-unknown-unknown --release
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

The Soroban smart contract manages the full invoice lifecycle:

| Function | Description |
|----------|-------------|
| `create_invoice` | Mint a new InvoiceToken with metadata |
| `fund_invoice` | Add funding to an invoice |
| `purchase_shares` | Buy fractional shares from creator |
| `settle_invoice` | Auto-settle when buyer pays |
| `default_invoice` | Mark invoice as defaulted past maturity |
| `get_invoice` | Read invoice state |

### Events

| Event | Trigger |
|-------|---------|
| `invoice_created` | New invoice minted |
| `invoice_funded` | Invoice receives funding |
| `shares_purchased` | Liquidity provider buys shares |
| `invoice_settled` | Buyer payment received |
| `invoice_defaulted` | Invoice past maturity |

## Testing

```bash
# All tests
cd contracts && cargo test
cd frontend && npm test
cd backend && npm test

# With coverage
cd frontend && npm run test:coverage
cd backend && npm run test:cov
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Stellar Development Foundation](https://stellar.org) for the blockchain infrastructure
- [Soroban](https://soroban.stellar.org) for the smart contract platform
- All contributors and the Stellar community
