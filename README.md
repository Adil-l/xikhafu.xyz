# O Pão de Cada Dia

Aplicação mobile-first para pedidos de comida, gestão de saldos e recibos diários.

## Experiências

- **Utilizador:** cria o PIN no primeiro acesso, consulta o saldo, faz pedidos apenas quando tem saldo suficiente e acompanha o histórico.
- **Administrador:** gere pedidos, preços personalizados, produtos, utilizadores, recargas e recibos diários em PDF. Também pode registar pedidos em nome de utilizadores cadastrados ou convidados.
- **Convidado:** não faz pedidos diretamente; o administrador regista o pedido em seu nome.

O sistema também inclui cardápio com opções, Hall da Fome e mensagens em português moçambicano.

## Acesso administrativo

O PIN administrativo é validado exclusivamente no Supabase e não existe um PIN padrão no frontend. Configure-o diretamente no ambiente seguro do projeto antes do primeiro uso. Cada utilizador define o próprio PIN no primeiro acesso.

## Executar localmente

```bash
python3 -m http.server 8080
```

Depois abra [http://127.0.0.1:8080](http://127.0.0.1:8080).

## Armazenamento

O Supabase centraliza os PINs, saldos, dívidas, pedidos, recargas, contribuições, históricos e os dados agregados do Hall da Fome. Um PIN solicitado no primeiro dispositivo fica pendente até aprovação do administrador e, depois disso, funciona nos restantes dispositivos sem poder ser redefinido pelo utilizador.

O navegador mantém uma cópia rápida dos dados para a interface, mas o Supabase é a fonte partilhada entre aparelhos. Novos pedidos são validados transacionalmente no servidor quando há ligação; pedidos criados pelo administrador ficam no aparelho e são sincronizados quando a ligação estiver disponível. Alterações administrativas usam chaves estáveis e versão de atualização para evitar que um aparelho antigo reverta outro.

## Testes

Instale as dependências e execute o smoke E2E não destrutivo com o servidor local:

```bash
npm install
python3 -m http.server 8090
npm run test:e2e:smoke
```

A URL e o binário do navegador podem ser definidos com `BASE_URL` e `CHROME_PATH`. O fluxo E2E completo pode alterar dados remotos; execute-o apenas contra um projeto de teste.
