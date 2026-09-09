# Contributing to FactBridge

Thank you for your interest in contributing to FactBridge! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and inclusive in all interactions. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).

## How to Contribute

### Reporting Bugs

- Use GitHub Issues with the `bug` label
- Include steps to reproduce, expected behavior, and actual behavior
- Include your environment (OS, Node version, browser)

### Suggesting Features

- Use GitHub Issues with the `enhancement` label
- Describe the problem you're solving and your proposed solution
- Include mockups or examples if applicable

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Add or update tests
5. Ensure all tests pass
6. Submit a pull request with a clear description

## Development Setup

### Prerequisites

- Node.js 18+
- Rust toolchain + Soroban CLI (for contracts)
- PostgreSQL 16+ (for backend)
- Redis 7+ (for backend caching)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

### Contracts

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
cargo test
```

## Code Style

- **TypeScript**: Strict mode, no `any` types, explicit return types on exported functions
- **React**: Functional components with hooks, colocated styles with Tailwind CSS
- **Rust**: Follow `rustfmt` defaults, use `clippy` for linting
- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/) format

## Testing

- **Frontend**: Vitest + React Testing Library
- **Backend**: Jest + Supertest
- **Contracts**: Soroban test framework

Run all tests before submitting:

```bash
# Frontend
cd frontend && npm test

# Backend
cd backend && npm test

# Contracts
cd contracts && cargo test
```

## PR Checklist

- [ ] Code compiles/builds without errors
- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] TypeScript strict mode passes (`npm run type-check`)
- [ ] Lint passes (`npm run lint`)
- [ ] No secrets or keys committed
- [ ] Clear PR description with context

## Project Structure

```
FactBridge/
├── contracts/     # Soroban smart contracts (Rust)
├── frontend/      # React + Vite + TypeScript
├── backend/       # Express + Prisma + PostgreSQL
├── docs/          # Documentation
└── scripts/       # Deployment and utility scripts
```

## Questions?

Open a GitHub Discussion or reach out on our Discord channel.
