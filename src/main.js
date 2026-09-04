/* ===================== UTIL ===================== */
import { supabase } from './supabaseClient.js';
import Chart from 'chart.js/auto';
const $ = (sel,root=document)=>root.querySelector(sel);
const $$ = (sel,root=document)=>Array.from(root.querySelectorAll(sel));
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function pad(n){return String(n).padStart(2,'0');}
function fmtCurrency(v){
  v = Number(v)||0;
  const neg = v<0; v=Math.abs(v);
  const s = v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  return (neg?'-':'')+'R$ '+s;
}
function fmtDate(iso){
  if(!iso) return '';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function todayISO(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function todayMonthKey(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}`;}
function monthKeyOf(iso){return iso? iso.slice(0,7) : todayMonthKey();}
function addMonthsToKey(key,n){
  let [y,m] = key.split('-').map(Number);
  m += n;
  while(m>12){m-=12;y++;}
  while(m<1){m+=12;y--;}
  return `${y}-${pad(m)}`;
}
function monthDiff(a,b){ // months from a to b
  const [ay,am]=a.split('-').map(Number),[by,bm]=b.split('-').map(Number);
  return (by-ay)*12+(bm-am);
}
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
function monthLabel(key){const [y,m]=key.split('-').map(Number);return `${MONTH_NAMES[m-1]} ${y}`;}
function monthLabelShort(key){const [y,m]=key.split('-').map(Number);return `${MONTH_NAMES[m-1].slice(0,3)}/${String(y).slice(2)}`;}
function escapeHtml(s){return (s==null?'':String(s)).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

/* ===================== ICONS ===================== */
const ICON_PATHS = {
  dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  list:'<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  creditcard:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  layers:'<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
  trendingDown:'<path d="M23 18l-9.5-9.5-5 5L1 6"/><path d="M17 18h6v-6"/>',
  trendingUp:'<path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
  repeat:'<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  barchart:'<path d="M3 20V10"/><path d="M12 20V4"/><path d="M21 20v-7"/><path d="M3 20h18"/>',
  sliders:'<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><circle cx="4" cy="13" r="2"/><circle cx="12" cy="10" r="2"/><circle cx="20" cy="14" r="2"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash:'<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  chevronLeft:'<path d="M15 18l-6-6 6-6"/>',
  chevronRight:'<path d="M9 18l6-6-6-6"/>',
  alertTriangle:'<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  checkCircle:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>',
  wallet:'<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
  sparkles:'<path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="M5.6 5.6l2.8 2.8"/><path d="M15.6 15.6l2.8 2.8"/><path d="M18.4 5.6l-2.8 2.8"/><path d="M8.4 15.6l-2.8 2.8"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 16v-5"/><path d="M12 8h.01"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>'
};
function icon(name,size){
  size = size||18;
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name]||''}</svg>`;
}
function emptyState(iconName,title,subtitle){
  return `<div class="empty-state">${icon(iconName,32)}<strong>${escapeHtml(title)}</strong><span>${escapeHtml(subtitle||'')}</span></div>`;
}
function emptyRow(colspan,iconName,title,subtitle){
  return `<tr class="empty-row"><td colspan="${colspan}">${emptyState(iconName,title,subtitle)}</td></tr>`;
}
/* ===================== CHARTS ===================== */
const CHART_COLORS = {
  green:'#39E27A', red:'#FF4D4D', yellow:'#FFD23F',
  ink:'#F2F3F0', inkSoft:'#8B9089', line:'#2A2C2E', panel:'#151617'
};
const chartInstances = {};
Chart.defaults.color = CHART_COLORS.inkSoft;
Chart.defaults.font.family = "'Manrope', sans-serif";
Chart.defaults.font.size = 12;

function renderChart(canvasId, config){
  const el = document.getElementById(canvasId);
  if(!el) return;
  if(chartInstances[canvasId]){ chartInstances[canvasId].destroy(); delete chartInstances[canvasId]; }
  chartInstances[canvasId] = new Chart(el, config);
}
function balanceEvolutionChart(canvasId, monthsBack, monthsFwd){
  const cur = todayMonthKey();
  const start = addMonthsToKey(cur, -monthsBack);
  const labels = [], saldos = [], acumulados = [];
  let acc = accumulatedBalance(addMonthsToKey(start,-1));
  let m = start;
  const total = monthsBack + monthsFwd + 1;
  for(let i=0;i<total;i++){
    const s = monthSummary(m);
    const saldo = m<=cur? s.saldoRealizado : s.saldoPlanejado;
    acc += saldo;
    labels.push(monthLabelShort(m));
    saldos.push(Math.round(saldo*100)/100);
    acumulados.push(Math.round(acc*100)/100);
    m = addMonthsToKey(m,1);
  }
  const curIndex = monthsBack;
  renderChart(canvasId,{
    type:'line',
    data:{ labels, datasets:[
      { label:'Saldo do mês', data:saldos, borderColor:CHART_COLORS.green, backgroundColor:'rgba(57,226,122,.12)', tension:.3, fill:true, pointRadius:3, pointBackgroundColor:CHART_COLORS.green },
      { label:'Saldo acumulado', data:acumulados, borderColor:CHART_COLORS.yellow, backgroundColor:'transparent', borderDash:[4,3], tension:.3, pointRadius:2, pointBackgroundColor:CHART_COLORS.yellow }
    ]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ usePointStyle:true, boxWidth:8 } },
        tooltip:{ callbacks:{ label:(ctx)=> `${ctx.dataset.label}: ${fmtCurrency(ctx.raw)}` } } },
      scales:{
        x:{ grid:{ color:CHART_COLORS.line }, ticks:{ color: (ctx)=> ctx.index===curIndex? CHART_COLORS.ink : CHART_COLORS.inkSoft } },
        y:{ grid:{ color:CHART_COLORS.line }, ticks:{ callback:(v)=>fmtCurrency(v) } }
      }
    }
  });
}
function categoryBarChart(canvasId, monthKey){
  const { rows } = paretoData(monthKey);
  const top = rows.slice(0,8);
  renderChart(canvasId,{
    type:'bar',
    data:{ labels: top.map(r=>r.cat), datasets:[{
      label:'Despesas', data: top.map(r=>Math.round(r.val*100)/100),
      backgroundColor: top.map(r=> r.essential? 'rgba(255,210,63,.75)' : 'rgba(57,226,122,.75)'),
      borderRadius:5, maxBarThickness:34
    }]},
    options:{
      responsive:true, maintainAspectRatio:false, indexAxis:'y',
      plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:(ctx)=>fmtCurrency(ctx.raw) } } },
      scales:{
        x:{ grid:{ color:CHART_COLORS.line }, ticks:{ callback:(v)=>fmtCurrency(v) } },
        y:{ grid:{ display:false } }
      }
    }
  });
}

function injectNavIcons(){
  $$('.nav-item[data-icon]').forEach(btn=>{
    if(btn.querySelector('svg')) return;
    btn.insertAdjacentHTML('afterbegin', icon(btn.dataset.icon,17));
  });
}

/* ===================== DEFAULT STATE ===================== */
function defaultCategories(){
  const mk=(name,type,essential)=>({id:uid(),name,type,essential:!!essential,status:'ativa'});
  return [
    mk('Moradia','despesa',true), mk('Casa/Família','despesa',true), mk('Transporte','despesa',true),
    mk('Gasolina','despesa',true), mk('Carro','despesa',false), mk('Cartão','despesa',false),
    mk('Assinaturas','despesa',false), mk('Alimentação','despesa',true), mk('Saúde','despesa',true),
    mk('Lazer','despesa',false), mk('Educação','despesa',false), mk('Dívidas','despesa',false),
    mk('Investimentos','despesa',false), mk('Outros','despesa',false),
    mk('Salário','receita',false), mk('Adiantamento','receita',false), mk('Pensão','receita',false),
    mk('Freelance','receita',false), mk('Outras receitas','receita',false)
  ];
}
function defaultState(){
  return {
    version:1,
    settings:{ nome:'', moeda:'BRL', primeiroDiaMes:1, salarioPadrao:0, metaEconomiaMensal:0 },
    categories: defaultCategories(),
    cards: [],
    incomes: [],
    recurring: [],
    installments: [],
    debts: [],
    goals: [],
    transactions: []
  };
}

/* ===================== AUTH ===================== */
let currentUser = null;
let authMode = 'login'; // 'login' | 'signup'

function showAuthScreen(){
  document.getElementById('app-loader').classList.add('hidden');
  document.getElementById('app-root').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
}
function hideAuthScreen(){
  document.getElementById('auth-screen').style.display = 'none';
}
function wireAuthForm(){
  const form = document.getElementById('auth-form');
  const switchBtn = document.getElementById('auth-switch-btn');
  const switchText = document.getElementById('auth-switch-text');
  const title = document.getElementById('auth-title');
  const submitBtn = document.getElementById('auth-submit');
  const errBox = document.getElementById('auth-error');

  switchBtn.onclick = ()=>{
    authMode = authMode==='login'?'signup':'login';
    title.textContent = authMode==='login'?'Entrar':'Criar conta';
    submitBtn.textContent = authMode==='login'?'Entrar':'Criar conta';
    switchText.textContent = authMode==='login'?'Ainda não tem conta?':'Já tem uma conta?';
    switchBtn.textContent = authMode==='login'?'Criar conta':'Entrar';
    errBox.style.display='none';
  };

  form.onsubmit = async (e)=>{
    e.preventDefault();
    errBox.style.display='none';
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Aguarde…';
    try{
      if(authMode==='login'){
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if(error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if(error) throw error;
        errBox.style.display='block';
        errBox.style.background='var(--green-bg)'; errBox.style.color='var(--green)';
        errBox.textContent = 'Conta criada! Se a confirmação por e-mail estiver ativa no seu projeto Supabase, verifique sua caixa de entrada antes de entrar.';
        submitBtn.disabled=false; submitBtn.textContent='Criar conta';
        return;
      }
    }catch(err){
      errBox.style.display='block';
      errBox.style.background='var(--red-bg)'; errBox.style.color='var(--red)';
      errBox.textContent = translateAuthError(err.message);
    }
    submitBtn.disabled = false;
    submitBtn.textContent = authMode==='login'?'Entrar':'Criar conta';
  };
}
function translateAuthError(msg){
  if(/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if(/User already registered/i.test(msg)) return 'Este e-mail já possui uma conta. Tente entrar.';
  if(/Password should be/i.test(msg)) return 'A senha deve ter pelo menos 6 caracteres.';
  return msg;
}

/* ===================== STORAGE (SUPABASE) ===================== */
let state = null;
let saveTimer = null;

async function loadState(){
  const { data, error } = await supabase.from('app_state').select('data').eq('user_id', currentUser.id).maybeSingle();
  if(error){ console.error('Erro ao carregar dados:', error); state = defaultState(); }
  else if(data && data.data){ state = data.data; }
  else { state = defaultState(); }
  if(!state.categories || !state.categories.length) state.categories = defaultCategories();
  ['cards','incomes','recurring','installments','debts','goals','transactions'].forEach(k=>{ if(!state[k]) state[k]=[]; });
  if(!state.settings) state.settings = defaultState().settings;
  rebuildIndex();
}
function rebuildIndex(){
  state._txnIndex = new Set(state.transactions.map(t=>t.genKey).filter(Boolean));
}
function saveState(immediate){
  clearTimeout(saveTimer);
  const doSave = async()=>{
    const clone = {...state};
    delete clone._txnIndex;
    try{
      const { error } = await supabase.from('app_state').upsert({ user_id: currentUser.id, data: clone, updated_at: new Date().toISOString() });
      if(error) console.error('Erro ao salvar', error);
    }catch(e){ console.error('Erro ao salvar',e); }
  };
  if(immediate) return doSave();
  saveTimer = setTimeout(doSave, 250);
}


/* ===================== MATERIALIZATION ===================== */
function ensureTxn(def){
  const occ = def.occMonth || def.month;
  const key = def.source+':'+def.sourceId+':'+occ+(def.installmentIndex!=null?':'+def.installmentIndex:'');
  if(state._txnIndex.has(key)) return false;
  const t = {
    id:uid(), genKey:key, type:def.type, category:def.category, description:def.description,
    value:def.value, date:def.date, month:def.month, paymentMethod:def.paymentMethod||'Outro',
    cardId:def.cardId||null, status: def.status || (def.month < todayMonthKey() ? 'pago':'pendente'),
    note:'', source:def.source, sourceId:def.sourceId, installmentIndex:def.installmentIndex ?? null,
    createdAt:Date.now()
  };
  state.transactions.push(t);
  state._txnIndex.add(key);
  return true;
}
function materializeRecurringAndIncome(){
  const cur = todayMonthKey();
  state.incomes.forEach(inc=>{
    if(inc.status!=='ativa') return;
    if(inc.frequency==='unica'){
      ensureTxn({type:'receita',source:'income',sourceId:inc.id,month:addMonthsToKey(monthKeyOf(inc.startDate),inc.monthOffset||0),occMonth:monthKeyOf(inc.startDate),category:inc.category||inc.name,description:inc.name,value:inc.value,date:inc.startDate});
      return;
    }
    let m = monthKeyOf(inc.startDate);
    while(m<=cur && (!inc.endDate || m<=monthKeyOf(inc.endDate))){
      ensureTxn({type:'receita',source:'income',sourceId:inc.id,occMonth:m,month:addMonthsToKey(m,inc.monthOffset||0),category:inc.category||inc.name,description:inc.name,value:inc.value,date:m+'-'+pad(inc.day||1)});
      m = addMonthsToKey(m,1);
    }
  });
  state.recurring.forEach(r=>{
    if(r.status!=='ativa') return;
    let m = monthKeyOf(r.startDate);
    while(m<=cur){
      ensureTxn({type:'despesa',source:'recurring',sourceId:r.id,occMonth:m,month:addMonthsToKey(m,r.monthOffset||0),category:r.category,description:r.name,value:r.value,paymentMethod:r.paymentMethod,date:m+'-'+pad(r.day||1)});
      m = addMonthsToKey(m,1);
    }
  });
}
function materializeInstallmentsDebts(){
  state.installments.forEach(inst=>{
    for(let i=0;i<inst.count;i++){
      const m = addMonthsToKey(inst.startMonth,i);
      ensureTxn({type:'despesa',source:'installment',sourceId:inst.id,month:m,installmentIndex:i,category:inst.category,description:`${inst.name} (${i+1}/${inst.count})`,value:inst.installmentValue,cardId:inst.cardId||null,paymentMethod: inst.cardId?'Crédito':'Outro',date:m+'-05'});
    }
  });
  state.debts.forEach(d=>{
    for(let i=0;i<d.count;i++){
      const m = addMonthsToKey(d.startMonth,i);
      ensureTxn({type:'despesa',source:'debt',sourceId:d.id,month:m,installmentIndex:i,category:'Dívidas',description:`${d.name} (${i+1}/${d.count})`,value:d.installmentValue,paymentMethod:'Outro',date:m+'-'+pad(d.dueDay||10)});
    }
  });
}
function materializeAll(){ rebuildIndex(); materializeRecurringAndIncome(); materializeInstallmentsDebts(); saveState(); }

function virtualEntriesForMonth(monthKey){
  const out=[];
  state.incomes.forEach(inc=>{
    if(inc.status!=='ativa'||inc.frequency!=='mensal') return;
    const offset = inc.monthOffset||0;
    const m = addMonthsToKey(monthKey,-offset);
    if(m<=todayMonthKey()) return; // já foi materializado como lançamento real
    if(m<monthKeyOf(inc.startDate)) return;
    if(inc.endDate && m>monthKeyOf(inc.endDate)) return;
    out.push({id:'v-'+inc.id+monthKey,type:'receita',category:inc.category||inc.name,description:inc.name,value:inc.value,month:monthKey,status:'pendente',source:'income',sourceId:inc.id,virtual:true});
  });
  state.recurring.forEach(r=>{
    if(r.status!=='ativa') return;
    const offset = r.monthOffset||0;
    const m = addMonthsToKey(monthKey,-offset);
    if(m<=todayMonthKey()) return;
    if(m<monthKeyOf(r.startDate)) return;
    out.push({id:'v-'+r.id+monthKey,type:'despesa',category:r.category,description:r.name,value:r.value,month:monthKey,status:'pendente',source:'recurring',sourceId:r.id,virtual:true});
  });
  return out;
}
function getMonthTransactions(monthKey){
  let txns = state.transactions.filter(t=>t.month===monthKey);
  if(monthKey > todayMonthKey()) txns = txns.concat(virtualEntriesForMonth(monthKey));
  return txns;
}

/* ===================== CALCULATIONS ===================== */
function monthSummary(monthKey){
  const txns = getMonthTransactions(monthKey);
  let plannedReceitas=0, realizedReceitas=0, plannedDespesas=0, realizedDespesas=0;
  const byCategory={};
  txns.forEach(t=>{
    const v = Number(t.value)||0;
    if(t.type==='receita'){ plannedReceitas+=v; if(t.status==='pago') realizedReceitas+=v; }
    else { plannedDespesas+=v; if(t.status==='pago') realizedDespesas+=v;
      byCategory[t.category]=(byCategory[t.category]||0)+v;
    }
  });
  return { txns, plannedReceitas, realizedReceitas, plannedDespesas, realizedDespesas,
    saldoPlanejado: plannedReceitas-plannedDespesas, saldoRealizado: realizedReceitas-realizedDespesas,
    byCategory };
}
function firstDataMonth(){
  const months = state.transactions.map(t=>t.month);
  if(!months.length) return todayMonthKey();
  return months.sort()[0];
}
function accumulatedBalance(uptoMonthKey){
  let m = firstDataMonth();
  let total=0;
  while(m<=uptoMonthKey){
    const s = monthSummary(m);
    total += (m<todayMonthKey()? s.saldoRealizado : (m===todayMonthKey()? s.saldoRealizado : s.saldoPlanejado));
    m = addMonthsToKey(m,1);
  }
  return total;
}
function breakeven(monthKey){
  const s = monthSummary(monthKey);
  const margem = s.plannedReceitas - s.plannedDespesas;
  const pct = s.plannedReceitas>0 ? (s.plannedDespesas/s.plannedReceitas*100) : (s.plannedDespesas>0?999:0);
  let status='verde';
  if(margem<0 || pct>95) status='vermelho'; else if(pct>75) status='amarelo';
  return { receitaPrevista:s.plannedReceitas, despesaPrevista:s.plannedDespesas, margem, pct, status };
}
function canSpendNow(monthKey){
  const s = monthSummary(monthKey);
  const goalsReserve = state.goals.filter(g=>!goalDone(g)).reduce((a,g)=>a+(Number(g.monthlyPlanned)||0),0);
  return s.plannedReceitas - s.plannedDespesas - goalsReserve;
}
function goalDone(g){ return Number(g.currentValue)>=Number(g.targetValue); }
function categoryEssential(name){ const c=state.categories.find(c=>c.name===name); return c? c.essential : false; }

function paretoData(monthKey){
  const s = monthSummary(monthKey);
  const rows = Object.entries(s.byCategory).map(([cat,val])=>({cat,val})).sort((a,b)=>b.val-a.val);
  const total = rows.reduce((a,r)=>a+r.val,0);
  let cum=0;
  rows.forEach(r=>{ r.pct = total? r.val/total*100:0; cum+=r.pct; r.cumPct=cum; r.essential=categoryEssential(r.cat); });
  return {rows,total};
}
function projection(startMonth,n){
  const out=[];
  let acc = accumulatedBalance(addMonthsToKey(startMonth,-1));
  let m = startMonth;
  for(let i=0;i<n;i++){
    const s = monthSummary(m);
    const saldo = m<=todayMonthKey()? s.saldoRealizado : s.saldoPlanejado;
    acc += saldo;
    out.push({month:m,label:monthLabel(m),receitas:s.plannedReceitas,despesas:s.plannedDespesas,saldo,saldoAcumulado:acc});
    m = addMonthsToKey(m,1);
  }
  return out;
}
function endingCommitmentsInRange(startMonth,n){
  const notes=[];
  const endMonth = addMonthsToKey(startMonth,n-1);
  const check=(list,label)=>{
    list.forEach(item=>{
      const lastMonth = addMonthsToKey(item.startMonth,item.count-1);
      if(lastMonth>=startMonth && lastMonth<=endMonth){
        notes.push(`${label} "${item.name}" termina em ${monthLabel(lastMonth)} — seu orçamento seguinte terá aproximadamente ${fmtCurrency(item.installmentValue)} a menos de despesas fixas.`);
      }
    });
  };
  check(state.installments,'O parcelamento de');
  check(state.debts,'A dívida de');
  return notes;
}
function computeAlerts(){
  const cur = todayMonthKey();
  const alerts=[];
  const be = breakeven(cur);
  if(be.status==='vermelho') alerts.push({sev:'rust',msg:`Seu mês está projetado para fechar negativo em ${fmtCurrency(Math.abs(be.margem))}.`});
  else if(be.status==='amarelo') alerts.push({sev:'gold',msg:`Seu comprometimento de renda está alto (${be.pct.toFixed(0)}% da receita prevista).`});
  endingCommitmentsInRange(cur,2).forEach(n=>alerts.push({sev:'gold',msg:n}));
  state.goals.forEach(g=>{
    if(goalDone(g)) return;
    if(g.deadline){
      const monthsLeft = Math.max(monthDiff(cur,monthKeyOf(g.deadline)),0);
      const remaining = Number(g.targetValue)-Number(g.currentValue);
      if(monthsLeft>0 && remaining/monthsLeft > (Number(g.monthlyPlanned)||0)*1.15){
        alerts.push({sev:'gold',msg:`Você precisa guardar aproximadamente ${fmtCurrency(remaining/monthsLeft)}/mês para atingir a meta "${g.name}" no prazo.`});
      }
    }
  });
  state.cards.forEach(c=>{
    const used = cardUsed(c.id);
    if(c.limit>0 && used/c.limit>0.85) alerts.push({sev:'rust',msg:`O cartão "${c.name}" está com ${(used/c.limit*100).toFixed(0)}% do limite comprometido.`});
  });
  const subsTotal = state.recurring.filter(r=>r.isSubscription && r.status==='ativa').reduce((a,r)=>a+Number(r.value),0);
  if(subsTotal>0) alerts.push({sev:'grey',msg:`Você gasta ${fmtCurrency(subsTotal)}/mês (${fmtCurrency(subsTotal*12)}/ano) em assinaturas.`});
  if(!alerts.length) alerts.push({sev:'green',msg:'Nenhum alerta no momento — seus números estão sob controle.'});
  return alerts;
}
function cardUsed(cardId){
  const cur = todayMonthKey();
  let used=0;
  state.installments.forEach(inst=>{
    if(inst.cardId!==cardId) return;
    const lastMonth = addMonthsToKey(inst.startMonth,inst.count-1);
    for(let i=0;i<inst.count;i++){
      const m = addMonthsToKey(inst.startMonth,i);
      if(m>=cur) used += Number(inst.installmentValue);
    }
    void lastMonth;
  });
  return used;
}
function installmentsPaidCount(sourceType,id){
  return state.transactions.filter(t=>t.source===sourceType && t.sourceId===id && t.status==='pago').length;
}

/* ===================== MODAL SYSTEM ===================== */
const modalRoot = ()=>document.getElementById('modal-root');
function closeModal(){ modalRoot().innerHTML=''; }
function confirmModal(title,message,onConfirm,confirmLabel){
  modalRoot().innerHTML = `
  <div class="modal-backdrop" data-close="1">
    <div class="modal confirm">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      <div class="modal-actions">
        <button class="btn" id="m-cancel">Cancelar</button>
        <button class="btn danger" id="m-ok">${escapeHtml(confirmLabel||'Excluir')}</button>
      </div>
    </div>
  </div>`;
  $('#m-cancel').onclick = closeModal;
  $('#m-ok').onclick = ()=>{ onConfirm(); closeModal(); };
  $('.modal-backdrop').onclick=(e)=>{ if(e.target.dataset.close) closeModal(); };
}
function choiceModal(title,message,choices){
  // choices: [{label, action}]
  modalRoot().innerHTML = `
  <div class="modal-backdrop" data-close="1">
    <div class="modal confirm">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      <div class="modal-actions" style="flex-wrap:wrap">
        <button class="btn" id="m-cancel">Cancelar</button>
        ${choices.map((c,i)=>`<button class="btn primary" data-i="${i}">${escapeHtml(c.label)}</button>`).join('')}
      </div>
    </div>
  </div>`;
  $('#m-cancel').onclick = closeModal;
  $$('.modal-actions [data-i]').forEach(btn=>btn.onclick=()=>{ choices[+btn.dataset.i].action(); closeModal(); });
  $('.modal-backdrop').onclick=(e)=>{ if(e.target.dataset.close) closeModal(); };
}

function fieldHtml(f,val){
  const v = val==null?'':val;
  if(f.type==='select'){
    return `<div class="field"><label>${f.label}</label><select name="${f.name}" ${f.required?'required':''}>
      ${f.options.map(o=>`<option value="${escapeHtml(o.value)}" ${String(o.value)===String(v)?'selected':''}>${escapeHtml(o.label)}</option>`).join('')}
    </select></div>`;
  }
  if(f.type==='checkbox'){
    return `<div class="checkline"><input type="checkbox" name="${f.name}" id="cb-${f.name}" ${v?'checked':''}><label for="cb-${f.name}" style="margin:0">${f.label}</label></div>`;
  }
  if(f.type==='textarea'){
    return `<div class="field"><label>${f.label}</label><textarea name="${f.name}" rows="2">${escapeHtml(v)}</textarea></div>`;
  }
  return `<div class="field"><label>${f.label}</label><input type="${f.type}" name="${f.name}" value="${escapeHtml(v)}" ${f.required?'required':''} ${f.step?`step="${f.step}"`:''} ${f.min!=null?`min="${f.min}"`:''}></div>`;
}
function openFormModal({title,fields,initial={},onSubmit,submitLabel,onDelete}){
  const rows = fields.map(f=>{
    if(f.row){ return `<div class="field-row">${f.row.map(ff=>fieldHtml(ff,initial[ff.name])).join('')}</div>`; }
    return fieldHtml(f,initial[f.name]);
  }).join('');
  modalRoot().innerHTML = `
  <div class="modal-backdrop" data-close="1">
    <div class="modal">
      <h3>${escapeHtml(title)}</h3>
      <form id="modal-form">${rows}
        <div class="modal-actions">
          ${onDelete?'<button type="button" class="btn danger" id="m-del" style="margin-right:auto">Excluir</button>':''}
          <button type="button" class="btn" id="m-cancel">Cancelar</button>
          <button type="submit" class="btn primary">${escapeHtml(submitLabel||'Salvar')}</button>
        </div>
      </form>
    </div>
  </div>`;
  $('#m-cancel').onclick = closeModal;
  $('.modal-backdrop').onclick=(e)=>{ if(e.target.dataset.close) closeModal(); };
  if(onDelete){ $('#m-del').onclick = ()=>{ onDelete(); }; }
  $('#modal-form').onsubmit = (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const flat = [];
    fields.forEach(f=>{ if(f.row) flat.push(...f.row); else flat.push(f); });
    const values = {};
    flat.forEach(f=>{
      if(f.type==='checkbox') values[f.name] = e.target.querySelector(`[name="${f.name}"]`).checked;
      else if(f.type==='number') values[f.name] = parseFloat(fd.get(f.name))||0;
      else values[f.name] = fd.get(f.name);
    });
    onSubmit(values);
    closeModal();
  };
}

/* ===================== NAV / ROUTER ===================== */
const RENDERERS = {};
let currentView = 'dashboard';
let planMonth = todayMonthKey();
let reportMonth = todayMonthKey();

function switchView(view){
  currentView = view;
  $$('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.view===view));
  $$('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');
  renderView(view);
}
function renderView(view){ if(RENDERERS[view]) RENDERERS[view](); }
function renderAll(){ renderView(currentView); }

function categoryOptions(type){
  return state.categories.filter(c=>c.status==='ativa' && (c.type===type)).map(c=>({value:c.name,label:c.name}));
}
function cardOptions(){ return [{value:'',label:'Nenhum'}].concat(state.cards.map(c=>({value:c.id,label:c.name}))); }

/* ===================== DASHBOARD ===================== */
RENDERERS.dashboard = function(){
  const cur = todayMonthKey();
  const s = monthSummary(cur);
  const be = breakeven(cur);
  const acc = accumulatedBalance(cur);
  const guardado = state.goals.reduce((a,g)=>a+Number(g.currentValue||0),0);
  const totalDividas = state.debts.reduce((a,d)=>{
    const paid = installmentsPaidCount('debt',d.id);
    return a + Math.max(0,(d.count-paid))*Number(d.installmentValue);
  },0);
  const totalParcelasFuturas = state.installments.reduce((a,inst)=>{
    const paid = installmentsPaidCount('installment',inst.id);
    return a + Math.max(0,(inst.count-paid))*Number(inst.installmentValue);
  },0);
  const comprometido = totalDividas+totalParcelasFuturas;
  const pctComprometido = s.plannedReceitas>0? (comprometido/s.plannedReceitas*100):0;
  const canSpend = canSpendNow(cur);
  const beColor = be.status==='verde'?'green':be.status==='amarelo'?'gold':'rust';
  const beText = be.status==='verde'?'Positivo — margem confortável':be.status==='amarelo'?'Atenção — margem baixa':'Déficit projetado';

  $('#view-dashboard').innerHTML = `
    <div class="view-head">
      <div><h1>Dashboard</h1><div class="view-sub">${monthLabel(cur)} · visão geral das suas finanças</div></div>
    </div>

    <div class="status-banner" style="--c:var(--${beColor==='green'?'green':beColor==='gold'?'yellow':'red'});background:var(--${beColor==='green'?'green-bg':beColor==='gold'?'yellow-bg':'red-bg'});color:var(--${beColor==='green'?'green':beColor==='gold'?'yellow':'red'})">
      <div class="icon-badge ${beColor==='green'?'green':beColor==='gold'?'yellow':'red'}" style="margin-bottom:0">${icon(beColor==='green'?'checkCircle':'alertTriangle',18)}</div>
      <div style="flex:1">
        <h3 style="color:var(--ink)">Seu mês está: ${beText}</h3>
        <p>Você já comprometeu ${be.pct.toFixed(0)}% da receita prevista deste mês. Saldo projetado: <strong class="num" style="color:var(--ink)">${fmtCurrency(be.margem)}</strong>.</p>
      </div>
    </div>

    <div class="grid grid-4">
      <div class="card clickable" data-goto="lancamentos"><div class="icon-badge ${s.saldoRealizado>=0?'green':'red'}">${icon('wallet',17)}</div><div class="stat-label">Saldo do mês</div><div class="stat-value ${s.saldoRealizado>=0?'pos':'neg'} num">${fmtCurrency(s.saldoRealizado)}</div><div class="stat-foot">Planejado: <span class="num">${fmtCurrency(s.saldoPlanejado)}</span></div></div>
      <div class="card clickable" data-goto="receitas"><div class="icon-badge green">${icon('trendingUp',17)}</div><div class="stat-label">Receitas do mês</div><div class="stat-value pos num">${fmtCurrency(s.realizedReceitas)}</div><div class="stat-foot">Previstas: <span class="num">${fmtCurrency(s.plannedReceitas)}</span></div></div>
      <div class="card clickable" data-goto="lancamentos"><div class="icon-badge red">${icon('trendingDown',17)}</div><div class="stat-label">Despesas do mês</div><div class="stat-value neg num">${fmtCurrency(s.realizedDespesas)}</div><div class="stat-foot">Previstas: <span class="num">${fmtCurrency(s.plannedDespesas)}</span></div></div>
      <div class="card clickable" data-goto="metas"><div class="icon-badge yellow">${icon('target',17)}</div><div class="stat-label">Guardado (total)</div><div class="stat-value num">${fmtCurrency(guardado)}</div><div class="stat-foot">Em ${state.goals.length} meta(s)</div></div>
    </div>
    <div class="grid grid-4" style="margin-top:14px">
      <div class="card clickable" data-goto="dividas"><div class="icon-badge red">${icon('trendingDown',17)}</div><div class="stat-label">Total em dívidas</div><div class="stat-value neg num">${fmtCurrency(totalDividas)}</div><div class="stat-foot">Saldo restante</div></div>
      <div class="card clickable" data-goto="parcelamentos"><div class="icon-badge red">${icon('layers',17)}</div><div class="stat-label">Parcelas futuras</div><div class="stat-value neg num">${fmtCurrency(totalParcelasFuturas)}</div><div class="stat-foot">Restante a pagar</div></div>
      <div class="card"><div class="icon-badge grey">${icon('sliders',17)}</div><div class="stat-label">Comprometido (próx. meses)</div><div class="stat-value num">${fmtCurrency(comprometido)}</div><div class="stat-foot">${pctComprometido.toFixed(0)}% da receita atual</div></div>
      <div class="card"><div class="icon-badge ${acc>=0?'green':'red'}">${icon('barchart',17)}</div><div class="stat-label">Saldo acumulado</div><div class="stat-value ${acc>=0?'pos':'neg'} num">${fmtCurrency(acc)}</div><div class="stat-foot">Desde ${monthLabel(firstDataMonth())}</div></div>
    </div>

    <div class="section-title"><h2>Evolução do saldo</h2></div>
    <div class="card"><div class="chart-box"><canvas id="chart-dashboard-balance"></canvas></div></div>

    <div class="section-title"><h2>Quanto posso gastar?</h2></div>
    <div class="card">
      <div class="icon-badge green">${icon('sparkles',17)}</div>
      <div class="stat-value pos num" style="font-size:32px">${fmtCurrency(Math.max(canSpend,0))}</div>
      <div class="stat-foot">Considerando despesas restantes, parcelas, dívidas e reservas planejadas para ${monthLabel(cur)}.</div>
    </div>

    <div class="section-title"><h2>Alertas financeiros</h2></div>
    <div>${computeAlerts().map(a=>`<div class="alert-item ${a.sev==='rust'?'rust':''}" style="${a.sev==='green'?'background:var(--green-bg);color:var(--green)':a.sev==='grey'?'background:var(--panel-2);color:var(--ink-soft)':''}">${icon(a.sev==='green'?'checkCircle':a.sev==='grey'?'info':'alertTriangle',16)}<span>${escapeHtml(a.msg)}</span></div>`).join('')}</div>
  `;
  $$('#view-dashboard [data-goto]').forEach(c=>c.onclick=()=>switchView(c.dataset.goto));
  balanceEvolutionChart('chart-dashboard-balance',5,6);
};

/* ===================== LANÇAMENTOS ===================== */
let lancFilter = {mes:'todos',tipo:'todos',categoria:'todos',status:'todos'};
RENDERERS.lancamentos = function(){
  const monthsSet = Array.from(new Set(state.transactions.map(t=>t.month))).sort().reverse();
  let list = state.transactions.slice().sort((a,b)=> b.date.localeCompare(a.date));
  if(lancFilter.mes!=='todos') list = list.filter(t=>t.month===lancFilter.mes);
  if(lancFilter.tipo!=='todos') list = list.filter(t=>t.type===lancFilter.tipo);
  if(lancFilter.categoria!=='todos') list = list.filter(t=>t.category===lancFilter.categoria);
  if(lancFilter.status!=='todos') list = list.filter(t=>t.status===lancFilter.status);

  $('#view-lancamentos').innerHTML = `
    <div class="view-head"><div><h1>Lançamentos</h1><div class="view-sub">Todas as receitas e despesas cadastradas</div></div>
      <button class="btn primary" id="btn-new-lanc">${icon('plus',15)} Novo lançamento</button></div>
    <div class="toolbar">
      <select id="f-mes"><option value="todos">Todos os meses</option>${monthsSet.map(m=>`<option value="${m}" ${lancFilter.mes===m?'selected':''}>${monthLabel(m)}</option>`).join('')}</select>
      <select id="f-tipo"><option value="todos">Todos os tipos</option><option value="receita" ${lancFilter.tipo==='receita'?'selected':''}>Receita</option><option value="despesa" ${lancFilter.tipo==='despesa'?'selected':''}>Despesa</option></select>
      <select id="f-cat"><option value="todos">Todas as categorias</option>${state.categories.map(c=>`<option value="${c.name}" ${lancFilter.categoria===c.name?'selected':''}>${c.name}</option>`).join('')}</select>
      <select id="f-status"><option value="todos">Todos os status</option><option value="pago" ${lancFilter.status==='pago'?'selected':''}>Pago</option><option value="pendente" ${lancFilter.status==='pendente'?'selected':''}>Pendente</option></select>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th class="right">Valor</th><th>Pagamento</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.length? list.map(rowLanc).join('') : emptyRow(8,'wallet','Nenhum lançamento encontrado','Cadastre receitas e despesas ou use os módulos de recorrentes e parcelamentos.')}</tbody>
    </table></div>
  `;
  function rowLanc(t){
    const shifted = t.date && t.month!==monthKeyOf(t.date);
    return `<tr>
      <td>${fmtDate(t.date)}${shifted?`<div class="help-text" style="margin:2px 0 0">competência: ${monthLabelShort(t.month)}</div>`:''}</td>
      <td>${escapeHtml(t.description)}${t.source!=='manual'?`<span class="badge grey" style="margin-left:6px">${sourceLabel(t.source)}</span>`:''}</td>
      <td>${escapeHtml(t.category||'—')}</td>
      <td>${t.type==='receita'?'<span class="badge green">Receita</span>':'<span class="badge rust">Despesa</span>'}</td>
      <td class="right num">${fmtCurrency(t.value)}</td>
      <td>${escapeHtml(t.paymentMethod||'—')}</td>
      <td>${t.status==='pago'?'<span class="badge green">Pago</span>':'<span class="badge gold">Pendente</span>'}</td>
      <td><button class="icon-btn" data-edit="${t.id}" title="Editar">${icon('edit',15)}</button><button class="icon-btn" data-dup="${t.id}" title="Duplicar">${icon('copy',15)}</button><button class="icon-btn" data-del="${t.id}" title="Excluir">${icon('trash',15)}</button></td>
    </tr>`;
  }
  $('#f-mes').onchange=e=>{lancFilter.mes=e.target.value;RENDERERS.lancamentos();};
  $('#f-tipo').onchange=e=>{lancFilter.tipo=e.target.value;RENDERERS.lancamentos();};
  $('#f-cat').onchange=e=>{lancFilter.categoria=e.target.value;RENDERERS.lancamentos();};
  $('#f-status').onchange=e=>{lancFilter.status=e.target.value;RENDERERS.lancamentos();};
  $('#btn-new-lanc').onclick=()=>openLancModal();
  $$('[data-edit]').forEach(b=>b.onclick=()=>openLancModal(state.transactions.find(t=>t.id===b.dataset.edit)));
  $$('[data-dup]').forEach(b=>b.onclick=()=>{
    const orig = state.transactions.find(t=>t.id===b.dataset.dup);
    const copy = {...orig,id:uid(),source:'manual',sourceId:null,genKey:null,createdAt:Date.now()};
    state.transactions.push(copy); saveState(); RENDERERS.lancamentos();
  });
  $$('[data-del]').forEach(b=>b.onclick=()=>{
    confirmModal('Excluir lançamento?','Essa ação não pode ser desfeita.',()=>{
      state.transactions = state.transactions.filter(t=>t.id!==b.dataset.del); saveState(); RENDERERS.lancamentos(); renderAll();
    });
  });
};
function sourceLabel(s){ return {recurring:'Recorrente',installment:'Parcela',debt:'Dívida',income:'Receita fixa'}[s]||''; }
function openLancModal(t){
  const isEdit = !!t;
  openFormModal({
    title: isEdit?'Editar lançamento':'Novo lançamento',
    initial: t || {date:todayISO(),month:todayMonthKey(),type:'despesa',status:'pendente',paymentMethod:'PIX'},
    fields:[
      {row:[{name:'type',label:'Tipo',type:'select',options:[{value:'despesa',label:'Despesa'},{value:'receita',label:'Receita'}]},
             {name:'status',label:'Status',type:'select',options:[{value:'pendente',label:'Pendente'},{value:'pago',label:'Pago'}]}]},
      {name:'description',label:'Descrição',type:'text',required:true},
      {row:[{name:'category',label:'Categoria',type:'select',options:state.categories.map(c=>({value:c.name,label:c.name}))},
             {name:'value',label:'Valor (R$)',type:'number',step:'0.01',required:true}]},
      {row:[{name:'date',label:'Data',type:'date',required:true},
             {name:'paymentMethod',label:'Forma de pagamento',type:'select',options:['Dinheiro','PIX','Débito','Crédito','Transferência','Outro'].map(v=>({value:v,label:v}))}]},
      {name:'month',label:'Mês de referência (competência)',type:'month',required:true},
      {name:'note',label:'Observação',type:'textarea'}
    ],
    onSubmit(v){
      if(isEdit){ Object.assign(t,v); }
      else { state.transactions.push({id:uid(),source:'manual',sourceId:null,createdAt:Date.now(),...v}); }
      saveState(); renderAll();
    },
    onDelete: isEdit? ()=>{ confirmModal('Excluir lançamento?','Essa ação não pode ser desfeita.',()=>{ state.transactions=state.transactions.filter(x=>x.id!==t.id); saveState(); closeModal(); renderAll(); }); } : null
  });
  if(!isEdit){
    const dateInput = document.querySelector('#modal-form [name="date"]');
    const monthInput = document.querySelector('#modal-form [name="month"]');
    if(dateInput && monthInput) dateInput.addEventListener('change', ()=>{ monthInput.value = dateInput.value.slice(0,7); });
  }
}

/* ===================== PLANEJAMENTO ===================== */
RENDERERS.planejamento = function(){
  const s = monthSummary(planMonth);
  const acc = accumulatedBalance(planMonth);
  const catRows = Object.entries(s.byCategory).sort((a,b)=>b[1]-a[1]);
  const receitaTxns = s.txns.filter(t=>t.type==='receita');
  const guardadoMes = state.goals.reduce((a,g)=>a+ (g.contributions||[]).filter(c=>c.month===planMonth).reduce((x,c)=>x+Number(c.value),0),0);

  $('#view-planejamento').innerHTML = `
    <div class="view-head">
      <div><h1>Planejamento mensal</h1><div class="view-sub">Navegue entre meses para planejar receitas e despesas</div></div>
      <div class="month-nav">
        <button class="btn" id="plan-prev">${icon('chevronLeft',16)}</button>
        <div class="month-label">${monthLabel(planMonth)}</div>
        <button class="btn" id="plan-next">${icon('chevronRight',16)}</button>
      </div>
    </div>
    <div class="grid grid-4">
      <div class="card"><div class="stat-label">Total de receitas</div><div class="stat-value pos num">${fmtCurrency(s.plannedReceitas)}</div></div>
      <div class="card"><div class="stat-label">Total de despesas</div><div class="stat-value neg num">${fmtCurrency(s.plannedDespesas)}</div></div>
      <div class="card"><div class="stat-label">Saldo do mês</div><div class="stat-value ${s.saldoPlanejado>=0?'pos':'neg'} num">${fmtCurrency(s.saldoPlanejado)}</div></div>
      <div class="card"><div class="stat-label">Saldo acumulado</div><div class="stat-value ${acc>=0?'pos':'neg'} num">${fmtCurrency(acc)}</div></div>
    </div>

    <div class="section-title"><h2>Receitas do mês</h2></div>
    <div class="table-wrap"><table><thead><tr><th>Descrição</th><th>Categoria</th><th class="right">Valor</th><th>Status</th></tr></thead>
    <tbody>${receitaTxns.length? receitaTxns.map(t=>`<tr><td>${escapeHtml(t.description)}</td><td>${escapeHtml(t.category||'—')}</td><td class="right num">${fmtCurrency(t.value)}</td><td>${t.status==='pago'?'<span class="badge green">Pago</span>':'<span class="badge gold">Pendente</span>'}</td></tr>`).join(''):'<tr class="empty-row"><td colspan="4">Sem receitas previstas neste mês.</td></tr>'}</tbody></table></div>

    <div class="section-title"><h2>Despesas por categoria</h2></div>
    <div class="table-wrap"><table><thead><tr><th>Categoria</th><th class="right">Total</th><th class="right">% do mês</th></tr></thead>
    <tbody>${catRows.length? catRows.map(([cat,val])=>`<tr><td>${escapeHtml(cat)}</td><td class="right num">${fmtCurrency(val)}</td><td class="right num">${(s.plannedDespesas? val/s.plannedDespesas*100:0).toFixed(1)}%</td></tr>`).join(''):'<tr class="empty-row"><td colspan="3">Sem despesas neste mês.</td></tr>'}</tbody></table></div>

    <div class="section-title"><h2>Guardado neste mês</h2></div>
    <div class="card"><div class="stat-value num">${fmtCurrency(guardadoMes)}</div><div class="stat-foot">Total aportado em metas em ${monthLabel(planMonth)}</div></div>
  `;
  $('#plan-prev').onclick=()=>{planMonth=addMonthsToKey(planMonth,-1);RENDERERS.planejamento();};
  $('#plan-next').onclick=()=>{planMonth=addMonthsToKey(planMonth,1);RENDERERS.planejamento();};
};

/* ===================== CARTÃO ===================== */
RENDERERS.cartao = function(){
  $('#view-cartao').innerHTML = `
    <div class="view-head"><div><h1>Cartão de crédito</h1><div class="view-sub">Gerencie seus cartões e compras parceladas</div></div>
      <button class="btn primary" id="btn-new-card">${icon('plus',15)} Novo cartão</button></div>
    <div class="grid grid-3">${state.cards.length? state.cards.map(cardCard).join(''):`<div class="card">${emptyState('creditcard','Nenhum cartão cadastrado','Adicione um cartão para acompanhar limite e compras parceladas.')}</div>`}</div>
    <div class="section-title"><h2>Nova compra no cartão</h2></div>
    <div class="card"><button class="btn primary" id="btn-new-purchase" ${!state.cards.length?'disabled':''}>${icon('plus',15)} Registrar compra</button>
      ${!state.cards.length?'<div class="help-text">Cadastre um cartão antes de registrar uma compra.</div>':''}</div>
  `;
  function cardCard(c){
    const used = cardUsed(c.id);
    const pct = c.limit>0? Math.min(used/c.limit*100,100):0;
    return `<div class="card">
      <div class="stat-label">${escapeHtml(c.name)}</div>
      <div class="stat-value num">${fmtCurrency(c.limit-used)}</div>
      <div class="stat-foot">disponível de ${fmtCurrency(c.limit)}</div>
      <div class="progress" style="margin-top:10px"><div style="width:${pct}%;background:${pct>85?'var(--red)':'var(--green)'}"></div></div>
      <div class="stat-foot">Fecha dia ${c.closingDay} · vence dia ${c.dueDay}</div>
      <div style="margin-top:10px"><button class="icon-btn" data-edit-card="${c.id}">${icon('edit',14)} Editar</button> <button class="icon-btn" data-del-card="${c.id}">${icon('trash',14)} Excluir</button></div>
    </div>`;
  }
  $('#btn-new-card').onclick=()=>openCardModal();
  $('#btn-new-purchase').onclick=()=>openPurchaseModal();
  $$('[data-edit-card]').forEach(b=>b.onclick=()=>openCardModal(state.cards.find(c=>c.id===b.dataset.editCard)));
  $$('[data-del-card]').forEach(b=>b.onclick=()=>confirmModal('Excluir cartão?','Compras parceladas vinculadas continuarão registradas.',()=>{
    state.cards = state.cards.filter(c=>c.id!==b.dataset.delCard); saveState(); RENDERERS.cartao();
  }));
};
function openCardModal(c){
  openFormModal({
    title: c?'Editar cartão':'Novo cartão', initial: c||{},
    fields:[{name:'name',label:'Nome do cartão',type:'text',required:true},
      {row:[{name:'limit',label:'Limite (R$)',type:'number',step:'0.01'},{name:'closingDay',label:'Dia de fechamento',type:'number'}]},
      {name:'dueDay',label:'Dia de vencimento',type:'number'}],
    onSubmit(v){ if(c) Object.assign(c,v); else state.cards.push({id:uid(),...v}); saveState(); RENDERERS.cartao(); },
    onDelete: c? ()=>{confirmModal('Excluir cartão?','Tem certeza?',()=>{state.cards=state.cards.filter(x=>x.id!==c.id);saveState();closeModal();RENDERERS.cartao();});}:null
  });
}
function openPurchaseModal(){
  openFormModal({
    title:'Nova compra no cartão',
    initial:{startMonth:todayMonthKey(),count:1,cardId:state.cards[0]?.id||''},
    fields:[
      {name:'name',label:'Descrição da compra',type:'text',required:true},
      {row:[{name:'category',label:'Categoria',type:'select',options:categoryOptions('despesa')},
             {name:'cardId',label:'Cartão',type:'select',options:state.cards.map(c=>({value:c.id,label:c.name}))}]},
      {row:[{name:'totalValue',label:'Valor total (R$)',type:'number',step:'0.01',required:true},
             {name:'count',label:'Nº de parcelas',type:'number',required:true}]},
      {name:'startMonth',label:'Mês da 1ª parcela',type:'month',required:true}
    ],
    onSubmit(v){
      const count = Math.max(1,parseInt(v.count));
      state.installments.push({id:uid(),name:v.name,category:v.category,totalValue:v.totalValue,installmentValue:Math.round(v.totalValue/count*100)/100,count,startMonth:v.startMonth,cardId:v.cardId,status:'ativo',note:''});
      materializeAll(); renderAll();
    }
  });
}

/* ===================== PARCELAMENTOS ===================== */
RENDERERS.parcelamentos = function(){
  $('#view-parcelamentos').innerHTML = `
    <div class="view-head"><div><h1>Parcelamentos</h1><div class="view-sub">Compras e compromissos parcelados</div></div>
      <button class="btn primary" id="btn-new-inst">${icon('plus',15)} Novo parcelamento</button></div>
    <div class="grid grid-3">${state.installments.length? state.installments.map(instCard).join(''):`<div class="card">${emptyState('layers','Nenhum parcelamento cadastrado','Registre compras parceladas para acompanhar o progresso aqui.')}</div>`}</div>
  `;
  function instCard(inst){
    const paid = installmentsPaidCount('installment',inst.id);
    const cur = Math.min(paid+ (inst.startMonth<=todayMonthKey()?1:0), inst.count);
    const pct = Math.min(paid/inst.count*100,100);
    const done = paid>=inst.count;
    return `<div class="card">
      <div class="stat-label">${escapeHtml(inst.name)} ${done?'<span class="badge green">Concluído</span>':''}</div>
      <div class="stat-value num">${fmtCurrency(inst.installmentValue)}<span style="font-size:14px;color:var(--ink-soft)"> /mês</span></div>
      <div class="stat-foot">${paid}/${inst.count} parcelas pagas · total ${fmtCurrency(inst.totalValue)}</div>
      <div class="progress" style="margin-top:8px"><div style="width:${pct}%"></div></div>
      <div class="stat-foot">Início: ${monthLabel(inst.startMonth)} · Fim: ${monthLabel(addMonthsToKey(inst.startMonth,inst.count-1))}</div>
      <div style="margin-top:10px"><button class="icon-btn" data-edit-inst="${inst.id}">${icon('edit',14)} Editar</button> <button class="icon-btn" data-del-inst="${inst.id}">${icon('trash',14)} Excluir</button></div>
    </div>`;
  }
  $('#btn-new-inst').onclick=()=>openInstallmentModal();
  $$('[data-edit-inst]').forEach(b=>b.onclick=()=>openInstallmentModal(state.installments.find(i=>i.id===b.dataset.editInst)));
  $$('[data-del-inst]').forEach(b=>b.onclick=()=>confirmModal('Excluir parcelamento?','As parcelas já lançadas em Lançamentos também serão removidas.',()=>{
    const id=b.dataset.delInst;
    state.installments = state.installments.filter(i=>i.id!==id);
    state.transactions = state.transactions.filter(t=>!(t.source==='installment'&&t.sourceId===id));
    saveState(); renderAll();
  }));
};
function openInstallmentModal(inst){
  const isEdit=!!inst;
  openFormModal({
    title: isEdit?'Editar parcelamento':'Novo parcelamento',
    initial: inst || {startMonth:todayMonthKey(),count:1},
    fields:[
      {name:'name',label:'Nome',type:'text',required:true},
      {row:[{name:'category',label:'Categoria',type:'select',options:categoryOptions('despesa')},
             {name:'cardId',label:'Cartão (opcional)',type:'select',options:cardOptions()}]},
      {row:[{name:'totalValue',label:'Valor total (R$)',type:'number',step:'0.01',required:true},
             {name:'count',label:'Nº de parcelas',type:'number',required:true}]},
      {name:'startMonth',label:'Mês da 1ª parcela',type:'month',required:true},
      {name:'note',label:'Observação',type:'textarea'}
    ],
    onSubmit(v){
      const count = Math.max(1,parseInt(v.count));
      const installmentValue = Math.round(v.totalValue/count*100)/100;
      if(isEdit){
        if(inst.count!==count || inst.startMonth!==v.startMonth || inst.totalValue!==v.totalValue){
          choiceModal('Alterar parcelamento','Parcelas já pagas não serão alteradas. O que deseja fazer com as parcelas futuras?',[
            {label:'Aplicar às futuras', action(){
              state.transactions = state.transactions.filter(t=>!(t.source==='installment'&&t.sourceId===inst.id&&t.status!=='pago'));
              Object.assign(inst,v,{count,installmentValue});
              materializeAll(); renderAll();
            }}
          ]);
          return;
        }
        Object.assign(inst,v,{count,installmentValue}); saveState(); renderAll();
      } else {
        state.installments.push({id:uid(),...v,count,installmentValue,status:'ativo'});
        materializeAll(); renderAll();
      }
    },
    onDelete: isEdit? ()=>{confirmModal('Excluir parcelamento?','As parcelas lançadas também serão removidas.',()=>{
      state.installments=state.installments.filter(x=>x.id!==inst.id);
      state.transactions=state.transactions.filter(t=>!(t.source==='installment'&&t.sourceId===inst.id));
      saveState();closeModal();renderAll();
    });}:null
  });
}

/* ===================== DÍVIDAS ===================== */
RENDERERS.dividas = function(){
  const totalOriginal = state.debts.reduce((a,d)=>a+Number(d.originalValue),0);
  const totalPago = state.debts.reduce((a,d)=>a+installmentsPaidCount('debt',d.id)*Number(d.installmentValue),0);
  $('#view-dividas').innerHTML = `
    <div class="view-head"><div><h1>Dívidas e empréstimos</h1><div class="view-sub">Acompanhe saldo devedor e previsão de término</div></div>
      <button class="btn primary" id="btn-new-debt">${icon('plus',15)} Nova dívida</button></div>
    <div class="grid grid-3">
      <div class="card"><div class="stat-label">Total original</div><div class="stat-value num">${fmtCurrency(totalOriginal)}</div></div>
      <div class="card"><div class="stat-label">Total pago</div><div class="stat-value pos num">${fmtCurrency(totalPago)}</div></div>
      <div class="card"><div class="stat-label">Total restante</div><div class="stat-value neg num">${fmtCurrency(totalOriginal-totalPago)}</div></div>
    </div>
    <div class="section-title"><h2>Suas dívidas</h2></div>
    <div class="grid grid-3">${state.debts.length? state.debts.map(debtCard).join(''):`<div class="card">${emptyState('trendingDown','Nenhuma dívida cadastrada','Cadastre empréstimos e dívidas para acompanhar o saldo devedor.')}</div>`}</div>
  `;
  function debtCard(d){
    const paid = installmentsPaidCount('debt',d.id);
    const pct = Math.min(paid/d.count*100,100);
    return `<div class="card">
      <div class="stat-label">${escapeHtml(d.name)}</div>
      <div class="stat-value neg num">${fmtCurrency(Math.max(0,(d.count-paid))*Number(d.installmentValue))}</div>
      <div class="stat-foot">saldo restante · parcela ${fmtCurrency(d.installmentValue)}</div>
      <div class="progress" style="margin-top:8px"><div style="width:${pct}%"></div></div>
      <div class="stat-foot">${paid}/${d.count} parcelas · previsão de término: ${monthLabel(addMonthsToKey(d.startMonth,d.count-1))}</div>
      <div style="margin-top:10px"><button class="icon-btn" data-edit-debt="${d.id}">${icon('edit',14)} Editar</button> <button class="icon-btn" data-del-debt="${d.id}">${icon('trash',14)} Excluir</button></div>
    </div>`;
  }
  $('#btn-new-debt').onclick=()=>openDebtModal();
  $$('[data-edit-debt]').forEach(b=>b.onclick=()=>openDebtModal(state.debts.find(d=>d.id===b.dataset.editDebt)));
  $$('[data-del-debt]').forEach(b=>b.onclick=()=>confirmModal('Excluir dívida?','As parcelas lançadas também serão removidas.',()=>{
    const id=b.dataset.delDebt;
    state.debts = state.debts.filter(d=>d.id!==id);
    state.transactions = state.transactions.filter(t=>!(t.source==='debt'&&t.sourceId===id));
    saveState(); renderAll();
  }));
};
function openDebtModal(d){
  const isEdit=!!d;
  openFormModal({
    title:isEdit?'Editar dívida':'Nova dívida',
    initial: d||{startMonth:todayMonthKey(),count:1,dueDay:10},
    fields:[
      {name:'name',label:'Nome',type:'text',required:true},
      {name:'description',label:'Descrição',type:'text'},
      {row:[{name:'originalValue',label:'Valor original (R$)',type:'number',step:'0.01',required:true},
             {name:'installmentValue',label:'Valor da parcela (R$)',type:'number',step:'0.01',required:true}]},
      {row:[{name:'count',label:'Nº de parcelas',type:'number',required:true},
             {name:'interest',label:'Juros (% a.m., opcional)',type:'number',step:'0.01'}]},
      {row:[{name:'startMonth',label:'Mês da 1ª parcela',type:'month',required:true},
             {name:'dueDay',label:'Dia de vencimento',type:'number'}]},
      {name:'note',label:'Observação',type:'textarea'}
    ],
    onSubmit(v){
      v.count = Math.max(1,parseInt(v.count));
      if(isEdit){ Object.assign(d,v);
        state.transactions = state.transactions.filter(t=>!(t.source==='debt'&&t.sourceId===d.id&&t.status!=='pago'));
        materializeAll(); renderAll();
      } else { state.debts.push({id:uid(),...v}); materializeAll(); renderAll(); }
    },
    onDelete: isEdit? ()=>{confirmModal('Excluir dívida?','Tem certeza?',()=>{
      state.debts=state.debts.filter(x=>x.id!==d.id);
      state.transactions=state.transactions.filter(t=>!(t.source==='debt'&&t.sourceId===d.id));
      saveState();closeModal();renderAll();
    });}:null
  });
}

/* ===================== RECEITAS ===================== */
RENDERERS.receitas = function(){
  $('#view-receitas').innerHTML = `
    <div class="view-head"><div><h1>Receitas</h1><div class="view-sub">Salário, pensão, freelances e outras entradas</div></div>
      <button class="btn primary" id="btn-new-income">${icon('plus',15)} Nova receita</button></div>
    <div class="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th class="right">Valor</th><th>Recorrência</th><th>Status</th><th></th></tr></thead>
    <tbody>${state.incomes.length? state.incomes.map(rowIncome).join(''):emptyRow(6,'trendingUp','Nenhuma receita cadastrada','Cadastre salário, pensão, freelances e outras entradas.')}</tbody></table></div>
  `;
  function rowIncome(inc){
    return `<tr><td>${escapeHtml(inc.name)}</td><td>${escapeHtml(inc.type)}</td><td class="right num">${fmtCurrency(inc.value)}</td>
      <td>${inc.frequency==='mensal'?'Mensal, dia '+inc.day:'Única em '+fmtDate(inc.startDate)}</td>
      <td>${inc.status==='ativa'?'<span class="badge green">Ativa</span>':'<span class="badge grey">Inativa</span>'}</td>
      <td><button class="icon-btn" data-edit-inc="${inc.id}">${icon('edit',15)}</button><button class="icon-btn" data-del-inc="${inc.id}">${icon('trash',15)}</button></td></tr>`;
  }
  $('#btn-new-income').onclick=()=>openIncomeModal();
  $$('[data-edit-inc]').forEach(b=>b.onclick=()=>openIncomeModal(state.incomes.find(i=>i.id===b.dataset.editInc)));
  $$('[data-del-inc]').forEach(b=>b.onclick=()=>confirmModal('Excluir receita?','Os lançamentos já gerados continuarão no histórico.',()=>{
    state.incomes=state.incomes.filter(i=>i.id!==b.dataset.delInc); saveState(); RENDERERS.receitas();
  }));
};
function openIncomeModal(inc){
  const isEdit=!!inc;
  openFormModal({
    title:isEdit?'Editar receita':'Nova receita',
    initial: inc||{type:'fixa',frequency:'mensal',day:5,startDate:todayISO(),status:'ativa',category:'Salário',monthOffset:0},
    fields:[
      {name:'name',label:'Nome',type:'text',required:true},
      {row:[{name:'type',label:'Tipo',type:'select',options:[{value:'fixa',label:'Fixa'},{value:'variavel',label:'Variável'},{value:'temporaria',label:'Temporária'}]},
             {name:'category',label:'Categoria',type:'select',options:categoryOptions('receita')}]},
      {row:[{name:'value',label:'Valor (R$)',type:'number',step:'0.01',required:true},
             {name:'frequency',label:'Recorrência',type:'select',options:[{value:'mensal',label:'Mensal'},{value:'unica',label:'Única'}]}]},
      {row:[{name:'startDate',label:'Data de recebimento',type:'date',required:true},{name:'day',label:'Dia do mês',type:'number'}]},
      {name:'monthOffset',label:'Contar como receita de',type:'select',options:[
        {value:0,label:'Mesmo mês do recebimento'},
        {value:1,label:'Mês seguinte (ex: adiantamento p/ fatura do mês que vem)'},
        {value:2,label:'Dois meses depois'}
      ]},
      {name:'endDate',label:'Data final (opcional)',type:'date'},
      {name:'status',label:'Status',type:'select',options:[{value:'ativa',label:'Ativa'},{value:'inativa',label:'Inativa'}]}
    ],
    onSubmit(v){
      v.monthOffset = parseInt(v.monthOffset)||0;
      if(isEdit){
        Object.assign(inc,v);
        state.transactions = state.transactions.filter(t=>!(t.source==='income'&&t.sourceId===inc.id&&t.status!=='pago'));
      } else {
        state.incomes.push({id:uid(),...v});
      }
      materializeAll(); renderAll();
    },
    onDelete: isEdit? ()=>{confirmModal('Excluir receita?','Tem certeza?',()=>{
      state.incomes=state.incomes.filter(x=>x.id!==inc.id);
      state.transactions=state.transactions.filter(t=>!(t.source==='income'&&t.sourceId===inc.id));
      saveState();closeModal();renderAll();
    });}:null
  });
}

/* ===================== RECORRENTES ===================== */
RENDERERS.recorrentes = function(){
  const subsAtivas = state.recurring.filter(r=>r.isSubscription&&r.status==='ativa');
  const subsTotal = subsAtivas.reduce((a,r)=>a+Number(r.value),0);
  $('#view-recorrentes').innerHTML = `
    <div class="view-head"><div><h1>Despesas recorrentes</h1><div class="view-sub">Gasolina, assinaturas, ajuda em casa e outras despesas fixas</div></div>
      <button class="btn primary" id="btn-new-rec">${icon('plus',15)} Nova recorrente</button></div>
    ${subsAtivas.length?`<div class="card" style="margin-bottom:18px"><div class="stat-label">Assinaturas ativas</div><div class="stat-value num">${fmtCurrency(subsTotal)}/mês</div><div class="stat-foot">${fmtCurrency(subsTotal*12)}/ano em ${subsAtivas.length} assinatura(s)</div></div>`:''}
    <div class="table-wrap"><table><thead><tr><th>Nome</th><th>Categoria</th><th class="right">Valor</th><th>Dia</th><th>Assinatura</th><th>Status</th><th></th></tr></thead>
    <tbody>${state.recurring.length? state.recurring.map(rowRec).join(''):emptyRow(7,'repeat','Nenhuma despesa recorrente','Cadastre gasolina, assinaturas e outras despesas fixas.')}</tbody></table></div>
  `;
  function rowRec(r){
    return `<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.category||'—')}</td><td class="right num">${fmtCurrency(r.value)}</td><td>${r.day||'—'}</td>
      <td>${r.isSubscription?'<span class="badge gold">Sim</span>':'—'}</td>
      <td>${r.status==='ativa'?'<span class="badge green">Ativa</span>':'<span class="badge grey">Inativa</span>'}</td>
      <td><button class="icon-btn" data-edit-rec="${r.id}">${icon('edit',15)}</button><button class="icon-btn" data-del-rec="${r.id}">${icon('trash',15)}</button></td></tr>`;
  }
  $('#btn-new-rec').onclick=()=>openRecModal();
  $$('[data-edit-rec]').forEach(b=>b.onclick=()=>openRecModal(state.recurring.find(r=>r.id===b.dataset.editRec)));
  $$('[data-del-rec]').forEach(b=>b.onclick=()=>confirmModal('Excluir recorrente?','Os lançamentos já gerados continuarão no histórico.',()=>{
    state.recurring=state.recurring.filter(r=>r.id!==b.dataset.delRec); saveState(); RENDERERS.recorrentes();
  }));
};
function openRecModal(r){
  const isEdit=!!r;
  openFormModal({
    title:isEdit?'Editar recorrente':'Nova despesa recorrente',
    initial: r||{frequency:'mensal',day:5,startDate:todayISO(),status:'ativa',paymentMethod:'PIX',isSubscription:false,monthOffset:0},
    fields:[
      {name:'name',label:'Nome',type:'text',required:true},
      {row:[{name:'category',label:'Categoria',type:'select',options:categoryOptions('despesa')},
             {name:'value',label:'Valor (R$)',type:'number',step:'0.01',required:true}]},
      {row:[{name:'day',label:'Dia do mês',type:'number'},{name:'startDate',label:'Início',type:'date',required:true}]},
      {name:'monthOffset',label:'Contar como despesa de',type:'select',options:[
        {value:0,label:'Mesmo mês da cobrança'},
        {value:1,label:'Mês seguinte'},
        {value:2,label:'Dois meses depois'}
      ]},
      {name:'paymentMethod',label:'Forma de pagamento',type:'select',options:['Dinheiro','PIX','Débito','Crédito','Transferência','Outro'].map(v=>({value:v,label:v}))},
      {name:'isSubscription',label:'É uma assinatura',type:'checkbox'},
      {name:'status',label:'Status',type:'select',options:[{value:'ativa',label:'Ativa'},{value:'inativa',label:'Inativa'}]}
    ],
    onSubmit(v){
      v.monthOffset = parseInt(v.monthOffset)||0;
      if(isEdit){
        Object.assign(r,v);
        state.transactions = state.transactions.filter(t=>!(t.source==='recurring'&&t.sourceId===r.id&&t.status!=='pago'));
        materializeAll(); renderAll();
      } else { state.recurring.push({id:uid(),...v}); materializeAll(); renderAll(); }
    },
    onDelete: isEdit? ()=>{confirmModal('Excluir recorrente?','Tem certeza?',()=>{state.recurring=state.recurring.filter(x=>x.id!==r.id);saveState();closeModal();renderAll();});}:null
  });
}

/* ===================== METAS ===================== */
RENDERERS.metas = function(){
  $('#view-metas').innerHTML = `
    <div class="view-head"><div><h1>Metas e reserva</h1><div class="view-sub">Reserva de emergência, viagens, compras e investimentos</div></div>
      <button class="btn primary" id="btn-new-goal">${icon('plus',15)} Nova meta</button></div>
    <div class="grid grid-3">${state.goals.length? state.goals.map(goalCard).join(''):`<div class="card">${emptyState('target','Nenhuma meta cadastrada','Crie metas de reserva, viagem ou investimento e acompanhe o progresso.')}</div>`}</div>
  `;
  function goalCard(g){
    const pct = g.targetValue>0? Math.min(Number(g.currentValue)/Number(g.targetValue)*100,100):0;
    return `<div class="card">
      <div class="stat-label">${escapeHtml(g.name)} ${goalDone(g)?'<span class="badge green">Concluída</span>':''}</div>
      <div class="stat-value num">${fmtCurrency(g.currentValue)} <span style="font-size:14px;color:var(--ink-soft)">/ ${fmtCurrency(g.targetValue)}</span></div>
      <div class="progress" style="margin-top:8px"><div style="width:${pct}%"></div></div>
      <div class="stat-foot">${g.deadline? 'Prazo: '+monthLabel(monthKeyOf(g.deadline)) : 'Sem prazo definido'} · aporte planejado ${fmtCurrency(g.monthlyPlanned||0)}/mês</div>
      <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn small" data-contribute="${g.id}">${icon('plus',13)} Registrar aporte</button>
        <button class="icon-btn" data-edit-goal="${g.id}">${icon('edit',15)}</button><button class="icon-btn" data-del-goal="${g.id}">${icon('trash',15)}</button>
      </div>
    </div>`;
  }
  $('#btn-new-goal').onclick=()=>openGoalModal();
  $$('[data-edit-goal]').forEach(b=>b.onclick=()=>openGoalModal(state.goals.find(g=>g.id===b.dataset.editGoal)));
  $$('[data-del-goal]').forEach(b=>b.onclick=()=>confirmModal('Excluir meta?','Tem certeza?',()=>{state.goals=state.goals.filter(g=>g.id!==b.dataset.delGoal);saveState();RENDERERS.metas();}));
  $$('[data-contribute]').forEach(b=>b.onclick=()=>{
    const g = state.goals.find(x=>x.id===b.dataset.contribute);
    openFormModal({title:'Registrar aporte em "'+g.name+'"',initial:{value:g.monthlyPlanned||0},fields:[{name:'value',label:'Valor guardado (R$)',type:'number',step:'0.01',required:true}],
      onSubmit(v){
        g.currentValue = Number(g.currentValue||0)+Number(v.value);
        g.contributions = g.contributions||[]; g.contributions.push({month:todayMonthKey(),value:v.value});
        saveState(); renderAll();
      }});
  });
};
function openGoalModal(g){
  const isEdit=!!g;
  openFormModal({
    title:isEdit?'Editar meta':'Nova meta',
    initial: g||{currentValue:0},
    fields:[
      {name:'name',label:'Nome da meta',type:'text',required:true},
      {row:[{name:'targetValue',label:'Valor objetivo (R$)',type:'number',step:'0.01',required:true},
             {name:'currentValue',label:'Valor atual (R$)',type:'number',step:'0.01'}]},
      {row:[{name:'deadline',label:'Prazo (opcional)',type:'date'},{name:'monthlyPlanned',label:'Aporte mensal planejado (R$)',type:'number',step:'0.01'}]}
    ],
    onSubmit(v){ if(isEdit) Object.assign(g,v); else state.goals.push({id:uid(),contributions:[],...v}); saveState(); renderAll(); },
    onDelete: isEdit? ()=>{confirmModal('Excluir meta?','Tem certeza?',()=>{state.goals=state.goals.filter(x=>x.id!==g.id);saveState();closeModal();renderAll();});}:null
  });
}

/* ===================== RELATÓRIOS ===================== */
let reportSubtab = 'resumo';
RENDERERS.relatorios = function(){
  $('#view-relatorios').innerHTML = `
    <div class="view-head"><div><h1>Relatórios</h1><div class="view-sub">Pareto 80/20, ponto de equilíbrio e projeção de 12 meses</div></div>
      <div class="month-nav"><button class="btn" id="rep-prev">${icon('chevronLeft',16)}</button><div class="month-label">${monthLabel(reportMonth)}</div><button class="btn" id="rep-next">${icon('chevronRight',16)}</button></div>
    </div>
    <div class="subtabs">
      <button class="subtab" data-sub="resumo">Resumo</button>
      <button class="subtab" data-sub="graficos">Gráficos</button>
      <button class="subtab" data-sub="pareto">Pareto 80/20</button>
      <button class="subtab" data-sub="equilibrio">Ponto de equilíbrio</button>
      <button class="subtab" data-sub="projecao">Projeção 12 meses</button>
      <button class="subtab" data-sub="simulador">Simulador</button>
    </div>
    <div id="report-body"></div>
  `;
  $$('.subtab').forEach(b=>{ b.classList.toggle('active',b.dataset.sub===reportSubtab); b.onclick=()=>{reportSubtab=b.dataset.sub; RENDERERS.relatorios();}; });
  $('#rep-prev').onclick=()=>{reportMonth=addMonthsToKey(reportMonth,-1);RENDERERS.relatorios();};
  $('#rep-next').onclick=()=>{reportMonth=addMonthsToKey(reportMonth,1);RENDERERS.relatorios();};
  const body = $('#report-body');
  if(reportSubtab==='resumo') body.innerHTML = renderResumo();
  else if(reportSubtab==='graficos') { body.innerHTML = renderGraficos(); wireGraficos(); }
  else if(reportSubtab==='pareto') body.innerHTML = renderPareto();
  else if(reportSubtab==='equilibrio') body.innerHTML = renderEquilibrio();
  else if(reportSubtab==='projecao') body.innerHTML = renderProjecao();
  else if(reportSubtab==='simulador') { body.innerHTML = renderSimulador(); wireSimulador(); }
};
function renderGraficos(){
  return `
    <div class="section-title" style="margin-top:0"><h2>Despesas por categoria — ${monthLabel(reportMonth)}</h2></div>
    <div class="card"><div class="chart-box"><canvas id="chart-report-category"></canvas></div></div>
    <div class="help-text" style="margin-top:8px">Barras amarelas = categorias essenciais · barras verdes = demais categorias.</div>

    <div class="section-title"><h2>Saldo mensal e acumulado (12 meses)</h2></div>
    <div class="card"><div class="chart-box"><canvas id="chart-report-balance"></canvas></div></div>
  `;
}
function wireGraficos(){
  categoryBarChart('chart-report-category', reportMonth);
  balanceEvolutionChart('chart-report-balance', 6, 6);
}
function renderResumo(){
  const s = monthSummary(reportMonth);
  const maiorCat = Object.entries(s.byCategory).sort((a,b)=>b[1]-a[1])[0];
  return `<div class="grid grid-4">
    <div class="card"><div class="stat-label">Receitas</div><div class="stat-value pos num">${fmtCurrency(s.plannedReceitas)}</div></div>
    <div class="card"><div class="stat-label">Despesas</div><div class="stat-value neg num">${fmtCurrency(s.plannedDespesas)}</div></div>
    <div class="card"><div class="stat-label">Saldo</div><div class="stat-value ${s.saldoPlanejado>=0?'pos':'neg'} num">${fmtCurrency(s.saldoPlanejado)}</div></div>
    <div class="card"><div class="stat-label">Maior categoria</div><div class="stat-value num" style="font-size:18px">${maiorCat?escapeHtml(maiorCat[0]):'—'}</div><div class="stat-foot">${maiorCat?fmtCurrency(maiorCat[1]):''}</div></div>
  </div>`;
}
function renderPareto(){
  const {rows,total} = paretoData(reportMonth);
  if(!rows.length) return '<div class="card">Sem despesas registradas neste mês para análise.</div>';
  return `<div class="card">
    <p style="font-size:13.5px;color:var(--ink-soft);margin-top:0">Categorias ordenadas da maior para a menor. As destacadas em dourado concentram cerca de 80% dos seus gastos — não significa que sejam dispensáveis.</p>
    ${rows.map(r=>`<div class="pareto-bar-row">
      <div>${escapeHtml(r.cat)}${r.essential?'<span class="tag-essential">essencial</span>':''}</div>
      <div class="pareto-track"><div class="pareto-fill ${r.cumPct<=80?'over':''}" style="width:${r.pct}%"></div></div>
      <div class="right num">${fmtCurrency(r.val)}</div>
      <div class="right num">${r.pct.toFixed(1)}%</div>
    </div>`).join('')}
    <div class="stat-foot" style="margin-top:10px">Total de despesas: <span class="num">${fmtCurrency(total)}</span></div>
  </div>`;
}
function renderEquilibrio(){
  const be = breakeven(reportMonth);
  const color = be.status==='verde'?'green':be.status==='amarelo'?'gold':'rust';
  return `<div class="grid grid-2">
    <div class="card"><div class="stat-label">Receita prevista</div><div class="stat-value pos num">${fmtCurrency(be.receitaPrevista)}</div></div>
    <div class="card"><div class="stat-label">Despesas previstas</div><div class="stat-value neg num">${fmtCurrency(be.despesaPrevista)}</div></div>
    <div class="card"><div class="stat-label">Margem disponível</div><div class="stat-value ${be.margem>=0?'pos':'neg'} num">${fmtCurrency(be.margem)}</div></div>
    <div class="card"><div class="stat-label">Percentual comprometido</div><div class="stat-value num">${be.pct.toFixed(1)}%</div><div class="stat-foot"><span class="badge ${color}">${be.status.toUpperCase()}</span></div></div>
  </div>`;
}
function renderProjecao(){
  const proj = projection(todayMonthKey(),12);
  const notes = endingCommitmentsInRange(todayMonthKey(),12);
  return `<div class="table-wrap"><table><thead><tr><th>Mês</th><th class="right">Receitas</th><th class="right">Despesas</th><th class="right">Saldo</th><th class="right">Acumulado</th></tr></thead>
    <tbody>${proj.map(p=>`<tr><td>${p.label}</td><td class="right num">${fmtCurrency(p.receitas)}</td><td class="right num">${fmtCurrency(p.despesas)}</td><td class="right num">${fmtCurrency(p.saldo)}</td><td class="right num">${fmtCurrency(p.saldoAcumulado)}</td></tr>`).join('')}</tbody></table></div>
    ${notes.length? `<div class="section-title"><h2>Mudanças previstas</h2></div>${notes.map(n=>`<div class="alert-item" style="background:var(--green-bg);color:var(--green)"><span class="dot"></span><span>${escapeHtml(n)}</span></div>`).join('')}` : ''}`;
}
function renderSimulador(){
  return `<div class="card" style="max-width:520px">
    <p style="font-size:13.5px;color:var(--ink-soft);margin-top:0">Teste cenários sem alterar seus dados reais.</p>
    <div class="field-row"><div class="field"><label>Variação de receita (R$)</label><input type="number" step="0.01" id="sim-receita" value="0"></div>
    <div class="field"><label>Variação de despesa (R$)</label><input type="number" step="0.01" id="sim-despesa" value="0"></div></div>
    <button class="btn primary" id="sim-run">Simular</button>
    <div id="sim-result" style="margin-top:16px"></div>
  </div>`;
}
function wireSimulador(){
  $('#sim-run').onclick=()=>{
    const dR = parseFloat($('#sim-receita').value)||0;
    const dD = parseFloat($('#sim-despesa').value)||0;
    const proj = projection(todayMonthKey(),12).map(p=>({...p,receitas:p.receitas+dR,despesas:p.despesas+dD,saldo:(p.receitas+dR)-(p.despesas+dD)}));
    let acc = accumulatedBalance(addMonthsToKey(todayMonthKey(),-1));
    proj.forEach(p=>{acc+=p.saldo;p.saldoAcumulado=acc;});
    $('#sim-result').innerHTML = `<div class="table-wrap"><table><thead><tr><th>Mês</th><th class="right">Saldo simulado</th><th class="right">Acumulado</th></tr></thead>
      <tbody>${proj.map(p=>`<tr><td>${p.label}</td><td class="right num">${fmtCurrency(p.saldo)}</td><td class="right num">${fmtCurrency(p.saldoAcumulado)}</td></tr>`).join('')}</tbody></table></div>
      <div class="help-text">Simulação descartável — nada foi salvo nos seus dados reais.</div>`;
  };
}

/* ===================== CONFIGURAÇÕES ===================== */
RENDERERS.configuracoes = function(){
  const st = state.settings;
  $('#view-configuracoes').innerHTML = `
    <div class="view-head"><div><h1>Configurações</h1><div class="view-sub">Preferências gerais e categorias</div></div></div>
    <div class="grid grid-2">
      <div class="card">
        <h3 style="margin-bottom:14px">Preferências</h3>
        <form id="settings-form">
          <div class="field"><label>Seu nome</label><input name="nome" value="${escapeHtml(st.nome||'')}"></div>
          <div class="field-row">
            <div class="field"><label>Salário padrão (R$)</label><input type="number" step="0.01" name="salarioPadrao" value="${st.salarioPadrao||0}"></div>
            <div class="field"><label>Meta de economia mensal (R$)</label><input type="number" step="0.01" name="metaEconomiaMensal" value="${st.metaEconomiaMensal||0}"></div>
          </div>
          <div class="field"><label>Primeiro dia do mês</label><input type="number" min="1" max="28" name="primeiroDiaMes" value="${st.primeiroDiaMes||1}"></div>
          <button class="btn primary" type="submit">Salvar preferências</button>
        </form>
      </div>
      <div class="card">
        <h3 style="margin-bottom:14px">Categorias</h3>
        <div style="max-height:340px;overflow-y:auto">
          <table><thead><tr><th>Nome</th><th>Tipo</th><th>Essencial</th><th></th></tr></thead>
          <tbody>${state.categories.map(c=>`<tr><td>${escapeHtml(c.name)}</td><td>${c.type}</td><td>${c.essential?'Sim':'—'}</td>
            <td><button class="icon-btn" data-edit-cat="${c.id}">${icon('edit',15)}</button><button class="icon-btn" data-del-cat="${c.id}">${icon('trash',15)}</button></td></tr>`).join('')}</tbody></table>
        </div>
        <button class="btn" style="margin-top:12px" id="btn-new-cat">${icon('plus',14)} Nova categoria</button>
      </div>
    </div>
    <div class="section-title"><h2>Backup dos dados</h2></div>
    <div class="card">
      <p style="font-size:13.5px;color:var(--ink-soft);margin-top:0">Exporte seus dados a qualquer momento como backup em JSON.</p>
      <button class="btn" id="btn-export">Exportar dados (JSON)</button>
    </div>
  `;
  $('#settings-form').onsubmit=(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    state.settings.nome = fd.get('nome');
    state.settings.salarioPadrao = parseFloat(fd.get('salarioPadrao'))||0;
    state.settings.metaEconomiaMensal = parseFloat(fd.get('metaEconomiaMensal'))||0;
    state.settings.primeiroDiaMes = parseInt(fd.get('primeiroDiaMes'))||1;
    saveState(true);
    renderAll();
  };
  $('#btn-new-cat').onclick=()=>openCategoryModal();
  $$('[data-edit-cat]').forEach(b=>b.onclick=()=>openCategoryModal(state.categories.find(c=>c.id===b.dataset.editCat)));
  $$('[data-del-cat]').forEach(b=>b.onclick=()=>confirmModal('Excluir categoria?','Lançamentos existentes manterão o nome da categoria.',()=>{
    state.categories = state.categories.filter(c=>c.id!==b.dataset.delCat); saveState(); RENDERERS.configuracoes();
  }));
  $('#btn-export').onclick=()=>{
    const blob = new Blob([JSON.stringify({...state,_txnIndex:undefined},null,2)],{type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'controle-financeiro-backup.json';
    a.click();
  };
};
function openCategoryModal(c){
  const isEdit=!!c;
  openFormModal({
    title:isEdit?'Editar categoria':'Nova categoria',
    initial: c||{type:'despesa',status:'ativa'},
    fields:[
      {name:'name',label:'Nome',type:'text',required:true},
      {row:[{name:'type',label:'Tipo',type:'select',options:[{value:'despesa',label:'Despesa'},{value:'receita',label:'Receita'}]},
             {name:'status',label:'Status',type:'select',options:[{value:'ativa',label:'Ativa'},{value:'inativa',label:'Inativa'}]}]},
      {name:'essential',label:'Categoria essencial',type:'checkbox'}
    ],
    onSubmit(v){ if(isEdit) Object.assign(c,v); else state.categories.push({id:uid(),...v}); saveState(); renderAll(); },
    onDelete: isEdit? ()=>{confirmModal('Excluir categoria?','Tem certeza?',()=>{state.categories=state.categories.filter(x=>x.id!==c.id);saveState();closeModal();renderAll();});}:null
  });
}

/* ===================== INIT ===================== */
async function init(){
  wireAuthForm();
  injectNavIcons();

  const { data:{ session } } = await supabase.auth.getSession();
  if(!session){
    showAuthScreen();
  } else {
    currentUser = session.user;
    await bootApp();
  }

  supabase.auth.onAuthStateChange(async (event, session)=>{
    if(event==='SIGNED_IN' && session){
      currentUser = session.user;
      hideAuthScreen();
      document.getElementById('app-loader').classList.remove('hidden');
      await bootApp();
    } else if(event==='SIGNED_OUT'){
      currentUser = null;
      state = null;
      document.getElementById('app-root').style.display='none';
      showAuthScreen();
    }
  });
}
async function bootApp(){
  await loadState();
  materializeAll();
  const userBox = document.getElementById('sidebar-user');
  if(userBox) userBox.textContent = currentUser.email;
  $$('.nav-item[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  const logoutBtn = document.getElementById('btn-logout');
  if(logoutBtn) logoutBtn.onclick = ()=>supabase.auth.signOut();
  document.getElementById('app-root').style.display='flex';
  switchView('dashboard');
  const loader = document.getElementById('app-loader');
  if(loader) loader.classList.add('hidden');
}
init();
