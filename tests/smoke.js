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
  await page.addInitScript(() => {
    window.setInterval = () => 0;
    window.print = () => { window.__printCalls = (window.__printCalls || 0) + 1; };
  });
  let submitUserOrderResponse = { ok: true, id: 902, status: "pending" };
  let adminDeductionResponse = { ok: true, id: 903, amount: -10, available: 15 };
  let adminDeductionRequest = null;
  let adminDeductionCalls = 0;
  await page.route("**/rest/v1/rpc/**", async route => {
    const functionName = new URL(route.request().url()).pathname.split("/").pop();
    if (functionName === "admin_deduct_balance") {
      adminDeductionCalls += 1;
      adminDeductionRequest = route.request().postDataJSON();
      if (adminDeductionResponse.ok) adminDeductionResponse = { ...adminDeductionResponse, date: new Date().toISOString() };
    }
    const emptyAdminState = { users: [], products: [], orders: [], recharges: [], donations: [], settings: { balancePolicy: "block" } };
    const responses = {
      load_admin_operational_state: emptyAdminState,
      load_public_app_bootstrap: { users: [], products: [], settings: { balancePolicy: "block" } },
      admin_pin_states: [],
      user_pin_status: "active",
      verify_user_pin: "ok",
      admin_add_recharge: { ok: true, id: 901, date: new Date().toISOString() },
      admin_deduct_balance: adminDeductionResponse,
      admin_sync_operational_state: true,
      sync_user_operational_state: true,
      admin_upsert_app_user: true,
      submit_user_order: submitUserOrderResponse
    };
    const body = Object.hasOwn(responses, functionName) ? responses[functionName] : true;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto(baseURL, { waitUntil: "networkidle" });
  assert.equal(await page.title(), "O Pão de Cada Dia");
  assert.equal(await page.evaluate(() => sessionStorage.getItem("paoCadaDiaUnifiedV3:cloudSession")), null);
  assert.equal(await page.getByRole("button", { name: /Pedido rápido, sem stress/i }).count(), 0, "O pedido rápido de convidado ainda está exposto");
  assert.equal(await page.getByRole("button", { name: /Entrar no painel administrativo/i }).count(), 1, "O acesso administrativo não carregou");
  assert.ok(await page.locator("#openRanking").count() > 0, "A página inicial não carregou");
  assert.equal(await page.getByText(/Novo mambo de pedidos/i).count(), 0, "O aviso de novas regras ainda está visível");
  await page.getByRole("button", { name: /Entrar no painel administrativo/i }).click();
  await page.locator("#adminPin").fill("1234");
  await page.locator("#confirmAdminLogin").click();
  await page.getByText("Painel Administrativo").waitFor();
  await page.getByRole("button", { name: "Gestão" }).click();
  await page.locator("#adminRecharge").click();
  await page.locator("#rechargeAmount").fill("25");
  await page.locator("#saveRecharge").click();
  await page.locator("#modal").waitFor({ state: "hidden" });
  const syncedRecharge = await page.evaluate(() => JSON.parse(localStorage.getItem("paoCadaDiaUnifiedV3")).recharges.find(recharge => recharge.amount === 25));
  assert.ok(syncedRecharge, "A recarga administrativa não foi guardada");
  assert.equal(syncedRecharge.pendingSync, false, "A recarga administrativa não foi sincronizada pela RPC dedicada");
  await page.locator("#adminDeduction").click();
  await page.locator("#deductionAmount").fill("10");
  await page.getByText(/25 MT → 15 MT depois do desconto/i).waitFor();
  await page.locator("#saveDeduction").click();
  await page.locator("#modal").waitFor({ state: "hidden" });
  assert.equal(adminDeductionCalls, 1, "O desconto não chamou a RPC exatamente uma vez");
  assert.equal(adminDeductionRequest.payload.userId, 1, "O desconto foi enviado para o utilizador errado");
  assert.equal(adminDeductionRequest.payload.amount, 10, "O valor do desconto enviado está incorreto");
  const syncedDeduction = await page.evaluate(() => JSON.parse(localStorage.getItem("paoCadaDiaUnifiedV3")).recharges.find(movement => movement.amount === -10));
  assert.ok(syncedDeduction, "O desconto confirmado não foi guardado no histórico local");
  assert.equal(syncedDeduction.pendingSync, false, "O desconto confirmado ficou marcado como pendente");

  await page.locator("#adminDeduction").click();
  const availableAfterDeduction = await page.locator("#deductionAvailable").textContent();
  assert.match(availableAfterDeduction, /15 MT/, `O saldo do segundo desconto não foi atualizado: ${availableAfterDeduction}`);
  await page.locator("#deductionAmount").fill("16");
  assert.equal(await page.locator("#saveDeduction").isDisabled(), true, "Um desconto superior ao saldo não foi bloqueado");
  assert.equal(adminDeductionCalls, 1, "O desconto inválido chamou o servidor");
  await page.getByRole("button", { name: "Fechar janela" }).click();

  adminDeductionResponse = { ok: false, reason: "server_error" };
  await page.locator("#adminDeduction").click();
  await page.locator("#deductionAmount").fill("5");
  await page.locator("#saveDeduction").click();
  await page.getByText(/Nada foi alterado/i).waitFor();
  assert.equal(await page.locator("#modal").getAttribute("aria-hidden"), "false", "O modal fechou depois da falha do servidor");
  const deductionsAfterFailure = await page.evaluate(() => JSON.parse(localStorage.getItem("paoCadaDiaUnifiedV3")).recharges.filter(movement => movement.amount < 0).length);
  assert.equal(deductionsAfterFailure, 1, "Uma falha do servidor alterou o saldo local");
  const failedSyncKey = adminDeductionRequest.payload.syncKey;
  adminDeductionResponse = { ok: true, id: 904, amount: -5, available: 10 };
  await page.locator("#saveDeduction").click();
  await page.locator("#modal").waitFor({ state: "hidden" });
  assert.equal(adminDeductionCalls, 3, "A repetição do desconto não chamou o servidor");
  assert.equal(adminDeductionRequest.payload.syncKey, failedSyncKey, "A repetição não reutilizou a chave idempotente");
  const deductionsAfterRetry = await page.evaluate(() => JSON.parse(localStorage.getItem("paoCadaDiaUnifiedV3")).recharges.filter(movement => movement.amount < 0).length);
  assert.equal(deductionsAfterRetry, 2, "O desconto confirmado na repetição não foi guardado");
  await page.getByRole("button", { name: "Pedidos" }).click();
  await page.locator("#newAdminOrder").click();
  assert.equal(await page.locator("#adminOrderType").count(), 1, "O formulário de pedido administrativo não abriu");
  await page.locator("#adminOrderType").selectOption("guest");
  await page.locator('[data-cart-plus="1"][data-cart-mode="admin"]').click();
  await page.locator("#saveAdminOrder").click();
  assert.equal(await page.locator("#adminGuestName").getAttribute("aria-invalid"), "true", "O nome obrigatório do convidado não foi anunciado");
  await page.locator("#adminGuestNameError").waitFor();
  await page.locator("#adminGuestName").fill("Mokizzow");
  await page.locator("#adminGuestPhone").fill("840000000");
  await page.locator("#saveAdminOrder").click();
  await page.getByText("Mokizzow").waitFor();
  await page.locator("#newAdminOrder").click();
  await page.locator("#adminOrderUser").selectOption("15");
  await page.locator('[data-cart-plus="1"][data-cart-mode="admin"]').click();
  await page.locator("#saveAdminOrder").click();
  await page.getByText(/saldo suficiente.*Disponível: 0 MT/i).waitFor();
  assert.equal(await page.locator("#modal").getAttribute("aria-hidden"), "false", "O pedido sem saldo não ficou bloqueado");
  await page.getByRole("button", { name: "Fechar janela" }).click();
  await page.getByRole("button", { name: "Utilizadores" }).click();
  const dilmaRow = page.locator(".manage-row").filter({ hasText: "Dilma Lineco" });
  await dilmaRow.getByText(/Saldo: 0 MT/).waitFor();
  const adilsonRow = page.locator(".manage-row").filter({ hasText: "Adilson Gavumende" });
  await adilsonRow.getByText(/Saldo: 10 MT/).waitFor();
  await page.locator("#openBalanceReceipt").click();
  await page.locator("#balanceReceiptSelectAll").uncheck();
  assert.equal(await page.locator("#previewBalanceReceipt").isDisabled(), true, "O recibo permitiu continuar sem utilizadores");
  await page.locator('[data-balance-receipt-user][value="1"]').check();
  await page.locator('[data-balance-receipt-user][value="15"]').check();
  await page.getByText(/2 utilizadores selecionados.*Saldo total: 10 MT/i).waitFor();
  await page.locator("#previewBalanceReceipt").click();
  assert.equal(await page.locator("#modal .balance-receipt-person").count(), 2, "O recibo não respeitou a seleção de utilizadores");
  await page.locator("#modal .balance-receipt-person").filter({ hasText: "Adilson Gavumende" }).getByText(/10 MT/).first().waitFor();
  await page.locator("#modal .balance-receipt-person").filter({ hasText: "Dilma Lineco" }).getByText(/0 MT/).first().waitFor();
  await page.locator("#printBalanceReceipt").click();
  await page.waitForFunction(() => window.__printCalls === 1);
  assert.equal(await page.locator("#printReceiptLayer .balance-receipt-person").count(), 2, "A camada de impressão perdeu utilizadores selecionados");
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  assert.equal(await page.locator("#printReceiptLayer").count(), 0, "A camada de impressão não foi limpa");
  await page.getByRole("button", { name: "Fechar janela" }).click();
  await adilsonRow.getByRole("button", { name: "Editar" }).click();
  await page.locator("#userBalance").fill("100");
  await page.locator("#saveUser").click();
  await page.locator("#modal").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Pedidos" }).click();
  await page.locator("#newAdminOrder").click();
  await page.locator('[data-cart-plus="2"][data-cart-mode="admin"]').click();
  await page.locator("#saveAdminOrder").click();
  await page.getByRole("button", { name: /Abrir pedido .* de Adilson Gavumende/i }).waitFor();
  await page.getByRole("button", { name: "Terminar sessão administrativa" }).click();
  await page.getByRole("button", { name: /Entrar como utilizador/i }).click();
  await page.locator("#loginUserPin").waitFor();
  await page.locator("#loginUserPin").fill("1234");
  await page.locator("#confirmUserLogin").click();
  await page.locator('.nav[data-user-page="menu"]').waitFor();
  await page.locator('.nav[data-user-page="menu"]').click();
  await page.locator('[data-order-schedule="tomorrow"]').click();
  assert.equal(await page.locator('[data-order-schedule="tomorrow"]').getAttribute("aria-pressed"), "true", "A opção de amanhã não ficou selecionada");
  await page.locator('[data-cart-plus="1"][data-cart-mode="user"]').click();
  await page.locator("#reviewUserOrder").click();
  await page.getByText("Pedido agendado para amanhã às 06:00").waitFor();
  await page.locator("#submitUserOrder").click();
  await page.locator("#modal").waitFor({ state: "hidden" });
  const scheduledDate = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("paoCadaDiaUnifiedV3"));
    return data.orders.filter(order => order.type === "user" && new Date(order.date) > new Date()).at(-1)?.date;
  });
  assert.ok(scheduledDate, "O pedido agendado não foi guardado");
  const maputoParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Maputo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(scheduledDate));
  const maputoDate = Object.fromEntries(maputoParts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  const nowMaputoParts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Maputo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).filter(part => part.type !== "literal").map(part => [part.type, Number(part.value)]));
  const expectedTomorrow = new Date(Date.UTC(nowMaputoParts.year, nowMaputoParts.month - 1, nowMaputoParts.day + 1));
  const expectedTomorrowKey = expectedTomorrow.toISOString().slice(0, 10);
  assert.equal(`${maputoDate.year}-${maputoDate.month}-${maputoDate.day}`, expectedTomorrowKey, "A data guardada não é amanhã em Maputo");
  assert.equal(maputoDate.hour, "06", "O pedido agendado não ficou para as 06:00 em Maputo");

  submitUserOrderResponse = { ok: false, reason: "server_error" };
  await page.locator('.nav[data-user-page="menu"]').click();
  await page.locator("#reviewUserOrder").waitFor();
  const successfulOrderCount = await page.evaluate(() => JSON.parse(localStorage.getItem("paoCadaDiaUnifiedV3")).orders.filter(order => order.type === "user").length);
  await page.locator('[data-cart-plus="1"][data-cart-mode="user"]').click();
  await page.locator("#reviewUserOrder").click();
  await page.locator("#submitUserOrder").click();
  await page.getByText(/Não foi possível enviar o pedido/).waitFor();
  assert.equal(await page.locator("#modal").getAttribute("aria-hidden"), "false", "O resumo fechou apesar da falha do servidor");
  const failedOrderCount = await page.evaluate(() => JSON.parse(localStorage.getItem("paoCadaDiaUnifiedV3")).orders.filter(order => order.type === "user").length);
  assert.equal(failedOrderCount, successfulOrderCount, "Um pedido recusado pelo servidor foi guardado localmente");
  await browser.close();
  console.log(JSON.stringify({ smoke: "ok", url: baseURL }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
