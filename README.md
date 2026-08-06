# O Pão de Cada Dia

Aplicação mobile-first para pedidos de comida, gestão de saldos e recibos diários.

## Experiências

- **Utilizador:** cria o PIN no primeiro acesso, consulta o saldo, faz pedidos e acompanha o histórico.
- **Administrador:** gere pedidos, preços personalizados, produtos, utilizadores, recargas e recibos diários em PDF.
- **Convidado:** faz pedidos rápidos sem cadastro e pode contribuir para a campanha do padeiro.

O sistema também inclui modo especial de sexta-feira, cardápio com opções, Hall da Fome e mensagens em português moçambicano.

## Acesso administrativo

O PIN inicial do administrador é `1234`. Cada utilizador define o próprio PIN no primeiro acesso.

## Executar localmente

```bash
python3 -m http.server 8080
```

Depois abra [http://127.0.0.1:8080](http://127.0.0.1:8080).

## Armazenamento

Esta versão guarda os dados no navegador do dispositivo. Para utilização em vários dispositivos, será necessário ligar a aplicação a um servidor ou base de dados partilhada.
