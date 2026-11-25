/* Simulador "e se eu comprar isso?": saídas da compra, saldo com a compra, resumo antes/depois, desenho e dica do dia. */
const {load}=require('./helpers/extract');
const R=[]; const ok=(l,v)=>R.push([l,!!v]);
let TODAY='2026-11-05';
const ctx=load(['pad','addMonthsToKey','daysInMonth','addDaysToISO','fmtDM','fmtCurrency','escapeHtml','rnd2','signClass','hasCycles','firstInvoiceMonth','invoiceDueDate','cardInvoiceFor','isInvoiceClosed','openInvoiceMonthFrom','simEvents','simSeries','simSummary','dashSimHtml','fmtDayShort','cashDate','dashDueToday','dashDayInfo','dashTipHtml','dashChartSvg'],
  {todayISO:()=>TODAY, virtualEntriesBetween:()=>[], Math, Number, String, Object, Array, Set, JSON, Date, parseInt},['WD_SHORT','dashSim']);
const NB={id:'nb',name:'Nubank',closingDay:4,dueDay:11};
function setup(sd,cards){ ctx.state={settings:{primeiroDiaMes:sd},cards:cards||[{...NB}],transactions:[]}; }
const nm=x=>x.replace(/\u00a0/g,' ');
setup(20);
// ===== saídas da compra =====
ok('à vista: uma saída na data escolhida; data passada vira hoje', JSON.stringify(ctx.simEvents({value:2000,mode:'avista',date:'2026-11-08'}))==='[{"date":"2026-11-08","value":2000}]' && ctx.simEvents({value:50,mode:'avista',date:'2026-10-01'})[0].date==='2026-11-05' && ctx.simEvents({value:50,mode:'avista'})[0].date==='2026-11-05');
ok('valor zero, negativo ou texto: nenhuma saída', [0,-10,'abc',undefined,NaN].every(v=>ctx.simEvents({value:v,mode:'avista'}).length===0));
let ev=ctx.simEvents({value:3000,mode:'parcelado',cardId:'nb',count:10,date:'2026-11-05'});
ok('parcelado em 10x no Nubank (fecha 4, vence 11), compra no dia 5 (depois do fechamento): 1ª parcela em 11/12, depois uma por mês até 11/09/2027, R$ 300 cada', ev.length===10 && ev[0].date==='2026-12-11' && ev[1].date==='2027-01-11' && ev[9].date==='2027-09-11' && ev.every(e=>e.value===300));
TODAY='2026-11-02'; ev=ctx.simEvents({value:3000,mode:'parcelado',cardId:'nb',count:10});
ok('compra ANTES do fechamento (dia 2): a 1ª parcela já vence em 11/11', ev[0].date==='2026-11-11' && ev[1].date==='2026-12-11'); TODAY='2026-11-05';
setup(20,[{...NB,closings:{'2026-12-11':{closedAt:1,total:0}}}]); ev=ctx.simEvents({value:300,mode:'parcelado',cardId:'nb',count:3,date:'2026-11-05'});
ok('fatura de dezembro já fechada por você: a compra vai para a próxima aberta (janeiro), como no lançamento real', ev[0].date==='2027-01-11' && ev[2].date==='2027-03-11'); setup(20);
ev=ctx.simEvents({value:100,mode:'parcelado',cardId:'nb',count:3});
ok('centavos: R$ 100 em 3x = 33,33 + 33,33 + 33,34 (soma exata)', ev.map(e=>e.value).join()==='33.33,33.33,33.34' && ctx.rnd2(ev.reduce((a,e)=>a+e.value,0))===100);
ok('limites: 0 parcelas vira 1; mais de 60 vira 60; cartão inexistente: nada', ctx.simEvents({value:100,mode:'parcelado',cardId:'nb',count:0}).length===1 && ctx.simEvents({value:100,mode:'parcelado',cardId:'nb',count:999}).length===60 && ctx.simEvents({value:100,mode:'parcelado',cardId:'x',count:3}).length===0);
// ===== saldo com a compra =====
const flat=(from,to,v)=>{ const o=[]; for(let d=from; d<=to; d=ctx.addDaysToISO(d,1)) o.push({date:d,value:v}); return o; };
let pf=flat('2026-11-01','2026-12-31',1000);
let sv=ctx.simSeries(pf,[{date:'2026-11-05',value:100}]);
ok('compra de HOJE: o saldo de hoje continua o real; pesa a partir de amanhã', sv[pf.findIndex(p=>p.date==='2026-11-05')]===1000 && sv[pf.findIndex(p=>p.date==='2026-11-06')]===900 && sv[0]===1000);
sv=ctx.simSeries(pf,[{date:'2026-11-08',value:100},{date:'2026-11-10',value:50}]); const at=(d)=>sv[pf.findIndex(p=>p.date===d)];
ok('várias saídas acumulam: 07/11 = 1.000, 08/11 = 900, 10/11 = 850 (e segue)', at('2026-11-07')===1000 && at('2026-11-08')===900 && at('2026-11-09')===900 && at('2026-11-10')===850 && at('2026-11-12')===850 && at('2026-12-31')===850);
// ===== o cenário da arte: saldo 4.320, menor saldo 1.280 em 17/11, termina em 2.380 =====
const stepVal=(d)=> d>='2026-11-18'? 2380 : d>='2026-11-17'? 1280 : d>='2026-11-14'? 1640 : d>='2026-11-12'? 1780 : d>='2026-11-11'? 1880 : d>='2026-11-10'? 3120 : 4320;
const mkpts=()=>flat('2026-10-20','2026-11-19',0).map(p=>({date:p.date,value:stepVal(p.date)}));
const per={from:'2026-10-20',to:'2026-11-19'}, m={livre:1280};
function run(sim){ const pts=mkpts(); const e=ctx.simEvents(sim); const s=ctx.simSeries(pts,e); pts.forEach((p,i)=>{p.sim=s[i];}); return {pts,e,sum:ctx.simSummary(per,m,pts,e)}; }
let r=run({value:2000,mode:'avista',date:'2026-11-08'});
ok('compra de R$ 2.000 em 08/11: menor saldo 1.280 → −720 (17/11); fim 2.380 → 380; "posso gastar" 1.280 → −720', r.sum.minBefore.value===1280 && r.sum.minAfter.value===-720 && r.sum.minAfter.date==='2026-11-17' && r.sum.endBefore===2380 && r.sum.endAfter===380 && r.sum.livreAfter===-720 && r.sum.inPeriod===2000);
ok('avisa o PRIMEIRO dia em que o saldo fica negativo por causa da compra (11/11)', r.sum.negDate==='2026-11-11');
r=run({value:100,mode:'avista',date:'2026-11-08'}); ok('compra pequena (R$ 100): o saldo não fica negativo', r.sum.negDate===null && r.sum.minAfter.value===1180 && r.sum.livreAfter===1180);
r=run({value:3000,mode:'parcelado',cardId:'nb',count:10,date:'2026-11-05'});
ok('parcelado cuja 1ª parcela vence só em dezembro: não mexe no período; as 10 parcelas (R$ 3.000) pesam nos ciclos seguintes, R$ 300 cada', r.sum.inPeriod===0 && r.sum.beyondCount===10 && r.sum.beyondTotal===3000 && r.sum.beyondEach===300 && r.sum.livreAfter===1280 && r.pts.every(p=>p.sim===p.value));
// ===== painel =====
r=run({value:2000,mode:'avista',date:'2026-11-08',description:'Notebook'}); let h=nm(ctx.dashSimHtml(per,{value:2000,mode:'avista',date:'2026-11-08',description:'Notebook'},r.sum,r.e));
ok('painel: nome, valor, "à vista em 08/11", antes → depois nos 3 números, aviso de saldo negativo, botões Editar/Limpar e o lembrete de que nada foi lançado', /Simulação:<\/b> Notebook · R\$ 2\.000,00 à vista em 08\/11/.test(h) && /R\$ 1\.280,00<\/span> → <b class="num neg">-R\$ 720,00<\/b> <span class="dash-sim-d">\(17\/11\)/.test(h) && /R\$ 2\.380,00<\/span> → <b class="num pos">R\$ 380,00/.test(h) && /Posso gastar até 19\/11/.test(h) && /negativo a partir de 11\/11/.test(h) && /id="sim-edit"/.test(h) && /id="sim-clear"/.test(h) && /Nada foi lançado/.test(h));
r=run({value:3000,mode:'parcelado',cardId:'nb',count:10,date:'2026-11-05',description:'TV'}); h=nm(ctx.dashSimHtml(per,{value:3000,mode:'parcelado',cardId:'nb',count:10,description:'TV'},r.sum,r.e));
ok('painel parcelado: "em 10x de R$ 300,00 no Nubank" e a nota das parcelas dos próximos ciclos', /em 10x de R\$ 300,00 no Nubank/.test(h) && /As outras 10 parcelas \(R\$ 3\.000,00\) pesam nos próximos ciclos: cerca de R\$ 300,00 por ciclo/.test(h) && !/negativo a partir/.test(h));
ctx.state.settings.primeiroDiaMes=1; ok('sem ciclo (mês no dia 1): o texto diz "meses" e "por mês"', /próximos meses: cerca de R\$ 300,00 por mês/.test(nm(ctx.dashSimHtml(per,{value:3000,mode:'parcelado',cardId:'nb',count:10,description:'TV'},r.sum,r.e)))); ctx.state.settings.primeiroDiaMes=20;
// ===== desenho =====
r=run({value:2000,mode:'avista',date:'2026-11-08'}); const svg=nm(ctx.dashChartSvg(r.pts));
ok('com simulação: segunda linha pontilhada, ponto e rótulo "com a compra · −R$ 720,00 (17/11)", linha do zero (saldo negativo) e descrição acessível', /class="dc-sim"/.test(svg) && /class="dc-simdot"/.test(svg) && /com a compra · -R\$ 720,00 \(17\/11\)/.test(svg) && /class="dc-zero"/.test(svg) && /com a compra o menor saldo seria -R\$ 720,00 em 17\/11/.test(svg) && !/NaN|undefined|Infinity/.test(svg));
const plain=mkpts(); ok('sem simulação: nada de linha simulada', !/dc-sim/.test(ctx.dashChartSvg(plain)));
r=run({value:3000,mode:'parcelado',cardId:'nb',count:10,date:'2026-11-05'}); ok('simulação sem efeito no período (parcelas só depois): não desenha linha que coincide com a original', !/class="dc-sim"/.test(ctx.dashChartSvg(r.pts)));
// ===== dica do dia =====
r=run({value:2000,mode:'avista',date:'2026-11-08'}); const idx=(d)=>r.pts.findIndex(p=>p.date===d);
const di=ctx.dashDayInfo(r.pts,idx('2026-11-11')), tip=nm(ctx.dashTipHtml(di));
ok('dica de 11/11: saldo 1.880 e "Com a compra: −R$ 120,00 (−R$ 2.000,00)" em vermelho', di.sim===-120 && di.simDelta===-2000 && /Com a compra: <b class="num neg">-R\$ 120,00<\/b> <span>\(−R\$ 2\.000,00\)<\/span>/.test(tip) && /R\$ 1\.880,00/.test(tip));
ok('dias antes da compra e sem simulação: a dica não fala de simulação', ctx.dashDayInfo(r.pts,idx('2026-11-06')).sim===null && !/Com a compra/.test(ctx.dashTipHtml(ctx.dashDayInfo(r.pts,idx('2026-11-06')))) && !/Com a compra/.test(ctx.dashTipHtml(ctx.dashDayInfo(mkpts(),5))));
let bad=0; for(const [l,v] of R){ console.log((v?'PASSOU  ':'FALHOU  ')+l); if(!v) bad++; }
console.log('\n'+R.length+' verificações,', bad+' falha(s)'); process.exit(bad?1:0);
