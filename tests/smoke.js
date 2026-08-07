const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");

const baseURL = process.env.BASE_URL || "http://127.0.0.1:8090";
const chromePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(fs.existsSync(chromePath) ? { executablePath: chromePath } : {})
  });
  const page = await browser.newPage();
  await page.goto(baseURL, { waitUntil: "networkidle" });
  assert.equal(await page.title(), "O Pão de Cada Dia");
  const guestEntry = page.getByRole("button", { name: /Pedido rápido, sem stress/i });
  await guestEntry.waitFor();
  assert.equal(await page.evaluate(() => sessionStorage.getItem("paoCadaDiaUnifiedV3:cloudSession")), null);
  await guestEntry.click();
  assert.ok(await page.locator(".product").count() > 0, "O catálogo público não carregou");
  await browser.close();
  console.log(JSON.stringify({ smoke: "ok", url: baseURL }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
