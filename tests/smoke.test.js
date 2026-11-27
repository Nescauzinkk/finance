/* Simulação do app inteiro: carrega o index.html + src/main.js de verdade (banco e gráficos falsos),
   abre TODAS as telas e clica em TODOS os controles, nos dois temas, em 3 cenários de dados.
   Falha se houver erro de execução ou texto suspeito (undefined, NaN, [object Object]...). */
const path=require('path'), fs=require('fs'); const esbuild=require('esbuild'); const {JSDOM,VirtualConsole}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
const VIEWS=['dashboard','contas','lancamentos','cartao','planejamento','recorrentes','parcelamentos','dividas','metas','relatorios','configuracoes'];
const BAD=/\bundefined\b|\bNaN\b|\[object|Infinity|\bnull\b/;
const SKIP=/sair|excluir|apagar|resetar|restaurar|limpar tudo|desfazer tudo|deletar|remover/i;
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
async function bundle(){
  const r=await esbuild.build({entryPoints:[path.join(ROOT,'src/main.js')],bundle:true,format:'iife',write:false,logLevel:'error',
    plugins:[{name:'stubs',setup(b){
      b.onResolve({filter:/supabaseClient\.js$/},()=>({path:path.join(__dirname,'stubs/supabaseClient.js')}));
      b.onResolve({filter:/^chart\.js\/auto$/},()=>({path:path.join(__dirname,'stubs/chart.js')}));
    }}]});
  return r.outputFiles[0].text;
}
function buildState(variant){
  const T=new Date(), p2=n=>String(n).padStart(2,'0'), iso=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
  const D=n=>{const d=new Date(T); d.setDate(d.getDate()+n); return iso(d);}; const M=n=>{const d=new Date(T.getFullYear(),T.getMonth()+n,1); return `${d.getFullYear()}-${p2(d.getMonth()+1)}`;};
  let k=0; const tx=(o)=>({id:'t'+(k++),type:'despesa',source:'manual',category:'Outros',paymentMethod:'PIX',accountId:'a1',status:'pago',value:10,...o,month:(o.date||D(0)).slice(0,7)});
  if(variant==='vazio') return null;   // usuário novo: nada cadastrado
  const S={version:2,settings:{nome:'Aldo',moeda:'BRL',primeiroDiaMes:20,salarioPadrao:4500,metaEconomiaMensal:500,currentBalance:0,currentBalanceDate:null},
   accounts:[{id:'a1',name:'Conta Principal',institution:'Nubank',type:'conta',initialBalance:2000,color:'green',status:'ativa',createdAt:Date.now()-120*864e5},{id:'a2',name:'Poupança',institution:'',type:'poupanca',initialBalance:500,color:'blue',status:'ativa',createdAt:Date.now()-120*864e5},{id:'a3',name:'Antiga',type:'conta',initialBalance:0,status:'inativa',createdAt:Date.now()-120*864e5}],
   cards:[{id:'nb',name:'Nubank',limit:5000,closingDay:4,dueDay:11,closings:{[M(0)+'-11']:{closedAt:Date.now()-864e5,total:1200}}},{id:'c2',name:'Inter',limit:2000,closingDay:25,dueDay:5}],
   incomes:[{id:'in1',name:'Salário',type:'Salário',category:'Salário',value:4500,frequency:'mensal',startDate:D(-100),day:5,accountId:'a1',paymentMethod:'PIX',status:'ativa'},{id:'in2',name:'Freela',type:'Freela',category:'Freela',value:800,frequency:'unica',startDate:D(6),day:1,accountId:'a1',paymentMethod:'PIX',status:'ativa'}],
   recurring:[{id:'r1',name:'Aluguel',category:'Casa',value:1200,day:10,startDate:D(-100),paymentMethod:'PIX',accountId:'a1',isSubscription:false,status:'ativa'},{id:'r2',name:'Netflix',category:'Lazer',value:39.9,day:15,startDate:D(-100),paymentMethod:'Crédito',cardId:'nb',isSubscription:true,status:'ativa'},{id:'r3',name:'Academia',category:'Saúde',value:120,day:3,startDate:D(-100),paymentMethod:'PIX',accountId:'a1',isSubscription:false,status:'inativa'}],
   installments:[{id:'i1',name:'TV',category:'Casa',cardId:'nb',totalValue:2400,count:12,installmentValue:200,startMonth:M(-2),alreadyPaid:0,status:'ativo'},{id:'i2',name:'Notebook',category:'Trabalho',cardId:'c2',totalValue:3000,count:10,installmentValue:300,startMonth:M(-4),alreadyPaid:3,status:'ativo'}],
   debts:[{id:'d1',name:'Carro',description:'Financiamento',originalValue:30000,installmentValue:1025,count:30,interest:1.2,startMonth:M(-5),dueDay:15,alreadyPaid:2,note:''}],
   goals:[{id:'g1',name:'Reserva de emergência',targetValue:20000,currentValue:9000,deadline:D(300),monthlyPlanned:300,contributions:[]},{id:'g2',name:'Viagem',targetValue:3000,currentValue:3000,deadline:D(30),monthlyPlanned:0,contributions:[]}],
   transactions:[
    tx({type:'receita',description:'Salário (mês passado)',category:'Salário',value:4500,date:D(-25),paidAt:D(-25)}),
    tx({description:'Mercado',category:'Mercado',value:600,date:D(-12),paidAt:D(-12)}),
    tx({description:'Transporte',category:'Transporte',value:320,date:D(-8),paidAt:D(-8)}),
    tx({description:'Restaurante',category:'Lazer',value:140,date:D(-2),paidAt:D(-2)}),
    tx({description:'Conta de luz (atrasada)',category:'Casa',value:180,date:D(-4),status:'pendente'}),
    tx({description:'Internet',category:'Casa',value:100,date:D(3),status:'pendente'}),
    tx({description:'Dentista',category:'Saúde',value:350,date:D(9),status:'pendente'}),
    tx({type:'receita',description:'Reembolso',category:'Outros',value:250,date:D(7),status:'pendente'}),
    tx({description:'Compra cartão',category:'Mercado',value:230,date:D(5),status:'pendente',cardId:'nb',paymentMethod:'Crédito',purchaseDate:D(-6)}),
    {id:'tj',type:'ajuste',source:'manual',description:'Ajuste de saldo',category:'Ajuste de saldo',value:-50,date:D(-5),month:D(-5).slice(0,7),status:'pago',accountId:'a1',paymentMethod:'—'},
    {id:'tt',type:'transferencia',source:'manual',description:'Para poupança',category:'Transferência',value:200,date:D(-3),month:D(-3).slice(0,7),status:'pago',accountId:'a1',toAccountId:'a2',paymentMethod:'—'}]};
  if(variant==='normal'){   // com limites por categoria
    const dc=(name,essential,extra)=>({id:'c-'+name,name,type:'despesa',essential:!!essential,status:'ativa',...extra});
    S.categories=[dc('Moradia',1),dc('Casa/Família',1),dc('Transporte',1),dc('Gasolina',1),dc('Carro'),dc('Cartão'),dc('Assinaturas'),dc('Alimentação',1,{limit:50}),dc('Saúde',1),dc('Lazer',0,{limit:100000}),dc('Educação'),dc('Dívidas'),dc('Investimentos'),dc('Outros'),
      {id:'r1',name:'Salário',type:'receita',essential:false,status:'ativa'},{id:'r2',name:'Pensão',type:'receita',essential:false,status:'ativa'},{id:'r3',name:'Freela',type:'receita',essential:false,status:'ativa'}];
    S.transactions.push(tx({description:'Gasto de hoje',category:'Alimentação',value:80,date:D(0),paidAt:D(0)}));
  }
  if(variant==='borda'){   // dados "feios": o que costuma quebrar telas
    S.accounts[0].initialBalance=-1500; S.accounts.push({id:'a4',name:'Sem saldo inicial',type:'conta',status:'ativa',createdAt:Date.now()});
    S.cards=[{id:'nb',name:'Sem fechamento',limit:0,dueDay:11},{id:'c2',name:'Cartão vazio',limit:1000,closingDay:25,dueDay:5}];
    S.goals=[{id:'g1',name:'Meta zerada',targetValue:0,currentValue:0,monthlyPlanned:0,contributions:[]},{id:'g2',name:'Sem prazo',targetValue:1000,currentValue:100,deadline:null,monthlyPlanned:0,contributions:[]},{id:'g3',name:'Estourada',targetValue:100,currentValue:900,deadline:D(-20),monthlyPlanned:50,contributions:[]}];
    S.debts=[{id:'d1',name:'Quitada',originalValue:1000,installmentValue:500,count:2,interest:0,startMonth:M(-4),dueDay:31,alreadyPaid:2},{id:'d2',name:'Parcela zero',originalValue:0,installmentValue:0,count:1,interest:0,startMonth:M(0),dueDay:10,alreadyPaid:0}];
    S.installments=[{id:'i1',name:'Quitado',category:'Casa',cardId:'c2',totalValue:300,count:3,installmentValue:100,startMonth:M(-6),alreadyPaid:3,status:'ativo'},{id:'i2',name:'Sem cartão',category:'Casa',totalValue:600,count:6,installmentValue:100,startMonth:M(-1),alreadyPaid:0,status:'ativo'}];
    S.recurring=[{id:'r1',name:'Dia 31',category:'Casa',value:50,day:31,startDate:D(-100),paymentMethod:'PIX',accountId:'a1',status:'ativa'},{id:'r2',name:'Sem categoria',value:10,day:29,startDate:D(-100),paymentMethod:'PIX',accountId:'a1',status:'ativa'}];
    S.incomes=[{id:'in1',name:'Única passada',type:'Outros',value:100,frequency:'unica',startDate:D(-200),day:1,accountId:'a1',status:'ativa'}];
    S.transactions=[tx({description:'Sem categoria',category:'',value:0,date:D(-1)}),tx({description:'Valor texto',value:'12.5',date:D(-2)}),tx({description:'D'.repeat(300),value:1e9,date:D(-3)}),
      {id:'sm',type:'despesa',source:'manual',description:'Sem mês e sem conta',value:30,date:D(-4),status:'pago'},{id:'sd',type:'despesa',source:'manual',description:'Sem data',value:30,status:'pendente'},
      tx({description:'Pendente antigo',value:75,date:D(-90),status:'pendente'}),tx({type:'receita',description:'Receita futura',value:5,date:D(200),status:'pendente'})];
    S.settings.primeiroDiaMes=31;
  }
  return S;
}
async function runVariant(variant,bundleText){
  const errors=new Set(), problems=new Set(); const info={};
  const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace(/<script[\s\S]*?<\/script>/g,'');
  const vc=new VirtualConsole();
  vc.on('jsdomError',e=>{ const m=(e.detail&&e.detail.stack? e.detail.stack.split('\n').slice(0,2).join(' | ') : e.message); if(!/Not implemented/.test(m)) errors.add('JSDOM: '+m.slice(0,260)); });
  vc.on('error',(...a)=>errors.add('console.error: '+a.map(x=>x&&x.stack? x.stack.split('\n')[0] : String(x)).join(' ').slice(0,260)));
  const onRej=(e)=>errors.add('promise: '+(e&&e.stack? e.stack.split('\n').slice(0,2).join(' | ') : e)); process.on('unhandledRejection',onRej);
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost/',pretendToBeVisual:true,virtualConsole:vc}); const w=dom.window, doc=w.document;
  doc.documentElement.setAttribute('data-theme','dark');
  w.addEventListener('error',e=>errors.add('window.error: '+e.message));
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}}); w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>null; w.Element.prototype.scrollIntoView=()=>{};
  w.URL.createObjectURL=()=>'blob:x'; w.confirm=()=>true; w.__STATE=buildState(variant);
  w.eval(bundleText); await wait(400);
  if(doc.getElementById('app-root').style.display!=='flex') errors.add('o app não abriu depois do login');
  const closeModal=()=>{ const c=doc.getElementById('m-cancel'); if(c) c.click(); const mr=doc.getElementById('modal-root'); if(mr) mr.innerHTML=''; };
  const visit=(v)=>{ const n=doc.querySelector(`.nav-item[data-view="${v}"]`); if(n) n.click(); };
  const checkView=(v,label)=>{ const el=doc.getElementById('view-'+v); const txt=(el?el.textContent:'').replace(/\s+/g,' ');
    if(!el||el.innerHTML.trim().length<80) problems.add(`[${label}] ${v}: tela vazia`);
    const m=txt.search(BAD); if(m>=0) problems.add(`[${label}] ${v}: texto suspeito "${txt.match(BAD)[0]}" → ...${txt.slice(Math.max(0,m-60),m+60)}...`); };
  const SEL='button, summary, [data-goto], .cat-row[data-cat], .subtab, .lp-btn, .dash-chip, .period-btn, .step-btn, .card.clickable';
  let clicks=0;
  async function pass(label){
    for(const v of VIEWS){ visit(v); await wait(15); checkView(v,label);
      const n=doc.getElementById('view-'+v).querySelectorAll(SEL).length;
      for(let i=0;i<Math.min(n,60);i++){
        visit(v); await wait(4);
        const b=[...doc.getElementById('view-'+v).querySelectorAll(SEL)][i]; if(!b) break;
        const name=(b.textContent||b.title||b.id||'').trim().slice(0,40);
        if(SKIP.test(name+' '+(b.title||'')+' '+(b.className||''))||/del|trash/.test(Object.keys(b.dataset).join(' '))) continue;
        const before=errors.size; try{ b.click(); }catch(e){ errors.add(`${v}: clique em "${name}" lançou ${e.message}`); }
        await wait(4); clicks++; if(errors.size>before) problems.add(`[${label}] ${v}: erro ao clicar em "${name}"`);
        checkView(v,`${label}/após "${name}"`); closeModal();
      }
    }
  }
  visit('lancamentos'); await wait(15); info.lanc=(doc.querySelector('#view-lancamentos .lp-btn.active')||{dataset:{}}).dataset.lpmode; info.lancCicloBtn=!!doc.querySelector('#view-lancamentos .lp-btn[data-lpmode="ciclo"]');
  visit('relatorios'); await wait(15); info.rel=(doc.querySelector('#view-relatorios .period-btn.active')||{dataset:{}}).dataset.pmode;
  visit('dashboard'); await wait(15); info.dash=(doc.querySelector('#view-dashboard .dash-chip.active')||{dataset:{}}).dataset.dmode;
  // ---- Relatórios por ciclo (ou por mês, se o seu mês começa no dia 1) ----
  const U = variant!=='vazio'; const rel={};
  visit('relatorios'); await wait(15);
  const tabs=[...doc.querySelectorAll('#view-relatorios .subtab')].map(b=>b.textContent.trim());
  rel.abas=tabs.join(' | ');
  const clickTab=async(sub)=>{ doc.querySelector(`#view-relatorios .subtab[data-sub="${sub}"]`).click(); await wait(15); };
  await clickTab('projecao'); rel.projLinhas=doc.querySelectorAll('#report-body tbody tr').length; rel.projCab=(doc.querySelector('#report-body thead th')||{}).textContent; rel.projPrimeira=(doc.querySelector('#report-body tbody td')||{}).textContent;
  await clickTab('comparativo'); rel.compSelects=doc.querySelectorAll('#report-body select').length; rel.compOpcoes=(doc.querySelector('#comp-cycle-a')||{options:[]}).options.length;
  if(doc.querySelector('#comp-cycle-b')){ const sel=doc.querySelector('#comp-cycle-b'); sel.value='-2'; sel.dispatchEvent(new w.Event('change')); await wait(15); rel.compTrocou=doc.querySelector('#comp-cycle-b').value==='-2'; }
  await clickTab('graficos'); rel.graf=([...doc.querySelectorAll('#report-body h2')].map(h=>h.textContent).find(t=>/^Saldo/.test(t))||'');
  await clickTab('simulador'); const run=doc.getElementById('sim-run'); if(run){ run.click(); await wait(15); rel.sim=(doc.querySelector('#sim-result thead th')||{}).textContent; rel.simLinhas=doc.querySelectorAll('#sim-result tbody tr').length; }
  await clickTab('resumo');
  info.rel2=rel;
  // ---- Orçamento por categoria ----
  const orc={}; await clickTab('orcamento');
  const rowOf=(name,root='#report-body')=>[...doc.querySelectorAll(root+' tbody tr')].find(r=>r.cells[0].textContent.trim().startsWith(name));
  const flat=(el)=>(el? el.textContent : '').replace(/\s+/g,' ').replace(/\u00a0/g,' ');
  orc.linhas=doc.querySelectorAll('#report-body tbody tr').length; orc.abas=/Orçamento por categoria/.test(rel.abas);
  visit('dashboard'); await wait(15);
  if(variant==='normal'){
    orc.linha=flat(rowOf('Alimentação')||null) || (visit('relatorios'), '');
    orc.dashCard=flat(doc.querySelector('#view-dashboard .bud-cr')); orc.alerta=flat(doc.querySelector('#view-dashboard .dash-alerts'));
    const link=doc.querySelector('#view-dashboard a[data-sub="limites"]'); if(link){ link.click(); await wait(15); orc.viaLink=!!doc.querySelector('#ob-cycle'); }
    orc.linha=flat(rowOf('Alimentação','#ob-body'));
    const inp=doc.querySelector('#ob-body input.bud-limit[data-cat="Alimentação"]'); inp.value='1000,00'; inp.dispatchEvent(new w.Event('change')); await wait(15);
    orc.depois=flat(rowOf('Alimentação','#ob-body'));
    visit('dashboard'); await wait(15); orc.alertaDepois=flat(doc.querySelector('#view-dashboard .dash-alerts')); orc.cartaoDepois=[...doc.querySelectorAll('#view-dashboard .bud-cr .dash-cat')].map(e=>e.textContent).join();
  } else { orc.semCartao=!doc.querySelector('#view-dashboard .bud-cr'); }
  info.orc=orc;
  // ---- Total da fatura no banco ----
  const fat={}; visit('parcelamentos'); await wait(15);
  const invCards=()=>[...doc.querySelectorAll('#view-parcelamentos .invoice-card')];
  const closeBtn=doc.querySelector('#view-parcelamentos [data-inv-close]');
  if(variant==='normal' && closeBtn){
    closeBtn.click(); await wait(10);
    fat.campo=!!doc.querySelector('#modal-form [name="bankTotal"]'); fat.botao=/Confirmar fechamento/.test(doc.querySelector('#modal-form .btn.primary').textContent);
    doc.querySelector('#modal-form [name="bankTotal"]').value='99999,00';
    doc.getElementById('modal-form').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true})); await wait(20);
    const c=invCards().find(el=>/99\.999,00/.test(flat(el)));
    fat.total=!!c; fat.ajuste=c? /Ajuste da fatura/.test(flat(c)) : false; fat.toast=flat(doc.getElementById('toasts'));
    fat.fechada=c? /Fechada/.test((c.querySelector('.badge')||{textContent:''}).textContent) : false;
    const bankBtn=c && c.querySelector('[data-inv-bank]'); fat.temBotaoBanco=!!bankBtn;
    if(bankBtn){ bankBtn.click(); await wait(10); doc.querySelector('#modal-form [name="bankTotal"]').value='1,00'; doc.getElementById('modal-form').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true})); await wait(20);
      fat.menor=/menor que o do Kivo/.test(flat(doc.getElementById('toasts'))); fat.ajusteSumiu=!invCards().some(el=>/Ajuste da fatura/.test(flat(el))); }
  }
  info.fat=fat;
  // ---- Simulador "e se eu comprar isso?" ----
  const simi={}; visit('dashboard'); await wait(15);
  const svgSim=()=>doc.querySelector('#view-dashboard svg.dc-svg');
  const fillSim=async(vals)=>{ doc.getElementById('btn-sim').click(); await wait(10); const f=doc.getElementById('modal-form'); Object.entries(vals).forEach(([k,val])=>{ const el=f.querySelector(`[name="${k}"]`); if(el) el.value=val; }); f.dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true})); await wait(20); };
  simi.botao=!!doc.getElementById('btn-sim');
  if(variant!=='vazio'){
    await fillSim({value:'999999,00', mode:'avista', description:'Carro'});
    simi.futuro=!!(svgSim() && svgSim().querySelector('.dc-fut')); simi.painel=flat(doc.querySelector('#view-dashboard .dash-sim')); simi.linha=!!(svgSim()&&svgSim().querySelector('.dc-sim')); simi.negativo=/negativo a partir de/.test(simi.painel); simi.nome=/Carro/.test(simi.painel);
    svgSim().getBoundingClientRect=()=>({left:0,top:0,width:640,height:214}); svgSim().dispatchEvent(new w.MouseEvent('pointermove',{clientX:635,bubbles:true}));
    simi.tooltip=/Com a compra/.test(flat(doc.querySelector('#view-dashboard .dc-tip')));   // só existe se ainda sobram dias no período
    doc.getElementById('sim-clear').click(); await wait(15);
    simi.limpou=!doc.querySelector('#view-dashboard .dash-sim') && !svgSim().querySelector('.dc-sim') && /Simular uma compra/.test(doc.getElementById('btn-sim').textContent);
    doc.getElementById('btn-sim').click(); await wait(10); const cid=doc.querySelector('#modal-form [name="cardId"]').options[0].value; doc.getElementById('m-cancel').click();
    await fillSim({value:'3000,00', mode:'parcelado', count:'10', cardId:cid}); simi.parcelado=/em 10x de R\$ 300,00/.test(simi.painel=flat(doc.querySelector('#view-dashboard .dash-sim')));
    simi.editar=/Editar simulação/.test(doc.getElementById('btn-sim').textContent); doc.getElementById('sim-clear').click(); await wait(15);
  } else {
    await fillSim({value:'500,00', mode:'parcelado'}); simi.erroSemCartao=/Cadastre um cartão/.test(flat(doc.getElementById('toasts'))) && !doc.querySelector('#view-dashboard .dash-sim');
  }
  info.sim=simi;
  // ---- Orçamento: abas, teto diário e fluxo do dinheiro ----
  const obx={}; visit('planejamento'); await wait(15);
  const obTab=async(k)=>{ doc.querySelector(`#view-planejamento .ob-tab[data-obtab="${k}"]`).click(); await wait(15); };
  await obTab('dia'); await obTab('visao');   // o app lembra a última aba; aqui escolhemos a Visão de propósito
  obx.titulo=(doc.querySelector('#view-planejamento h1')||{}).textContent;
  obx.abas=[...doc.querySelectorAll('#view-planejamento .ob-tab')].map(b=>b.textContent.trim()).join('|');
  obx.ativa=(doc.querySelector('#view-planejamento .ob-tab.active')||{dataset:{}}).dataset.obtab;
  obx.hero=flat(doc.querySelector('#view-planejamento .ob-hero')); obx.canvas=!!doc.getElementById('chart-ob-daily');
  obx.hoje=/Hoje/.test(obx.hero) && /A partir de amanhã|Amanhã/.test(obx.hero);
  await obTab('fluxo');
  obx.sk=!!doc.querySelector('#view-planejamento .sk-svg'); obx.nos=doc.querySelectorAll('#view-planejamento .sk-node').length; obx.grupos=doc.querySelectorAll('#view-planejamento details.flow-group').length;
  obx.msgVazio=/Sem receitas nem despesas/.test(flat(doc.getElementById('ob-body')));
  const band=doc.querySelector('#view-planejamento .sk-band');
  if(band){ band.dispatchEvent(new w.MouseEvent('pointermove',{clientX:100,clientY:80,bubbles:true})); obx.tip=!doc.querySelector('#view-planejamento .sk-wrap .dc-tip').hidden && /do total/.test(flat(doc.querySelector('#view-planejamento .sk-wrap .dc-tip'))); }
  doc.querySelector('#view-planejamento .ob-by[data-by="tipo"]').click(); await wait(15);
  obx.porTipo=flat(doc.querySelectorAll('#view-planejamento .dash-grid.dash-2 > .card')[1]);
  obx.tipoAtivo=(doc.querySelector('#view-planejamento .ob-by.active')||{dataset:{}}).dataset.by;
  doc.querySelector('#view-planejamento .fb-btn[data-fbmode="30d"]').click(); await wait(15);
  obx.periodo30=/Últimos 30 dias/.test(flat(doc.querySelector('#view-planejamento .period-bar')));
  await obTab('limites'); obx.limites=doc.querySelectorAll('#ob-cycle option').length;
  await obTab('dia'); const lbl=()=>flat(doc.querySelector('#view-planejamento .month-label')); const l0=lbl(); doc.getElementById('plan-prev').click(); await wait(15); obx.diaNav=lbl()!==l0 && !!doc.getElementById('plan-today');
  await obTab('visao'); obx.volta=(doc.querySelector('#view-planejamento .ob-tab.active')||{dataset:{}}).dataset.obtab;
  info.ob=obx;
  await pass('escuro');
  doc.getElementById('btn-theme').click(); info.tema=doc.documentElement.getAttribute('data-theme'); await pass('claro');
  doc.getElementById('btn-theme').click();
  process.removeListener('unhandledRejection',onRej); w.close();
  return {errors:[...errors],problems:[...problems],info,clicks,temaTrocou:info.tema==='light',temaVoltou:true};
}
(async()=>{
  const code=await bundle(); let falhas=0;
  const esperado={normal:{ciclo:true},borda:{ciclo:true},vazio:{ciclo:false}};
  for(const v of ['normal','borda','vazio']){
    const r=await runVariant(v,code); const ciclo=esperado[v].ciclo; const modo=ciclo? 'ciclo' : 'mes';
    const coerente=r.info.lanc===modo && r.info.rel===modo && r.info.dash===modo && r.info.lancCicloBtn===ciclo;
    const q=r.info.rel2, unidade=ciclo? 'ciclo' : 'mês';
    const relOk = q.projLinhas===12 && q.compSelects===2 && q.compOpcoes===31 && q.compTrocou===true && q.simLinhas===12 &&
      (ciclo? (/Projeção 12 ciclos/.test(q.abas) && /Comparativo de ciclos/.test(q.abas) && q.projCab==='Ciclo' && /^\d\d\/\d\d a \d\d\/\d\d\/\d\d$/.test(q.projPrimeira) && q.sim==='Ciclo' && /ciclo/.test(q.graf))
            : (/Projeção 12 meses/.test(q.abas) && /Comparativo mensal/.test(q.abas) && q.projCab==='Mês' && /\d{4}$/.test(q.projPrimeira) && q.sim==='Mês' && /mensal/.test(q.graf)));
    if(!relOk) console.log('    Relatórios inesperado:', JSON.stringify(q));
    const o=r.info.orc;
    const orcOk = o.linhas>0 && o.abas && (v==='normal'
      ? (/Estourou/.test(o.linha) && /160%/.test(o.linha) && /Alimentação/.test(o.dashCard) && /de R\$ 50,00/.test(o.dashCard) && /passou do limite de "Alimentação"/.test(o.alerta) && o.viaLink===true && /Dentro/.test(o.depois) && /8%/.test(o.depois) && !/Alimentação/.test(o.alertaDepois) && /Alimentação,Lazer/.test(o.cartaoDepois))
      : o.semCartao===true);
    if(!orcOk) console.log('    Orçamento inesperado:', JSON.stringify(o));
    const f=r.info.fat;
    const fatOk = v==='normal'? (f.campo && f.botao && f.total && f.ajuste && /Criei um lançamento/.test(f.toast) && f.fechada && f.temBotaoBanco && f.menor && f.ajusteSumiu) : true;
    if(!fatOk) console.log('    Total do banco inesperado:', JSON.stringify(f));
    const sm=r.info.sim;
    const simOk = sm.botao && (v==='vazio'? sm.erroSemCartao===true : ((sm.futuro===false || (sm.linha && (v==='normal'? sm.negativo : true) && sm.tooltip)) && sm.nome && sm.limpou && sm.parcelado && sm.editar));
    if(!simOk) console.log('    Simulador inesperado:', JSON.stringify(sm));
    const x=r.info.ob;
    const obOk = x.titulo==='Orçamento' && x.abas==='Visão do período|Fluxo do dinheiro|Limites por categoria|Dia a dia' && x.ativa==='visao' && /Você pode gastar por dia até/.test(x.hero) && x.canvas && x.hoje
      && (x.sk? x.nos>=3 : x.msgVazio) && x.tipoAtivo==='tipo' && x.periodo30 && x.limites===31 && x.diaNav && x.volta==='visao'
      && (v==='vazio' ? true : (x.grupos>=1 && x.tip===true && /Dia a dia|Contas recorrentes/.test(x.porTipo)));
    if(!obOk) console.log('    Orçamento (abas) inesperado:', JSON.stringify(x));
    const ok=r.errors.length===0 && r.problems.length===0 && r.temaTrocou && coerente && relOk && orcOk && fatOk && simOk && obOk;
    console.log(`${ok?'PASSOU ':'FALHOU '} cenário "${v}": ${r.clicks} cliques nos 2 temas · abre em: Lançamentos=${r.info.lanc}, Relatórios=${r.info.rel}, Dashboard=${r.info.dash}`);
    r.errors.slice(0,10).forEach(e=>console.log('    erro:',e)); r.problems.slice(0,10).forEach(e=>console.log('    problema:',e));
    if(!coerente) console.log(`    período padrão inconsistente (esperado "${modo}" em todas as telas)`);
    if(!ok) falhas++;
  }
  console.log(falhas? `\n${falhas} cenário(s) com falha` : '\nTudo certo nos 3 cenários.'); process.exit(falhas?1:0);
})();
