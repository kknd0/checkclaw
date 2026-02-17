# checkclaw

CLI for [checkclaw](https://checkclaw.com) — query bank accounts, transactions, and manage financial data from your terminal.

Built on the [Plaid API](https://plaid.com/docs/), checkclaw gives you instant access to your bank accounts, transactions, and spending insights — all from the command line.

## Installation

```bash
# npm (global)
npm install -g checkclaw

# npx (no install)
npx checkclaw --help
```

## Quick Start

```bash
# Create an account
checkclaw signup

# Or log in with an API key
checkclaw login --key ck_live_abc123

# Connect a bank
checkclaw link

# View your accounts
checkclaw accounts

# Check recent transactions
checkclaw tx --days 7

# Export to CSV
checkclaw export --format csv --days 90 -o transactions.csv
```

## Commands

### Authentication

```bash
checkclaw signup                          # Create a new account (interactive)
checkclaw login                           # Log in (interactive email/password)
checkclaw login --key ck_live_abc123      # Log in with API key
checkclaw logout                          # Clear stored credentials
```

### Bank Connections

```bash
checkclaw link                            # Connect a bank via Plaid Link
checkclaw link --list                     # List connected banks
checkclaw unlink                          # Disconnect a bank (interactive)
checkclaw unlink --all                    # Disconnect all banks
```

### Accounts

```bash
checkclaw accounts                        # List all accounts with balances
checkclaw accounts --type checking        # Filter by account type
```

**Example output:**

```
┌──────────────────┬──────────┬───────────┬───────────┐
│ Account          │ Type     │ Available │ Current   │
├──────────────────┼──────────┼───────────┼───────────┤
│ Chase Checking   │ checking │ $1,234.56 │ $1,334.56 │
│ Chase Savings    │ savings  │ $5,678.90 │ $5,678.90 │
│ Amex Platinum    │ credit   │ $7,200.00 │ $2,800.00 │
└──────────────────┴──────────┴───────────┴───────────┘
```

### Transactions

```bash
checkclaw tx                              # Last 30 days
checkclaw tx --days 7                     # Last 7 days
checkclaw tx --from 2025-01-01 --to 2025-01-31   # Date range
checkclaw tx --category "Food and Drink"  # Filter by category
checkclaw tx --search "Starbucks"         # Search by merchant
checkclaw tx --min 100                    # Minimum amount
checkclaw tx --limit 50                   # Limit results
checkclaw tx --recurring                  # Show recurring payments
```

**Example output:**

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

### Export

```bash
checkclaw export --format csv --days 90 -o transactions.csv
checkclaw export --format json --from 2025-01-01 -o jan.json
checkclaw export --summary --days 30      # Category spending summary
```

**Summary output:**

```
Monthly Summary (2025-01-15 -> 2025-02-14)
──────────────────────────────────────────
 Food and Drink      $  482.30  ██████████████ 32%
 Transportation      $  310.50  ██████████     21%
 Entertainment       $  125.99  ████           8%
 Shopping            $   89.45  ███            6%
 Other               $  492.76  ████████████████ 33%
──────────────────────────────────────────
 Total Spending      $ 1,501.00
 Total Income        $ 6,400.00
 Net                 +$4,899.00
```

### Billing

```bash
checkclaw billing                         # Current plan and usage
checkclaw billing invoices                # Invoice history
```

**Example output:**

```
Plan: Pro ($9.00/mo)
Period: ... -> 2025-02-15

Usage:
  Bank connections   2 / 5
  API queries        347 / unlimited

Next invoice: $9.00 on 2025-02-15
```

## Configuration

Credentials are stored at `~/.config/checkclaw/config.json`.

You can authenticate via:
- **Session**: Interactive login (email + password)
- **API Key**: Direct key input (`checkclaw login --key ck_live_...`)

## Security

- Credentials stored locally with restrictive file permissions
- No bank passwords or access tokens stored on your machine
- All communication over HTTPS
- API keys use `ck_live_` prefix for easy identification

## Requirements

- Node.js 18+

## License

MIT © [Lizi Li](https://github.com/kknd0)
