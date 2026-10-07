// Renders every slide of ../index.html to a 1920x1080 PNG. Usage: node shots.mjs <frontend dir> <out dir>
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const [, , frontendDir, outDir] = process.argv
const puppeteer = createRequire(frontendDir + '/')('puppeteer-core')
const deck = fileURLToPath(new URL('../index.html', import.meta.url))
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const page = await browser.newPage()
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
await page.goto('file://' + deck, { waitUntil: 'networkidle2' })
await page.evaluate(() => document.fonts.ready)
const ids = await page.evaluate(() => [...document.querySelectorAll('#stage > section')].map((s) => s.id))
await page.addStyleTag({ content: '#count,#notes,#script{display:none!important}' })
for (let i = 0; i < ids.length; i++) {
  await page.evaluate((n) => { document.querySelectorAll('#stage > section').forEach((s, k) => s.classList.toggle('on', k === n)) }, i)
  await new Promise((r) => setTimeout(r, 250))
  await page.screenshot({ path: `${outDir}/${String(i + 1).padStart(2, '0')}-${ids[i]}.png` })
}
console.log(ids.length + ' slides rendered')
await browser.close()
