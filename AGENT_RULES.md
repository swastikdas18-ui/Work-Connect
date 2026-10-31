# AGENT_RULES.md (v2) — AI Coding Agent Guidelines
## Project: Work-Connect (White-Label Multi-Tenant Community & Chat Platform)

---

### 1. Architectural Principles & Tenancy Isolation

- **Clean-Slate Architecture**: This repository is built strictly from scratch. Delete any residual template code before starting implementation.
- **Strict Tenant Isolation**:
  - All database tables holding customer data **must** include a `tenant_id` column.
  - Multi-tenancy is enforced at the database layer using **PostgreSQL Row-Level Security (RLS)** policies via Supabase. Never rely solely on application-level filtering.
  - Every incoming API request and WebSocket handshake must extract and validate the `tenant_id` from an authenticated JWT payload.
  - Database connections/queries must set session variables (e.g., `SET LOCAL app.current_tenant_id = '...'`) prior to executing queries to trigger RLS policies.
- **Decoupled Real-Time Transport**:
  - WebSockets handle bidirectional real-time events, backed by a **Redis Pub/Sub** message broker (Upstash Redis) tagged with tenant-specific channel namespaces (`tenant:{tenant_id}:channel:{channel_id}`).
  - Persistence to PostgreSQL occurs asynchronously or cleanly separated from the WebSocket transport layer to prevent server bottlenecks.

---

### 2. Mobile-First UX & Responsive Layout Standards

- **Mobile-First Responsive Design**:
  - Design and build mobile screens first; scale gracefully to desktop viewports.
- **Thumb-Zone & Bottom Navigation**:
  - Implement a fixed bottom navigation bar (`Home`, `Communities`, `Chats`, `Profile`) for mobile screens to keep main actions within reach of the thumb zone.
- **Touch Targets & Spacing**:
  - All interactive elements (buttons, channel list items, reaction icons, inputs) must have a minimum touch target size of **44×44px**.
- **Virtual Keyboard & Dynamic Viewport Handling**:
  - Use dynamic viewport height (`dvh` unit) and `position: sticky` for the chat input bar to prevent mobile virtual keyboards from obscuring chat history or message fields.
- **Bottom Drawers & Sheet Modals**:
  - Use mobile-friendly bottom drawers/sheets (e.g. `vaul` drawer or Radix dialog sheets) for channel lists, tenant switchers, and user settings instead of heavy pop-up modals.
- **PWA (Progressive Web App) Preparedness**:
  - Maintain a clean `public/manifest.json` and service worker setup to enable "Add to Home Screen" native mobile experiences.

---

### 3. Recommended Tech Stack & Integrations (Free Tier Optimised)

- **Frontend Hosting**: Vercel or Netlify (Next.js App Router, SSR & Static Optimization, PWA support).
- **Database & Auth**: Supabase (PostgreSQL with built-in RLS, multi-tenant JWT claims with `tenant_id`, Auth helpers).
- **Real-Time WebSockets**: Render (custom Node.js Socket.IO server) or Ably Pub/Sub integration.
- **Caching & Event Bus**: Upstash Redis (Serverless Redis for tenant pub/sub channel isolation).
- **Media & File Storage**: Cloudinary or Supabase Storage (auto-format, resize, and compress mobile uploads on slow networks).

---

### 4. Mandatory Folder Structure

```text
/
├── app/                  # Next.js App Router (Pages, API routes)
│   ├── (auth)/           # Tenant auth, login, signup
│   ├── (dashboard)/      # Mobile-first community workspace & chat UI
│   └── api/              # REST & WebSocket handlers
├── components/           # UI Components
│   ├── ui/               # Reusable atomic UI (shadcn/ui or custom)
│   ├── community/        # Domain components (Chat, Channels, Members)
│   └── mobile/           # Bottom nav, dynamic sheets, drawer UI
├── lib/                  # Core utilities & engine
│   ├── db/               # Database client, migrations, RLS policies
│   ├── redis/            # Upstash Redis Pub/Sub client & channels
│   ├── storage/          # Media upload & Cloudinary helpers
│   └── tenant/           # Tenant context middleware & JWT helpers
├── types/                # Strict TypeScript interfaces & schemas
├── AGENT_RULES.md        # AI Coding Agent Guidelines
└── README.md
```

---

### 5. Coding Standards & Conventions

1. **Type Safety**:
   - Write strict TypeScript. Do **not** use `any`. Define explicit interfaces for all data structures, API requests, and WebSocket payload formats.
2. **Tenant Middleware Protocol**:
   - Every API handler under `/api/` must wrap database access in `withTenantContext(req, async (tenantId, db) => { ... })`.
   - Never write naked SQL or ORM queries without asserting tenant context.
3. **Error Handling & Security**:
   - Wrap async operations in structured try/catch blocks.
   - Do **not** leak internal server traces, SQL errors, or tenant context details in production API responses.
   - Sanitize all user inputs (chat messages, rich text content) to prevent XSS and SQL injection.
4. **Component Isolation**:
   - Keep UI components small, modular, and single-purpose.
   - Separate server actions/API calls from visual component rendering.

---

### 6. AI Agent Workflow Rules

- **Read Before Writing**: Inspect existing module dependencies and type definitions before creating new files.
- **Incremental Implementation**: Build in small, verified steps (e.g., Database Schema -> RLS Policies -> Auth Middleware -> Real-time Broker -> UI Components).
- **Test-Driven Verification**: Write unit tests for tenant context middleware and database RLS policies to verify zero cross-tenant leakage.
