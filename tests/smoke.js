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
  await page.route("**/rest/v1/rpc/**", async route => {
    const functionName = new URL(route.request().url()).pathname.split("/").pop();
    const emptyAdminState = { users: [], products: [], orders: [], recharges: [], donations: [], settings: { balancePolicy: "allow-negative" } };
    const body = functionName === "load_admin_operational_state" ? emptyAdminState : functionName === "load_public_app_bootstrap" ? { users: [], products: [], settings: { balancePolicy: "allow-negative" } } : functionName === "admin_pin_states" ? [] : functionName === "user_pin_status" ? "active" : functionName === "verify_user_pin" ? "ok" : {};
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto(baseURL, { waitUntil: "networkidle" });
  assert.equal(await page.title(), "O Pão de Cada Dia");
  assert.equal(await page.evaluate(() => sessionStorage.getItem("paoCadaDiaUnifiedV3:cloudSession")), null);
  assert.equal(await page.getByRole("button", { name: /Pedido rápido, sem stress/i }).count(), 0, "O pedido rápido de convidado ainda está exposto");
  assert.equal(await page.getByRole("button", { name: /Cantinho do administrador/i }).count(), 1, "O acesso administrativo não carregou");
  assert.ok(await page.locator("#openRanking").count() > 0, "A página inicial não carregou");
  assert.equal(await page.getByText(/Novo mambo de pedidos/i).count(), 0, "O aviso de novas regras ainda está visível");
  await page.getByRole("button", { name: /Cantinho do administrador/i }).click();
  await page.locator("#adminPin").fill("1234");
  await page.locator("#confirmAdminLogin").click();
  await page.getByText("Painel Administrativo").waitFor();
  await page.getByRole("button", { name: "Pedidos" }).click();
  await page.locator("#newAdminOrder").click();
  assert.equal(await page.locator("#adminOrderType").count(), 1, "O formulário de pedido administrativo não abriu");
  await page.locator("#adminOrderType").selectOption("guest");
  await page.locator("#adminGuestName").fill("Mokizzow");
  await page.locator("#adminGuestPhone").fill("840000000");
  await page.locator('[data-cart-plus="1"][data-cart-mode="admin"]').click();
  await page.locator("#saveAdminOrder").click();
  await page.getByText("Mokizzow").waitFor();
  await page.getByRole("button", { name: "Utilizadores" }).click();
  const adilsonRow = page.locator(".manage-row").filter({ hasText: "Adilson Gavumende" });
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
  await page.getByRole("button", { name: /Entrar como boss da fome/i }).click();
  await page.locator("#loginUserPin").waitFor();
  await page.locator("#loginUserPin").fill("1234");
  await page.locator("#confirmUserLogin").click();
  await page.locator('.nav[data-user-page="menu"]').waitFor();
  await page.locator('.nav[data-user-page="menu"]').click();
  await page.locator('[data-order-schedule="tomorrow"]').click();
  assert.equal(await page.locator('[data-order-schedule="tomorrow"]').getAttribute("aria-pressed"), "true", "A opção de amanhã não ficou selecionada");
  await page.locator('[data-cart-plus="1"][data-cart-mode="user"]').click();
  await page.locator("#reviewUserOrder").click();
  await page.getByText("Pedido agendado para amanhã").waitFor();
  await page.locator("#submitUserOrder").click();
  await page.locator("#modal").waitFor({ state: "hidden" });
  const scheduledDate = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("paoCadaDiaUnifiedV3"));
    return data.orders.filter(order => order.type === "user" && new Date(order.date) > new Date()).at(-1)?.date;
  });
  assert.ok(scheduledDate, "O pedido agendado não foi guardado");
  assert.equal(new Date(scheduledDate).getDate(), new Date(Date.now() + 86400000).getDate(), "A data guardada não é amanhã");
  assert.equal(new Date(scheduledDate).getHours(), 6, "O pedido agendado não ficou para as 06:00");
  await browser.close();
  console.log(JSON.stringify({ smoke: "ok", url: baseURL }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
