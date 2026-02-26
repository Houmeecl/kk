# KONTAX - Environmental Accounting & Tax Compliance Platform

## Overview

KONTAX is a Chilean environmental accounting and tax compliance platform that combines traditional tax reporting (SII, TGR, Previred) with environmental/sustainability accounting based on the SEEA (System of Environmental-Economic Accounting) framework from the United Nations. The application provides dashboards for monitoring fiscal compliance, environmental balances, green ledger entries, and document management for companies operating in Chile.

The platform is built as a full-stack TypeScript application with a React frontend and Express backend, using PostgreSQL for data persistence. It's designed for auditors and accountants managing environmental and tax compliance for multiple companies.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled with Vite
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state; no global client state library
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Charts**: Recharts for data visualization (line, area, bar charts)
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`, `@assets/` maps to `attached_assets/`
- **Key pages**: Landing page (public), Dashboard/Home, Clients (auditor client management), Onboarding (public client SII linking), Visor Fiscal, Libro Verde, Contabilidad Ambiental, Report Detail, Documents, with sidebar navigation
- **Email integration**: Not configured (user dismissed Resend). Invitations use shareable links that auditors copy and send manually.
- **Language**: UI is primarily in Spanish (Chilean market)

### Backend Architecture
- **Framework**: Express.js running on Node.js with TypeScript (via tsx)
- **HTTP Server**: Node's native `http.createServer` wrapping Express
- **API Pattern**: RESTful JSON APIs under `/api/` prefix
- **Authentication**: Replit Auth via OpenID Connect (OIDC), using Passport.js with session-based auth stored in PostgreSQL (`connect-pg-simple`)
- **Session Management**: Express sessions with PostgreSQL session store, 1-week TTL
- **Build**: Custom build script using esbuild for server bundling and Vite for client bundling; output to `dist/` directory
- **Development**: Vite dev server with HMR proxied through Express in development mode

### Data Storage
- **Database**: PostgreSQL (required, via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema validation
- **Schema location**: `shared/schema.ts` and `shared/models/auth.ts`
- **Migration strategy**: `drizzle-kit push` (schema push, not migration files)
- **Key tables**:
  - `users` - User accounts (Replit Auth managed)
  - `sessions` - Session storage for authentication
  - `companies` - Company profiles with RUT, addresses, economic activities, tax regime; includes `assignedAuditorId`, `invitationStatus`, `siiLinked`
  - `client_invitations` - Invitation tokens for client onboarding (token, status, expiry)
  - `tax_reports` - Comprehensive tax compliance reports (SII, TGR, Previred data)
  - `green_entries` - Environmental accounting journal entries
  - `environmental_balances` - Environmental balance records
  - `documents` - Document management
- **Data types**: Heavy use of JSONB columns for structured data (addresses, activities, income history, declarations)

### Storage Layer
- `server/storage.ts` defines an `IStorage` interface with a `DatabaseStorage` implementation
- All database operations go through this storage abstraction
- Exported as a singleton `storage` instance

### API Routes
Authenticated routes (`isAuthenticated` middleware):
- `GET /api/companies` - List companies for authenticated auditor
- `POST /api/companies` - Create a new client company (Zod validated)
- `PATCH /api/companies/:id` - Update company details
- `GET /api/reports` - List all tax reports
- `GET /api/reports/:id` - Get specific report
- `GET /api/green-entries?companyId=` - Get green entries by company
- `GET /api/documents` - Get documents
- `POST /api/documents` - Create document
- `GET /api/invitations` - List invitations for authenticated auditor
- `POST /api/invitations` - Create client invitation (generates shareable link)
- `POST /api/invitations/:id/resend` - Renew invitation token (ownership checked)
- `GET /api/auth/user` - Get current authenticated user
- Auth routes: `/api/login`, `/api/logout`, `/api/callback` (Replit OIDC flow)

SII API Gateway routes (authenticated):
- `GET /api/sii/situacion-tributaria/:rut` - Public SII lookup via apigateway.cl (no SII creds needed)
- `POST /api/sii/rcv/compras` - RCV purchase register summary (needs SII credentials in body)
- `POST /api/sii/rcv/ventas` - RCV sales register summary (needs SII credentials in body)

Public routes (no auth required):
- `GET /api/onboarding/:token` - Get invitation info by token
- `POST /api/onboarding/:token` - Submit SII credentials, pull data via API Gateway, create company + initial tax report

### API Gateway Integration (server/services/apigateway.ts)
- **Provider**: apigateway.cl (Chilean SII passthrough API)
- **Auth**: Bearer token via `APIGATEWAY_TOKEN` env var + SII credentials per-request in body
- **Public endpoints**: Situación tributaria (no SII auth), actividades económicas, indicadores (UF)
- **Authenticated endpoints**: RCV compras/ventas, BHE, DTE verificación, MiSII datos (require SII RUT + clave in request body)
- **Onboarding flow**: When client submits SII credentials, KONTAX pulls situación tributaria + RCV data, stores company info and creates initial tax report. SII credentials are NOT stored.
- **Fiscal page**: Includes live SII lookup by RUT (public endpoint) showing actividades, documentos timbrados, observaciones

### Seed Data
- `server/seed.ts` provides initial database seeding with a sample Chilean company (agricultural/transport), complete with tax report data including SII compliance sections

## External Dependencies

### Required Services
- **PostgreSQL**: Primary database, must be provisioned with `DATABASE_URL` environment variable
- **Replit Auth (OIDC)**: Authentication provider using Replit's OpenID Connect service; requires `REPL_ID`, `ISSUER_URL`, and `SESSION_SECRET` environment variables
- **API Gateway Chile** (apigateway.cl): SII data passthrough API; requires `APIGATEWAY_TOKEN` secret

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit**: Database ORM and schema management
- **express** + **express-session**: Web server and session handling
- **passport** + **openid-client**: Authentication flow
- **connect-pg-simple**: PostgreSQL session store
- **@tanstack/react-query**: Client-side data fetching and caching
- **recharts**: Chart/graph components
- **shadcn/ui ecosystem**: Radix UI primitives, Tailwind CSS, class-variance-authority, clsx, tailwind-merge
- **wouter**: Client-side routing
- **zod** + **drizzle-zod**: Schema validation

### Replit-Specific Plugins
- `@replit/vite-plugin-runtime-error-modal`: Runtime error overlay in development
- `@replit/vite-plugin-cartographer`: Development tooling (dev only)
- `@replit/vite-plugin-dev-banner`: Development banner (dev only)