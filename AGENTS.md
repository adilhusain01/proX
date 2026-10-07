# Notes for AI agents working on ProX

Read `README.md` first, then `docs/CHANGELOG.md` for what changed recently. If your copy of the code is from before 7 October 2026, read `docs/DESIGN_HANDOFF.md` before anything else: it is the step-by-step way onto the current frontend. `docs/prd.md` is the original spec; the README lists where the code now differs from it. Adil's vault note for this project is `Projects/ProX.md`.

## Keep the docs current

Adil asked for this on 2026-10-07. Whenever you change behaviour, the API, the design, the configuration or the way to run the app, update in the same piece of work:

- `docs/CHANGELOG.md`: a dated entry saying what changed, who asked, what was checked and what was not.
- `README.md`: if setup, the API table, the user's choices or the safety rails changed.
- `frontend/README.md` or `cre/convergence-oracle/README.md`: if that part changed.
- The vault note `Projects/ProX.md`, with a line in the vault log.

## Rules that matter here

- Work on `dev` or a branch off it. Never commit to `main`; it changes only through a pull request.
- Before every commit, check that no value from an `.env` file is staged.
- This app places real orders. Leave `TRADING_ENABLED=false` unless Adil says otherwise, and always when the Backpack keys in `backend/.env` are someone else's.
- Never read out, print or commit values from any `.env` file.
- Tests come from the requirement and must fail before the code is written. Never edit a test to make it pass.
- The frontend design is settled: Adil chose it on 2026-10-07 and it is described in `frontend/README.md`. Build on it. Do not restyle a screen, swap the fonts or bring back the old card layout without his say.
- Take colours, radii and type from the Umbra tokens in `frontend/app/globals.css`. Use the shared components listed in `frontend/README.md` before writing a new one.
- A page file under `frontend/app` may only export its default component. Shared components go in `frontend/components`.
- Do the work in one session. No subagents.
- Nothing is mocked. If a screen needs data, read it from the backend.
- `frontend/AGENTS.md` has a notice about Next.js 16; follow it before changing framework code.
