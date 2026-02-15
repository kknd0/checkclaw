# checkclaw — Project Plan

## Overview

**checkclaw** is a financial data platform built on the [Plaid API](https://plaid.com/docs/). As a Plaid service provider, checkclaw offers clients seamless bank account connectivity, financial data queries, payment subscription management, and more.

## Product Suite

| Product | Audience | Description |
|---|---|---|
| **checkclaw Web** | Clients | Web dashboard: sign up, connect banks, manage subscriptions, view service fees, manage authorized accounts |
| **checkclaw CLI** | Clients | Terminal tool: quick balance checks, transaction queries, data export |
| **checkclaw API** | Web + CLI | Backend service: holds Plaid credentials, proxies all financial data requests, manages users and billing |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  checkclaw Web   │     │  checkclaw CLI   │
│  (Dashboard)     │     │  (Terminal Tool) │
└────────┬────────┘     └────────┬────────┘
         │  HTTPS                │  HTTPS
         │  API Key              │  API Key
         ▼                       ▼
┌─────────────────────────────────────────┐
│           checkclaw API Backend          │
│  ┌──────────┐ ┌─────────┐ ┌──────────┐  │
│  │  Users   │ │ Billing │ │  Plaid   │  │
│  └──────────┘ └─────────┘ └──────────┘  │
│          Holds Plaid API Credentials     │
└────────────────────┬────────────────────┘
                     │
                     ▼
              ┌──────────────┐
              │   Plaid API   │
              └──────────────┘
```

## Reserved Assets

| Platform | URL |
|---|---|
| npm | [checkclaw](https://www.npmjs.com/package/checkclaw) |
| GitHub | [kknd0/checkclaw](https://github.com/kknd0/checkclaw) |
| Homebrew Tap | [kknd0/homebrew-checkclaw](https://github.com/kknd0/homebrew-checkclaw) |

## Repository Layout (Separate Repos)

| Repository | Description | Stack | Deployed To |
|---|---|---|---|
| **checkclaw** | CLI client | TypeScript, Commander.js | npm, Homebrew |
| **checkclaw-api** | Backend API | TypeScript, Hono, Plaid SDK | Vercel / CF Workers |
| **checkclaw-web** | Web frontend | TBD (Next.js / Nuxt) | Vercel |

## Tech Stack

### CLI (checkclaw)

| Purpose | Choice |
|---|---|
| Language | TypeScript |
| CLI Framework | Commander.js |
| HTTP Client | Node.js native fetch |
| Terminal Output | cli-table3 + chalk |
| Config Storage | conf |
| CSV Export | csv-stringify |
| Build | tsup |
| Dev Runtime | tsx |

### Backend API (checkclaw-api)

| Purpose | Choice |
|---|---|
| Language | TypeScript |
| Framework | Hono |
| Plaid SDK | plaid (official) |
| Database | Vercel KV / Cloudflare D1 |
| Deployment | Vercel / Cloudflare Workers |

## Project Structure

### checkclaw (CLI)

```
checkclaw/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── bin/
│   └── checkclaw.js              # Executable entry point
└── src/
    ├── index.ts                  # CLI entry (Commander.js)
    ├── commands/
    │   ├── auth.ts               # login / logout / signup
    │   ├── link.ts               # Connect bank account
    │   ├── unlink.ts             # Disconnect bank account
    │   ├── accounts.ts           # List accounts and balances
    │   ├── transactions.ts       # Query transactions
    │   └── export.ts             # Export data
    ├── lib/
    │   ├── api.ts                # HTTP client for backend communication
    │   └── config.ts             # Local config (API Key storage)
    └── utils/
        ├── format.ts             # Table / output formatting
        └── date.ts               # Date utilities
```

### checkclaw-api (Backend)

```
checkclaw-api/
├── package.json
├── tsconfig.json
├── vercel.json                   # or wrangler.toml
└── src/
    ├── index.ts                  # Hono entry
    ├── routes/
    │   ├── auth.ts               # User signup / login / API Key management
    │   ├── link.ts               # Plaid Link proxy
    │   ├── accounts.ts           # Account query proxy
    │   ├── transactions.ts       # Transaction query proxy
    │   └── billing.ts            # Subscription & service fees
    ├── middleware/
    │   └── auth.ts               # API Key verification
    ├── lib/
    │   ├── plaid.ts              # Plaid SDK client (holds credentials)
    │   └── db.ts                 # Database connection
    └── models/
        ├── user.ts               # User model
        ├── token.ts              # Plaid access_token model
        └── subscription.ts       # Subscription / billing model
```

## API Design

### General

- **Base URL**: `https://api.checkclaw.com`
- **Auth**: `Authorization: Bearer <api-key>`
- **Format**: JSON

### Endpoints

#### Authentication

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/auth/signup` | Register new user | No |
| POST | `/auth/login` | Login, receive API Key | No |
| POST | `/auth/oauth/callback` | OAuth callback | No |
| DELETE | `/auth/logout` | Revoke API Key | Yes |
| GET | `/auth/me` | Get current user info | Yes |
| POST | `/auth/api-keys` | Create new API Key | Yes |
| DELETE | `/auth/api-keys/:id` | Revoke an API Key | Yes |

#### Bank Connections

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/link/token` | Create Plaid Link Token | Yes |
| POST | `/link/exchange` | Exchange public_token, store access_token | Yes |
| GET | `/link/items` | List authorized bank connections | Yes |
| DELETE | `/link/:itemId` | Disconnect a bank | Yes |

#### Financial Data

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/accounts` | List accounts | Yes |
| GET | `/accounts/balance` | Get real-time balances | Yes |
| GET | `/transactions` | Get transactions (filterable, paginated) | Yes |
| GET | `/transactions/sync` | Incremental transaction sync | Yes |
| GET | `/transactions/recurring` | Detect recurring payments | Yes |

#### Billing

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/billing/plan` | View current subscription plan | Yes |
| POST | `/billing/subscribe` | Subscribe or upgrade plan | Yes |
| POST | `/billing/cancel` | Cancel subscription | Yes |
| GET | `/billing/invoices` | View invoice history | Yes |
| GET | `/billing/usage` | View current month usage | Yes |

### Request / Response Examples

```json
// GET /accounts/balance
// Authorization: Bearer ck_live_abc123...

{
  "accounts": [
    {
      "id": "acc_xxx",
      "name": "Chase Checking",
      "type": "depository",
      "subtype": "checking",
      "balance": {
        "available": 1234.56,
        "current": 1334.56,
        "currency": "USD"
      }
    }
  ]
}
```

```json
// GET /transactions?days=30&category=Food+and+Drink&limit=20
// Authorization: Bearer ck_live_abc123...

{
  "transactions": [
    {
      "id": "tx_xxx",
      "date": "2025-02-14",
      "merchant": "Whole Foods Market",
      "amount": -45.23,
      "category": ["Food and Drink", "Groceries"],
      "account_id": "acc_xxx"
    }
  ],
  "total": 42,
  "has_more": true
}
```

```json
// GET /billing/plan
// Authorization: Bearer ck_live_abc123...

{
  "plan": "pro",
  "price": 9.00,
  "currency": "USD",
  "billing_cycle": "monthly",
  "current_period_end": "2025-03-15",
  "limits": {
    "bank_connections": 5,
    "monthly_queries": -1
  },
  "usage": {
    "bank_connections": 2,
    "monthly_queries": 347
  }
}
```

## CLI Commands

### `checkclaw signup`

Register a new checkclaw account.

```bash
checkclaw signup                            # Interactive registration
```

### `checkclaw login`

Log in to an existing account.

```bash
checkclaw login                             # Interactive (OAuth via browser)
checkclaw login --key ck_live_abc123        # Direct API Key input
```

### `checkclaw link`

Connect a bank account via Plaid Link in the browser.

```bash
checkclaw link                              # Open browser to connect a bank
checkclaw link --list                       # List authorized bank connections
```

**Flow:**

```
checkclaw link
  -> CLI requests POST /api/link/token from backend
  -> Backend creates link_token using its Plaid credentials
  -> Returns link_token to CLI
  -> CLI starts local HTTP server (localhost:3210)
  -> Opens browser with Plaid Link page (passing link_token)
  -> User completes bank authorization in browser
  -> Plaid callback -> local server receives public_token
  -> CLI sends public_token to backend POST /api/link/exchange
  -> Backend exchanges for access_token -> stores in database
  -> CLI displays success message
```

### `checkclaw unlink`

Disconnect a bank account.

```bash
checkclaw unlink                            # Interactive selection
checkclaw unlink --all                      # Disconnect all accounts
```

### `checkclaw accounts`

List all connected accounts with balances.

```bash
checkclaw accounts                          # List all accounts
checkclaw accounts --type checking          # Filter by type
```

**Output:**

```
┌──────────────────┬──────────┬───────────┬───────────┐
│ Account          │ Type     │ Available │ Current   │
├──────────────────┼──────────┼───────────┼───────────┤
│ Chase Checking   │ checking │ $1,234.56 │ $1,334.56 │
│ Chase Savings    │ savings  │ $5,678.90 │ $5,678.90 │
│ Amex Platinum    │ credit   │ $7,200.00 │ $2,800.00 │
└──────────────────┴──────────┴───────────┴───────────┘
```

### `checkclaw tx`

Query transaction history.

```bash
checkclaw tx                                # Last 30 days
checkclaw tx --days 7                       # Last 7 days
checkclaw tx --from 2025-01-01 --to 2025-01-31   # Date range
checkclaw tx --category "Food and Drink"    # Filter by category
checkclaw tx --search "Starbucks"           # Search merchant name
checkclaw tx --account checking             # Filter by account
checkclaw tx --min 100                      # Amount >= 100
checkclaw tx --limit 50                     # Limit results
checkclaw tx --recurring                    # Recurring payments only
```

**Output:**

```
┌────────────┬─────────────────────┬───────────┬──────────────────┐
│ Date       │ Merchant            │ Amount    │ Category         │
├────────────┼─────────────────────┼───────────┼──────────────────┤
│ 2025-02-14 │ Whole Foods Market  │ -$45.23   │ Food and Drink   │
│ 2025-02-13 │ Shell Gas Station   │ -$52.10   │ Transportation   │
│ 2025-02-12 │ Netflix             │ -$15.99   │ Entertainment    │
│ 2025-02-12 │ Employer Payroll    │ +$3,200.0 │ Income           │
└────────────┴─────────────────────┴───────────┴──────────────────┘
 4 transactions | Total spent: -$113.32 | Total income: +$3,200.00
```

### `checkclaw export`

Export transaction data.

```bash
checkclaw export --format csv --days 90 -o transactions.csv
checkclaw export --format json --from 2025-01-01 -o jan.json
checkclaw export --summary --days 30        # Category spending summary
```

**Summary output:**

```
Monthly Summary (2025-01-15 -> 2025-02-14)
─────────────────────────────────────────
 Food and Drink      $  482.30  ██████████████ 32%
 Transportation      $  310.50  ██████████     21%
 Entertainment       $  125.99  ████           8%
 Shopping            $   89.45  ███            6%
 Other               $  492.76  ████████████████ 33%
─────────────────────────────────────────
 Total Spending      $1,501.00
 Total Income        $6,400.00
 Net                 +$4,899.00
```

### `checkclaw billing`

View subscription and service fees (also manageable on the web dashboard).

```bash
checkclaw billing                           # Current plan and usage
checkclaw billing invoices                  # Invoice history
```

**Output:**

```
Plan: Pro ($9/mo)
Period: 2025-01-15 -> 2025-02-15

Usage:
  Bank connections   2 / 5
  API queries        347 / unlimited

Next invoice: $9.00 on 2025-02-15
```

## Web Dashboard (checkclaw-web)

The web dashboard provides full account management; the CLI focuses on data queries.

| Module | Description |
|---|---|
| **Auth** | Email signup, OAuth login (Google / GitHub) |
| **Overview** | Connected banks, account balances, recent transactions |
| **Bank Connections** | Connect / disconnect banks via Plaid Link |
| **Transactions** | Browse, search, filter, categorize transactions |
| **Subscriptions** | Auto-detect recurring payments, manage alerts |
| **API Keys** | Create, view, revoke API Keys |
| **Billing** | Choose plan, upgrade / downgrade, view invoices, service fee breakdown |
| **Settings** | Profile, notification preferences, data export |

## Security

### Client-Side

- **API Key** stored at `~/.config/checkclaw/credentials.json` with `600` file permissions
- **No bank credentials** stored on the client — no passwords or access_tokens
- **Minimal data sent** — CLI only transmits necessary request parameters

### Server-Side

- **Plaid credentials** stored exclusively in server environment variables, never exposed
- **access_tokens** encrypted at rest in the database, scoped to individual users
- **API Key format**: `ck_live_` prefix + random string for easy identification and revocation
- **Rate limiting** enforced per user, scaled by subscription tier
- **HTTPS enforced** for all API communication
- **Data isolation**: users can only access their own financial data

## Installation

```bash
# npm
npm install -g checkclaw

# Homebrew
brew tap kknd0/checkclaw
brew install checkclaw

# npx (no install)
npx checkclaw accounts
```

## Pricing

| Tier | Price | Limits |
|---|---|---|
| Free | $0 | 1 bank connection, 100 queries/month |
| Pro | $9/mo | 5 bank connections, unlimited queries, data export, subscription detection |
| Business | $29/mo | Unlimited bank connections, team sharing, priority support |

## Roadmap

### Phase 1 — Foundation

- [ ] **checkclaw**: Init TypeScript project, Commander.js skeleton, register all subcommands
- [ ] **checkclaw-api**: Init Hono project, route structure, Vercel deployment config
- [ ] **checkclaw-api**: Plaid SDK client wrapper
- [ ] **checkclaw-api**: Database schema design (users, API keys, Plaid tokens, subscriptions)

### Phase 2 — Authentication

- [ ] **checkclaw-api**: User signup / login endpoints, API Key generation and validation
- [ ] **checkclaw-api**: OAuth integration (Google / GitHub)
- [ ] **checkclaw**: `signup` / `login` / `logout` commands
- [ ] **checkclaw**: API Key local storage + HTTP client wrapper

### Phase 3 — Bank Connections

- [ ] **checkclaw-api**: Plaid Link Token creation, public_token exchange, access_token storage
- [ ] **checkclaw**: `link` command (local server + browser + Plaid Link page)
- [ ] **checkclaw**: `unlink` command

### Phase 4 — Data Queries

- [ ] **checkclaw-api**: Accounts / balance / transactions / recurring transaction endpoints
- [ ] **checkclaw**: `accounts` / `tx` commands (with filters and pagination)
- [ ] **checkclaw**: `export` command (CSV / JSON / summary reports)

### Phase 5 — Billing

- [ ] **checkclaw-api**: Subscription plan management, usage tracking, invoice generation
- [ ] **checkclaw**: `billing` command
- [ ] Stripe payment gateway integration

### Phase 6 — Web Dashboard

- [ ] **checkclaw-web**: Project initialization
- [ ] Auth pages (signup / login)
- [ ] Account overview dashboard
- [ ] Bank connection management (Plaid Link integration)
- [ ] Transaction browser & subscription management
- [ ] API Key management page
- [ ] Billing & invoice pages

### Phase 7 — Polish & Launch

- [ ] Error handling and user messaging improvements
- [ ] **checkclaw-api**: Production domain + deployment
- [ ] **checkclaw**: Publish v1.0.0 to npm
- [ ] Update Homebrew Formula
- [ ] GitHub Releases + CHANGELOG
- [ ] Launch website & documentation
