/* Relatórios por ciclo: janelas, rótulos, acumulado, projeção, compromissos que terminam. */
const {load}=require('./helpers/extract');
const R=[]; const ok=(l,v)=>R.push([l,!!v]);
let TODAY='2026-11-05', VIRT=[];
const ctx=load(['pad','addMonthsToKey','daysInMonth','addDaysToISO','fmtDM','fmtDate','fmtCurrency','escapeHtml','monthLabel','monthLabelShort','cashDate','summarize','periodSummary','cycleFor','hasCycles','cycleAt','cycleLabel','cycleShort','cycleOptions','firstDataDate','cycleNet','accumulatedBeforeCycle','rnd2','projectionCycles','endingCommitmentsCycles','instDate','debtDate','invoiceDueDate'],
  {todayISO:()=>TODAY, todayMonthKey:()=>TODAY.slice(0,7), virtualEntriesBetween:(f,t)=>VIRT.filter(v=>v.date>f&&v.date<=t), parseInt, Math, Number, String, Object, Array, Set, JSON},
  ['MONTH_NAMES']);
const money=n=>Math.round(n*100)/100;
const mk=(o)=>({type:'despesa',status:'pago',value:10,description:'x',category:'Outros',...o,month:(o.date||'').slice(0,7)});
function setState(sd,txs,extra){ ctx.state={settings:{primeiroDiaMes:sd},transactions:txs||[],cards:[],installments:[],debts:[],...(extra||{})}; }
// ===== janelas =====
setState(20); TODAY='2026-11-05';
const sp=c=>c.from+'..'+c.to;
ok('ciclo atual (dia 20, hoje 05/11): 20/10 a 19/11; anterior 20/09 a 19/10; próximo 20/11 a 19/12', sp(ctx.cycleAt(0))==='2026-10-20..2026-11-19' && sp(ctx.cycleAt(-1))==='2026-09-20..2026-10-19' && sp(ctx.cycleAt(1))==='2026-11-20..2026-12-19');
ok('virada de ano: ciclo +2 vai de 20/12 a 19/01 e +3 de 20/01 a 19/02', sp(ctx.cycleAt(2))==='2026-12-20..2027-01-19' && sp(ctx.cycleAt(3))==='2027-01-20..2027-02-19');
ok('no dia exato do início (hoje 20/11) já é o ciclo novo; no dia anterior (19/11) ainda é o velho', (TODAY='2026-11-20', sp(ctx.cycleAt(0))==='2026-11-20..2026-12-19') && (TODAY='2026-11-19', sp(ctx.cycleAt(0))==='2026-10-20..2026-11-19'));
TODAY='2026-11-05';
ok('rótulos: "20/10 a 19/11/26" (completo) e "20/10–19/11" (curto, para gráficos); cruzando o ano mostra o ano do fim', ctx.cycleLabel(ctx.cycleAt(0))==='20/10 a 19/11/26' && ctx.cycleShort(ctx.cycleAt(0))==='20/10–19/11' && ctx.cycleLabel(ctx.cycleAt(2))==='20/12 a 19/01/27');
const opts=ctx.cycleOptions(0); ok('lista do comparativo: 31 opções (+6 … −24), o atual marcado e selecionado', (opts.match(/<option/g)||[]).length===31 && /value="0" selected>20\/10 a 19\/11\/26 \(atual\)/.test(opts) && /value="6"/.test(opts) && /value="-24"/.test(opts));
setState(1);
ok('SEM ciclo (dia 1): o ciclo é o mês de calendário e o rótulo é o nome do mês', !ctx.hasCycles() && sp(ctx.cycleAt(0))==='2026-11-01..2026-11-30' && ctx.cycleLabel(ctx.cycleAt(0))==='Novembro 2026' && ctx.cycleShort(ctx.cycleAt(0))==='Nov/26' && sp(ctx.cycleAt(-1))==='2026-10-01..2026-10-31');
// ===== propriedade: ciclos seguidos não deixam buraco nem se sobrepõem, e a soma bate com o período inteiro =====
let propOk=true, propMsg='';
const cases=[[1,'2026-11-05'],[5,'2026-11-05'],[20,'2026-11-05'],[20,'2027-01-02'],[28,'2026-03-31'],[31,'2026-02-28'],[15,'2028-02-29']];
for(const [sd,today] of cases){
  TODAY=today; setState(sd,[]);
  const txs=[]; for(let i=0;i<500;i++){ const d=new Date(Date.UTC(2025,0,1)+i*86400000*1.3); txs.push(mk({type:i%3?'despesa':'receita',value:10+i%7,date:d.toISOString().slice(0,10),status:i%4?'pago':'pendente'})); }
  ctx.state.transactions=txs;
  let prev=ctx.cycleAt(-24); for(let o=-23;o<=6;o++){ const c=ctx.cycleAt(o); if(ctx.addDaysToISO(prev.to,1)!==c.from){ propOk=false; propMsg=`buraco/sobreposição em sd=${sd} hoje=${today} offset=${o}`; } prev=c; }
  const proj=ctx.projectionCycles(12); const whole=ctx.periodSummary({from:proj[0].from,to:proj[11].to});
  const sumR=money(proj.reduce((a,p)=>a+p.receitas,0)), sumD=money(proj.reduce((a,p)=>a+p.despesas,0));
  if(proj.length!==12 || money(whole.plannedReceitas)!==sumR || money(whole.plannedDespesas)!==sumD){ propOk=false; propMsg=`soma não bate em sd=${sd} hoje=${today}: ${sumR}/${sumD} vs ${money(whole.plannedReceitas)}/${money(whole.plannedDespesas)}`; }
  if(proj[0].from!==ctx.cycleAt(0).from) { propOk=false; propMsg='a projeção não começa no ciclo atual'; }
}
ok('PROPRIEDADE (7 combinações de dia de início × data de hoje, incl. 29/02 e dia 31): sem buracos nem sobreposição em 31 ciclos; os 12 ciclos somam exatamente o período inteiro', propOk || (console.log('   ',propMsg),false));
// ===== números conferidos à mão =====
TODAY='2026-11-05'; setState(20,[
  mk({type:'receita',value:3000,date:'2026-08-25'}), mk({value:500,date:'2026-09-25'}), mk({value:200,date:'2026-10-05'}), mk({value:150,date:'2026-10-01',status:'pendente'}),
  mk({type:'receita',value:3000,date:'2026-10-30'}), mk({value:1200,date:'2026-11-10',status:'pendente'}), mk({type:'receita',value:500,date:'2026-11-18',status:'pendente'}),
  mk({value:300,date:'2026-12-01',status:'pendente'})]);
ok('primeiro dado em 25/08 → primeiro ciclo 20/08 a 19/09', ctx.firstDataDate()==='2026-08-25');
ok('acumulado ANTES do ciclo atual = +3.000 (ciclo 20/08) −700 (ciclo 20/09: só o que foi pago; a conta de R$ 150 pendente e atrasada não conta) = R$ 2.300', ctx.accumulatedBeforeCycle(ctx.cycleAt(0))===2300);
const pj=ctx.projectionCycles(12);
ok('ciclo atual usa o PLANEJADO: receitas 3.500, despesas 1.200, saldo +2.300 (= receitas − despesas), acumulado 4.600', pj[0].receitas===3500 && pj[0].despesas===1200 && pj[0].saldo===2300 && pj[0].saldoAcumulado===4600 && pj[0].saldo===money(pj[0].receitas-pj[0].despesas));
ok('ciclo seguinte: despesa de 300 → saldo −300, acumulado 4.300', pj[1].despesas===300 && pj[1].receitas===0 && pj[1].saldo===-300 && pj[1].saldoAcumulado===4300);
ok('os rótulos e o início seguem os ciclos: 20/10 a 19/11/26, 20/11 a 19/12/26, … 12 linhas', pj.length===12 && pj[0].label==='20/10 a 19/11/26' && pj[1].label==='20/11 a 19/12/26' && pj[2].label==='20/12 a 19/01/27' && pj[11].from==='2027-09-20' && pj[11].to==='2027-10-19');
ok('ciclo que já passou usa o REALIZADO (o pendente atrasado de R$ 150 fica de fora)', ctx.cycleNet(ctx.cycleAt(-1)).past===true && ctx.cycleNet(ctx.cycleAt(-1)).saldo===-700 && ctx.cycleNet(ctx.cycleAt(0)).past===false);
VIRT=[{type:'despesa',value:1200,date:'2027-01-10',status:'pendente',virtual:true},{type:'receita',value:4500,date:'2027-01-05',status:'pendente',virtual:true}];
const pv=ctx.projectionCycles(12);
ok('previsões das recorrentes (virtuais) entram no ciclo certo (05/01 e 10/01 → ciclo 20/12 a 19/01)', pv[2].receitas===4500 && pv[2].despesas===1200 && pv[2].saldoAcumulado===money(4300+3300));
VIRT=[];
// ===== compromissos que terminam =====
setState(20,[],{cards:[{id:'nb',name:'Nubank',closingDay:4,dueDay:11}],
  installments:[{id:'i1',name:'TV',cardId:'nb',count:3,startMonth:'2026-10',installmentValue:200},{id:'i2',name:'Antigo',cardId:'nb',count:2,startMonth:'2025-01',installmentValue:99},{id:'i3',name:'Longe',cardId:'nb',count:60,startMonth:'2026-10',installmentValue:50}],
  debts:[{id:'d1',name:'Carro',count:14,startMonth:'2026-01',dueDay:15,installmentValue:1000},{id:'d2',name:'Sem início',count:3,installmentValue:10}]});
const end=ctx.endingCommitmentsCycles(12);
ok('parcelamento que termina dentro dos 12 ciclos aparece com o NOME DO CICLO e o valor; o que já acabou, o que termina depois e o sem data ficam de fora', end.length===2 && /parcelamento de "TV" termina no ciclo 20\/11 a 19\/12\/26/.test(end[0]) && /R\$\s?200,00/.test(end[0]) && /dívida de "Carro" termina no ciclo 20\/01 a 19\/02\/27/.test(end[1]) && !end.join().includes('Antigo') && !end.join().includes('Longe') && !end.join().includes('Sem início'));
setState(1,[],ctx.state); ctx.state.settings.primeiroDiaMes=1;
ok('sem ciclo, o texto fala em mês ("termina em Dezembro 2026")', /termina em Dezembro 2026/.test(ctx.endingCommitmentsCycles(12)[0]));
let bad=0; for(const [l,v] of R){ console.log((v?'PASSOU  ':'FALHOU  ')+l); if(!v) bad++; }
console.log('\n'+R.length+' verificações,', bad+' falha(s)'); process.exit(bad?1:0);
