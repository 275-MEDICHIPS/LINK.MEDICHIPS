# MEDICHIPS-LINK

## Project Overview
AI-powered medical education platform for training healthcare workers in developing countries.
Korean medical expertise delivered via L-D-V-I (Learn-Do-Verify-Improve) microlearning cycle.

## Tech Stack
- **Framework:** Next.js 15 (App Router) + TypeScript strict
- **Database:** PostgreSQL 15 (Prisma ORM, 46 models)
- **State:** Zustand + TanStack Query
- **UI:** Tailwind CSS + shadcn/ui (medichips.ai aesthetic)
- **Offline:** PWA + Workbox + Dexie.js (IndexedDB)
- **AI:** Anthropic Claude API
- **Deploy:** GCP Cloud Run (asia-northeast3), project: medichips-new

## Commands
```bash
pnpm dev              # Local dev server (Turbopack)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm typecheck        # TypeScript check
pnpm test             # Unit tests (Jest)
pnpm db:generate      # Prisma generate
pnpm db:migrate       # Prisma migrate dev
pnpm db:studio        # Prisma Studio
```

## Local Dev Setup
```bash
cp .env.example .env  # Then fill in secrets (DATABASE_URL → GCP Cloud SQL)
pnpm install
npx prisma db push    # Sync schema to Cloud SQL
pnpm dev
```

## Database
- GCP Cloud SQL (PostgreSQL 15): `medichips-link-db` (asia-northeast3)
- Public IP: 34.50.54.174 (authorized networks 설정 필요)
- `npx prisma db push` for schema sync, `npx prisma studio` for GUI

## Key Directories
- `prisma/schema.prisma` — 46 models, 18 enums
- `src/app/(public)/` — Landing page (SSG)
- `src/app/(auth)/` — Login/register (no sidebar)
- `src/app/(learner)/` — Learner UI (bottom tabs)
- `src/app/(admin)/` — Admin UI (sidebar)
- `src/app/(supervisor)/` — Supervisor UI
- `src/app/api/v1/` — API routes
- `src/lib/services/` — Business logic
- `src/lib/auth/` — JWT + PIN + OAuth + CSRF
- `src/lib/ai/` — Claude API integration

## Architecture Rules
- Domain-specific offline sync (NOT last-write-wins)
- Risk-based content review (L1/L2/L3)
- AI content always requires human review
- 8-char alphanumeric PIN with bcrypt(12)
- No quiz answers stored in IndexedDB
- HMAC checksum on progress data
- RLS for multi-tenant isolation

## Environment
- GCP Project: medichips-new (779954785847)
- Domain: link.medichips.ai
- Region: asia-northeast3
