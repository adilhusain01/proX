# Changelog

What changed in ProX, newest first. Add an entry whenever behaviour, the API, the design or the way to run the app changes.

## 2026-10-07

### Time ranges and days

Asked for by Rizwan: check the UI flow of wallet connection, choosing the asset, a time range of "after hours", "4 hours" or custom, and 1, 3 or 5 days.

- The Protect page offers After hours, 4 hours, Weekend and Custom. After hours has a 1, 3 or 5 day choice.
- `preview` and `activate` accept `days` (1, 3 or 5). It only affects `mode: TONIGHT`, where the window ends at the regular open that many trading days ahead.
- `nthStateStart` in `packages/core/src/session.ts` does the counting. `MarketSessionService.reopenFor` takes the day count.
- "4 hours" needs no backend change: it is `mode: CUSTOM` with an end time four hours after the option was picked.
- Assumption, not yet confirmed with Rizwan: the days mean one hedge held through that many market opens. A hedge re-armed every night would need a scheduler that places orders unattended.
- Tests: `packages/core/test/session.test.ts` (`nthStateStart`) and `backend/test/market-session.test.ts`. Both were written first and seen to fail.

Checked against the live Backpack calendar on Wednesday 7 October 2026: 1, 3 and 5 days end on 7, 9 and 13 October at 13:30 UTC.

### Umbra design

Asked for by Adil: take the whole look from the Umbra wallet.

- Tokens, fonts, paper background, buttons, chips, tabs, sheets, toasts and page layout now follow `adilhusain01/umbra`, files `web/src/theme.css` and `web/src/style.css`. Those files are unchanged from the original author's last commit, so this is the original Umbra style.
- Fonts: Bodoni Moda, Mulish, Geist Mono, loaded through `next/font`.
- The shell is a brand bar with status chips and pill section tabs. The portfolio leads with a centred balance. Sign-in is a single centred screen.
- Dark mode was removed. Umbra has one theme.
- `frontend/README.md` describes the tokens and how to use them.

### Interface fixes

- Sign out button in the header. It clears the session and disconnects the wallet.
- The advanced page lists the latest oracle reports, using `GET /api/attestations` and `GET /api/attestations/:hash`.
- The preview leads with what is protected, what is still exposed and until when. Margin and pricing figures are in a collapsed section.
- Sign-in shows the wallet button once. It was in the header and the card.
- "-$0.00" is shown as "$0.00", and the perp is named "NVDA" where it read "NVDA.US".
- A lint error on the protect page (state set inside an effect) is gone; the default stock is derived.

### API and types

- Removed `GET /api/session`. `GET /api/health` already returns the session.
- `frontend/lib/api.ts` imports its response types from the backend through `Wire<T>`. `Health`, `MarketRow` and `PolicyHealth` are still written by hand.
- `frontend/tsconfig.json` targets ES2020, needed for the BigInt maths in `packages/core`.

### Loading indicator

Asked for by Adil: the grey skeleton box looked wrong.

- Every loading state now shows the Gather spinner from the `loading-dev` package, through one component, `frontend/components/loader.tsx`. It replaced the skeleton boxes on all five pages, the "Loading…" and "Checking session…" text, and the empty preview card.
- The spinner takes its colour from the text, so it is ink on paper. The package honours the reduced-motion setting itself.
- `components/ui/skeleton.tsx` is still in the tree but no longer used.
- Seen in a headless browser with the portfolio request held open: the spinner and its caption show, and no skeleton element is left.

### Dependencies reinstalled on Adil's Mac

- `node_modules` had been copied from Rizwan's machine and pointed at his pnpm store, so pnpm refused to add a package. `pnpm install` was run to rebuild it against the local store; `pnpm-lock.yaml` now also lists `loading-dev`.
- pnpm is still not installed globally on the Mac. `npx pnpm@11.1.2 <command>` works.

### Running it

- The README gained sections on other ports, running without pnpm, and troubleshooting (macOS quarantine, a missing database, a wallet that is not allowed, a stale stylesheet).

### Repository

- First commit pushed to `github.com/adilhusain01/proX` (private). Rizwan is a collaborator.
- `main` is the stable branch and `dev` is the working branch. The README has the workflow.
- Checked before the first commit: the three `.env` files are ignored, and none of their secret values appears in any committed file.

### Ignore rules

- The root `.gitignore` now also covers key and wallet files (`*.pem`, `*.key`, `*-keypair.json`, `id.json`, `wallet*.json`), cookie files, database dumps, editor folders, and the Vercel, Turbo and pnpm store folders.
- `frontend/.gitignore` and `cre/.gitignore` no longer ignore their own `.env.example`.
- Checked: the working tree is clean, the only env files tracked are the three `.env.example` files, and no untracked file is left outside the ignore rules.

### State at the end of the day

- Typecheck passes for backend and frontend. Lint is clean. Tests: 63 in backend, 24 in core.
- Seen in a headless browser at 1280 and 390 wide, signed in, against the real Backpack account holding 0.01 NVDA, with trading switched off: portfolio, protect and advanced.
- Not yet seen with data: the live protection page and the receipt.
- The oracle cannot run on Adil's Mac yet: the Chainlink CRE command-line tool is not installed there, and the oracle config points at port 4000 while that backend runs on 4100. A hedge opened there closes by the Close now button, the risk engine or the hard stop, not by convergence.
- Not yet done: an activation through the UI. Rizwan reports the same engine opening and closing a 0.01 NVDA short from the command line.
