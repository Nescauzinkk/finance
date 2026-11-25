/* Total da fatura no banco: cria/atualiza/remove o lançamento de ajuste (juros e tarifas) sem duplicar. */
const {load}=require('./helpers/extract');
const R=[]; const ok=(l,v)=>R.push([l,!!v]);
let n=0;
const ctx=load(['pad','addMonthsToKey','daysInMonth','addDaysToISO','firstInvoiceMonth','invoiceDueDate','cardInvoiceFor','closingDateOf','invoiceMonthFromDue','isInvoiceClosed','openInvoiceMonthFrom','invoiceInfoFor','cardInvoices','cashDate','fmtCurrency','rnd2','adjustKeyOf','applyInvoiceBankTotal'],
  {todayISO:()=>'2026-11-05', todayMonthKey:()=>'2026-11', uid:()=>'adj'+(n++), defaultAccountId:()=>'a1', Date, Math, Number, String, Object, Array, Set, JSON, parseInt},['MONTH_NAMES']);
const row=(id,v,due,o={})=>({id,type:'despesa',source:'installment',description:'Compra '+id,value:v,date:due,month:due.slice(0,7),status:'pendente',cardId:'nb',paymentMethod:'Crédito',accountId:'a1',category:'Outros',...o});
const NB={id:'nb',name:'Nubank',closingDay:4,dueDay:11};
function setup(cards,txs,cats){ ctx.state={settings:{},cards:cards||[{...NB}],transactions:txs||[row('a',1000,'2026-11-11'),row('b',241.22,'2026-11-11')],categories:cats||[{type:'despesa',name:'Cartão'}]}; }
const inv=(due)=>ctx.cardInvoices(ctx.state.cards[0]).find(i=>i.dueDate===due||due===undefined);
const adjRows=()=>ctx.state.transactions.filter(t=>t.adjustKey);
const norm=x=>x.replace(/\u00a0/g,' ');
setup(); const card=()=>ctx.state.cards[0];
ok('ponto de partida: fatura de novembro no Kivo = R$ 1.241,22 em 2 lançamentos', inv('2026-11-11').total===1241.22 && inv('2026-11-11').count===2);
// ----- banco maior: cria o ajuste -----
let r=ctx.applyInvoiceBankTotal(card(),'2026-11-11',1300);
ok('banco R$ 1.300 > Kivo: cria UM lançamento de R$ 58,78 e a fatura passa a bater com o banco', r.status==='added' && r.diff===58.78 && adjRows().length===1 && inv('2026-11-11').total===1300 && inv('2026-11-11').count===3);
const row1=adjRows()[0];
ok('o ajuste cai na fatura certa: despesa pendente no cartão, vencimento 11/11, mês 2026-11, "data da compra" = fechamento (04/11), categoria Cartão, forma Crédito', row1.type==='despesa' && row1.status==='pendente' && row1.cardId==='nb' && row1.date==='2026-11-11' && row1.month==='2026-11' && row1.purchaseDate==='2026-11-04' && row1.category==='Cartão' && row1.paymentMethod==='Crédito' && /Ajuste da fatura Nubank/.test(row1.description) && row1.source==='manual');
ok('mensagem clara com os valores', /Criei um lançamento de R\$ 58,78/.test(norm(r.message)) && /R\$ 1\.300,00/.test(norm(r.message)));
// ----- idempotente -----
r=ctx.applyInvoiceBankTotal(card(),'2026-11-11',1310);
ok('informar de novo (R$ 1.310) ATUALIZA o mesmo ajuste para R$ 68,78, sem duplicar', r.status==='updated' && adjRows().length===1 && adjRows()[0].id===row1.id && adjRows()[0].value===68.78 && inv('2026-11-11').total===1310);
const undoUpd=r.undo; undoUpd(); ok('desfazer a atualização devolve R$ 58,78', adjRows()[0].value===58.78 && inv('2026-11-11').total===1300);
r=ctx.applyInvoiceBankTotal(card(),'2026-11-11',1241.22);
ok('banco = Kivo (R$ 1.241,22): REMOVE o ajuste e diz que já bate', r.status==='equal' && adjRows().length===0 && inv('2026-11-11').total===1241.22 && /já bate/.test(r.message) && /Removi o ajuste/.test(r.message));
r.undo(); ok('desfazer a remoção traz o ajuste de volta', adjRows().length===1 && inv('2026-11-11').total===1300); adjRows().forEach(t=>ctx.state.transactions.splice(ctx.state.transactions.indexOf(t),1));
// ----- banco menor -----
r=ctx.applyInvoiceBankTotal(card(),'2026-11-11',1200);
ok('banco MENOR (R$ 1.200): não inventa valor; avisa para conferir lançamentos a mais ou estornos', r.status==='lower' && r.diff<0 && adjRows().length===0 && inv('2026-11-11').total===1241.22 && /menor/.test(r.message) && /estornos/.test(r.message));
ctx.applyInvoiceBankTotal(card(),'2026-11-11',1300); r=ctx.applyInvoiceBankTotal(card(),'2026-11-11',1200);
ok('banco menor com ajuste antigo: o ajuste some (deixou de fazer sentido) e o aviso menciona isso', r.status==='lower' && adjRows().length===0 && /Removi o ajuste/.test(r.message));
// ----- sem valor -----
const before=JSON.stringify(ctx.state.transactions);
ok('em branco, zero, texto ou NaN: não faz nada', ['',0,'abc',NaN,undefined,null,-5].every(v=>ctx.applyInvoiceBankTotal(card(),'2026-11-11',v).status==='none') && JSON.stringify(ctx.state.transactions)===before);
// ----- bordas -----
setup([{id:'nb',name:'Sem fechamento',dueDay:11}]);
r=ctx.applyInvoiceBankTotal(card(),'2026-11-11',1300);
ok('cartão sem dia de fechamento: o ajuste usa o vencimento como "data da compra" (não quebra)', r.status==='added' && adjRows()[0].purchaseDate==='2026-11-11');
setup(undefined,undefined,[{type:'despesa',name:'Outros'}]);
ok('sem categoria "Cartão" cadastrada: usa "Outros"', (ctx.applyInvoiceBankTotal(card(),'2026-11-11',1300), adjRows()[0].category==='Outros'));
setup([{id:'nb',name:'Nubank',closingDay:4,dueDay:11}],[row('p',100.10,'2026-11-11')]);
ok('centavos sem ruído de ponto flutuante (100,10 → 100,30 = ajuste de R$ 0,20 exato)', (ctx.applyInvoiceBankTotal(card(),'2026-11-11',100.30), adjRows()[0].value===0.2 && inv('2026-11-11').total===100.3));
setup([{id:'c2',name:'Inter',closingDay:25,dueDay:5}],[]);
const ph=ctx.cardInvoices(card()).find(i=>i.status==='aberta');
ok('fatura aberta vazia (sem lançamentos): o ajuste vira o primeiro lançamento dela', ph && ph.dueDate==='2026-12-05' && (ctx.applyInvoiceBankTotal(card(),ph.dueDate,500), ctx.cardInvoices(card()).find(i=>i.dueDate==='2026-12-05').total===500 && adjRows()[0].month==='2026-11' && adjRows()[0].purchaseDate==='2026-11-25'));
setup([{...NB},{id:'c2',name:'Inter',closingDay:25,dueDay:5}],[row('a',100,'2026-11-11'),row('z',50,'2026-11-05',{cardId:'c2'})]);
ctx.applyInvoiceBankTotal(ctx.state.cards[0],'2026-11-11',300); ctx.applyInvoiceBankTotal(ctx.state.cards[1],'2026-11-05',90);
ok('um ajuste por cartão e por fatura (chaves diferentes), cada um na sua fatura', adjRows().length===2 && adjRows().map(t=>t.adjustKey).join()==='inv-adjust|nb|2026-11-11,inv-adjust|c2|2026-11-05' && adjRows()[0].value===200 && adjRows()[1].value===40);
let bad=0; for(const [l,v] of R){ console.log((v?'PASSOU  ':'FALHOU  ')+l); if(!v) bad++; }
console.log('\n'+R.length+' verificações,', bad+' falha(s)'); process.exit(bad?1:0);
