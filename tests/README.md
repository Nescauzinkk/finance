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
- **css-theme.test.js** confere o CSS e o `index.html`: variáveis definidas, nada do neon antigo,
  contraste de cores nos temas escuro e claro e o script que escolhe o tema antes de a página aparecer.

Não testa a aparência (cores, espaçamento): isso só o olho vê.
