/* Teto diário: quanto dá para gastar por dia até o fim do período, e como ele se atualiza sozinho. */
const {load}=require('./helpers/extract');
const R=[]; const ok=(l,v)=>R.push([l,!!v]);
let TODAY='2026-11-05';
const ctx=load(['pad','addMonthsToKey','daysInMonth','addDaysToISO','daysBetween','fmtDM','fmtCurrency','rnd2','signClass','monthLabel','cashDate','localISODate','accountStartISO','txCountsForBalance','accountBalance','totalAvailable','earliestTrackedDate','goalDone','summarize','periodSummary','cycleFor','hasCycles','cycleAt','cycleLabel','dashMetrics','budgetPeriod','manualCashSpent','allowanceInfo','dailyBreakdown'],
  {todayISO:()=>TODAY, todayMonthKey:()=>TODAY.slice(0,7), virtualEntriesBetween:()=>[], Math, Number, String, Object, Array, Set, JSON, Date, parseInt},['MONTH_NAMES']);
const T=(id,o)=>({id,type:'despesa',source:'manual',description:id,category:'Outros',value:10,status:'pago',accountId:'a1',paymentMethod:'PIX',date:'2026-11-02',month:'2026-11',...o});
function base(extra,initial){
  ctx.state={settings:{primeiroDiaMes:20},categories:[],goals:[],debts:[],installments:[],incomes:[],recurring:[],
   accounts:[{id:'a1',name:'Conta Principal',status:'ativa',initialBalance:initial===undefined?1780:initial,createdAt:Date.parse('2026-09-03T12:00:00Z')}],
   cards:[{id:'nb',name:'Nubank',closingDay:4,dueDay:11}],
   transactions:[
    T('Salário',{type:'receita',value:4100,date:'2026-10-28',month:'2026-10',source:'income'}), T('Transporte',{value:620,date:'2026-10-22',month:'2026-10'}), T('Mercado',{value:600,date:'2026-10-25',month:'2026-10'}), T('Lazer pago',{value:340,date:'2026-11-02'}),
    T('Aluguel',{value:1200,date:'2026-11-10',status:'pendente',source:'recurring'}), T('Fatura Nubank',{value:1240,date:'2026-11-11',status:'pendente',cardId:'nb',source:'installment'}), T('Internet',{value:100,date:'2026-11-12',status:'pendente',source:'recurring'}),
    T('Luz',{value:140,date:'2026-11-14',status:'pendente',source:'recurring'}), T('Academia',{value:360,date:'2026-11-17',status:'pendente',source:'recurring'}), T('Pensão',{type:'receita',value:1100,date:'2026-11-18',status:'pendente',source:'income'}),
    ...(extra||[])]};
}
const near=(a,b,n)=>Math.abs(a-b)<=0.005*n+1e-6;   // o teto é arredondado para centavos: erro de até meio centavo por dia
TODAY='2026-11-05'; base();
const p=ctx.budgetPeriod();
ok('período: ciclo 20/10 a 19/11 (31 dias), hoje é o dia 17 e faltam 15 dias (hoje incluído)', p.from==='2026-10-20' && p.to==='2026-11-19' && p.daysTotal===31 && p.dayIndex===17 && p.daysLeft===15 && p.label==='20/10 a 19/11/26');
let a=ctx.allowanceInfo();
ok('base: saldo R$ 4.320 − contas a vencer R$ 3.040 = livre R$ 1.280 ÷ 15 dias = R$ 85,33 por dia', a.livre===1280 && a.perDay===85.33 && a.m.saldo===4320 && a.m.aPagar===3040);
ok('sem gasto hoje: o teto de hoje é o mesmo (R$ 85,33), sobra tudo hoje, e a partir de amanhã sobe para R$ 91,43 (1.280 ÷ 14)', a.spentToday===0 && a.perDayStart===85.33 && a.leftToday===85.33 && a.tomorrow===91.43);
ok('ritmo: nos últimos 7 dias só houve o lazer de R$ 340 (02/11) → R$ 48,57 por dia; abaixo do teto; o livre dura de sobra', a.avg7===48.57 && a.status==='ok' && a.runoutDate===null && a.overBy===0 && a.daysOfCover===26);
ok('média do ciclo até agora: (620 + 600 + 340) ÷ 17 dias = R$ 91,76 por dia', a.spentPeriod===1560 && a.avgPeriod===91.76);
// ----- auto-atualização -----
const tomorrowPredicted=a.tomorrow;
TODAY='2026-11-06'; const next=ctx.allowanceInfo(); TODAY='2026-11-05';
ok('A PROVA do "se atualiza sozinho": o valor previsto para amanhã (R$ 91,43) é EXATAMENTE o teto que aparece amanhã se você não gastar nada hoje', next.perDay===tomorrowPredicted && next.per.daysLeft===14);
base([T('Almoço',{value:40,date:'2026-11-05'})]); a=ctx.allowanceInfo();
ok('gastou R$ 40 hoje: o teto de agora cai para R$ 82,67 (1.240 ÷ 15); o teto "ao acordar" continua R$ 85,33; sobram R$ 45,33 para hoje', a.livre===1240 && a.perDay===82.67 && a.perDayStart===85.33 && a.spentToday===40 && a.leftToday===45.33);
ok('e amanhã, se não gastar mais: R$ 88,57 por dia (1.240 ÷ 14) — menos que os R$ 91,43 de quando não se gastava', a.tomorrow===88.57 && a.tomorrow<tomorrowPredicted);
base([T('Almoço',{value:120,date:'2026-11-05'})]); a=ctx.allowanceInfo();
ok('gastou R$ 120 hoje (acima do teto de R$ 85,33): "sobra hoje" fica NEGATIVA (−R$ 34,67) e o teto dos próximos dias cai', a.leftToday===-34.67 && a.perDay<85.33 && a.tomorrow<91.43);
ok('compra no cartão hoje NÃO entra no gasto de hoje (pesa quando a fatura vence), mas é mostrada à parte', (base([T('TV',{value:900,date:'2026-12-11',status:'pendente',cardId:'nb',purchaseDate:'2026-11-05'})]), a=ctx.allowanceInfo(), a.cardToday===900 && a.spentToday===0 && a.livre===1280));
ok('conta fixa paga hoje (aluguel) não conta como gasto do dia a dia', (base([T('Conta paga',{value:300,date:'2026-11-05',source:'recurring'})]), ctx.allowanceInfo().spentToday===0));
ok('gasto manual de ontem não entra no gasto de hoje, mas entra no ritmo dos 7 dias', (base([T('Ontem',{value:70,date:'2026-11-04'})]), a=ctx.allowanceInfo(), a.spentToday===0 && a.avg7===rnd(410/7)));
function rnd(n){ return Math.round(n*100)/100; }
// ----- ritmo acima do teto -----
base([T('Gasto grande',{value:700,date:'2026-11-04'})]); a=ctx.allowanceInfo();
ok('ritmo ACIMA do teto: média dos 7 dias R$ 148,57 > teto R$ 38,67; o livre (R$ 580) acaba em 08/11 e faltariam R$ 1.648,55 até 19/11', a.livre===580 && a.perDay===38.67 && a.avg7===148.57 && a.status==='acima' && a.runoutDate==='2026-11-08' && a.overBy===1648.55);
// ----- sem margem -----
base([],-1500); a=ctx.allowanceInfo();
ok('sem margem (saldo menor que o que vence): livre negativo, status "sem-margem", sem data de esgotamento inventada', a.livre<0 && a.status==='sem-margem' && a.perDay<0 && a.daysOfCover===null && a.runoutDate===null);
// ----- último dia -----
base(); TODAY='2026-11-19'; a=ctx.allowanceInfo();
ok('último dia do ciclo (19/11): 1 dia restante, não há "amanhã" no mesmo ciclo e o teto é o livre inteiro', a.per.daysLeft===1 && a.tomorrow===null && a.perDay===a.livre); TODAY='2026-11-05';
// ----- mês sem ciclo -----
base(); ctx.state.settings.primeiroDiaMes=1; const pm=ctx.budgetPeriod();
ok('mês começando no dia 1: o período é novembro inteiro (30 dias), faltam 26', pm.from==='2026-11-01' && pm.to==='2026-11-30' && pm.daysTotal===30 && pm.daysLeft===26); ctx.state.settings.primeiroDiaMes=20;
// ----- propriedade: teto × dias = livre, em qualquer dia do ciclo -----
let prop=true, msg='';
for(let d=new Date(Date.UTC(2026,9,20)); d<=new Date(Date.UTC(2026,10,19)); d=new Date(d.getTime()+864e5)){ TODAY=d.toISOString().slice(0,10); const x=ctx.allowanceInfo(); if(x.per.daysLeft<1 || x.per.daysLeft>31 || !near(x.perDay*x.per.daysLeft, x.livre, x.per.daysLeft) || (x.tomorrow!==null && !near(x.tomorrow*(x.per.daysLeft-1), x.livre, x.per.daysLeft-1))){ prop=false; msg=TODAY; } }
TODAY='2026-11-05'; ok('PROPRIEDADE (todos os 31 dias do ciclo): teto × dias restantes = livre; "amanhã" × (dias − 1) = livre', prop || (console.log('   falhou em',msg),false));
// ----- gráfico por dia -----
base(); const bars=ctx.dailyBreakdown(ctx.budgetPeriod()); const day=(d)=>bars.find(b=>b.date===d);
ok('31 dias, de 20/10 a 19/11; dias futuros marcados', bars.length===31 && bars[0].date==='2026-10-20' && bars[30].date==='2026-11-19' && !day('2026-11-05').future && day('2026-11-06').future);
ok('cada gasto na barra certa: transporte (dia a dia) 22/10; aluguel (conta fixa) 10/11; fatura do cartão 11/11', day('2026-10-22').dia===620 && day('2026-11-10').fixas===1200 && day('2026-11-11').cartao===1240 && day('2026-11-10').dia===0);
ok('a soma de todas as barras = despesas do período (R$ 4.600 = 1.560 pagas + 3.040 a pagar)', rnd(bars.reduce((s,b)=>s+b.dia+b.fixas+b.cartao,0))===4600);
let bad=0; for(const [l,v] of R){ console.log((v?'PASSOU  ':'FALHOU  ')+l); if(!v) bad++; }
console.log('\n'+R.length+' verificações,', bad+' falha(s)'); process.exit(bad?1:0);
