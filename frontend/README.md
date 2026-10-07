# ProX frontend

The web app for ProX: sign in with a wallet, see the Backpack portfolio, protect a stock, watch a live protection and read its receipt. Next.js 16 with React 19, TanStack Query, shadcn components on Base UI, Sonner, lightweight-charts, loading-dev and the Solana wallet adapter.

Next.js 16 has breaking changes from earlier versions. `AGENTS.md` in this folder says where its bundled docs are; read them before changing framework code.

## Getting started

The backend must be running first; see the README one folder up.

```bash
pnpm dev                 # http://localhost:3000, expects the backend on :4000
```

To use other ports, or to run without pnpm:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4100 npx next dev -p 3200
```

`NEXT_PUBLIC_API_URL` is the only setting; `.env.example` lists it. The backend's `FRONTEND_ORIGIN` has to match the address this app is served from, or the browser blocks the calls.

## Pages

| Route | File | What it shows |
|---|---|---|
| `/` | `app/page.tsx` | Portfolio value, protected and exposed value, stocks, account health, recent protections |
| `/protect` | `app/protect/page.tsx` | Stock, protection level, time range, and the live preview with the Activate button |
| `/protection/[id]` | `app/protection/[id]/page.tsx` | A live protection: PnL, health, timeline, convergence checks, orders, Solana anchors |
| `/protection/[id]/receipt` | `app/protection/[id]/receipt/page.tsx` | The completed protection report |
| `/advanced` | `app/advanced/page.tsx` | Raw Backpack account data and the latest oracle reports |

`components/app-shell.tsx` is the frame: the brand, the status chips, Sign out and the section tabs. `components/sign-in-gate.tsx` holds everything else behind an operator session.

## Data

- `lib/api.ts` is the only place that calls the backend. Cookies carry the session, so every call sends credentials.
- Response types are imported from the backend source (`../backend/src/...`) and passed through `Wire<T>`, which turns every `Date` into the ISO string JSON delivers. Rename a field in the backend and the typecheck here fails. Three shapes are still written by hand because the routes build them inline: `Health`, `MarketRow` and `PolicyHealth`.
- `hooks/use-stream.ts` listens to `GET /api/stream` (server-sent events) for PnL, basis, account health and policy changes, and refreshes the affected queries.
- Nothing is mocked. With no backend the app shows "Backend unreachable".

## Design

The look comes from the Umbra wallet (`adilhusain01/umbra`, files `web/src/theme.css` and `web/src/style.css`, unchanged from the original author's last commit).

- **Tokens** are in `app/globals.css`: paper (`--paper`, `--paper-2`, `--paper-3`), ink (`--ink`, `--ink-soft`, `--ink-faint`), hairlines (`--line`, `--line-soft`), one accent (`--gold`, `--gold-deep`, `--gold-wash`) and `--danger`. Tailwind classes exist for each: `bg-paper-2`, `text-ink-soft`, `border-line`, `text-gold-deep`.
- Umbra calls its gold `--accent`. Here it is `--gold`, because shadcn already uses `--accent` for hover surfaces. shadcn's own names (`--background`, `--card`, `--primary` and the rest) point at the Umbra palette.
- **Type** is loaded in `app/layout.tsx`: Bodoni Moda for display (`font-heading`), Mulish for the interface (`font-sans`), Geist Mono for figures (`font-mono`).
- **Shapes**: radii of 6, 10 and 16 pixels; surfaces are outlined with an inset 1.5 pixel line instead of a border or shadow; chips, tabs and round marks are pills; section labels are small, uppercase and letterspaced.
- **Gold is rare.** It marks a portfolio with a live hedge, the net result of a protection, and links. Risk climbs from ink through gold to the oxblood red.
- **Shared pieces** are in `components/umbra.tsx`: `SectionLabel`, `StatTile` and `LineRow`. The restyled primitives are in `components/ui`.
- **Loading** is always `components/loader.tsx`, the Gather spinner from `loading-dev` with an optional caption. Use `<Loader label="..." />` for a page and `<Loader compact />` inside a card. Do not use skeleton boxes.
- There is one theme. Umbra has no dark mode, so neither does this.

Take colours, radii and type from these tokens. Do not add new hex values in components.

## Checks

```bash
npx tsc --noEmit
npx eslint app components hooks lib
```

After changing `app/globals.css`, restart `next dev` if the page keeps the old colours.
