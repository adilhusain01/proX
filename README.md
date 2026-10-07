# ProX

Temporary downside protection for tokenized stocks held on Backpack. You hold NVDA on Backpack, pick a protection level and a time range, and ProX opens a matching short on the Backpack equity perpetual, watches margin and basis, and closes it reduce-only once the window has ended and prices have converged. A Chainlink CRE workflow acts as the convergence oracle; the hashes of what happened are written to Solana mainnet as Memo transactions.

The product spec is in `docs/prd.md`. What has changed since, by date, is in `docs/CHANGELOG.md`.

## Layout

| Folder | What it is |
|---|---|
| `packages/core` | Pure logic shared by the backend and the oracle: US equity session engine, basis maths, report codec |
| `backend` | Fastify API, Backpack adapter (REST + WebSocket), protection state machine, risk engine, workers, CRE report ingest, Solana anchoring |
| `cre` | Chainlink CRE project with the `convergence-oracle` workflow |
| `frontend` | Next.js app: portfolio, protect, live protection, receipt, advanced |

Each of `frontend` and `cre/convergence-oracle` has its own README.

## What the user picks

On the Protect page the user chooses three things. Everything else (perp quantity, leverage, margin) is worked out by the backend.

| Choice | Options | What the backend receives |
|---|---|---|
| Stock | Any held stock with a Backpack perpetual | `stockSymbol` |
| Protection | 25, 50, 75 or 100 percent | `protectionBps` |
| Time range | After hours, 4 hours, Weekend, Custom | `mode`, plus `customEndAt` or `days` |

- **After hours** is `mode: TONIGHT`. It ends at a regular market open. With `days` set to 1, 3 or 5 the hedge stays on through that many market opens and closes after the last one. It is one hedge held for the whole span; it is not re-opened each night.
- **4 hours** is `mode: CUSTOM` with `customEndAt` four hours after the option was picked.
- **Weekend** is `mode: WEEKEND`: the first regular open after the coming weekend.
- **Custom** is `mode: CUSTOM` with a time the user picks.

When the window ends the policy waits for convergence, then closes.

## Getting started

Prerequisites: Node 22+, pnpm 11, Bun 1.2+, the CRE CLI (`cre`), a Postgres database, a Backpack account that holds a tokenized stock, and a Solana wallet.

1. Install dependencies.

   ```bash
   pnpm install
   cd cre/convergence-oracle && bun install && cd ../..
   ```

2. Configure the backend. Copy `backend/.env.example` to `backend/.env` and fill it in. Every trading limit is required on purpose; the PRD values are `MAX_TOTAL_NOTIONAL_USD=50`, `MAX_POSITION_NOTIONAL_USD=25`, `MAX_APPLICATION_LEVERAGE=2`, `MMR_WARNING=0.50`, `MMR_RISK=0.65`, `MMR_REDUCE=0.80`, `MMR_EMERGENCY=0.90`, `CONVERGENCE_BPS=50`, `CONVERGENCE_COUNT=3`.
   - `BACKPACK_API_KEY` and `BACKPACK_PRIVATE_KEY`: an ED25519 key pair from Backpack, Settings, API Keys (base64). The backend checks they belong together at boot.
   - `OPERATOR_WALLETS`: the Solana addresses allowed to sign in, comma separated. A wallet that is not listed is refused with "this wallet is not allowed to operate the app".
   - `DATABASE_URL`: your own Postgres. The value in a copy received from someone else points at their machine.
   - `SOLANA_PRIVATE_KEY`: pays for Memo anchors. Leave empty to turn anchoring off.
   - `CRE_INGEST_TOKEN`: any random string; put the same value in `cre/.env` as `CRE_SECRET_PROX_INGEST_TOKEN`.

3. Configure the oracle. Copy `cre/.env.example` to `cre/.env`, run `cre login`, and check `cre/convergence-oracle/config.staging.json` points at the backend (`http://127.0.0.1:4000` locally).

4. Create the database and start the backend. The schema is applied at every boot; it is idempotent.

   ```bash
   createdb prox
   pnpm dev:backend
   ```

5. Start the frontend and open http://localhost:3000.

   ```bash
   pnpm dev:frontend
   ```

6. Sign in. Connect a wallet listed in `OPERATOR_WALLETS` and sign the one-time message. It is free and sends no transaction.

### Running on other ports, or without pnpm

Any value in `backend/.env` can be overridden for one run by setting it on the command line, because the backend never overwrites a variable that is already set. The frontend reads the backend address from `NEXT_PUBLIC_API_URL`. `npx` runs the tools straight from `node_modules`, so pnpm is not needed just to start the app.

```bash
# backend on 4100, allowing a frontend on 3200
cd backend
PORT=4100 FRONTEND_ORIGIN=http://localhost:3200 npx tsx watch src/server.ts

# frontend on 3200, talking to that backend
cd frontend
NEXT_PUBLIC_API_URL=http://localhost:4100 npx next dev -p 3200
```

The same trick works for `DATABASE_URL`, `OPERATOR_WALLETS` and `TRADING_ENABLED=false`. If the backend moves off port 4000, change `backendUrl` in `cre/convergence-oracle/config.staging.json` too, or the oracle cannot reach it and no convergence checks arrive.

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `bad interpreter: Operation not permitted`, or `library load disallowed by system policy` | macOS quarantined the folder because it arrived through a browser, AirDrop or a chat app | `xattr -dr com.apple.quarantine .` from this folder |
| `zsh: command not found: pnpm` | pnpm is not installed | Use the `npx` commands above, `npx pnpm@11.1.2 <command>`, or `npm i -g pnpm@11` |
| `ERR_PNPM_UNEXPECTED_STORE` | `node_modules` was copied from another machine | `pnpm install --config.confirmModulesPurge=false`, which rebuilds it from the lockfile |
| `ECONNREFUSED ...:5432` at boot | `DATABASE_URL` points at a Postgres that is not there | Point it at your own; check the port with `lsof -nP -iTCP -sTCP:LISTEN \| grep postgres` |
| "this wallet is not allowed to operate the app" | The connected wallet is not in `OPERATOR_WALLETS` | Add its address and restart the backend |
| The page has layout but no colours or fonts after a style change | The dev server kept a stale stylesheet | Restart `next dev` |
| `backend/.env is incomplete or invalid` | A required value is blank | The message lists each missing name |

## Working together

The code lives at `github.com/adilhusain01/proX` (private). Adil and Rizwan both push to it.

- `main` holds code that is known to work. Nobody commits to it directly.
- `dev` is where work happens. Branch from it for anything larger (`git switch -c time-ranges dev`), and merge back with a pull request.
- `dev` goes into `main` through a pull request once it has been run and checked.
- Each machine keeps its own `backend/.env`, `cre/.env` and `frontend/.env.local`. They are ignored by git and must never be committed. After pulling, run `pnpm install`.

```bash
git clone git@github.com:adilhusain01/proX.git && cd proX
git switch dev
pnpm install
```

## Tests

```bash
pnpm test          # unit tests for core and backend (no network)
pnpm test:live     # read-only checks against the real Backpack API
pnpm typecheck
```

Without pnpm: `npx vitest run` inside `backend` or `packages/core`, and `npx tsc --noEmit` inside `backend` or `frontend`.

The live suite needs no key for the public endpoints. Signed endpoints and the single live order test run only when `backend/.env` holds a key and you opt in; see `backend/test/live`.

Tests are written from the requirement and seen to fail before the code exists. Do not edit a test to make it pass.

## HTTP API

All routes except the three marked public need a signed-in operator.

| Route | Purpose |
|---|---|
| `GET /api/health` (public) | Trading switch, demo mode, oracle mode, socket state, current session |
| `POST /api/auth/challenge`, `/verify`, `/logout`, `GET /api/auth/me` | Wallet sign-in |
| `GET /api/portfolio` | Holdings, other assets, positions, account health |
| `GET /api/protection/markets` | Held stocks with their perp, eligibility and which levels can be sized |
| `POST /api/protection/preview` | Sizing, leverage, risk, costs, window and blockers for a choice |
| `POST /api/protection` | Activate: places the real short |
| `GET /api/protection`, `/:id`, `/:id/health`, `/:id/receipt` | Policies and their detail |
| `POST /api/protection/:id/close` | Manual reduce-only close |
| `POST /api/demo/reopen` | Demo mode: treat the market as reopened now |
| `GET /api/account/advanced` | Raw Backpack account data |
| `GET /api/attestations`, `GET /api/attestations/:hash` (public) | Stored oracle reports |
| `GET /api/cre/watchlist` (public), `POST /api/cre/reports` | Used by the oracle |
| `GET /api/stream` | Server-sent events for live updates |

`preview` and `activate` take `{ stockSymbol, protectionBps, mode, customEndAt?, days? }`. `days` is 1, 3 or 5 and only affects `TONIGHT`.

## How the oracle runs

Until Chainlink grants deploy access (`cre account access`), the backend runs the workflow itself through `cre workflow simulate` every `CRE_SIM_INTERVAL_SEC` seconds while a protection is live (`CRE_REPORT_MODE=simulation`). Those reports carry the simulator's test signatures, are accepted only from this machine with the shared token, and are labelled as such. With deploy access, deploy to the private registry, host the backend on a public URL, set `CRE_REPORT_MODE=don`, `CRE_WORKFLOW_ID` and `ETH_MAINNET_RPC_URL`, and the backend verifies f+1 DON signatures against the Capability Registry before trusting a report.

## Safety rails

- The executor can only sell to open and buy reduce-only to close. Opening orders are IOC limits priced within `MAX_SLIPPAGE_BPS` of the touch.
- `TRADING_ENABLED=false` turns every order route off while leaving the dashboard readable. Use it whenever the keys in `backend/.env` belong to someone else.
- One live protection per stock, caps on position and total notional, an allowlist of stock symbols.
- Every order is written to the database before it is sent, with a deterministic `clientId`; unknown outcomes are reconciled, never resent blindly.
- Risk actions run on Backpack's maintenance margin rate from the backend's own data, never from the oracle.

## Where the code differs from the PRD

- Orders are IOC limits bounded by `MAX_SLIPPAGE_BPS`. The PRD allowed market orders.
- Any Postgres works, through `pg`. The PRD named Supabase.
- The Chainlink CRE oracle and the Solana Memo anchors were added. The PRD had no chain part.
- Sign-in with an allowlisted Solana wallet guards every trading route.
- Time ranges are After hours (1, 3 or 5 days), 4 hours, Weekend and Custom. The PRD listed Tonight, Weekend and Custom.

## Open points

- Whether "1, 3 or 5 days" should instead re-open the hedge each night. That would need a scheduler that places orders unattended.
- `Health`, `MarketRow` and `PolicyHealth` are still typed by hand in `frontend/lib/api.ts`, because `backend/src/api/routes.ts` builds them inline.
