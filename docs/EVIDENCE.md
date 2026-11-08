# Verification Evidence

This document records the reproducible checks behind the FactBridge
implementation. Every transaction below is on **Stellar testnet** and can be
inspected in a block explorer.

## 1. Contract unit tests

```bash
cd contracts
cargo test
```

Result: **18 passed, 0 failed** (`cargo test`, Rust 1.98, `soroban-sdk` 25.3.2).

The suite covers:

- invoice creation, validation and funding-target math (`amount * (10000 - discount_bps) / 10000`)
- creator auth, distinct-party validation, discount bounds
- funding and share purchase moving real SEP-41 tokens to the SME
- over-funding, late funding and insufficient-balance rejection
- pro-rata settlement across two independent funders
- maturity/grace-period rules for settlement and default
- zero-value position reads and invoice enumeration

## 2. WASM build

```bash
cd contracts
cargo build --target wasm32v1-none --release
```

Result: `factbridge.wasm` = **18,489 bytes**, well under the 96 KiB CI budget.

> Soroban SDK 25 requires the `wasm32v1-none` target; the previous
> `wasm32-unknown-unknown` build fails on Rust 1.82+.

## 3. End-to-end testnet run

```bash
cd scripts
npm install
npm run e2e:testnet
```

The script creates and funds five accounts with Friendbot, uploads and deploys
the contract, tokenizes a 1,000 XLM invoice at a 5% discount, funds it from two
independent liquidity providers, waits for maturity, and has the buyer settle
it. It then asserts the settlement invariants and writes
[`testnet-e2e.json`](./evidence/testnet-e2e.json).

### Run summary (2026-11-08)

| Step | Transaction |
|------|-------------|
| Upload WASM | [a2891d66…8086e9](https://stellar.expert/explorer/testnet/tx/a2891d66c77384fdf39081ea9ee43ed775aa9e67a670bf7cbad572c46b8086e9) |
| Deploy contract | [c6e7412e…54f0e5b2](https://stellar.expert/explorer/testnet/tx/c6e7412e9e5b8b4602694e7a26e011d27af8a04b0fb0b1d2c7c8c3d354f0e5b2) |
| Create invoice | [989cb740…cd167fa](https://stellar.expert/explorer/testnet/tx/989cb740891b8ad4e0ffcf89a92fc10cccf0e04d4e6c2ff466d76af62cd167fa) |
| Funder A funds 500 XLM | [a3baa500…a58203](https://stellar.expert/explorer/testnet/tx/a3baa500201ca8b4e857bf58daf14517ddf5db2b8257692f9b763ada8ba58203) |
| Funder B funds 450 XLM | [ff17567d…ee1a0](https://stellar.expert/explorer/testnet/tx/ff17567da1947c3ba1808813bac8b666b980406bfae6b692841a0231007ee1a0) |
| Buyer settles 1,000 XLM | [bbe0e87f…26464](https://stellar.expert/explorer/testnet/tx/bbe0e87ffe1c5d2fa4192ed6ae5abfd31bc108af86bc8f13bc393815b5226464) |

- Contract: `CCYVAVSAM4UK7QTFHCBHBXSJMJJ2JM2ONYHXIDIUQCJGXDKURKIQ4E4B`
- Token: native XLM SAC `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`

### Balance deltas (stroops)

| Party | Before | After | Delta |
|-------|--------|-------|-------|
| SME (seller) | 99,998,725,785 | 109,498,725,785 | **+9,500,000,000** (950 XLM raised) |
| Funder A | 100,000,000,000 | 100,262,680,952 | **+262,680,952** (26.27 XLM yield) |
| Funder B | 100,000,000,000 | 100,236,501,405 | **+236,501,405** (23.65 XLM yield) |
| Buyer | 100,000,000,000 | 89,999,886,500 | **−10,000,113,500** (1,000 XLM + fees) |

Settlement split: funder A received 5,263,157,894 stroops, funder B received
4,736,842,106 stroops — the two payouts sum to the 10,000,000,000 stroop face
value exactly.

All checks in the JSON report are `true`.

## 4. Application builds

```bash
cd backend  && npm install && npm run build      # tsc: clean
cd frontend && npm install && npm run typecheck && npm run build
```

Result: backend TypeScript build clean; frontend typecheck and Vite production
build succeed.
