/* Alerta de equilíbrio: vale o ciclo atual (ou o mês, se o seu mês começa no dia 1) e não o mês de calendário. */
const {load}=require('./helpers/extract');
const R=[]; const ok=(l,v)=>R.push([l,!!v]);
const ctx=load(['pad','addMonthsToKey','daysInMonth','addDaysToISO','fmtDM','fmtCurrency','monthLabel','monthLabelShort','monthKeyOf','cashDate','summarize','periodSummary','summaryFor','cycleFor','hasCycles','cycleAt','breakeven','computeAlerts'],
  {todayISO:()=>'2026-11-05', todayMonthKey:()=>'2026-11', virtualEntriesBetween:()=>[], goalDone:()=>false, monthDiff:()=>0, cardUsed:()=>0, budgetAlerts:()=>[], endingCommitmentsCycles:()=>[], Math, Number, String, Object, Array, Set, JSON, parseInt},['MONTH_NAMES']);
const mk=(o)=>({type:'despesa',status:'pago',value:10,description:'x',category:'Outros',...o,month:(o.date||'').slice(0,7)});
function setup(sd,txs){ ctx.state={settings:{primeiroDiaMes:sd},transactions:txs,goals:[],cards:[],recurring:[]}; }
const msgs=()=>ctx.computeAlerts().map(a=>a.msg).join(' | ');
// Ciclo (dia 20, hoje 05/11) = 20/10 a 19/11. A despesa de 25/10 está NO ciclo, mas FORA do mês de novembro.
setup(20,[mk({type:'receita',value:1000,date:'2026-11-02'}), mk({value:1500,date:'2026-10-25'})]);
ok('despesa de 25/10 (dentro do ciclo, fora do mês de novembro): o alerta de "negativo" aparece e fala em CICLO, com R$ 500,00', /Seu ciclo está projetado para fechar negativo em R\$\s?500,00/.test(msgs().replace(/\u00a0/g,' ')) && ctx.computeAlerts()[0].sev==='rust');
const mon=ctx.periodSummary({from:'2026-11-01',to:'2026-11-30'}), cyc=ctx.periodSummary(ctx.cycleAt(0));
ok('a prova: pelo mês de novembro a despesa prevista seria R$ 0 (o alerta antigo não existiria); pelo ciclo, R$ 1.500', mon.plannedDespesas===0 && cyc.plannedDespesas===1500 && mon.plannedReceitas===1000 && cyc.plannedReceitas===1000);
setup(1,[mk({type:'receita',value:1000,date:'2026-11-02'}), mk({value:1500,date:'2026-10-25'})]);
ok('mês começando no dia 1: a despesa de outubro fica de fora e não há alerta de negativo', !/negativo/.test(msgs()));
setup(1,[mk({type:'receita',value:1000,date:'2026-11-02'}), mk({value:1500,date:'2026-11-03'})]);
ok('mês começando no dia 1: o texto diz "mês" ("Seu mês está projetado…")', /Seu mês está projetado para fechar negativo/.test(msgs()));
setup(20,[mk({type:'receita',value:1000,date:'2026-11-02'}), mk({value:800,date:'2026-10-25'})]);
ok('80% da receita comprometida (faixa amarela): aviso "comprometimento de renda está alto (80%)"', /comprometimento de renda está alto \(80%/.test(msgs()) && ctx.computeAlerts()[0].sev==='gold');
setup(20,[mk({type:'receita',value:1000,date:'2026-11-02'}), mk({value:300,date:'2026-10-25'})]);
ok('30% comprometido: nenhum alerta de equilíbrio (cai no "sob controle")', !/negativo|comprometimento/.test(msgs()) && ctx.computeAlerts()[0].sev==='green');
let bad=0; for(const [l,v] of R){ console.log((v?'PASSOU  ':'FALHOU  ')+l); if(!v) bad++; }
console.log('\n'+R.length+' verificações,', bad+' falha(s)'); process.exit(bad?1:0);
