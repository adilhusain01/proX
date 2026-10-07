# Changelog

What changed in ProX, newest first. Add an entry whenever behaviour, the API, the design or the way to run the app changes.

## 2026-10-07

### Pitch deck

- The script was rewritten for the video: shorter and plainer, about three minutes spoken. `pitch/video/make.py` builds a narrated video from the deck with an ElevenLabs voice. The last slide now carries a real QR code for `https://prox-weld.vercel.app`, checked by decoding it.

- A business model slide was added before the close, at Rizwan's request: a $10 monthly subscription and a $1 flat fee per protection, beside the size of the market. The market figures come from RWA.xyz and Binance Research and are cited on the slide; the two prices are a launch plan and labelled as one. The deck is now fifteen slides.

- `pitch/index.html` holds the fourteen-slide pitch, with Rizwan's spoken script in each slide and a small viewer for presenting, reading the script and printing to PDF. `pitch/README.md` covers how to edit it and what is left to do.
- Five meme images in `pitch/assets` are stand-ins to be replaced with licensed copies. The QR code on the last slide is a placeholder until the site has a public address.
- Checked: all fourteen slides render in a headless browser with nothing outside the canvas and no failed requests.

### Handoff guide

- `docs/DESIGN_HANDOFF.md` tells Rizwan and his AI how to bring the new frontend into a copy from before this work: a fresh clone, or nine layers taken one at a time with a check after each. `AGENTS.md` now says the design is settled and points there.
- Checked: the nine steps were run in a throwaway worktree starting from the first commit. Afterwards the tree had no differences from `dev`.

### Redesign, landing page and the move to /app

Asked for by Adil: make the interface and its flow first-rate, use the full width, add a landing page that explains the idea visually, and put the app under `/app`.

Routes:

- `/` is now a public landing page. The app lives at `/app`, `/app/protect`, `/app/protection/[id]`, `/app/protection/[id]/receipt` and `/app/advanced`. The old paths redirect.
- Only `/app` is behind the wallet sign-in.

Landing page:

- A hero chart of a price falling while the market is shut, with the hedged line holding level. It is an illustration and says so.
- A worked example the visitor can move: a price change and a protection level give the stock result, the hedge result and the net.
- How it works in three steps, the safeguards, and the real market session read from the backend when it is reachable.

App:

- One header row: brand, section tabs, market session, wallet and sign out. Content is up to 1240 pixels wide with a side rail.
- Portfolio: the value, a coverage bar of hedged against exposed, the stocks with their protection state, and a rail with the market session and a margin meter.
- Protect: three numbered steps and a summary that stays in view. The summary shows what is protected, the window on a line from now to the latest close, and a table of what a price move does with and without the hedge.
- Live protection: the result as one sum (stock plus hedge minus costs), a four-stage progress line, the chart, the margin meter, and readable timeline, price checks, orders and Solana records.
- Receipt: the same sum, what you hold against what you would hold without the hedge, a statement and the proof.
- Advanced: tables and labelled values in place of raw JSON, which is still there under each section.

Two faults fixed on the way:

- A short on Backpack that ProX did not open was ignored, so the portfolio said nothing was hedged. It now counts as hedged and is labelled as not managed by ProX.
- When an existing short already covered the chosen level, the preview offered to "Short 0" with the button enabled. It now says the position is already covered and disables the button.

Details:

- Buttons and choices scale to 0.97 when pressed. Transitions name the properties they change and use one ease-out curve.
- Amounts under a dollar show two decimals unless that would round a real amount to zero.
- Loading, empty and error states say what is happening and what to do next.

Checked: typecheck and lint pass. Every page was viewed in a headless browser at 1440 and 390 wide, signed in, against the real Backpack account with trading off: no horizontal overflow and no console errors. The live protection and receipt pages were viewed with a test record in a scratch database, because no real protection has been run from this machine. Not checked: an activation through the new Protect page, and the pages in Safari or Firefox.

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
