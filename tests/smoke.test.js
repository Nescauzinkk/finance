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
    const ok=r.errors.length===0 && r.problems.length===0 && r.temaTrocou && coerente;
    console.log(`${ok?'PASSOU ':'FALHOU '} cenário "${v}": ${r.clicks} cliques nos 2 temas · abre em: Lançamentos=${r.info.lanc}, Relatórios=${r.info.rel}, Dashboard=${r.info.dash}`);
    r.errors.slice(0,10).forEach(e=>console.log('    erro:',e)); r.problems.slice(0,10).forEach(e=>console.log('    problema:',e));
    if(!coerente) console.log(`    período padrão inconsistente (esperado "${modo}" em todas as telas)`);
    if(!ok) falhas++;
  }
  console.log(falhas? `\n${falhas} cenário(s) com falha` : '\nTudo certo nos 3 cenários.'); process.exit(falhas?1:0);
})();
