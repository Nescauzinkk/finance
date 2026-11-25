/* Orçamento por categoria: gasto x limite por ciclo, situações nas fronteiras, alertas, tela e cartão do Dashboard. */
const {load}=require('./helpers/extract'); const {JSDOM}=require('jsdom');
const R=[]; const ok=(l,v)=>R.push([l,!!v]);
let TODAY='2026-11-05', VIRT=[];
const ctx=load(['pad','addMonthsToKey','daysInMonth','addDaysToISO','fmtDM','fmtDate','fmtCurrency','escapeHtml','monthLabel','monthLabelShort','cashDate','summarize','periodSummary','cycleFor','hasCycles','cycleAt','cycleLabel','cycleOptions','rnd2','signClass','fmtPlain','budgetRows','budgetAlerts','budgetBadge','renderOrcamento','dashLimitsHtml'],
  {todayISO:()=>TODAY, todayMonthKey:()=>TODAY.slice(0,7), virtualEntriesBetween:(f,t)=>VIRT.filter(v=>v.date>f&&v.date<=t), parseInt, Math, Number, String, Object, Array, Set, JSON},['MONTH_NAMES','budgetOffset']);
const mk=(o)=>({type:'despesa',status:'pago',value:10,description:'x',category:'Outros',...o,month:(o.date||'').slice(0,7)});
const cat=(name,limit,extra)=>({id:name,name,type:'despesa',essential:false,status:'ativa',limit,...extra});
function setup(sd){
  ctx.state={settings:{primeiroDiaMes:sd},cards:[],installments:[],debts:[],
   categories:[cat('Mercado',800,{essential:true}),cat('Lazer',100),cat('Casa',1000),cat('Saúde',500),cat('Transporte',0),cat('Zero',0),cat('Inativa',0,{status:'inativa'}),{id:'s',name:'Salário',type:'receita',status:'ativa',limit:999}],
   transactions:[
    mk({category:'Mercado',value:500,date:'2026-10-25'}), mk({category:'Mercado',value:300,date:'2026-11-10',status:'pendente'}),
    mk({category:'Lazer',value:101,date:'2026-10-28'}), mk({category:'Casa',value:799,date:'2026-11-01'}),
    mk({category:'Saúde',value:400,date:'2026-11-15',status:'pendente'}), mk({category:'Transporte',value:200,date:'2026-11-02'}),
    mk({category:'',value:50,date:'2026-11-03'}), mk({category:'Pet',value:30,date:'2026-11-04'}),
    mk({category:'Mercado',value:999,date:'2026-09-25'}),                                   // ciclo anterior: não conta
    mk({type:'receita',category:'Salário',value:4000,date:'2026-10-30'}), mk({type:'transferencia',category:'Mercado',value:700,date:'2026-11-02'}), mk({type:'ajuste',category:'Mercado',value:700,date:'2026-11-02'})]};
}
setup(20); TODAY='2026-11-05';
const rows=ctx.budgetRows(ctx.cycleAt(0)); const by=n=>rows.find(r=>r.name===n);
ok('limite de R$ 800 em Mercado: gasto 800 (500 pago + 300 previsto) = 100% → "atenção" (não estourou)', by('Mercado').spent===800 && by('Mercado').paid===500 && by('Mercado').left===0 && by('Mercado').pct===100 && by('Mercado').status==='atencao');
ok('FRONTEIRAS: 101% = estourou (restante −1); 80% = atenção; 79,9% = dentro', by('Lazer').status==='estourou' && by('Lazer').left===-1 && by('Saúde').pct===80 && by('Saúde').status==='atencao' && by('Casa').status==='ok' && by('Casa').left===201);
ok('só conta o ciclo certo e só despesas: o gasto de setembro, a receita, a transferência e o ajuste ficam de fora', by('Mercado').spent===800);
ok('categoria sem limite (Transporte), com limite zero (Zero), sem categoria e não cadastrada (Pet) aparecem como "sem limite"', ['Transporte','Zero','Sem categoria','Pet'].every(n=>by(n) && by(n).status==='sem' && by(n).limit===0 && by(n).pct===null && by(n).left===null) && by('Sem categoria').spent===50 && by('Pet').spent===30);
ok('categoria inativa sem gasto e categoria de receita não entram', !by('Inativa') && !by('Salário'));
ok('ordem: quem tem limite por % de uso (Lazer 101, Mercado 100, Saúde 80, Casa 79,9); depois sem limite por gasto (Transporte 200, Sem categoria 50, Pet 30, Zero 0)', rows.map(r=>r.name).join()==='Lazer,Mercado,Saúde,Casa,Transporte,Sem categoria,Pet,Zero');
const al=ctx.budgetAlerts();
ok('alertas: Lazer (estourou, vermelho) e Mercado e Saúde (atenção, amarelo); Casa não', al.length===3 && al[0].sev==='rust' && /passou do limite de "Lazer" neste ciclo/.test(al[0].msg) && al[1].sev==='gold' && /"Mercado" já usou 100% do limite do ciclo/.test(al[1].msg) && /"Saúde" já usou 80%/.test(al[2].msg) && !al.some(a=>/Casa/.test(a.msg)));
VIRT=[{type:'despesa',category:'Casa',value:300,date:'2026-11-12',status:'pendente',virtual:true}];
ok('previsões das recorrentes (virtuais) contam no gasto: Casa 1.099 → estourou', ctx.budgetRows(ctx.cycleAt(0)).find(r=>r.name==='Casa').status==='estourou'); VIRT=[];
ok('o ciclo anterior tem os seus próprios números (Mercado 999)', ctx.budgetRows(ctx.cycleAt(-1)).find(r=>r.name==='Mercado').spent===999 && ctx.budgetRows(ctx.cycleAt(-1)).find(r=>r.name==='Mercado').status==='estourou');
// ----- tela -----
const dom=new JSDOM('<div id="x"></div>'); const doc=dom.window.document; doc.getElementById('x').innerHTML=ctx.renderOrcamento();
const tr=[...doc.querySelectorAll('tbody tr')];
ok('tabela com uma linha por categoria (8), limites digitáveis com o valor formatado ("800,00") e o campo de "Sem categoria" desabilitado', tr.length===8 && doc.querySelectorAll('input.bud-limit').length===8 && doc.querySelector('input[data-cat="Mercado"]').value==='800,00' && doc.querySelector('input[data-cat="Transporte"]').value==='' && doc.querySelector('input[data-cat="Sem categoria"]').disabled===true);
const cardsTxt=[...doc.querySelectorAll('.card')].map(c=>c.textContent.replace(/\s+/g,' ').replace(/\u00a0/g,' '));
ok('totais: limites R$ 2.400 (4 categorias), gasto nelas R$ 2.100 (88%), restante R$ 300', /R\$ 2\.400,00.*4 categorias/.test(cardsTxt[0]) && /R\$ 2\.100,00.*88% do total/.test(cardsTxt[1]) && /R\$ 300,00/.test(cardsTxt[2]));
const lazer=tr[0].textContent.replace(/\s+/g,' ');
ok('linha do Lazer: barra cheia (limitada a 100%), "101%" e selo "Estourou"; restante negativo em vermelho', /101%/.test(lazer) && /Estourou/.test(lazer) && tr[0].querySelector('.bud-bar i').style.width==='100%' && tr[0].querySelector('.bud-bar i').className==='st-estourou' && tr[0].querySelector('td.neg:nth-child(5)'));
ok('Saúde = "Atenção" com barra em 80%; Casa = "Dentro" com 80% (79,9 arredondado)', /Atenção/.test(tr[2].textContent) && tr[2].querySelector('.bud-bar i').style.width==='80%' && /Dentro/.test(tr[3].textContent) && tr[3].querySelector('.bud-bar i').className==='st-ok');
ok('seletor de ciclo com 31 opções e o ciclo atual selecionado; sem limite mostra "Sem limite" e traço', doc.querySelectorAll('#bud-cycle option').length===31 && doc.querySelector('#bud-cycle option:checked').value==='0' && /Sem limite/.test(tr[4].textContent) && /—/.test(tr[4].textContent));
// ----- cartão do Dashboard -----
doc.getElementById('x').innerHTML=ctx.dashLimitsHtml();
ok('Dashboard: cartão "Limites do ciclo · 20/10 a 19/11/26" com as categorias mais perto do limite primeiro, "R$ 101 de R$ 100" em vermelho e o link que abre a aba certa', /Limites do ciclo · 20\/10 a 19\/11\/26/.test(doc.body.textContent) && doc.querySelectorAll('.bud-cr').length===4 && doc.querySelector('.bud-cr .dash-cat').textContent==='Lazer' && /101,00.*de.*100,00/.test(doc.querySelector('.bud-cr').textContent.replace(/\s+/g,' ')) && doc.querySelector('.bud-cr .num').classList.contains('neg') && doc.querySelector('a[data-goto="relatorios"]').dataset.sub==='orcamento');
ctx.state.categories.forEach(c=>{ if(c.type==='despesa') c.limit=0; });
ok('sem nenhum limite: o Dashboard não mostra o cartão e o app não gera alertas de limite', ctx.dashLimitsHtml()==='' && ctx.budgetAlerts().length===0);
doc.getElementById('x').innerHTML=ctx.renderOrcamento();
ok('sem limites: tela amigável ("defina um limite para começar"), zeros e todas as linhas "Sem limite"', /defina um limite para começar/.test(doc.body.textContent) && /0 categorias/.test(doc.body.textContent) && [...doc.querySelectorAll('tbody tr')].every(r=>/Sem limite/.test(r.textContent)));
for(let i=0;i<7;i++){ ctx.state.categories.push(cat('Extra'+i,100)); ctx.state.transactions.push(mk({category:'Extra'+i,value:10+i,date:'2026-11-03'})); }
doc.getElementById('x').innerHTML=ctx.dashLimitsHtml();
ok('com 7 limites: o Dashboard mostra só 5 e diz "+ 2 categorias com limite"', doc.querySelectorAll('.bud-cr').length===5 && /\+ 2 categorias com limite/.test(doc.body.textContent));
setup(1); ctx.state.settings.primeiroDiaMes=1; TODAY='2026-11-05';
ok('sem ciclo (mês começa no dia 1): o texto diz "mês" e o período é o mês de calendário', /neste mês/.test((ctx.state.transactions.push(mk({category:'Lazer',value:500,date:'2026-11-03'})),ctx.budgetAlerts().map(a=>a.msg).join(' '))) && /Limites do mês · Novembro 2026/.test((doc.getElementById('x').innerHTML=ctx.dashLimitsHtml(), doc.body.textContent)));
let bad=0; for(const [l,v] of R){ console.log((v?'PASSOU  ':'FALHOU  ')+l); if(!v) bad++; }
console.log('\n'+R.length+' verificações,', bad+' falha(s)'); process.exit(bad?1:0);
