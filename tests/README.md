# Testes do Kivo

Duas verificações rápidas, para rodar sempre que mudar algo importante:

```
cd tests
npm install        # só na primeira vez
npm test
```

- **smoke.test.js** abre o app inteiro de mentirinha (banco e gráficos falsos), em 3 cenários de dados
  (normal, usuário novo sem nada e dados "feios"), visita todas as telas, clica em todos os controles nos
  dois temas e falha se houver erro de execução ou texto estranho (`undefined`, `NaN`, `[object Object]`).
  Também confere se Dashboard, Lançamentos e Relatórios abrem no mesmo período.
- **cycles.test.js** testa a lógica dos ciclos (janelas, rótulos, acumulado, projeção, compromissos que terminam),
  inclusive uma verificação de propriedade: 12 ciclos seguidos não deixam buraco nem sobreposição e somam o período inteiro.
- **budget.test.js** testa o orçamento por categoria: gasto x limite por ciclo, as fronteiras (79,9% dentro, 80% e 100% atenção, acima de 100% estourou), a ordem, os alertas, a aba e o cartão do Dashboard.
- **invoice-bank.test.js** testa o ajuste da fatura pelo total do banco (cria, atualiza sem duplicar, remove, banco menor, bordas).
- **alerts.test.js** prova que o alerta de equilíbrio usa o ciclo e não o mês de calendário.
- **simulator.test.js** testa o simulador "e se eu comprar isso?": saídas à vista e parceladas (regras de fatura), saldo com a compra, resumo antes/depois, desenho e dica do gráfico.
- **css-theme.test.js** confere o CSS e o `index.html`: variáveis definidas, nada do neon antigo,
  contraste de cores nos temas escuro e claro e o script que escolhe o tema antes de a página aparecer.

Não testa a aparência (cores, espaçamento): isso só o olho vê.
