const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const baseURL = process.env.BASE_URL || "http://127.0.0.1:8090";
const chromePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const openingPhrases = [
  "O estômago já enviou três notificações.",
  "O padeiro está a observar...",
  "Hoje promete muita badjia.",
  "A dieta começa segunda."
];

async function freshPage(browser) {
  const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: "networkidle" });
  return { context, page };
}

async function expectBrandedModal(page) {
  const dialog = page.getByRole("dialog");
  await dialog.locator(".modal-brand").getByText("O Pão de Cada Dia", { exact: true }).waitFor();
}

async function updateUserState(page, changes) {
  await page.evaluate((next) => {
    const key = "paoCadaDiaUnifiedV3";
    const state = JSON.parse(localStorage.getItem(key));
    const active = state.users.find((user) => user.id === state.session.userId);
    if (next.balance !== undefined) active.monthlyBalance = next.balance;
    if (next.policy) state.settings.balancePolicy = next.policy;
    if (next.clearOrders) state.orders = [];
    localStorage.setItem(key, JSON.stringify(state));
  }, changes);
  await page.reload({ waitUntil: "networkidle" });
}

async function userFlow(browser) {
  const { context, page } = await freshPage(browser);
  const phrase = (await page.locator(".opening-phrase").innerText()).replace("💬", "").trim();
  assert.ok(openingPhrases.includes(phrase), `Frase inicial inesperada: ${phrase}`);

  await page.getByRole("button", { name: /Entrar como boss da fome/i }).click();
  await expectBrandedModal(page);
  await page.getByLabel("NOVO PIN").fill("1111");
  await page.getByLabel("CONFIRMAR PIN").fill("1111");
  await page.getByRole("button", { name: /CRIAR PIN E ENTRAR/i }).click();

  for (const [balance, message] of [
    [150, "Calma, campeão. O teu saldo já está a pedir água."],
    [100, "A carteira está de dieta."],
    [50, "Restam apenas 50 MT. Escolhe a badjia com sabedoria."]
  ]) {
    await updateUserState(page, { balance, clearOrders: true });
    await page.getByText(message, { exact: true }).waitFor();
  }

  await updateUserState(page, { balance: 0, policy: "block", clearOrders: true });
  await page.getByRole("button", { name: "Pedir" }).click();
  await page.getByRole("button", { name: "Aumentar quantidade de Bread" }).click();
  await page.getByRole("button", { name: /REVER PEDIDO/i }).click();
  await page.getByRole("button", { name: "CONFIRMAR PEDIDO" }).click();
  await expectBrandedModal(page);
  await page.getByRole("dialog").getByText("Saldo esgotado. O bread fica para o próximo mês.", { exact: false }).waitFor();
  let state = await page.evaluate(() => JSON.parse(localStorage.getItem("paoCadaDiaUnifiedV3")));
  assert.equal(state.orders.length, 0, "A política de bloqueio deixou o pedido passar");
  await page.getByRole("button", { name: "ENTENDI, BOSS" }).click();

  await updateUserState(page, { balance: 0, policy: "allow-negative", clearOrders: true });
  await page.getByRole("button", { name: "Pedir" }).click();
  await page.getByRole("button", { name: "Aumentar quantidade de Bread" }).click();
  await page.getByRole("button", { name: /REVER PEDIDO/i }).click();
  await page.getByRole("button", { name: "CONFIRMAR PEDIDO" }).click();
  await page.getByText("Eish, a mola está curta: o food custa 12 MT e tens 0 MT. Queres entrar nas dívidas e mandar vir mesmo assim?", { exact: true }).waitFor();
  await page.getByRole("button", { name: "MANDAR MESMO ASSIM" }).click();
  await page.getByRole("dialog").getByText("Calma campeão... ainda tens 12 MT por acertar.", { exact: true }).waitFor();
  await page.locator("#toast").getByText("Excelente escolha. O padeiro agradece. 🎉", { exact: true }).waitFor();
  assert.equal(await page.locator(".celebration-layer").count(), 1, "O confete discreto não apareceu");
  state = await page.evaluate(() => JSON.parse(localStorage.getItem("paoCadaDiaUnifiedV3")));
  assert.equal(state.orders.length, 1);
  assert.equal(state.orders[0].status, "debt");
  await context.close();
}

async function guestFlow(browser) {
  const { context, page } = await freshPage(browser);
  await page.getByRole("button", { name: /Pedido rápido, sem stress/i }).click();
  await page.getByLabel("TEU NOME *").fill("Convidado Teste");
  await page.getByRole("button", { name: "Aumentar quantidade de Bread" }).click();
  await page.getByRole("button", { name: /REVER PEDIDO, BOSS/i }).click();
  await expectBrandedModal(page);
  await page.getByRole("button", { name: "CONFIRMAR PEDIDO" }).click();
  await page.locator("#toast").getByText("Excelente escolha. O padeiro agradece. 🎉", { exact: true }).waitFor();
  assert.equal(await page.locator(".celebration-layer").count(), 1);
  await page.getByRole("button", { name: /Hoje não dá/i }).click();
  await page.getByRole("heading", { name: "Pedido entrou, boss!" }).waitFor();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("paoCadaDiaUnifiedV3")));
  assert.equal(state.orders.length, 1);
  assert.equal(state.orders[0].type, "guest");
  await context.close();
}

async function adminFlow(browser) {
  const { context, page } = await freshPage(browser);
  await page.getByRole("button", { name: /Cantinho do administrador/i }).click();
  await expectBrandedModal(page);
  await page.getByLabel("PIN DO ADMINISTRADOR").fill("1234");
  await page.getByRole("button", { name: "SÃO PROCESSOS", exact: true }).click();
  await page.getByRole("button", { name: "Gestão" }).click();
  await page.getByRole("button", { name: /Bloquear pedidos/i }).click();
  assert.equal(await page.getByRole("button", { name: /Bloquear pedidos/i }).getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: /Permitir saldo negativo/i }).click();
  assert.equal(await page.getByRole("button", { name: /Permitir saldo negativo/i }).getAttribute("aria-pressed"), "true");

  await page.evaluate(() => {
    const key = "paoCadaDiaUnifiedV3";
    const state = JSON.parse(localStorage.getItem(key));
    state.orders = [{
      id: 77,
      type: "user",
      userId: 1,
      date: new Date().toISOString(),
      status: "pending",
      items: [{ productId: 1, qty: 1, unitPrice: 58 }],
      customRequest: "",
      needsContact: false
    }, {
      id: 78,
      type: "guest",
      guestName: "Recibo Teste",
      guestPhone: "840000000",
      date: new Date().toISOString(),
      status: "pending",
      items: [{ productId: 3, qty: 2, unitPrice: 0 }],
      customRequest: "",
      needsContact: true
    }];
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Recibo do dia/i }).click();
  await expectBrandedModal(page);
  const printButton = page.getByRole("button", { name: "PREENCHE OS VALORES PRIMEIRO" });
  assert.equal(await printButton.isDisabled(), true);
  await page.getByLabel("Preço unitário de Coca-Cola no pedido 78").fill("35");
  await page.getByRole("button", { name: "GUARDAR VALORES DO RECIBO" }).click();
  await page.getByRole("button", { name: "IMPRIMIR / GUARDAR PDF" }).waitFor();
  const receiptState = await page.evaluate(() => JSON.parse(localStorage.getItem("paoCadaDiaUnifiedV3")));
  const receiptOrder = receiptState.orders.find((order) => order.id === 78);
  assert.equal(receiptOrder.items[0].unitPrice, 35);
  assert.equal(receiptOrder.needsContact, false);
  await page.getByRole("button", { name: "Fechar janela" }).click();
  await page.getByRole("button", { name: "Pedidos" }).click();
  await page.getByRole("button", { name: /Abrir pedido 77/i }).click();
  await expectBrandedModal(page);
  await page.getByLabel("ESTADO").selectOption("paid");
  await page.getByRole("button", { name: /Guardar pedido e preços/i }).click();
  await page.getByText("💰➜🥖", { exact: false }).waitFor();
  await page.getByText("Missão cumprida. A tua consciência está leve.", { exact: true }).waitFor();
  await page.getByRole("button", { name: /ESTÁ NICE/i }).click();

  await page.getByRole("button", { name: /Abrir pedido 77/i }).click();
  await page.getByLabel("ESTADO").selectOption("pending");
  await page.getByRole("button", { name: /Guardar pedido e preços/i }).click();
  await page.getByRole("button", { name: /Abrir pedido 77/i }).click();
  await page.getByLabel("ESTADO").selectOption("debt");
  await page.getByRole("button", { name: /Guardar pedido e preços/i }).click();
  await page.getByText("😂", { exact: true }).waitFor();
  await page.getByText("Calma campeão... ainda tens 58 MT por acertar.", { exact: true }).waitFor();
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true, ...(chromePath ? { executablePath: chromePath } : {}) });
  const results = [];
  for (const [name, flow] of [["utilizador", userFlow], ["convidado", guestFlow], ["administrador", adminFlow]]) {
    try {
      await flow(browser);
      results.push({ flow: name, status: "ok" });
    } catch (error) {
      results.push({ flow: name, status: "failed", error: error.message });
      throw error;
    }
  }
  console.log(JSON.stringify(results));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
