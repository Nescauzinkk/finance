/* Fluxo do dinheiro: de onde vem, para onde vai (agrupamentos, totais, diagrama de fluxo e listas). */
const {load}=require('./helpers/extract');
const R=[]; const ok=(l,v)=>R.push([l,!!v]);
const ctx=load(['pad','addMonthsToKey','daysInMonth','addDaysToISO','fmtDM','fmtCurrency','escapeHtml','rnd2','signClass','monthLabel','cashDate','summarize','periodSummary','categoryEssential','flowItems','flowGroups','flowData','sankeyLayout','flowSankeySvg','flowGroupsHtml'],
  {todayISO:()=>'2026-11-05', virtualEntriesBetween:()=>[], Math, Number, String, Object, Array, Set, Map, JSON, Date, parseInt},['MONTH_NAMES','FLOW_SOURCE_LABEL']);
const T=(id,o)=>({id,type:'despesa',source:'manual',description:id,category:'Outros',value:10,status:'pago',accountId:'a1',paymentMethod:'PIX',date:'2026-11-02',...o});
const per={from:'2026-10-20',to:'2026-11-19'};
function setup(extra){
  ctx.state={settings:{},accounts:[{id:'a1',name:'Conta Principal'},{id:'a2',name:'Poupança'}],
   categories:[{name:'Casa',essential:true},{name:'Mercado',essential:true},{name:'Transporte',essential:true},{name:'Lazer',essential:false}],
   transactions:[
    T('Salário',{type:'receita',category:'Salário',value:4100,date:'2026-10-28',source:'income'}), T('Pensão',{type:'receita',category:'Pensão',value:1100,date:'2026-11-18',status:'pendente',source:'income',accountId:'a2'}),
    T('Transporte',{category:'Transporte',value:620,date:'2026-10-22'}), T('Mercado',{category:'Mercado',value:600,date:'2026-10-25'}), T('Lazer pago',{category:'Lazer',value:340,date:'2026-11-02'}),
    T('Aluguel',{category:'Casa',value:1200,date:'2026-11-10',status:'pendente',source:'recurring'}), T('Fatura Nubank',{category:'Cartão',value:1240,date:'2026-11-11',status:'pendente',cardId:'nb',source:'installment',paymentMethod:'Crédito'}),
    T('Internet',{category:'Casa',value:100,date:'2026-11-12',status:'pendente',source:'recurring'}), T('Luz',{category:'Casa',value:140,date:'2026-11-14',status:'pendente',source:'recurring'}), T('Academia',{category:'Lazer',value:360,date:'2026-11-17',status:'pendente',source:'recurring'}),
    ...(extra||[])]};
}
setup(); const fd=ctx.flowData(per);
ok('entrou R$ 5.200 (recebido 4.100 + a receber 1.100); saiu R$ 4.600 (pago 1.560 + a pagar 3.040); sobra R$ 600', fd.entrou===5200 && fd.recPaid===4100 && fd.recPending===1100 && fd.saiu===4600 && fd.desPaid===1560 && fd.desPending===3040 && fd.sobra===600);
ok('DE ONDE VEM: por categoria (Salário 4.100, Pensão 1.100) e em qual conta cai (Conta Principal 4.100, Poupança 1.100)', fd.byRecCat.map(g=>g.key+':'+g.total).join()==='Salário:4100,Pensão:1100' && fd.recByAccount.map(g=>g.key+':'+g.total).join()==='Conta Principal:4100,Poupança:1100');
ok('PARA ONDE VAI por categoria, do maior ao menor: Casa 1.440, Cartão 1.240, Lazer 700, Transporte 620, Mercado 600', fd.by.categoria.map(g=>g.key+':'+g.total).join()==='Casa:1440,Cartão:1240,Lazer:700,Transporte:620,Mercado:600');
ok('por tipo de gasto: Contas recorrentes 1.800, Dia a dia 1.560, Parcelamentos 1.240', fd.by.tipo.map(g=>g.key+':'+g.total).join()==='Contas recorrentes:1800,Dia a dia:1560,Parcelamentos:1240');
ok('por forma de pagamento: PIX 3.360 e Cartão de crédito 1.240 (qualquer lançamento com cartão conta como cartão)', fd.by.pagamento.map(g=>g.key+':'+g.total).join()==='PIX:3360,Cartão de crédito:1240');
ok('por conta: tudo saiu da Conta Principal (4.600)', fd.by.conta.length===1 && fd.by.conta[0].key==='Conta Principal' && fd.by.conta[0].total===4600);
ok('essenciais: Casa + Mercado + Transporte = R$ 2.660 (58% das saídas)', fd.essential===2660 && Math.round(fd.essential/fd.saiu*100)===58);
const casa=fd.by.categoria[0];
ok('cada grupo traz seus lançamentos em ordem de data, com pago/pendente: Casa → Aluguel 10/11, Internet 12/11, Luz 14/11; Lazer pago 340 + pendente 360', casa.items.map(i=>i.description).join()==='Aluguel,Internet,Luz' && casa.pending===1440 && casa.paid===0 && fd.by.categoria.find(g=>g.key==='Lazer').paid===340 && fd.by.categoria.find(g=>g.key==='Lazer').pending===360);
ok('a soma dos grupos de CADA agrupamento é o total que saiu (nada some nem se repete)', ['categoria','tipo','pagamento','conta'].every(k=>ctx.rnd2(fd.by[k].reduce((a,g)=>a+g.total,0))===4600));
setup([T('Sem cat',{category:'',value:5,date:'2026-11-03'})]); ok('lançamento sem categoria vira "Sem categoria"', ctx.flowData(per).by.categoria.some(g=>g.key==='Sem categoria' && g.total===5)); setup();
// ----- diagrama -----
const mk=(arr,kind)=>arr.map(([label,value],i)=>({key:'k'+i,label,value,kind}));
const L1=ctx.sankeyLayout(mk([['Salário',4100],['Pensão',1100]],'in'), [...mk([['Casa',1440],['Cartão',1240],['Lazer',700],['Transporte',620],['Mercado',600]],'out'),{key:'s',label:'Sobra',value:600,kind:'keep'}], {W:900,H:380});
const col=(side)=>L1.nodes.filter(n=>n.side===side).sort((a,b)=>a.y-b.y);
const inBounds=L1.nodes.every(n=>n.y>=-0.1 && n.y+n.h<=380.6 && n.h>=18 || n.side==='mid');
ok('diagrama: 9 blocos e 8 faixas; total 5.200', L1.nodes.length===9 && L1.links.length===8 && L1.total===5200);
ok('todos os blocos ficam dentro da área, com altura mínima de 18, e nenhum se sobrepõe ao vizinho (coluna da esquerda e da direita)', inBounds && [col('src'),col('dst')].every(c=>c.every((n,i)=>i===c.length-1 || n.y+n.h+8<=c[i+1].y+0.15)));
ok('o que entra é igual ao que sai: soma das faixas da esquerda = soma da direita = total; o bloco central tem a altura do total na mesma escala', L1.links.filter(l=>l.side==='src').reduce((a,l)=>a+l.value,0)===5200 && L1.links.filter(l=>l.side==='dst').reduce((a,l)=>a+l.value,0)===5200 && Math.abs(L1.nodes.find(n=>n.side==='mid').h-5200*L1.k)<0.2);
ok('as faixas são curvas válidas (sem NaN) e blocos maiores são mais altos (Casa > Mercado)', L1.links.every(l=>/^M[\d. -]+C/.test(l.d) && !/NaN/.test(l.d)) && L1.nodes.find(n=>n.label==='Casa').h>L1.nodes.find(n=>n.label==='Mercado').h);
ok('sem valores, nada para desenhar', ctx.sankeyLayout([],[],{}).nodes.length===0 && ctx.sankeyLayout(mk([['a',0]],'in'),mk([['b',0]],'out'),{}).nodes.length===0);
const many=ctx.sankeyLayout(mk(Array.from({length:6},(_,i)=>['S'+i,i===0?10000:5]),'in'), mk(Array.from({length:9},(_,i)=>['D'+i,i===0?10000:1]),'out'), {W:900,H:300});
ok('valores muito desiguais (um enorme e vários minúsculos): ainda cabe na altura e respeita o mínimo', many.nodes.every(n=>n.side==='mid' || (n.h>=18 && n.y+n.h<=300.6 && n.y>=-0.1)));
// ----- SVG -----
let svg=ctx.flowSankeySvg(fd).replace(/\u00a0/g,' ');
ok('desenho: descrição acessível, rótulos com valor, bloco "Sobra do período" e dica (título/valor/%) em cada bloco e faixa', /aria-label="Fluxo do dinheiro: entram R\$ 5\.200,00 e saem R\$ 4\.600,00; sobram R\$ 600,00"/.test(svg) && />Salário · R\$ 4\.100,00</.test(svg) && />Sobra do período · R\$ 600,00</.test(svg) && /data-title="Casa" data-value="R\$ 1\.440,00 · 28% do total"/.test(svg) && (svg.match(/class="sk-band/g)||[]).length===8 && !/NaN|undefined/.test(svg));
setup([T('Reforma',{category:'Casa',value:9000,date:'2026-11-06',status:'pendente'})]); svg=ctx.flowSankeySvg(ctx.flowData(per)).replace(/\u00a0/g,' ');
ok('saiu mais do que entrou: aparece "Do saldo que já tinha" na esquerda, não há "Sobra", e a descrição diz que faltam R$ 8.400', />Do saldo que já tinha/.test(svg) && !/Sobra do período/.test(svg) && /faltam R\$ 8\.400,00/.test(svg) && /sk-gap/.test(svg)); setup();
setup(Array.from({length:30},(_,i)=>T('Gasto'+i,{category:'Cat'+i,value:10+i,date:'2026-11-03'}))); svg=ctx.flowSankeySvg(ctx.flowData(per)).replace(/\u00a0/g,' ');
ok('30 categorias: mostra as 8 maiores e agrupa o resto em "Outras categorias (N)" — o diagrama não vira bagunça', /Outras categorias \(\d+\)/.test(svg) && (svg.match(/class="sk-node sk-out"/g)||[]).length===9); setup();
ctx.state.transactions=[]; ok('sem lançamentos: mensagem em vez de diagrama quebrado', /Sem receitas nem despesas/.test(ctx.flowSankeySvg(ctx.flowData(per)))); setup();
// ----- listas -----
const doc=new (require('jsdom').JSDOM)('<div id="x"></div>').window.document; doc.getElementById('x').innerHTML=ctx.flowGroupsHtml(fd.by.categoria, fd.saiu, 'neg');
const gs=[...doc.querySelectorAll('details.flow-group')], txt=(el)=>el.textContent.replace(/\s+/g,' ').replace(/\u00a0/g,' ');
ok('lista "para onde vai": 5 grupos recolhidos, o primeiro é Casa com R$ 1.440,00 e 31% (1.440 de 4.600)', gs.length===5 && /Casa/.test(gs[0].querySelector('summary').textContent) && /R\$ 1\.440,00/.test(gs[0].querySelector('summary').textContent) && /31%/.test(gs[0].querySelector('summary').textContent));
ok('ao abrir: "A pagar R$ 1.440,00 · 3 lançamentos" e as linhas com data, forma/conta, status e valor em vermelho', /A pagar R\$ 1\.440,00 · 3 lançamentos/.test(txt(gs[0])) && gs[0].querySelectorAll('tbody tr').length===3 && /10\/11.*Aluguel.*PIX · Conta Principal.*Pendente.*R\$ 1\.200,00/.test(txt(gs[0].querySelector('tbody tr'))) && gs[0].querySelector('td.neg'));
doc.getElementById('x').innerHTML=ctx.flowGroupsHtml(fd.byRecCat, fd.entrou, 'pos'); const rg=[...doc.querySelectorAll('details.flow-group')];
ok('lista "de onde vem": usa "Recebido" / "A receber" e valores em verde', rg.length===2 && /Recebido R\$ 4\.100,00/.test(txt(rg[0])) && /A receber R\$ 1\.100,00/.test(txt(rg[1])) && rg[0].querySelector('td.pos') && rg[0].querySelector('.fg-val.pos'));
ok('lista vazia: mensagem', /Nada neste período/.test(ctx.flowGroupsHtml([],0,'neg')));
doc.getElementById('x').innerHTML=ctx.flowGroupsHtml([{key:'<img src=x onerror=alert(1)>',total:10,paid:10,pending:0,items:[{date:'2026-11-03',description:'<b>x</b>',value:10,status:'pago',method:'PIX',account:'A',virtual:false}]}],10,'neg');
ok('texto vindo dos lançamentos é escapado (nada de HTML injetado)', !doc.querySelector('#x img') && !doc.querySelector('#x tbody b') && /&lt;b&gt;x/.test(doc.getElementById('x').innerHTML));
let bad=0; for(const [l,v] of R){ console.log((v?'PASSOU  ':'FALHOU  ')+l); if(!v) bad++; }
console.log('\n'+R.length+' verificações,', bad+' falha(s)'); process.exit(bad?1:0);
