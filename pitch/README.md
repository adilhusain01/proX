# ProX pitch deck

The pitch that goes in front of the platform demo. Fifteen slides, one idea each, in the same palette and type as the ProX site. Rizwan presents it.

## Getting started

Open `index.html` in a browser. There is no build step and nothing to install. It needs a connection the first time, to load the three fonts from Google Fonts.

| Key | Does |
|---|---|
| Right, Space, Page Down | Next slide |
| Left, Page Up | Previous slide |
| Home, End | First, last |
| N | Show the spoken script for this slide |
| S | Show the whole script on one page |
| F | Full screen |

Clicking the right two thirds of the slide goes forward; the left third goes back. The address ends in the slide number (`index.html#8`), so a reload stays where you were.

To make a PDF, print from the browser (Cmd+P) and save as PDF. Each slide becomes one page at 1920 by 1080.

## How the file is built

Everything is in `index.html`.

- Each slide is one `<section id="...">` on a fixed 1920 by 1080 canvas. A comment above it gives its number and name.
- Every style is inline on the element it applies to, in pixels. To change a slide you only read that slide.
- The last child of each `<section>` is an `<aside>`. That is what Rizwan says while the slide is up. It never shows on the slide.
- The `<style>` block and the `<script>` at the bottom are the viewer: fitting the slide to the window, the keys, the notes panel, printing. They do not style or change slide content.
- Images are in `assets/`.

The slides, in order:

| # | id | What it says |
|---|---|---|
| 1 | `cover` | ProX, "pro·tect, verb: to keep from loss" |
| 2 | `always-open` | Tokenized stocks trade 24/7. Wall Street does not. |
| 3 | `shaq` | The market sleeps, the price does not (Sleeping Shaq) |
| 4 | `hours` | 65 hours, every weekend |
| 5 | `fine` | You, holding it all weekend (This Is Fine) |
| 6 | `buttons` | Today you get two buttons (Two Buttons) |
| 7 | `prox` | Keep the stock. Sit out the gap. |
| 8 | `chart` | The hedge cancels the fall (the gap chart, drawn in SVG) |
| 9 | `choices` | Three choices: which stock, how much, how long |
| 10 | `collateral` | Your stock is the collateral (Always Has Been) |
| 11 | `panik` | A hedge you babysit is a second job (Panik Kalm Panik) |
| 12 | `closes` | It closes itself: Chainlink oracle, Solana receipt |
| 13 | `proof` | $2.40 of real NVDA, really hedged |
| 14 | `model` | Two ways ProX earns, and the size of the market |
| 15 | `try` | Try it, with the QR code |

## Changing it

- **Words on a slide:** edit the text inside that `<section>`.
- **What Rizwan says:** edit the `<aside>` at the end of that `<section>`.
- **Order:** move the whole `<section>` block. The counter and the script follow.
- **A new slide:** copy a `<section>` that has the layout you want, give it a new `id`, and change its content. Keep the `<aside>` last.
- **Size and position:** the canvas is 1920 wide and 1080 tall with 128 pixels of margin. Text placed over an image uses `position:absolute` with `left` and `top` in pixels, measured from the image's own box.
- **Colours and type:** paper `#ece5d3` and `#e5dcc6`, ink `#1c1a14`, soft ink `#4a4537`, gold `#a87e36` (deeper `#876326`, on a dark slide `#c79a4c`), red `#9a3b2a`. Bodoni Moda for display, Mulish for text, Geist Mono for the link. These match `frontend/app/globals.css`; keep them in step.

Keep to one idea a slide. If a slide needs a second idea, it needs a second slide.

## Still to do before recording

- **The QR code.** Slide 15 has a dashed box and the text `[site link]`. Once the site has a public address, replace the box with the QR image (`npx qrcode -o pitch/assets/qr.png "<the address>"` makes one) and put the address in place of `[site link]`.
- **The meme images.** The five files in `assets/` are stand-ins taken from imgflip's public templates. Replace each with a licensed copy under the same file name and nothing else needs to change. If a replacement has different proportions, adjust the `width` and `height` on its `<img>` and the caption positions beside it.
- **Slide 3.** The Sleeping Shaq template has a line printed on its lower panel. The slide hides it by showing only the top 612 pixels of the image. Check it is still out of frame after replacing the file.
- **Slide 13 is a claim.** It says a real short was opened and closed against 0.01 NVDA on Backpack. Say it only if that is what happened on the account you demo.
- **Slide 14 has prices we chose.** $10 a month and $1 a protection are a launch plan, and the slide says so. Change them in the two lines on the slide and in its script, where the "one in a hundred" sum (about $900,000 a year) depends on the $10. The market figures are sourced: $3.22 billion of tokenized stocks on RWA.xyz on 3 October 2026, up from $951 million in March; 758,950 holders in July 2026; and Binance Research's base case of $349 billion by 2030, from "The RWA Activation Era", September 2026.
- **Slide 8** is an illustration with invented prices, and the script says so.

## Assets

| File | Slide | What it is |
|---|---|---|
| `assets/sleeping-shaq.jpg` | 3 | Sleeping Shaq template, 640 by 631 |
| `assets/this-is-fine.jpg` | 5 | This Is Fine template, 580 by 282 |
| `assets/two-buttons.jpg` | 6 | Two Buttons template, 600 by 908 |
| `assets/always-has-been.png` | 10 | Always Has Been template, 960 by 540 |
| `assets/panik-kalm-panik.png` | 11 | Panik Kalm Panik template, 640 by 881 |
