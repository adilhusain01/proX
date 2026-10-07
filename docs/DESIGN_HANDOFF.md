# Bringing the new frontend into your copy

For Rizwan and the AI working with him. Written on 2026-10-07.

Adil redesigned the frontend that day and added a landing page. This is now the agreed design for ProX, and it is on the `dev` and `main` branches of `github.com/adilhusain01/proX`. Your local copy is from before that work. This guide gets you onto the new frontend in small steps, with a check after each one, so that if something breaks you know which step did it.

Read `frontend/README.md` for what the design is and how to use it. Read `docs/CHANGELOG.md` for the full list of what changed and what was verified. This file is only about how to get there safely.

## Why move to it

The earlier screens worked, but they were a narrow column of boxed cards, with margin jargon up front and raw JSON on two pages. The new frontend:

- Explains the product on a public landing page, with a chart of a price gap and an example you can move.
- Leads every app screen with the thing the user came for: what is hedged, what a protection would do, what it did.
- Shows the market session and a countdown to the open, which is the reason the product exists.
- Fixes two real faults (listed under "Behaviour that changed" below).
- Was viewed at 1440 and 390 pixels wide with no sideways scroll and no console errors.

Keep its tokens, type and layout. If you want to change the design, say so to Adil first and change it in one place (`frontend/app/globals.css` and `frontend/README.md`), so both machines stay the same.

## Before you start

Your folder and the repo do not share git history. Your copy was never committed, and the repo started from Adil's copy. So `git merge origin/dev` will refuse with "unrelated histories". Both ways below avoid a merge.

Keep your three env files whatever you do. They are ignored by git and nothing here touches them: `backend/.env`, `cre/.env`, `frontend/.env.local`.

Stop both dev servers first. Start them again only when a step tells you to check something.

## The short way: a fresh clone

Use this if you have not changed the code since you sent it to Adil, or only a little.

```bash
cd <the folder that holds your ProX folder>
git clone git@github.com:adilhusain01/proX.git prox-new && cd prox-new
git switch dev
cp ../<old app folder>/backend/.env backend/.env
cp ../<old app folder>/cre/.env cre/.env
cp ../<old app folder>/frontend/.env.local frontend/.env.local
pnpm install
cd cre/convergence-oracle && bun install && cd ../..
```

Set `CRE_PROJECT_DIR` in `backend/.env` to the new `cre` folder. Then run the checks in step 8 below. Keep the old folder until you are sure nothing in it is missing from the new one.

If you did change code in the old folder, compare the two (`diff -ru <old>/backend/src prox-new/backend/src`) and bring your changes across by hand, on a branch off `dev`.

## The long way, one layer at a time

Use this to change your existing folder in place and see each layer land. First save what you have and connect the repo:

```bash
cd <your ProX app folder>
git add -A && git commit -m "Save local work before taking the new frontend"
git remote add origin git@github.com:adilhusain01/proX.git   # skip if it is already there
git fetch origin
git switch -c take-new-frontend
```

Each step takes a named set of files from `origin/dev` with `git checkout origin/dev -- <paths>`. That replaces those files and leaves everything else alone, and it works without shared history. Commit after each step that passes its check, so you can go back one step with `git reset --hard HEAD~1`.

If you changed one of the files a step replaces, look at your change first (`git diff HEAD origin/dev -- <file>`), take the new file, then put your change back on top of it.

The order matters. Later steps import things that earlier steps add.

### Step 1. The new dependency

```bash
git checkout origin/dev -- frontend/package.json pnpm-lock.yaml
pnpm install
```

This adds `loading-dev`, the loading spinner. Check: `pnpm install` finishes without errors, and `ls frontend/node_modules/loading-dev` lists a `dist` folder.

### Step 2. The day count in the backend and core

```bash
git checkout origin/dev -- \
  packages/core/src/session.ts packages/core/test/session.test.ts \
  backend/src/market/market-session.service.ts backend/test/market-session.test.ts \
  backend/src/protection/protection.preview.ts backend/src/api/routes.ts
```

What it does: `preview` and `activate` accept `days` (1, 3 or 5) for the After hours range, and `GET /api/session` is removed because `GET /api/health` already returns the session.

Check:

```bash
pnpm test            # expect 24 tests in core and 63 in backend to pass
pnpm --filter @prox/backend typecheck
```

Start the backend and confirm it prints "ProX backend ready".

### Step 3. Types, helpers and the TypeScript target

```bash
git checkout origin/dev -- \
  frontend/tsconfig.json frontend/lib/api.ts frontend/lib/format.ts \
  frontend/lib/hedge.ts frontend/hooks/use-now.ts
```

`lib/api.ts` now imports its response types from the backend source, so this step depends on step 2. The typecheck will fail here, because the old pages still use names this step changed. That is expected. Go straight to step 4.

### Step 4. Colours, type and the base components

```bash
git checkout origin/dev -- \
  frontend/app/globals.css frontend/app/layout.tsx frontend/components/ui \
  frontend/components/risk-badge.tsx frontend/components/error-card.tsx \
  frontend/components/pnl-chart.tsx
```

This is the Umbra look: cream paper, charcoal ink, one gold accent, Bodoni Moda with Mulish and Geist Mono. Nothing to check yet; the pages come next.

### Step 5. The shared pieces

```bash
git checkout origin/dev -- \
  frontend/components/loader.tsx frontend/components/umbra.tsx \
  frontend/components/session-card.tsx frontend/components/coverage-bar.tsx \
  frontend/components/margin-meter.tsx frontend/components/window-track.tsx \
  frontend/components/scenario-table.tsx frontend/components/result-equation.tsx \
  frontend/components/anchors-list.tsx
```

### Step 6. The routes, the shell and the pages

The app moved from `/` to `/app`, so the page files moved from `frontend/app/` to `frontend/app/app/`. Remove the old ones and take the new ones together, or Next.js will see two pages for the same thing.

```bash
git rm -r -q frontend/app/page.tsx frontend/app/protect frontend/app/protection frontend/app/advanced
git checkout origin/dev -- \
  frontend/app/app frontend/app/page.tsx frontend/components/landing \
  frontend/components/app-shell.tsx frontend/components/sign-in-gate.tsx \
  frontend/next.config.ts
```

Check, and this is the one that matters:

```bash
cd frontend
npx tsc --noEmit
npx eslint app components hooks lib
```

Both must pass with no errors. If `tsc` complains about files under `.next/types`, those are left over from the old routes: delete the `frontend/.next` folder and run it again.

### Step 7. The docs

```bash
git checkout origin/dev -- README.md AGENTS.md docs frontend/README.md cre/convergence-oracle/README.md .gitignore frontend/.gitignore cre/.gitignore
```

### Step 8. See it

Start the backend, then the frontend, and open each of these:

| Address | What you should see |
|---|---|
| `/` | The landing page: a large headline, a chart with a shaded "market closed" band, and a slider example |
| `/app` | The sign-in screen, then the portfolio with the value, a hedged and exposed bar, and a side rail |
| `/app/protect` | Three numbered steps on the left and a summary on the right |
| `/app/advanced` | Tables, with "Raw response" under each section |
| `/protect` | A redirect to `/app/protect` |

### Step 9. Rejoin the repo's history

Your folder now holds the new frontend, but your branch still has no history in common with the repo. See what still differs:

```bash
git diff --stat origin/dev
```

Anything listed is either a file these steps did not cover or a change of your own. When that list is what you expect, move your branch onto the repo's history without touching your files:

```bash
git reset --soft origin/dev
git status
```

`git status` now shows only your own differences from `dev`, staged. Commit them if you want them, or drop them with `git checkout origin/dev -- <file>`. From here you push your branch and open a pull request into `dev` like anyone else.

## After every step

```bash
git status                      # only the files that step names should have changed
git add -A && git commit -m "Take the new frontend: step N"
```

## If something looks wrong

| What you see | Cause | Fix |
|---|---|---|
| The page has the new layout but is white, with a plain serif font | The dev server kept the old stylesheet | Stop `next dev` and start it again |
| A hydration error in the console right after taking new files | The dev server rendered the old component on the server | Stop `next dev` and start it again |
| `Cannot find module 'loading-dev'` | Step 1 was skipped or `pnpm install` did not run | Run `pnpm install` |
| `ERR_PNPM_UNEXPECTED_STORE` | `node_modules` came from another machine | `pnpm install --config.confirmModulesPurge=false` |
| `BigInt literals are not available` | `frontend/tsconfig.json` still targets ES2017 | Take the file in step 3 |
| The frontend calls `/api/session` and gets 404 | An old page is still in place | Finish step 6 |
| "this wallet is not allowed to operate the app" | Your wallet is not in `OPERATOR_WALLETS` | Add it in `backend/.env` and restart the backend |
| `bad interpreter: Operation not permitted` | macOS quarantined a folder that arrived by chat or AirDrop | `xattr -dr com.apple.quarantine .` |

## Behaviour that changed

These are differences you will notice, and they are intended.

- **Addresses.** The app is at `/app`. The root is the landing page. Old links redirect.
- **Time ranges.** After hours (for 1, 3 or 5 days), 4 hours, Weekend and Custom. "Tonight" is now called After hours. The 1, 3 or 5 days mean one hedge held through that many market opens. Adil built it that way as an assumption. If you meant a hedge that re-opens every night, tell him; that needs a scheduler that places orders unattended.
- **A short you opened yourself counts.** If Backpack shows a short that ProX did not open, the portfolio counts it as hedged and labels it as not managed by ProX. Before, it said nothing was hedged.
- **Nothing to open.** If an existing short already covers the level you picked, the summary says so and the button is disabled. Before, it offered to short zero.
- **Loading.** A four-block spinner replaces the grey boxes.
- **One theme.** There is no dark mode.

## Rules for whoever works on this next

- Take colours, radii and type from the tokens in `frontend/app/globals.css`. Do not add hex values in components.
- Use the shared pieces before writing a new one: `Loader`, `LineRow`, `SessionCard`, `CoverageBar`, `MarginMeter`, `WindowTrack`, `ScenarioTable`, `ResultEquation`.
- Do not mock data. Every screen reads from the backend.
- A page file under `frontend/app` may only export its default component. Put shared components in `frontend/components`.
- Never commit an `.env` file, and never start the backend with trading on using someone else's Backpack keys without their say.
- When you change behaviour, the API, the design or the setup, update `docs/CHANGELOG.md` and the README that covers it in the same commit.

## What has not been tested

Be straight with yourself about these before a demo.

- No protection has been activated through the new Protect page. Rizwan has run the same engine from the command line.
- The live protection and receipt pages were viewed with a test record, not a real protection.
- Safari and Firefox.
- The oracle on Adil's Mac: the Chainlink CRE tool is not installed there.
