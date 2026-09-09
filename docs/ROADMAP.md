# FactBridge Roadmap

## Phase 1: Foundation (v1.0)

### Smart Contracts
- [x] Core invoice lifecycle (create, fund, purchase shares, settle, default)
- [ ] Dispute resolution mechanism (#1)
- [ ] Share transfer/secondary trading (#2)
- [ ] Early settlement with penalty (#5)
- [ ] Contract upgrade mechanism (#6)
- [ ] Minimum share threshold validation (#7)
- [ ] Metadata hash verification (#8)
- [ ] Invoice cancellation (#9)
- [ ] Platform fee mechanism (#10)
- [ ] Time-locked fund withdrawal (#13)
- [ ] Event indexing with sequential IDs (#12)
- [ ] Invoice freezing for compliance (#15)

### Frontend
- [x] Landing page and core UI components
- [x] Dashboard with stats, charts, recent invoices
- [x] Invoice creation multi-step form
- [x] Invoice detail view
- [x] Marketplace for browsing invoices
- [x] Settlements history
- [x] Wallet integration (Freighter)
- [ ] Real-time WebSocket updates (#16)
- [ ] Mobile responsive navigation (#18)
- [ ] Form progress indicator (#19)
- [ ] WCAG 2.1 AA accessibility (#28)
- [ ] Skeleton loading states (#29)
- [ ] Comprehensive unit tests (#31)

### Backend
- [x] Express API with auth, invoices, settlements, users
- [x] Prisma schema with PostgreSQL
- [x] JWT authentication
- [ ] Soroban event indexer (#32)
- [ ] Per-user rate limiting (#33)
- [ ] Request validation with Zod (#36)
- [ ] Database indexing (#37)
- [ ] Health checks and graceful shutdown (#38)
- [ ] Structured logging (#39)
- [ ] Redis caching (#40)
- [ ] Integration tests (#41)
- [ ] Docker Compose setup (#43)
- [ ] Idempotent creation (#44)
- [ ] SEP-10 auth (#45)

## Phase 2: Growth (v1.1)

### Smart Contracts
- [ ] Dynamic interest rate calculation (#3)
- [ ] Batch invoice creation (#4)
- [ ] Maturity extension mechanism (#11)
- [ ] Multi-currency with Stellar Asset Contracts (#14)

### Frontend
- [ ] Dark mode (#17)
- [ ] Date range filtering (#20)
- [ ] Chart time range selector (#21)
- [ ] Toast undo capability (#22)
- [ ] Onboarding flow (#23)
- [ ] Share allocation visualization (#24)
- [ ] Global search (#25)
- [ ] Responsive data tables (#26)
- [ ] Optimistic UI updates (#27)
- [ ] Transaction history timeline (#30)

### Backend
- [ ] Webhook system (#34)
- [ ] API versioning (#35)
- [ ] Export functionality (#42)

## Phase 3: Scale (v2.0)

- Cross-chain bridge integration
- Mobile app (React Native)
- AI-powered risk scoring
- Institutional API
- Multi-language support (i18n)
- Reputation system v2 (soulbound tokens)
