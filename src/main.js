/* ===================== UTIL ===================== */
import { supabase } from './supabaseClient.js';
import Chart from 'chart.js/auto';
const $ = (sel,root=document)=>root.querySelector(sel);
const $$ = (sel,root=document)=>Array.from(root.querySelectorAll(sel));
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function pad(n){return String(n).padStart(2,'0');}
function signClass(v){ v = Number(v)||0; return v>0? 'pos' : v<0? 'neg' : ''; }
function txClass(t){ return t.type==='receita'? 'pos' : t.type==='despesa'? 'neg' : t.type==='ajuste'? signClass(t.value) : ''; }
function txMoney(t){   // valor com sinal: a cor não é a única pista (ajuda quem enxerga mal as cores)
  const v = Number(t.value)||0;
  if(t.type==='receita') return '+'+fmtCurrency(v);
  if(t.type==='despesa') return '−'+fmtCurrency(v);
  if(t.type==='ajuste') return (v>0? '+' : v<0? '−' : '')+fmtCurrency(Math.abs(v));
  return fmtCurrency(v);
}
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
function daysInMonth(key){ const [y,m]=key.split('-').map(Number); return new Date(y,m,0).getDate(); }
function invoiceDueDate(card, invoiceMonth){
  // fatura que fecha no mês X vence no dia de vencimento do próprio mês X (se vence depois do fechamento)
  // ou do mês seguinte (se o dia de vencimento é menor/igual ao de fechamento — caso mais comum)
  const due = card && card.dueDay? (parseInt(card.dueDay,10)||10) : 10;
  const closing = card && card.closingDay? (parseInt(card.closingDay,10)||0) : 0;
  const dueMonth = (closing && due<=closing)? addMonthsToKey(invoiceMonth,1) : invoiceMonth;
  return dueMonth+'-'+pad(Math.min(due, daysInMonth(dueMonth)));
}
function cardInvoiceFor(card, purchaseDateISO){
  // a qual fatura (mês de fechamento) uma compra pertence e quando essa fatura vence
  const invoiceMonth = firstInvoiceMonth(card, purchaseDateISO);
  return {invoiceMonth, dueDate: invoiceDueDate(card, invoiceMonth)};
}
function firstInvoiceMonth(card, purchaseDateISO){
  // se a compra foi feita depois do fechamento do cartão, ela entra na fatura do mês seguinte
  const day = parseInt(purchaseDateISO.slice(8,10),10);
  const purchaseMonth = purchaseDateISO.slice(0,7);
  const closing = card && card.closingDay? parseInt(card.closingDay,10) : 99;
  return day > closing ? addMonthsToKey(purchaseMonth,1) : purchaseMonth;
}
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
function monthLabel(key){ if(!key) return '—'; const [y,m]=key.split('-').map(Number);return `${MONTH_NAMES[m-1]} ${y}`;}
function monthLabelShort(key){ if(!key) return '—'; const [y,m]=key.split('-').map(Number);return `${MONTH_NAMES[m-1].slice(0,3)}/${String(y).slice(2)}`;}
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
  chevronDown:'<path d="M6 9l6 6 6-6"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon:'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>',
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
  green:'#3DDC97', red:'#FF6B7A', yellow:'#F5C451', accent:'#7658F4',
  ink:'#ECECF1', inkSoft:'#A3A3B2', line:'#2A2A34', panel:'#17171E',
  accentFill:'rgba(118,88,244,.75)', greenFill:'rgba(61,220,151,.12)', greenBar:'rgba(61,220,151,.75)', yellowBar:'rgba(245,196,81,.75)'
};
function applyChartTheme(){
  // lê as cores do tema ativo (variáveis do CSS) para os gráficos acompanharem o claro/escuro
  if(typeof getComputedStyle==='undefined' || typeof document==='undefined') return;
  const cs = getComputedStyle(document.documentElement);
  const v = n=>cs.getPropertyValue(n).trim();
  const rgba = (n,a)=>{ const p = v(n).split(/[\s,]+/).filter(Boolean); return p.length===3? `rgba(${p.join(',')},${a})` : null; };
  const set = (k,val)=>{ if(val) CHART_COLORS[k] = val; };
  set('green',v('--pos')); set('red',v('--neg')); set('yellow',v('--warn')); set('accent',v('--accent'));
  set('ink',v('--ink')); set('inkSoft',v('--ink-soft')); set('line',v('--line')); set('panel',v('--surface'));
  set('accentFill',rgba('--accent-rgb',.75)); set('greenFill',rgba('--pos-rgb',.12)); set('greenBar',rgba('--pos-rgb',.75)); set('yellowBar',rgba('--warn-rgb',.75));
  Chart.defaults.color = CHART_COLORS.inkSoft;
  Chart.defaults.borderColor = CHART_COLORS.line;
}
const THEME_KEY = 'kivo-theme';
function currentTheme(){ return document.documentElement.getAttribute('data-theme')==='light'? 'light' : 'dark'; }
function applyTheme(t, opts){
  t = t==='light'? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', t==='light'? '#F5F5F8' : '#0C0C10');
  const ios = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if(ios) ios.setAttribute('content', t==='light'? 'default' : 'black-translucent');   // no iPhone, texto branco sumiria no fundo claro
  const b = document.getElementById('btn-theme');
  if(b){
    const next = t==='light'? 'Mudar para o tema escuro' : 'Mudar para o tema claro';
    b.innerHTML = icon(t==='light'? 'moon' : 'sun', 18); b.title = next; b.setAttribute('aria-label', next);
  }
  applyChartTheme();
  if(opts && opts.save){ try{ localStorage.setItem(THEME_KEY, t); }catch(e){} }
  if(opts && opts.rerender && typeof renderAll==='function') renderAll();
}
function toggleTheme(){ applyTheme(currentTheme()==='light'? 'dark' : 'light', {save:true, rerender:true}); }
let themeMqBound = false;
function initTheme(){
  applyTheme(currentTheme());
  const b = document.getElementById('btn-theme'); if(b) b.onclick = toggleTheme;
  if(themeMqBound) return;
  themeMqBound = true;
  try{
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const follow = e=>{ let saved = null; try{ saved = localStorage.getItem(THEME_KEY); }catch(x){} if(!saved) applyTheme(e.matches? 'light' : 'dark', {rerender:true}); };
    if(mq.addEventListener) mq.addEventListener('change', follow);
  }catch(e){}
}
const chartInstances = {};
Chart.defaults.color = CHART_COLORS.inkSoft;
Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
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
      { label:'Saldo do mês', data:saldos, borderColor:CHART_COLORS.green, backgroundColor:CHART_COLORS.greenFill, tension:.3, fill:true, pointRadius:3, pointBackgroundColor:CHART_COLORS.green },
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
      backgroundColor: top.map(r=> r.essential? CHART_COLORS.yellowBar : CHART_COLORS.greenBar),
      borderRadius:0, maxBarThickness:34
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
  $$('.nav-item[data-icon], #btn-quick-add[data-icon]').forEach(btn=>{
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
    version:2,
    settings:{ nome:'', moeda:'BRL', primeiroDiaMes:1, salarioPadrao:0, metaEconomiaMensal:0, currentBalance:0, currentBalanceDate:null },
    categories: defaultCategories(),
    accounts: [],
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

/* ===== SYNC:BEGIN — salvamento seguro, conflito entre aparelhos e histórico de versões ===== */
const SNAPSHOT_EVERY_MS = 60*60*1000;   // no máximo uma cópia automática por hora
const HISTORY_KEEP = 30;                // quantas cópias ficam guardadas
const RETRY_DELAYS = [3000,8000,20000,45000,60000];
const HISTORY_SQL = `-- Histórico de versões do Kivo (rode uma única vez no SQL Editor do Supabase).
-- Só CRIA uma tabela nova: não altera nenhum dado nem a tabela app_state.
create table if not exists public.app_state_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  reason text not null default 'Automática',
  summary jsonb not null default '{}'::jsonb,
  data jsonb not null
);

create index if not exists app_state_history_user_created
  on public.app_state_history (user_id, created_at desc);

alter table public.app_state_history enable row level security;

drop policy if exists "Usuário lê apenas seu próprio histórico" on public.app_state_history;
create policy "Usuário lê apenas seu próprio histórico"
  on public.app_state_history for select using (auth.uid() = user_id);

drop policy if exists "Usuário cria apenas seu próprio histórico" on public.app_state_history;
create policy "Usuário cria apenas seu próprio histórico"
  on public.app_state_history for insert with check (auth.uid() = user_id);

drop policy if exists "Usuário apaga apenas seu próprio histórico" on public.app_state_history;
create policy "Usuário apaga apenas seu próprio histórico"
  on public.app_state_history for delete using (auth.uid() = user_id);
`;
let syncNow = ()=>Date.now();
let serverStamp = null;      // updated_at que o servidor tinha quando carregamos/salvamos por último
let lastSavedJson = '';      // como estavam os dados no servidor (para saber se algo mudou de verdade)
let dirty = false, saving = false, pendingAgain = false, conflict = false;
let retryTimer = null, retryCount = 0, lastRemoteCheck = 0, syncListenersOn = false;
let historyAvailable = null, historyReady = Promise.resolve(), lastSnapshotAt = 0;

function resetSyncState(){
  clearTimeout(saveTimer); clearTimeout(retryTimer);
  serverStamp = null; lastSavedJson = '';
  dirty = false; saving = false; pendingAgain = false; conflict = false;
  retryCount = 0; lastRemoteCheck = 0; lastSnapshotAt = 0; historyAvailable = null;
  hideSaveBanner();
}
function cloneForSave(){
  const c = {...state}; delete c._txnIndex;
  return JSON.parse(JSON.stringify(c));
}
function adoptData(raw){
  state = (raw && typeof raw==='object')? raw : defaultState();
  if(!state.categories || !state.categories.length) state.categories = defaultCategories();
  ['accounts','cards','incomes','recurring','installments','debts','goals','transactions'].forEach(k=>{ if(!state[k]) state[k]=[]; });
  if(!state.settings) state.settings = defaultState().settings;
  state.settings = {...defaultState().settings, ...state.settings};
  migrateToAccounts();
  rebuildIndex();
}
async function loadState(){
  // se falhar, NÃO seguimos com dados vazios (isso poderia sobrescrever os dados reais no próximo salvamento)
  const { data, error } = await supabase.from('app_state').select('data, updated_at').eq('user_id', currentUser.id).maybeSingle();
  if(error) throw error;
  resetSyncState();
  if(data && data.data){
    serverStamp = data.updated_at;
    lastSavedJson = JSON.stringify(data.data);
    adoptData(data.data);
  } else {
    adoptData(defaultState());   // usuário novo: ainda não existe linha no servidor
  }
  return true;
}
function showLoadError(){
  const loader = document.getElementById('app-loader'); if(loader) loader.classList.add('hidden');
  modalRoot().innerHTML = `
  <div class="modal-backdrop">
    <div class="modal confirm">
      <h3>Não foi possível carregar seus dados</h3>
      <p>Verifique sua internet e tente de novo. Nada foi alterado nem apagado.</p>
      <div class="modal-actions">
        <button class="btn" id="le-out">Sair</button>
        <button class="btn primary" id="le-retry">Tentar novamente</button>
      </div>
    </div>
  </div>`;
  $('#le-retry').onclick = ()=>{ closeModal(); const l=document.getElementById('app-loader'); if(l) l.classList.remove('hidden'); bootApp(); };
  $('#le-out').onclick = ()=>{ closeModal(); supabase.auth.signOut(); };
}

function saveState(immediate){
  if(!state || !currentUser) return Promise.resolve();
  dirty = true;
  clearTimeout(saveTimer);
  if(immediate) return flushSave();
  saveTimer = setTimeout(flushSave, 250);
  return Promise.resolve();
}
async function writeState(clone){
  try{
    let res;
    if(serverStamp){
      // só grava se ninguém salvou depois de nós (compara o updated_at)
      res = await supabase.from('app_state').update({ data: clone }).eq('user_id', currentUser.id).eq('updated_at', serverStamp).select('updated_at');
    } else {
      res = await supabase.from('app_state').insert({ user_id: currentUser.id, data: clone }).select('updated_at');
    }
    if(res.error){
      if(res.error.code==='23505') return { conflict:true };   // outro aparelho criou a linha antes
      return { error: res.error };
    }
    if(!res.data || res.data.length===0) return { conflict:true };
    return { ok:true, stamp: res.data[0].updated_at };
  }catch(e){ return { error:e }; }
}
async function flushSave(){
  if(!state || !currentUser) return;
  clearTimeout(saveTimer);
  if(!dirty || conflict) return;
  if(saving){ pendingAgain = true; return; }
  const clone = {...state}; delete clone._txnIndex;
  const json = JSON.stringify(clone);
  if(json===lastSavedJson){ dirty = false; return true; }   // nada mudou de verdade: não grava
  saving = true; pendingAgain = false;
  try{
    await historyReady;
    if(lastSavedJson && historyAvailable!==false && syncNow()-lastSnapshotAt > SNAPSHOT_EVERY_MS){
      await snapshotNow('Automática', JSON.parse(lastSavedJson));   // guarda como estava ANTES desta alteração
    }
  }catch(e){}
  const res = await writeState(clone);
  saving = false;
  if(res.ok){
    serverStamp = res.stamp; lastSavedJson = json; retryCount = 0;
    clearTimeout(retryTimer); hideSaveBanner();
    dirty = pendingAgain;
    if(pendingAgain){ pendingAgain = false; flushSave(); }
    return true;
  }
  if(res.conflict){ conflict = true; showConflictModal(); return false; }
  retryCount++;
  showSaveBanner('Não foi possível salvar suas alterações. Elas continuam aqui e o Kivo vai tentar de novo.');
  clearTimeout(retryTimer);
  retryTimer = setTimeout(flushSave, RETRY_DELAYS[Math.min(retryCount-1, RETRY_DELAYS.length-1)]);
  return false;
}

async function reloadFromServer(){
  const { data, error } = await supabase.from('app_state').select('data, updated_at').eq('user_id', currentUser.id).maybeSingle();
  if(error || !data) return false;
  clearTimeout(saveTimer);
  serverStamp = data.updated_at; lastSavedJson = JSON.stringify(data.data);
  dirty = false; conflict = false; pendingAgain = false;
  adoptData(data.data);
  materializeAll();
  renderAll();
  return true;
}
async function checkRemote(force){
  if(!state || !currentUser || conflict || saving) return;
  if(!force && syncNow()-lastRemoteCheck < 15000) return;
  if(modalRoot().innerHTML.trim()!=='') return;   // não troca os dados debaixo de um formulário aberto
  lastRemoteCheck = syncNow();
  try{
    const { data, error } = await supabase.from('app_state').select('updated_at').eq('user_id', currentUser.id).maybeSingle();
    if(error || !data || data.updated_at===serverStamp) return;
    if(dirty){ conflict = true; showConflictModal(); return; }
    if(await reloadFromServer()) showToast('Dados atualizados com as alterações feitas em outro aparelho.');
  }catch(e){}
}
function startSyncListeners(){
  if(syncListenersOn) return;
  syncListenersOn = true;
  document.addEventListener('visibilitychange', ()=>{
    if(document.visibilityState==='visible') checkRemote();
    else if(dirty) flushSave();
  });
  window.addEventListener('pagehide', ()=>{ if(dirty) flushSave(); });
  window.addEventListener('focus', ()=>checkRemote());
  window.addEventListener('online', ()=>{ if(dirty){ retryCount = 0; flushSave(); } checkRemote(true); });
  window.addEventListener('beforeunload', (e)=>{ if(dirty || saving){ e.preventDefault(); e.returnValue = ''; } });
}

function downloadJson(obj, filename){
  const blob = new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}
function showConflictModal(){
  modalRoot().innerHTML = `
  <div class="modal-backdrop">
    <div class="modal confirm">
      <h3>Seus dados mudaram em outro aparelho</h3>
      <p>Outro aparelho (ou outra aba) salvou alterações depois que você abriu o Kivo aqui. Para não apagar nada sem querer, o salvamento foi pausado.</p>
      <div class="modal-actions" style="flex-direction:column;align-items:stretch;gap:8px">
        <button class="btn primary" id="cf-reload">Carregar a versão mais recente</button>
        <button class="btn" id="cf-keep">Manter a minha e sobrescrever</button>
        <button class="btn small" id="cf-download">Baixar uma cópia da minha versão</button>
      </div>
      <p class="help-text" style="margin:10px 0 0">Ao sobrescrever, a versão do outro aparelho fica guardada no histórico (se ele estiver ativado).</p>
    </div>
  </div>`;
  $('#cf-download').onclick = ()=>downloadJson(cloneForSave(), 'kivo-minha-versao.json');
  $('#cf-reload').onclick = async()=>{
    closeModal();
    const ok = await reloadFromServer();
    if(ok) showToast('Dados atualizados com a versão mais recente.');
    else { showToast('Não foi possível carregar agora. Tente de novo.','error'); showConflictModal(); }
  };
  $('#cf-keep').onclick = async()=>{
    closeModal();
    const { data, error } = await supabase.from('app_state').select('data, updated_at').eq('user_id', currentUser.id).maybeSingle();
    if(error){ showToast('Não foi possível confirmar agora. Tente de novo.','error'); showConflictModal(); return; }
    if(data){
      await snapshotNow('Versão de outro aparelho (antes de sobrescrever)', data.data);
      serverStamp = data.updated_at; lastSavedJson = JSON.stringify(data.data);
    } else { serverStamp = null; lastSavedJson = ''; }
    conflict = false; dirty = true;
    await flushSave();
  };
}

function ensureEl(id){
  let e = document.getElementById(id);
  if(!e){ e = document.createElement('div'); e.id = id; document.body.appendChild(e); }
  return e;
}
function showToast(msg, kind, action){
  const root = ensureEl('toasts');
  const el = document.createElement('div');
  el.className = 'toast '+(kind||'')+(action? ' has-action' : '');
  const txt = document.createElement('span'); txt.textContent = msg; el.appendChild(txt);
  if(action){
    const b = document.createElement('button');
    b.className = 'toast-action'; b.textContent = action.label;
    b.onclick = ()=>{ el.remove(); action.fn(); };
    el.appendChild(b);
  }
  root.appendChild(el);
  const life = action? 9000 : 4200;
  setTimeout(()=>el.classList.add('hide'), life);
  setTimeout(()=>el.remove(), life+600);
}
function showSaveBanner(msg){
  const b = ensureEl('save-banner');
  b.innerHTML = `<span>${escapeHtml(msg)}</span><button class="btn small" id="sb-retry">Tentar agora</button>`;
  b.classList.add('show');
  $('#sb-retry').onclick = ()=>{ retryCount = 0; flushSave(); };
}
function hideSaveBanner(){
  const b = document.getElementById('save-banner');
  if(b) b.classList.remove('show');
}

/* ---------- histórico de versões ---------- */
function isMissingTable(err){
  const m = (err && err.message || '');
  return !!err && (err.code==='42P01' || err.code==='PGRST205' || (/app_state_history/.test(m) && /does not exist|schema cache|not find/i.test(m)));
}
function summarizeData(d){
  const n = k=>Array.isArray(d && d[k])? d[k].length : 0;
  return { lancamentos:n('transactions'), contas:n('accounts'), recorrentes:n('incomes')+n('recurring'), parcelamentos:n('installments'), dividas:n('debts') };
}
function summaryText(s){
  s = s || {};
  return `${s.lancamentos||0} lançamentos · ${s.contas||0} contas · ${s.recorrentes||0} recorrentes · ${s.parcelamentos||0} parcelamentos · ${s.dividas||0} dívidas`;
}
function fmtDateTime(iso){
  const d = new Date(iso), p = n=>String(n).padStart(2,'0');
  return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function initHistory(){
  historyReady = (async()=>{
    try{
      const { data, error } = await supabase.from('app_state_history').select('created_at').eq('user_id', currentUser.id).order('created_at',{ascending:false}).limit(1);
      if(error){ historyAvailable = isMissingTable(error)? false : null; return; }
      historyAvailable = true;
      lastSnapshotAt = (data && data[0])? new Date(data[0].created_at).getTime() : 0;
    }catch(e){ historyAvailable = null; }
  })();
  return historyReady;
}
async function snapshotNow(reason, data){
  if(historyAvailable===false || !currentUser) return { ok:false, missing:true };
  try{
    const { error } = await supabase.from('app_state_history').insert({ user_id: currentUser.id, reason, summary: summarizeData(data), data });
    if(error){ if(isMissingTable(error)) historyAvailable = false; return { ok:false, error }; }
    historyAvailable = true; lastSnapshotAt = syncNow();
    pruneHistory();
    return { ok:true };
  }catch(e){ return { ok:false, error:e }; }
}
async function pruneHistory(){
  try{
    const { data } = await supabase.from('app_state_history').select('id').eq('user_id', currentUser.id).order('created_at',{ascending:false}).range(HISTORY_KEEP, HISTORY_KEEP+500);
    if(data && data.length) await supabase.from('app_state_history').delete().in('id', data.map(r=>r.id));
  }catch(e){}
}
async function listHistory(){
  const { data, error } = await supabase.from('app_state_history').select('id, created_at, reason, summary').eq('user_id', currentUser.id).order('created_at',{ascending:false}).limit(HISTORY_KEEP);
  if(error){ if(isMissingTable(error)) historyAvailable = false; return null; }
  historyAvailable = true;
  return data || [];
}
async function saveVersionNow(){
  const r = await snapshotNow('Manual', cloneForSave());
  showToast(r.ok? 'Versão guardada no histórico.' : 'Não foi possível guardar agora.', r.ok? '' : 'error');
  return r.ok;
}
async function restoreVersion(id){
  const { data, error } = await supabase.from('app_state_history').select('data, created_at, reason').eq('id', id).eq('user_id', currentUser.id).maybeSingle();
  if(error || !data){ showToast('Não foi possível abrir essa versão agora.','error'); return false; }
  await snapshotNow('Antes de restaurar', cloneForSave());   // dá para desfazer a restauração
  clearTimeout(saveTimer);
  adoptData(JSON.parse(JSON.stringify(data.data)));
  dirty = true;
  materializeAll();
  renderAll();
  const ok = await flushSave();
  if(ok!==false) showToast('Versão restaurada.');
  return true;
}
async function renderHistoryCard(){
  const box = document.getElementById('history-card');
  if(!box) return;
  await historyReady;
  box.innerHTML = '<p class="help-text" style="margin:0">Carregando…</p>';
  const rows = await listHistory();
  if(rows===null){
    if(historyAvailable===false){
      box.innerHTML = `<p style="font-size:13.5px;color:var(--ink-soft);margin-top:0">O histórico guarda cópias automáticas dos seus dados (no máximo uma por hora, as últimas ${HISTORY_KEEP}) e deixa você voltar no tempo se algo der errado. Para ativar, crie a tabela do histórico no Supabase, uma única vez:</p>
        <ol class="help-text" style="margin:0 0 12px 18px;padding:0"><li>Abra o Supabase › SQL Editor › New query</li><li>Clique em "Copiar SQL", cole lá e execute (Run)</li><li>Volte aqui e recarregue a página</li></ol>
        <button class="btn" id="btn-copy-sql">Copiar SQL</button>`;
      $('#btn-copy-sql').onclick = async()=>{
        try{ await navigator.clipboard.writeText(HISTORY_SQL); showToast('SQL copiado. Cole no SQL Editor do Supabase.'); }
        catch(e){ showToast('Não consegui copiar automaticamente. O SQL está em supabase/schema.sql no projeto.','error'); }
      };
    } else {
      box.innerHTML = '<p class="help-text" style="margin:0">Não foi possível carregar o histórico agora.</p>';
    }
    return;
  }
  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px">
      <p style="font-size:13.5px;color:var(--ink-soft);margin:0">Cópias automáticas (no máximo uma por hora, as últimas ${HISTORY_KEEP}). Restaurar guarda antes uma cópia do estado atual.</p>
      <button class="btn small" id="btn-snap-now">Salvar versão agora</button>
    </div>
    ${rows.length? `<div class="history-list">${rows.map(r=>`
      <div class="history-row">
        <div><strong>${fmtDateTime(r.created_at)}</strong> <span class="badge grey">${escapeHtml(r.reason||'')}</span>
          <div class="help-text" style="margin:3px 0 0">${escapeHtml(summaryText(r.summary))}</div></div>
        <button class="btn small" data-restore="${r.id}">Restaurar</button>
      </div>`).join('')}</div>` : '<p class="help-text" style="margin:0">Ainda não há versões guardadas. A primeira aparece depois da próxima alteração.</p>'}`;
  $('#btn-snap-now').onclick = async()=>{ await saveVersionNow(); renderHistoryCard(); };
  $$('#history-card [data-restore]').forEach(b=>b.onclick=()=>confirmModal(
    'Restaurar esta versão?',
    'Seus dados atuais serão trocados pelos dessa data. Antes disso o Kivo guarda uma cópia do estado de agora, então dá para desfazer.',
    ()=>restoreVersion(b.dataset.restore), 'Restaurar', 'primary'));
}
/* ===== SYNC:END ===== */
function migrateToAccounts(){
  // V1: quem só usava "saldo atual em conta" (um número solto) ganha uma conta de verdade,
  // sem perder o valor que já tinha informado.
  if(state.accounts.length>0) return;
  const initial = Number(state.settings.currentBalance)||0;
  state.accounts.push({
    id: uid(), name:'Conta Principal', institution:'', type:'conta', initialBalance: initial,
    color:'green', status:'ativa', createdAt: Date.now()
  });
  // lançamentos antigos (sem conta) continuam funcionando; o saldo por conta é calculado
  // a partir de agora sobre os que tiverem accountId. O valor migrado preserva o total que você já via.
}
function rebuildIndex(){
  state._txnIndex = new Set(state.transactions.map(t=>t.genKey).filter(Boolean));
}



/* ===================== MATERIALIZATION ===================== */
function defaultAccountId(){
  const acc = state.accounts.find(a=>a.status==='ativa');
  return acc? acc.id : null;
}
function ensureTxn(def){
  const occ = def.occMonth || def.month;
  const key = def.source+':'+def.sourceId+':'+occ+(def.installmentIndex!=null?':'+def.installmentIndex:'');
  if(state._txnIndex.has(key)) return false;
  const t = {
    id:uid(), genKey:key, type:def.type, category:def.category, description:def.description,
    value:def.value, date:def.date, month:def.month, paymentMethod:def.paymentMethod||'Outro',
    cardId:def.cardId||null, accountId: def.accountId || defaultAccountId(),
    status: def.status || (def.month < todayMonthKey() ? 'pago':'pendente'),
    note:'', source:def.source, sourceId:def.sourceId, installmentIndex:def.installmentIndex ?? null,
    preSettled: !!def.preSettled, createdAt:Date.now()
  };
  state.transactions.push(t);
  state._txnIndex.add(key);
  return true;
}
const MATERIALIZE_AHEAD = 3; // meses à frente que as recorrentes já viram lançamentos reais; além disso só aparecem como "previsto" no Orçamento
function limitMonth(){ return addMonthsToKey(todayMonthKey(), MATERIALIZE_AHEAD); }
function recurringGenerated(r, occ){
  const card = r.cardId? state.cards.find(c=>c.id===r.cardId) : null;
  const base = occ+'-'+pad(Math.min(parseInt(r.day,10)||1, daysInMonth(occ)));
  let date = base, month = occ;
  if(card){ const inv = cardInvoiceFor(card, base); date = inv.dueDate; month = inv.invoiceMonth; } // compra no crédito cai na fatura certa
  return {type:'despesa',source:'recurring',sourceId:r.id,occMonth:occ,month,date,category:r.category,description:r.name,value:r.value,
          paymentMethod: card? 'Crédito' : r.paymentMethod, cardId: card? card.id : null, accountId: r.accountId};
}
function incomeGenerated(inc, occ){
  const date = occ+'-'+pad(Math.min(parseInt(inc.day,10)||1, daysInMonth(occ)));
  return {type:'receita',source:'income',sourceId:inc.id,occMonth:occ,month:occ,date,category:inc.category||inc.name,description:inc.name,value:inc.value,paymentMethod:inc.paymentMethod,accountId:inc.accountId};
}
function materializeRecurringAndIncome(){
  const horizon = limitMonth();
  state.incomes.forEach(inc=>{
    if(inc.status!=='ativa') return;
    if(inc.frequency==='unica'){
      ensureTxn({type:'receita',source:'income',sourceId:inc.id,month:monthKeyOf(inc.startDate),occMonth:monthKeyOf(inc.startDate),category:inc.category||inc.name,description:inc.name,value:inc.value,date:inc.startDate,paymentMethod:inc.paymentMethod,accountId:inc.accountId});
      return;
    }
    let m = monthKeyOf(inc.startDate);
    while(m<=horizon && (!inc.endDate || m<=monthKeyOf(inc.endDate))){
      ensureTxn(incomeGenerated(inc,m));
      m = addMonthsToKey(m,1);
    }
  });
  state.recurring.forEach(r=>{
    if(r.status!=='ativa') return;
    let m = monthKeyOf(r.startDate);
    while(m<=horizon){
      ensureTxn(recurringGenerated(r,m));
      m = addMonthsToKey(m,1);
    }
  });
}
function pruneFutureGenerated(){
  // remove lançamentos gerados automaticamente além da janela de 3 meses (eram gerados 2 anos à frente).
  // Preserva: pagos, receitas únicas e qualquer mês que você tenha editado à mão.
  const lim = limitMonth();
  state.transactions = state.transactions.filter(t=>{
    if(t.status!=='pendente' || (t.source!=='recurring' && t.source!=='income') || !t.genKey) return true;
    const occ = t.genKey.split(':')[2];
    if(!occ || occ<=lim) return true;
    const def = (t.source==='recurring'? state.recurring : state.incomes).find(d=>d.id===t.sourceId);
    if(!def) return false;
    if(t.source==='income' && def.frequency==='unica') return true;
    const g = t.source==='recurring'? recurringGenerated(def,occ) : incomeGenerated(def,occ);
    const untouched = t.date===g.date && t.description===g.description && Number(t.value)===Number(g.value) && (t.category||'')===(g.category||'');
    return !untouched;
  });
}
function materializeInstallmentsDebts(){
  state.installments.forEach(inst=>{
    const card = inst.cardId? state.cards.find(c=>c.id===inst.cardId) : null;
    for(let i=0;i<inst.count;i++){
      const m = addMonthsToKey(inst.startMonth,i);
      const dueDate = card? invoiceDueDate(card,m) : m+'-05';
      const def = {type:'despesa',source:'installment',sourceId:inst.id,month:m,installmentIndex:i,category:inst.category,description:`${inst.name} (${i+1}/${inst.count})`,value:inst.installmentValue,cardId:inst.cardId||null,paymentMethod: inst.cardId?'Crédito':'Outro',date:dueDate};
      if(inst.alreadyPaid!=null){ // as primeiras N já foram pagas antes: ficam pagas e não descontam do saldo de novo
        def.status = i < inst.alreadyPaid ? 'pago' : 'pendente';
        def.preSettled = i < inst.alreadyPaid;
      }
      ensureTxn(def);
    }
  });
  state.transactions.forEach(t=>{
    if(t.source!=='installment' || t.status!=='pendente' || !t.cardId) return;
    const card = state.cards.find(c=>c.id===t.cardId);
    if(card){ const nd = invoiceDueDate(card, t.month); if(t.date!==nd) t.date = nd; }
  });
  state.debts.forEach(d=>{
    for(let i=0;i<d.count;i++){
      const m = addMonthsToKey(d.startMonth,i);
      const def = {type:'despesa',source:'debt',sourceId:d.id,month:m,installmentIndex:i,category:'Dívidas',description:`${d.name} (${i+1}/${d.count})`,value:d.installmentValue,paymentMethod:'Outro',date:debtDate(d,i)};
      if(d.alreadyPaid!=null){ // as primeiras N parcelas já foram pagas antes: ficam pagas e não descontam do saldo de novo
        def.status = i < d.alreadyPaid ? 'pago' : 'pendente';
        def.preSettled = i < d.alreadyPaid;
      }
      ensureTxn(def);
    }
  });
}
function debtDate(d,i){
  const m = addMonthsToKey(d.startMonth,i);
  return m+'-'+pad(Math.min(parseInt(d.dueDay,10)||10, daysInMonth(m)));
}
function autoPaidCount(d){
  let n = 0;
  for(let i=0;i<d.count;i++){ if(debtDate(d,i) < todayISO()) n++; }
  return n;
}
function instDate(inst,i){
  const m = addMonthsToKey(inst.startMonth,i);
  const card = inst.cardId? state.cards.find(c=>c.id===inst.cardId) : null;
  return card? invoiceDueDate(card,m) : m+'-05';
}
function autoPaidCountInst(inst){
  let n = 0;
  for(let i=0;i<inst.count;i++){ if(instDate(inst,i) < todayISO()) n++; }
  return n;
}
function paidLeadingCount(sourceType,id){
  const rows = state.transactions.filter(t=>t.source===sourceType && t.sourceId===id);
  let n = 0;
  while(rows.some(t=>t.installmentIndex===n && t.status==='pago')) n++;
  return n;
}
function materializeAll(){ pruneFutureGenerated(); rebuildIndex(); materializeRecurringAndIncome(); materializeInstallmentsDebts(); saveState(); }

function virtualForOcc(occ){
  const out=[];
  state.incomes.forEach(inc=>{
    if(inc.status!=='ativa' || inc.frequency!=='mensal') return;
    if(occ<monthKeyOf(inc.startDate)) return;
    if(inc.endDate && occ>monthKeyOf(inc.endDate)) return;
    out.push({...incomeGenerated(inc,occ), id:'v-'+inc.id+'-'+occ, status:'pendente', virtual:true});
  });
  state.recurring.forEach(r=>{
    if(r.status!=='ativa') return;
    if(occ<monthKeyOf(r.startDate)) return;
    out.push({...recurringGenerated(r,occ), id:'v-'+r.id+'-'+occ, status:'pendente', virtual:true});
  });
  return out;
}
function virtualEntriesForMonth(monthKey){
  const lim = limitMonth(), out=[];
  [addMonthsToKey(monthKey,-1), monthKey].forEach(occ=>{
    if(occ<=lim) return;
    virtualForOcc(occ).forEach(v=>{ if(v.month===monthKey) out.push(v); });
  });
  return out;
}
function virtualEntriesBetween(fromIsoExclusive, toIsoInclusive){
  const out=[]; let occ = addMonthsToKey(limitMonth(),1); const end = monthKeyOf(toIsoInclusive);
  for(let guard=0; occ<=end && guard<240; guard++){
    virtualForOcc(occ).forEach(v=>{ if(v.date>fromIsoExclusive && v.date<=toIsoInclusive) out.push(v); });
    occ = addMonthsToKey(occ,1);
  }
  return out;
}
function virtualEntriesByDate(iso){
  if(monthKeyOf(iso) <= limitMonth()) return [];
  return virtualEntriesBetween(addDaysToISO(iso,-1), iso);
}
function getMonthTransactions(monthKey){
  let txns = state.transactions.filter(t=>txMonth(t)===monthKey);
  if(monthKey > limitMonth()) txns = txns.concat(virtualEntriesForMonth(monthKey));
  return txns;
}

/* ===================== CALCULATIONS ===================== */
function summarize(txns){
  let plannedReceitas=0, realizedReceitas=0, plannedDespesas=0, realizedDespesas=0;
  const byCategory={};
  txns.forEach(t=>{
    if(t.type==='transferencia' || t.type==='ajuste') return; // transferência e ajuste de saldo não são receita nem despesa
    const v = Number(t.value)||0;
    if(t.type==='receita'){ plannedReceitas+=v; if(t.status==='pago') realizedReceitas+=v; }
    else { plannedDespesas+=v; if(t.status==='pago') realizedDespesas+=v;
      const catName = t.category || 'Sem categoria';
      byCategory[catName]=(byCategory[catName]||0)+v;
    }
  });
  return { txns, plannedReceitas, realizedReceitas, plannedDespesas, realizedDespesas,
    saldoPlanejado: plannedReceitas-plannedDespesas, saldoRealizado: realizedReceitas-realizedDespesas,
    byCategory };
}
function monthSummary(monthKey){ return summarize(getMonthTransactions(monthKey)); }
function periodSummary(p){
  // fluxo de caixa entre duas datas: vale o dia em que o dinheiro mexe (recebido/pago, ou a data prevista) + previsão das recorrentes
  const txns = state.transactions.filter(t=>{ const d = cashDate(t); return d && d>=p.from && d<=p.to; })
    .concat(virtualEntriesBetween(addDaysToISO(p.from,-1), p.to));
  return summarize(txns);
}
function summaryFor(x){ return typeof x==='string'? monthSummary(x) : periodSummary(x); }
function firstDataMonth(){
  const months = state.transactions.map(txMonth);
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
  const s = summaryFor(monthKey);
  const margem = s.plannedReceitas - s.plannedDespesas;
  const pct = s.plannedReceitas>0 ? (s.plannedDespesas/s.plannedReceitas*100) : (s.plannedDespesas>0?999:0);
  let status='verde';
  if(margem<0 || pct>95) status='vermelho'; else if(pct>75) status='amarelo';
  return { receitaPrevista:s.plannedReceitas, despesaPrevista:s.plannedDespesas, margem, pct, status };
}
function canSpendNow(days){
  const today = todayISO();
  const limit = addDaysToISO(today, days);
  let total = totalAvailable();
  state.transactions.forEach(t=>{
    if(t.status!=='pendente' || !t.date) return;
    if(t.date>=today && t.date<=limit){
      total += t.type==='receita'? Number(t.value) : -Number(t.value);
    }
  });
  const goalsReserve = state.goals.filter(g=>!goalDone(g)).reduce((a,g)=>a+(Number(g.monthlyPlanned)||0),0);
  return total - goalsReserve;
}
function goalDone(g){ return Number(g.currentValue)>=Number(g.targetValue); }
function categoryEssential(name){ const c=state.categories.find(c=>c.name===name); return c? c.essential : false; }

function paretoData(monthKey){
  const s = summaryFor(monthKey);
  const rows = Object.entries(s.byCategory).map(([cat,val])=>({cat,val})).sort((a,b)=>b.val-a.val);
  const total = rows.reduce((a,r)=>a+r.val,0);
  let cum=0;
  rows.forEach(r=>{ r.pct = total? r.val/total*100:0; cum+=r.pct; r.cumPct=cum; r.essential=categoryEssential(r.cat); });
  return {rows,total};
}
/* ===================== RELATÓRIOS POR CICLO ===================== */
function hasCycles(){ return (parseInt(state.settings.primeiroDiaMes,10)||1)>1; }
function cycleAt(offset){   // 0 = ciclo de hoje, -1 = anterior, +1 = próximo...
  const sd = state.settings.primeiroDiaMes;
  let c = cycleFor(todayISO(), sd);
  for(let i=0;i<Math.abs(offset);i++) c = offset<0? cycleFor(addDaysToISO(c.from,-1), sd) : cycleFor(addDaysToISO(c.to,1), sd);
  return c;
}
function cycleLabel(c){ return hasCycles()? `${fmtDM(c.from)} a ${fmtDM(c.to)}/${c.to.slice(2,4)}` : monthLabel(c.from.slice(0,7)); }
function cycleShort(c){ return hasCycles()? `${fmtDM(c.from)}–${fmtDM(c.to)}` : monthLabelShort(c.from.slice(0,7)); }
function cycleOptions(selected){
  let h = '';
  for(let o=6;o>=-24;o--) h += `<option value="${o}" ${o===selected? 'selected' : ''}>${escapeHtml(cycleLabel(cycleAt(o)))}${o===0? ' (atual)' : ''}</option>`;
  return h;
}
function firstDataDate(){ const ds = state.transactions.map(cashDate).filter(Boolean).sort(); return ds.length? ds[0] : todayISO(); }
function cycleNet(c){
  // ciclo que já acabou: vale o que realmente aconteceu; ciclo atual e futuros: o planejado (realizado + o que falta)
  const s = periodSummary(c), past = c.to < todayISO();
  return {s, past, saldo: past? s.saldoRealizado : s.saldoPlanejado};
}
function accumulatedBeforeCycle(c){
  const sd = state.settings.primeiroDiaMes;
  let cc = cycleFor(firstDataDate(), sd), acc = 0, guard = 0;
  while(cc.to < c.from && guard++ < 600){ acc += cycleNet(cc).saldo; cc = cycleFor(addDaysToISO(cc.to,1), sd); }
  return rnd2(acc);
}
function projectionCycles(n){
  const sd = state.settings.primeiroDiaMes, out = [];
  let c = cycleAt(0), acc = accumulatedBeforeCycle(c);
  for(let i=0;i<n;i++){
    const net = cycleNet(c); acc = rnd2(acc+net.saldo);
    out.push({from:c.from, to:c.to, label:cycleLabel(c), receitas:net.s.plannedReceitas, despesas:net.s.plannedDespesas, saldo:rnd2(net.saldo), saldoAcumulado:acc});
    c = cycleFor(addDaysToISO(c.to,1), sd);
  }
  return out;
}
function endingCommitmentsCycles(n){
  const notes = [], first = cycleAt(0), last = cycleAt(n-1);
  const check = (list,label,dateOf)=>list.forEach(item=>{
    if(!item.count || !item.startMonth) return;
    const end = dateOf(item, item.count-1);
    if(end>=first.from && end<=last.to){
      const c = cycleFor(end, state.settings.primeiroDiaMes);
      notes.push(`${label} "${item.name}" termina ${hasCycles()? 'no ciclo '+cycleLabel(c) : 'em '+cycleLabel(c)} — a partir do período seguinte, aproximadamente ${fmtCurrency(item.installmentValue)} a menos de despesas fixas.`);
    }
  });
  check(state.installments,'O parcelamento de',instDate);
  check(state.debts,'A dívida de',debtDate);
  return notes;
}
/* ===================== ORÇAMENTO POR CATEGORIA (limite por ciclo) ===================== */
let budgetOffset = 0;   // 0 = ciclo atual
function fmtPlain(n){ return Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function budgetRows(c){
  // gasto = pago + ainda previsto no ciclo (as despesas que o ciclo vai ter); "pago" mostra só o que já saiu
  const s = periodSummary(c), spent = {}, paid = {};
  s.txns.forEach(t=>{
    if(t.type!=='despesa') return;
    const n = t.category || 'Sem categoria', v = Number(t.value)||0;
    spent[n] = (spent[n]||0)+v; if(t.status==='pago') paid[n] = (paid[n]||0)+v;
  });
  const cats = state.categories.filter(x=>x.type==='despesa' && x.status!=='inativa');
  const names = new Set(cats.map(x=>x.name)); Object.keys(spent).forEach(n=>names.add(n));
  const rows = [...names].map(name=>{
    const cat = state.categories.find(x=>x.name===name && x.type==='despesa');
    const limit = Number(cat && cat.limit)||0, used = rnd2(spent[name]||0), pct = limit>0? used/limit*100 : null;
    return {name, essential:!!(cat && cat.essential), limit, spent:used, paid:rnd2(paid[name]||0), left: limit>0? rnd2(limit-used) : null, pct,
            status: limit<=0? 'sem' : pct>100? 'estourou' : pct>=80? 'atencao' : 'ok'};
  });
  return rows.sort((a,b)=> (b.limit>0)-(a.limit>0) || (b.pct||0)-(a.pct||0) || b.spent-a.spent || a.name.localeCompare(b.name));
}
function budgetAlerts(){
  const un = hasCycles()? 'ciclo' : 'mês';
  return budgetRows(cycleAt(0)).filter(r=>r.limit>0 && r.pct>=80).map(r=> r.pct>100
    ? {sev:'rust', msg:`Você passou do limite de "${r.name}" neste ${un}: ${fmtCurrency(r.spent)} de ${fmtCurrency(r.limit)}.`}
    : {sev:'gold', msg:`"${r.name}" já usou ${Math.round(r.pct)}% do limite do ${un} (${fmtCurrency(r.spent)} de ${fmtCurrency(r.limit)}).`});
}
function budgetBadge(st){
  return st==='estourou'? '<span class="badge rust">Estourou</span>' : st==='atencao'? '<span class="badge gold">Atenção</span>' : st==='ok'? '<span class="badge green">Dentro</span>' : '<span class="badge grey">Sem limite</span>';
}
function renderOrcamento(idp){
  idp = idp || 'bud';
  const c = cycleAt(budgetOffset), rows = budgetRows(c), U = hasCycles();
  const withLimit = rows.filter(r=>r.limit>0);
  const totLimit = rnd2(withLimit.reduce((a,r)=>a+r.limit,0)), totSpent = rnd2(withLimit.reduce((a,r)=>a+r.spent,0)), totLeft = rnd2(totLimit-totSpent);
  return `
    <div class="field-row" style="max-width:560px;margin-bottom:8px"><div class="field"><label>${U? 'Ciclo' : 'Mês'}</label><select id="${idp}-cycle">${cycleOptions(budgetOffset)}</select></div></div>
    <div class="help-text" style="margin-top:0">Digite o limite de cada categoria para o ${U? 'ciclo' : 'mês'}. O gasto soma o que já foi pago e o que ainda está previsto. A partir de 80% o app avisa.</div>
    <div class="grid grid-3" style="margin-top:12px">
      <div class="card"><div class="stat-label">Limites definidos</div><div class="stat-value num">${fmtCurrency(totLimit)}</div><div class="stat-foot">${withLimit.length} categoria${withLimit.length===1? '' : 's'}</div></div>
      <div class="card"><div class="stat-label">Gasto nessas categorias</div><div class="stat-value neg num">${fmtCurrency(totSpent)}</div><div class="stat-foot">${totLimit>0? Math.round(totSpent/totLimit*100)+'% do total dos limites' : 'defina um limite para começar'}</div></div>
      <div class="card"><div class="stat-label">Restante</div><div class="stat-value ${signClass(totLeft)} num">${fmtCurrency(totLeft)}</div><div class="stat-foot">limites − gasto</div></div>
    </div>
    <div class="table-wrap" style="margin-top:16px"><table>
      <thead><tr><th>Categoria</th><th class="right">Limite</th><th class="right">Gasto</th><th class="right">Pago</th><th class="right">Restante</th><th>Uso</th></tr></thead>
      <tbody>${rows.map(r=>`<tr>
        <td>${escapeHtml(r.name)}${r.essential? ' <span class="badge grey">essencial</span>' : ''}</td>
        <td class="right"><div class="currency-input bud-input"><span class="prefix">R$</span><input type="text" inputmode="decimal" autocomplete="off" class="currency-mask bud-limit" data-cat="${escapeHtml(r.name)}" value="${r.limit>0? fmtPlain(r.limit) : ''}" placeholder="sem limite" ${r.name==='Sem categoria'? 'disabled' : ''} aria-label="Limite de ${escapeHtml(r.name)}"></div></td>
        <td class="right num ${r.spent>0? 'neg' : ''}">${fmtCurrency(r.spent)}</td>
        <td class="right num">${fmtCurrency(r.paid)}</td>
        <td class="right num ${r.left===null? '' : signClass(r.left)}">${r.left===null? '—' : fmtCurrency(r.left)}</td>
        <td>${r.limit>0? `<div class="bud-uso"><div class="bud-bar"><i class="st-${r.status}" style="width:${Math.min(100,r.pct).toFixed(0)}%"></i></div><span class="bud-pct">${Math.round(r.pct)}%</span>${budgetBadge(r.status)}</div>` : budgetBadge('sem')}</td>
      </tr>`).join('')}</tbody></table></div>`;
}
function wireOrcamento(idp, rootId, rerender){
  idp = idp || 'bud'; rootId = rootId || 'report-body'; rerender = rerender || (()=>RENDERERS.relatorios());
  const root = document.getElementById(rootId);
  wireCurrencyMasks(root);
  document.getElementById(idp+'-cycle').onchange = (e)=>{ budgetOffset = parseInt(e.target.value,10); rerender(); };
  root.querySelectorAll('.bud-limit').forEach(inp=>inp.onchange = ()=>{
    const name = inp.dataset.cat, v = parseCurrencyValue(inp.value);
    let cat = state.categories.find(x=>x.name===name && x.type==='despesa');
    if(!cat){ if(!(v>0)) return; cat = {id:uid(), name, type:'despesa', essential:false, status:'ativa'}; state.categories.push(cat); }
    cat.limit = v>0? rnd2(v) : 0;
    saveState(); rerender();
  });
}
function dashLimitsHtml(){
  const c = cycleAt(0), rows = budgetRows(c).filter(r=>r.limit>0);
  if(!rows.length) return '';
  return `<div class="card" style="margin-top:16px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap"><div class="stat-label">Limites do ${hasCycles()? 'ciclo' : 'mês'} · ${escapeHtml(cycleLabel(c))}</div><div class="dash-note" style="margin:0"><a href="#" data-goto="planejamento" data-sub="limites">Ver todos e editar</a></div></div>
    ${rows.slice(0,5).map(r=>`<div class="bud-cr"><span class="dash-cat" title="${escapeHtml(r.name)}">${escapeHtml(r.name)}</span><div class="bud-bar"><i class="st-${r.status}" style="width:${Math.min(100,r.pct).toFixed(0)}%"></i></div><span class="num ${r.status==='estourou'? 'neg' : ''}">${fmtCurrency(r.spent)} <span class="bud-de">de ${fmtCurrency(r.limit)}</span></span></div>`).join('')}
    ${rows.length>5? `<div class="dash-note">+ ${rows.length-5} categoria${rows.length-5===1? '' : 's'} com limite</div>` : ''}
  </div>`;
}
function cycleBalanceChart(canvasId, back, fwd){
  const sd = state.settings.primeiroDiaMes, labels = [], saldos = [], acumulados = [];
  let c = cycleAt(-back), acc = accumulatedBeforeCycle(c);
  for(let i=0;i<back+fwd+1;i++){
    const net = cycleNet(c); acc += net.saldo;
    labels.push(cycleShort(c)); saldos.push(rnd2(net.saldo)); acumulados.push(rnd2(acc));
    c = cycleFor(addDaysToISO(c.to,1), sd);
  }
  const curIndex = back, un = hasCycles()? 'ciclo' : 'mês';
  renderChart(canvasId,{
    type:'line',
    data:{ labels, datasets:[
      { label:`Saldo do ${un}`, data:saldos, borderColor:CHART_COLORS.green, backgroundColor:CHART_COLORS.greenFill, tension:.3, fill:true, pointRadius:3, pointBackgroundColor:CHART_COLORS.green },
      { label:'Saldo acumulado', data:acumulados, borderColor:CHART_COLORS.yellow, backgroundColor:'transparent', borderDash:[4,3], tension:.3, pointRadius:2, pointBackgroundColor:CHART_COLORS.yellow }
    ]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ usePointStyle:true, boxWidth:8 } }, tooltip:{ callbacks:{ label:(ctx)=> `${ctx.dataset.label}: ${fmtCurrency(ctx.raw)}` } } },
      scales:{ x:{ grid:{ color:CHART_COLORS.line }, ticks:{ color:(ctx)=> ctx.index===curIndex? CHART_COLORS.ink : CHART_COLORS.inkSoft } }, y:{ grid:{ color:CHART_COLORS.line }, ticks:{ callback:(v)=>fmtCurrency(v) } } }
    }
  });
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
  const cur = todayMonthKey(), un = hasCycles()? 'ciclo' : 'mês';
  const alerts=[];
  const be = breakeven(cycleAt(0));   // o ciclo atual (ou o mês, se o seu mês começa no dia 1)
  if(be.status==='vermelho') alerts.push({sev:'rust',msg:`Seu ${un} está projetado para fechar negativo em ${fmtCurrency(Math.abs(be.margem))}.`});
  else if(be.status==='amarelo') alerts.push({sev:'gold',msg:`Seu comprometimento de renda está alto (${be.pct.toFixed(0)}% da receita prevista).`});
  endingCommitmentsCycles(2).forEach(n=>alerts.push({sev:'gold',msg:n}));
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
  budgetAlerts().forEach(a=>alerts.push(a));
  const subsTotal = state.recurring.filter(r=>r.isSubscription && r.status==='ativa').reduce((a,r)=>a+Number(r.value),0);
  if(subsTotal>0) alerts.push({sev:'grey',msg:`Você gasta ${fmtCurrency(subsTotal)}/mês (${fmtCurrency(subsTotal*12)}/ano) em assinaturas.`});
  if(!alerts.length) alerts.push({sev:'green',msg:'Nenhum alerta no momento — seus números estão sob controle.'});
  return alerts;
}
function cardUsed(cardId){
  // pendente no cartão = limite comprometido. Assinaturas recorrentes só reservam a próxima cobrança, não os meses futuros.
  const ciclo = addDaysToISO(todayISO(), 35);
  return state.transactions
    .filter(t=>t.cardId===cardId && t.type==='despesa' && t.status==='pendente' && (t.source!=='recurring' || t.date<=ciclo))
    .reduce((a,t)=>a+Number(t.value),0);
}
function installmentsPaidCount(sourceType,id){
  return state.transactions.filter(t=>t.source===sourceType && t.sourceId===id && t.status==='pago').length;
}
function daysBetween(isoA,isoB){
  const a = new Date(isoA+'T00:00:00'), b = new Date(isoB+'T00:00:00');
  return Math.round((b-a)/86400000);
}
function upcomingItems(daysAhead){
  const today = todayISO();
  const limit = new Date(today+'T00:00:00');
  limit.setDate(limit.getDate()+daysAhead);
  const limitIso = `${limit.getFullYear()}-${pad(limit.getMonth()+1)}-${pad(limit.getDate())}`;
  const overdueLimit = new Date(today+'T00:00:00');
  overdueLimit.setDate(overdueLimit.getDate()-45);
  const overdueIso = `${overdueLimit.getFullYear()}-${pad(overdueLimit.getMonth()+1)}-${pad(overdueLimit.getDate())}`;
  return state.transactions
    .filter(t=>t.status==='pendente' && t.date && t.date>=overdueIso && t.date<=limitIso)
    .sort((a,b)=> (a.date||'').localeCompare(b.date||''))
    .map(t=>({...t, daysUntil: daysBetween(today, t.date)}));
}


/* ===================== MODAL SYSTEM ===================== */
const modalRoot = ()=>document.getElementById('modal-root');
function closeModal(){ modalRoot().innerHTML=''; }
function confirmModal(title,message,onConfirm,confirmLabel,confirmClass){
  modalRoot().innerHTML = `
  <div class="modal-backdrop" data-close="1">
    <div class="modal confirm">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      <div class="modal-actions">
        <button class="btn" id="m-cancel">Cancelar</button>
        <button class="btn ${escapeHtml(confirmClass||'danger')}" id="m-ok">${escapeHtml(confirmLabel||'Excluir')}</button>
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
  $$('.modal-actions [data-i]').forEach(btn=>btn.onclick=()=>{ const action = choices[+btn.dataset.i].action; closeModal(); action(); });
  $('.modal-backdrop').onclick=(e)=>{ if(e.target.dataset.close) closeModal(); };
}

/* ===================== CURRENCY MASK ===================== */
function formatCurrencyDigits(num){
  const neg = Number(num)<0;
  let cents = Math.round(Math.abs(Number(num)||0)*100);
  let s = String(cents).padStart(3,'0');
  let decimals = s.slice(-2);
  let intPart = s.slice(0,-2).replace(/^0+(?=\d)/,'');
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  return (neg?'-':'')+intPart+','+decimals;
}
function parseCurrencyValue(str){
  if(str==null || str==='') return 0;
  const clean = String(str).replace(/\./g,'').replace(',','.');
  return parseFloat(clean)||0;
}
function maskCurrencyEvent(e){
  const el = e.target;
  let digits = el.value.replace(/\D/g,'');
  if(!digits) digits='0';
  digits = digits.replace(/^0+(?=\d)/,'');
  el.value = formatCurrencyDigits(parseInt(digits,10)/100);
}
function wireCurrencyMasks(root){
  (root||document).querySelectorAll('input.currency-mask').forEach(el=>{
    el.addEventListener('input', maskCurrencyEvent);
  });
}

function fieldHtml(f,val){
  const v = val==null?'':val;
  if(f.type==='note') return `<div class="modal-note">${f.html}</div>`;
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
  if(f.type==='currency'){
    const display = v!==''? formatCurrencyDigits(v) : '';
    return `<div class="field"><label>${f.label}</label><div class="currency-input"><span class="prefix">R$</span><input type="text" inputmode="decimal" autocomplete="off" class="currency-mask" name="${f.name}" value="${escapeHtml(display)}" placeholder="0,00" ${f.required?'required':''}></div></div>`;
  }
  return `<div class="field"><label>${f.label}</label><input type="${f.type}" name="${f.name}" value="${escapeHtml(v)}" ${f.required?'required':''} ${f.step?`step="${f.step}"`:''} ${f.min!=null?`min="${f.min}"`:''} ${f.placeholder?`placeholder="${escapeHtml(f.placeholder)}"`:''} ${f.inputmode?`inputmode="${f.inputmode}"`:''}></div>`;
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
  wireCurrencyMasks(document.getElementById('modal-form'));
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
      else if(f.type==='currency') values[f.name] = parseCurrencyValue(fd.get(f.name));
      else values[f.name] = fd.get(f.name);
    });
    closeModal();
    onSubmit(values);
  };
}

/* ===================== NAV / ROUTER ===================== */
const RENDERERS = {};
let currentView = 'dashboard';
let planMonth = todayMonthKey();
let reportMonth = todayMonthKey();

function switchView(view){
  currentView = view;
  $$('.nav-item[data-view]').forEach(b=>b.classList.toggle('active', b.dataset.view===view));
  $$('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');
  renderView(view);
}
function renderView(view){ if(RENDERERS[view]) RENDERERS[view](); }
function renderAll(){ renderView(currentView); }

function categoryOptions(type){
  return state.categories.filter(c=>c.status==='ativa' && (c.type===type)).map(c=>({value:c.name,label:c.name}));
}
const PAYMENT_METHODS = ['Dinheiro','PIX','Débito','Crédito','Transferência','Outro'];
function paymentOptions(){ return PAYMENT_METHODS.map(v=>({value:v,label:v})); }
function cardOptions(){ return [{value:'',label:'Nenhum'}].concat(state.cards.map(c=>({value:c.id,label:c.name}))); }
function accountOptions(includeId){ return state.accounts.filter(a=>a.status!=='inativa' || a.id===includeId).map(a=>({value:a.id,label:a.name+(a.status==='inativa'? ' (inativa)' : '')})); }

/* ===================== DASHBOARD ===================== */
let upcomingWindow = 7;
let spendWindow = 30;
/* ===================== BOAS-VINDAS DO DASHBOARD ===================== */
function greetingFor(date){
  const h = (date || new Date()).getHours();
  return h<5? 'Boa noite' : h<12? 'Bom dia' : h<18? 'Boa tarde' : 'Boa noite';
}
function friendlyName(){
  const first = ((state.settings && state.settings.nome) || '').trim().split(/\s+/)[0] || '';
  return first? first.charAt(0).toUpperCase()+first.slice(1) : '';
}
function dashboardMessage(){
  const today = todayISO();
  if(!state.transactions.length && !state.incomes.length && !state.recurring.length){
    return {ic:'sparkles', text:'Vamos organizar suas finanças? Siga os passos abaixo e, em poucos minutos, tudo fica claro.'};
  }
  const pend = state.transactions.filter(t=>t.status==='pendente' && t.type==='despesa' && t.date);
  const late = pend.filter(t=>t.date<today);
  if(late.length){
    return {ic:'alertTriangle', goto:'planejamento', text: late.length===1
      ? 'Há 1 conta com vencimento já passado esperando para ser marcada como paga.'
      : `Há ${late.length} contas com vencimento já passado esperando para serem marcadas como pagas.`};
  }
  const soon = pend.filter(t=>t.date>=today && t.date<=addDaysToISO(today,7)).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  if(soon.length){
    const n = daysBetween(today, soon[0].date);
    const when = n===0? 'hoje' : n===1? 'amanhã' : `em ${n} dias`;
    return {ic:'calendar', goto:'planejamento', text:`Próximo vencimento: ${soon[0].description}, ${when}.`+(soon.length>1? ` Mais ${soon.length-1} nos próximos 7 dias.` : '')};
  }
  return {ic:'checkCircle', text:'Tudo em dia por aqui. Nenhum vencimento nos próximos 7 dias.'};
}
function dashboardHeader(per){
  per = per || dashPeriod();
  const name = friendlyName();
  const base = name || (typeof currentUser!=='undefined' && currentUser && currentUser.email) || 'K';
  const msg = dashboardMessage();
  const sd = parseInt(state.settings.primeiroDiaMes,10)||1;
  const chips = [...(sd>1? [['ciclo','Ciclo']] : []), ['mes','Mês'], ['30d','Próx. 30 dias']];
  const left = per.daysLeft===0? 'último dia' : `faltam ${per.daysLeft} dia${per.daysLeft>1? 's' : ''}`;
  return `<div class="view-head hello-head">
    <div class="hello">
      <div class="avatar">${escapeHtml(base.charAt(0).toUpperCase())}</div>
      <div class="hello-body">
        <h1>Olá${name? ', '+escapeHtml(name) : '!'}</h1>
        <div class="view-sub">${greetingFor()} · ${escapeHtml(per.label)} · ${left}</div>
        <div class="hello-msg">${icon(msg.ic,15)}<span>${escapeHtml(msg.text)}</span>${msg.goto? `<button class="btn small" data-goto="${msg.goto}">Ver</button>` : ''}</div>
        ${name? '' : `<form id="quick-name" class="quick-name"><input type="text" id="quick-name-input" placeholder="Como você gostaria de ser chamado?" maxlength="40" autocomplete="given-name"><button class="btn small primary" type="submit">Salvar</button></form>`}
      </div>
    </div>
    <div class="dash-chips">${chips.map(([m,l])=>`<button class="dash-chip ${m===per.mode? 'active' : ''}" data-dmode="${m}">${l}</button>`).join('')}</div>
  </div>`;
}
function firstStepsCard(){
  if(state.transactions.length || state.incomes.length || state.recurring.length) return '';
  const steps = [
    {done: state.accounts.some(a=>Number(a.initialBalance)!==0), label:'Informe quanto você tem hoje', desc:'Defina o saldo da sua conta', view:'contas'},
    {done: false, label:'Cadastre suas receitas fixas', desc:'Salário, adiantamento, pensão…', view:'recorrentes', rtab:'receitas'},
    {done: false, label:'Cadastre suas despesas fixas', desc:'Assinaturas, gasolina, contas da casa…', view:'recorrentes', rtab:'despesas'},
    {done: false, label:'Registre seus gastos do dia a dia', desc:'Cada lançamento atualiza tudo sozinho', view:'lancamentos'}
  ];
  return `<div class="card first-steps">
    <div class="stat-label">Primeiros passos</div>
    <div class="steps-list">${steps.map((st,i)=>`<button class="step-btn ${st.done?'done':''}" data-view="${st.view}"${st.rtab?` data-rtab="${st.rtab}"`:''}>
      <span class="step-num">${st.done? icon('checkCircle',16) : i+1}</span>
      <span class="step-text"><strong>${st.label}</strong><small>${st.desc}</small></span>
      ${icon('chevronRight',15)}
    </button>`).join('')}</div>
  </div>`;
}
function wireDashboardHeader(){
  const form = document.getElementById('quick-name');
  if(form) form.onsubmit = (e)=>{
    e.preventDefault();
    const v = (document.getElementById('quick-name-input').value||'').trim();
    if(!v) return;
    state.settings.nome = v;
    saveState(true);
    renderAll();
  };
  $$('#view-dashboard .step-btn').forEach(b=>b.onclick=()=>{
    if(b.dataset.rtab) recorrentesTab = b.dataset.rtab;
    switchView(b.dataset.view);
  });
}

/* ===================== DASHBOARD (visão do ciclo) ===================== */
let dashMode = null;   // null = automático: ciclo, se o seu mês não começa no dia 1
function rnd2(n){ return Math.round(n*100)/100; }
function fmtDM(iso){ return iso? iso.slice(8,10)+'/'+iso.slice(5,7) : '—'; }
function dashPeriod(){
  const today = todayISO();
  const sd = parseInt(state.settings.primeiroDiaMes,10)||1;
  let mode = dashMode || (sd>1? 'ciclo' : 'mes');
  if(mode==='ciclo' && sd<=1) mode = 'mes';
  let from, to, label;
  if(mode==='ciclo'){ const c = cycleFor(today, sd); from = c.from; to = c.to; label = `Ciclo de ${fmtDM(from)} a ${fmtDM(to)}`; }
  else if(mode==='30d'){ from = today; to = addDaysToISO(today,29); label = 'Próximos 30 dias'; }
  else { const mk = todayMonthKey(); from = mk+'-01'; to = mk+'-'+pad(daysInMonth(mk)); label = monthLabel(mk); }
  return {mode, from, to, label, daysLeft: Math.max(0, daysBetween(today, to))};
}
function dashMetrics(per){
  // "Posso gastar" = saldo das contas − o que ainda vence até o fim do período − reservas de metas.
  // Receitas ainda não recebidas NÃO entram (prudência); aparecem à parte em "a receber".
  const today = todayISO();
  const pend = state.transactions.filter(t=>t.status==='pendente' && t.date && (t.type==='receita' || t.type==='despesa'));
  const virt = virtualEntriesBetween(addDaysToISO(today,-1), per.to);   // previsão das recorrentes além da janela real
  const upDes = pend.filter(t=>t.type==='despesa' && t.date>=today && t.date<=per.to).concat(virt.filter(v=>v.type==='despesa'));
  const upRec = pend.filter(t=>t.type==='receita' && t.date>=today && t.date<=per.to).concat(virt.filter(v=>v.type==='receita'));
  const late = pend.filter(t=>t.type==='despesa' && t.date<today);
  const sum = a=>rnd2(a.reduce((x,t)=>x+(Number(t.value)||0),0));
  const saldo = rnd2(totalAvailable());
  const aPagar = sum(upDes), aReceber = sum(upRec), atrasado = sum(late);
  const reservas = rnd2(state.goals.filter(g=>!goalDone(g)).reduce((a,g)=>a+(Number(g.monthlyPlanned)||0),0));
  return {saldo, aPagar, aPagarCount:upDes.length, aReceber, atrasado, atrasadoCount:late.length, reservas,
          livre: rnd2(saldo-aPagar-reservas), fimProjetado: rnd2(saldo+aReceber-aPagar)};
}
const WD_SHORT = ['dom','seg','ter','qua','qui','sex','sáb'];
function fmtDayShort(iso){ const [y,m,d] = iso.split('-').map(Number); return WD_SHORT[new Date(y,m-1,d).getDay()]+', '+fmtDM(iso); }
function dashDueToday(){
  // o que vence hoje e ainda está pendente: sai do saldo ao fim do dia, então aparece a partir de amanhã
  const today = todayISO();
  const real = state.transactions.filter(t=>t.status==='pendente' && t.date===today && (t.type==='receita' || t.type==='despesa'));
  return real.concat(virtualEntriesBetween(addDaysToISO(today,-1), today).filter(v=>v.date===today));
}
function dashSeries(per){
  const today = todayISO(), pts = [];
  const dueNet = dashDueToday().reduce((a,t)=>a+(t.type==='receita'? 1 : -1)*(Number(t.value)||0),0);
  for(let d=per.from, k=0; d<=per.to && k<400; d=addDaysToISO(d,1), k++){
    let v = balanceAsOfDate(d);
    if(v===null) continue;
    if(d>today) v += dueNet;
    pts.push({date:d, value:rnd2(v), proj:d>today});
  }
  return pts;
}
function dashDayInfo(pts, i){
  const today = todayISO(), p = pts[i], d = p.date;
  const mk = t=>({description:t.description, type:t.type, value:Number(t.value)||0, note:t.note||''});
  const isFlow = t=>t.type==='receita' || t.type==='despesa';
  let items;
  if(d<=today) items = state.transactions.filter(t=>isFlow(t) && t.status==='pago' && cashDate(t)===d).map(mk);
  else {
    items = state.transactions.filter(t=>isFlow(t) && t.status==='pendente' && t.date===d).map(mk)
      .concat(virtualEntriesBetween(addDaysToISO(d,-1), d).filter(v=>v.date===d).map(mk));
    if(d===addDaysToISO(today,1)) items = dashDueToday().map(t=>({...mk(t), note:'vence hoje'})).concat(items);
  }
  items.sort((a,b)=>b.value-a.value);
  const hasSim = typeof p.sim==='number' && p.sim!==p.value;
  return {date:d, label:fmtDayShort(d), value:p.value, sim: hasSim? p.sim : null, simDelta: hasSim? rnd2(p.sim-p.value) : null, delta: i>0? rnd2(p.value-pts[i-1].value) : null, proj:p.proj, isToday:d===today, items};
}
function dashTipHtml(info){
  const tag = info.isToday? 'Hoje' : info.proj? 'Previsto' : 'Já aconteceu';
  const signed = (v)=>(v<0? '−' : '+')+fmtCurrency(Math.abs(v));
  const delta = (info.delta===null || info.delta===0)? '' : `<div class="dc-tip-delta ${signClass(info.delta)}">${signed(info.delta)} no dia</div>`;
  const list = info.items.slice(0,4).map(x=>`<li><span>${escapeHtml(x.description)}${x.note? ` <em>(${escapeHtml(x.note)})</em>` : ''}</span><b class="${x.type==='receita'? 'pos' : 'neg'}">${x.type==='receita'? '+' : '−'}${fmtCurrency(x.value)}</b></li>`).join('');
  const more = info.items.length>4? `<li class="dc-more">+ ${info.items.length-4} a mais</li>` : '';
  return `<div class="dc-tip-head"><b>${escapeHtml(info.label)}</b><span class="badge grey">${tag}</span></div>`
    + `<div class="dc-tip-val num ${signClass(info.value)}">${fmtCurrency(info.value)}</div>${delta}`
    + (info.sim!==null && info.sim!==undefined? `<div class="dc-tip-sim">Com a compra: <b class="num ${signClass(info.sim)}">${fmtCurrency(info.sim)}</b> <span>(${signed(info.simDelta)})</span></div>` : '')
    + (list || more? `<ul class="dc-tip-list">${list}${more}</ul>` : '');
}
function wireDashChart(wrap, pts){
  const svg = wrap.querySelector('svg.dc-svg'), tip = wrap.querySelector('.dc-tip');
  if(!svg || !tip || pts.length<2) return;
  const W = Number(svg.dataset.w), H = Number(svg.dataset.h), ys = svg.dataset.ys.split(',').map(Number), n = pts.length;
  const guide = svg.querySelector('.dc-guide'), dot = svg.querySelector('.dc-hover');
  const ti = Math.max(0, pts.findIndex(p=>p.date===todayISO()));
  let cur = -1;
  const show = (i)=>{
    i = Math.max(0, Math.min(n-1, i)); cur = i;
    const x = i/(n-1)*W, y = ys[i];
    guide.setAttribute('x1',x); guide.setAttribute('x2',x); guide.setAttribute('visibility','visible');
    dot.setAttribute('cx',x); dot.setAttribute('cy',y); dot.setAttribute('visibility','visible');
    tip.innerHTML = dashTipHtml(dashDayInfo(pts,i)); tip.hidden = false;
    const r = svg.getBoundingClientRect(), tw = tip.offsetWidth || 200, th = tip.offsetHeight || 120;
    const px = x/W*r.width, py = y/H*r.height;
    let left = px+16; if(left+tw>r.width) left = px-tw-16; if(left<0) left = 0;
    let top = py-th-12; if(top<0) top = py+16;
    tip.style.left = left+'px'; tip.style.top = top+'px';
  };
  const hide = ()=>{ cur = -1; guide.setAttribute('visibility','hidden'); dot.setAttribute('visibility','hidden'); tip.hidden = true; };
  const idxAt = (cx)=>{ const r = svg.getBoundingClientRect(); return r.width? Math.round((cx-r.left)/r.width*(n-1)) : 0; };
  svg.addEventListener('pointermove', e=>show(idxAt(e.clientX)));
  svg.addEventListener('pointerdown', e=>show(idxAt(e.clientX)));
  svg.addEventListener('pointerleave', e=>{ if(e.pointerType!=='touch') hide(); });   // no toque, o cartão fica até você tocar de novo
  svg.addEventListener('focus', ()=>{ if(cur<0) show(ti); });
  svg.addEventListener('blur', hide);
  svg.addEventListener('keydown', e=>{
    if(e.key==='ArrowRight'){ e.preventDefault(); show(cur<0? ti : cur+1); }
    else if(e.key==='ArrowLeft'){ e.preventDefault(); show(cur<0? ti : cur-1); }
    else if(e.key==='Escape') hide();
  });
}
function dashChartSvg(pts){
  const today = todayISO();
  if(pts.length<2) return '<div class="dash-note">Ainda não há dados suficientes para mostrar a evolução do saldo.</div>';
  const W=640, H=214, top=26, bot=26, n=pts.length;
  const vals = pts.map(p=>p.value);
  const simVals = pts.every(p=>typeof p.sim==='number') && pts.some(p=>p.sim!==p.value)? pts.map(p=>p.sim) : null;
  const allVals = simVals? vals.concat(simVals) : vals;
  const lo = Math.min(0,...allVals), hi0 = Math.max(...allVals,1), hi = hi0+(hi0-lo)*0.06;
  const X = i=>(i/(n-1))*W;
  const Y = v=>top+(hi-v)/(hi-lo)*(H-top-bot);
  const f = x=>x.toFixed(1);
  const ti = pts.findIndex(p=>p.date===today);
  const split = ti>=0? ti : (pts[0].date>today? 0 : n-1);
  const segOf = (arr,a,b)=>{ let d = `M${f(X(a))} ${f(Y(arr[a]))}`; for(let i=a+1;i<=b;i++) d += `H${f(X(i))}V${f(Y(arr[i]))}`; return d; };
  const seg = (a,b)=>segOf(vals,a,b);
  const past = split>0? seg(0,split) : '', fut = split<n-1? seg(split,n-1) : '';
  const area = seg(0,n-1)+`V${H-bot}H0Z`;
  const anchor = x=>x>W*0.62? 'end' : 'start', dx = x=>x>W*0.62? -9 : 9;
  const txt = (x,y,t,cls)=>`<text x="${f(x+dx(x))}" y="${f(y)}" text-anchor="${anchor(x)}"${cls? ` class="${cls}"` : ''}>${t}</text>`;
  let marks = '';
  // hoje
  const xt = X(split), yt = Y(vals[split]);
  if(pts[split].date===today){
    if(split>0) marks += `<path d="M${f(xt)} ${top-12}V${H-bot}" class="dc-today"/>`;
    marks += `<circle cx="${f(xt)}" cy="${f(yt)}" r="6" class="dc-dot"/>` + txt(xt, yt-12, `hoje · ${fmtCurrency(vals[split])}`);
  }
  // menor saldo da previsão
  let mi = split;
  for(let i=split;i<n;i++) if(vals[i]<vals[mi]) mi = i;
  if(mi>split && vals[mi]<vals[split]){
    marks += `<circle cx="${f(X(mi))}" cy="${f(Y(vals[mi]))}" r="6" class="dc-min"/>` + txt(X(mi), Y(vals[mi])+22, `menor saldo · ${fmtCurrency(vals[mi])} (${fmtDM(pts[mi].date)})`, 'dc-neg-t');
  }
  // maior entrada prevista
  let bi = -1, bv = 0;
  for(let i=split+1;i<n;i++){ const d = vals[i]-vals[i-1]; if(d>bv){ bv = d; bi = i; } }
  if(bi>0) marks += txt(X(bi), Y(vals[bi])-12, `entra ${fmtCurrency(rnd2(bv))} em ${fmtDM(pts[bi].date)}`, 'dc-pos-t');
  // simulação: segunda linha (pontilhada) e o menor saldo com a compra
  let simPath = '', simAria = '';
  if(simVals && split<n-1){
    simPath = `<path d="${segOf(simVals,split,n-1)}" class="dc-sim"/>`;
    let si = split; for(let i=split;i<n;i++) if(simVals[i]<simVals[si]) si = i;
    const near = mi>split && Math.abs(X(si)-X(mi))<120;
    marks += `<circle cx="${f(X(si))}" cy="${f(Y(simVals[si]))}" r="6" class="dc-simdot"/>` + txt(X(si), Y(simVals[si])+(near? 40 : 22), `com a compra · ${fmtCurrency(simVals[si])} (${fmtDM(pts[si].date)})`, 'dc-sim-t');
    simAria = `, com a compra o menor saldo seria ${fmtCurrency(simVals[si])} em ${fmtDM(pts[si].date)}`;
  }
  const zero = lo<0? `<path d="M0 ${f(Y(0))}H${W}" class="dc-zero"/><text x="4" y="${f(Y(0)-5)}" class="dc-neg-t">R$ 0</text>` : '';
  const grid = [0.25,0.5,0.75].map(g=>`<path d="M0 ${f(top+(H-top-bot)*g)}H${W}"/>`).join('');
  const ys = pts.map(p=>Y(p.value).toFixed(1)).join(',');
  const last = pts[n-1];
  const aria = `Saldo ${pts[split].date===today? 'hoje '+fmtCurrency(vals[split])+', ' : ''}${mi>split? 'menor saldo '+fmtCurrency(vals[mi])+' em '+fmtDM(pts[mi].date)+', ' : ''}termina em ${fmtCurrency(last.value)} em ${fmtDM(last.date)}${simAria}`;
  return `<svg class="dc-svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" tabindex="0" aria-label="${escapeHtml(aria)}" data-w="${W}" data-h="${H}" data-ys="${ys}" style="display:block;font-size:12px">
    <g class="dc-grid">${grid}</g>${zero}
    <path d="${area}" class="dc-area"/>
    ${past? `<path d="${past}" class="dc-past"/>` : ''}
    ${fut? `<path d="${fut}" class="dc-fut"/>` : ''}
    ${simPath}
    <g class="dc-text">${marks}<text x="2" y="${H-8}">${fmtDM(pts[0].date)}</text><text x="${W-2}" y="${H-8}" text-anchor="end">${fmtDM(last.date)}</text></g><line class="dc-guide" x1="0" x2="0" y1="${top-12}" y2="${H-bot}" visibility="hidden"/><circle class="dc-hover" r="6" cx="0" cy="0" visibility="hidden"/></svg>`;
}
let dashSim = null;   // simulação "e se eu comprar isso?": só na tela, nada é lançado
function simEvents(sim){
  // as saídas que a compra causaria: à vista = 1 saída na data; parcelado = 1 por fatura, no vencimento (mesmas regras dos lançamentos reais)
  const today = todayISO(), v = rnd2(Number(sim.value)||0);
  if(!(v>0)) return [];
  const date = (sim.date && sim.date>=today)? sim.date : today;
  if(sim.mode!=='parcelado') return [{date, value:v}];
  const card = state.cards.find(c=>c.id===sim.cardId);
  if(!card) return [];
  const n = Math.max(1, Math.min(60, parseInt(sim.count,10)||1));
  const first = openInvoiceMonthFrom(card, cardInvoiceFor(card, date).invoiceMonth);
  const each = Math.floor(v/n*100)/100, out = []; let acc = 0;
  for(let i=0;i<n;i++){ const val = i===n-1? rnd2(v-acc) : each; acc = rnd2(acc+val); out.push({date:invoiceDueDate(card, addMonthsToKey(first,i)), value:val}); }
  return out;
}
function simSeries(pts, events){
  // saldo com a compra: o que sai hoje pesa a partir de amanhã (mesma regra das contas que vencem hoje)
  const today = todayISO();
  return pts.map(p=> p.date<=today? p.value : rnd2(p.value - events.filter(e=>e.date<=p.date).reduce((a,e)=>a+e.value,0)));
}
function simSummary(per, m, pts, events){
  const today = todayISO();
  const fut = pts.filter(p=>p.date>=today && typeof p.sim==='number');
  const minOf = (key)=>fut.reduce((a,p)=> (a===null || p[key]<a.value)? {value:p[key], date:p.date} : a, null);
  const inPeriod = rnd2(events.filter(e=>e.date<=per.to).reduce((a,e)=>a+e.value,0));
  const beyond = events.filter(e=>e.date>per.to);
  const neg = fut.find(p=>p.sim<0 && p.value>=0);
  return {minBefore:minOf('value'), minAfter:minOf('sim'), endBefore:pts[pts.length-1].value, endAfter:pts[pts.length-1].sim,
          livreBefore:m.livre, livreAfter:rnd2(m.livre-inPeriod), inPeriod, beyondCount:beyond.length, beyondEach:beyond.length? beyond[0].value : 0,
          beyondTotal:rnd2(beyond.reduce((a,e)=>a+e.value,0)), total:rnd2(events.reduce((a,e)=>a+e.value,0)), negDate:neg? neg.date : null};
}
function dashSimHtml(per, sim, sum, events){
  const un = hasCycles()? 'ciclo' : 'mês', unPl = hasCycles()? 'ciclos' : 'meses', card = state.cards.find(c=>c.id===sim.cardId);
  const how = sim.mode==='parcelado' && card? `em ${events.length}x de ${fmtCurrency(events[0].value)} no ${escapeHtml(card.name)}` : `à vista${events[0] && events[0].date>todayISO()? ' em '+fmtDM(events[0].date) : ''}`;
  const row = (label, before, after, extra)=>`<div><div class="lab">${label}</div><div class="dash-sim-v"><span class="num">${fmtCurrency(before)}</span> → <b class="num ${signClass(after)}">${fmtCurrency(after)}</b>${extra? ` <span class="dash-sim-d">${extra}</span>` : ''}</div></div>`;
  return `<div class="dash-sim">
    <div class="dash-sim-head"><div><b>Simulação:</b> ${escapeHtml(sim.description)} · ${fmtCurrency(sum.total)} ${how}</div>
      <div class="dash-sim-actions"><button class="btn small" id="sim-edit">Editar</button><button class="btn small" id="sim-clear">Limpar</button></div></div>
    <div class="dash-sim-grid">
      ${row('Menor saldo do período', sum.minBefore.value, sum.minAfter.value, sum.minAfter? '('+fmtDM(sum.minAfter.date)+')' : '')}
      ${row('Saldo no fim do período', sum.endBefore, sum.endAfter)}
      ${row(`Posso gastar até ${fmtDM(per.to)}`, sum.livreBefore, sum.livreAfter)}
    </div>
    ${sum.negDate? `<div class="dash-note neg" style="margin-top:12px">Com essa compra o saldo ficaria <b>negativo a partir de ${fmtDM(sum.negDate)}</b>.</div>` : ''}
    ${sum.beyondCount? `<div class="dash-note">As outras ${sum.beyondCount} parcela${sum.beyondCount===1? '' : 's'} (${fmtCurrency(sum.beyondTotal)}) pesam nos próximos ${unPl}: cerca de ${fmtCurrency(sum.beyondEach)} por ${un}.</div>` : ''}
    <div class="dash-note">Nada foi lançado: é só uma simulação. Ela some ao recarregar a página.</div>
  </div>`;
}
function openSimModal(){
  const cur = dashSim || {description:'', value:'', mode:'avista', count:10, cardId:(state.cards[0]||{}).id||'', date:todayISO()};
  openFormModal({
    title:'Simular uma compra',
    initial:{...cur, value:cur.value||''},
    fields:[
      {name:'note', type:'note', html:'Veja como uma compra mudaria o seu saldo e o "posso gastar". Nada é lançado.'},
      {name:'description', label:'O que é (opcional)', type:'text'},
      {row:[{name:'value', label:'Valor total', type:'currency'}, {name:'date', label:'Data da compra', type:'date'}]},
      {name:'mode', label:'Como vai pagar', type:'select', options:[{value:'avista',label:'À vista (sai da conta)'},{value:'parcelado',label:'Parcelado no cartão'}]},
      {row:[{name:'cardId', label:'Cartão (se parcelado)', type:'select', options: state.cards.length? state.cards.map(c=>({value:c.id,label:c.name})) : [{value:'',label:'Nenhum cartão cadastrado'}]}, {name:'count', label:'Parcelas', type:'number'}]}
    ],
    submitLabel:'Simular',
    onSubmit(v){
      if(!(v.value>0)){ showToast('Informe o valor da compra para simular.','error'); return; }
      if(v.mode==='parcelado' && !state.cards.some(c=>c.id===v.cardId)){ showToast('Cadastre um cartão para simular uma compra parcelada.','error'); return; }
      dashSim = {description:(v.description||'').trim() || 'Compra simulada', value:v.value, mode:v.mode, count:Math.max(1,Math.min(60,Math.round(v.count)||1)), cardId:v.cardId, date:v.date||todayISO()};
      RENDERERS.dashboard();
    }
  });
}
/* ===================== ORÇAMENTO: teto diário e fluxo do dinheiro ===================== */
let budTab = 'visao';   // visao | fluxo | limites | dia
let flowPeriod = {mode:null, month:null, custom:{from:'',to:''}, cycleRef:null};
let flowBy = 'categoria';   // como agrupar as saídas: categoria | tipo | pagamento | conta
const FLOW_SOURCE_LABEL = {manual:'Dia a dia', recurring:'Contas recorrentes', installment:'Parcelamentos', debt:'Dívidas', income:'Receitas fixas'};
function budgetPeriod(){
  const today = todayISO(), c = cycleAt(0);
  const total = daysBetween(c.from,c.to)+1;
  return {from:c.from, to:c.to, label:cycleLabel(c), daysTotal:total, daysLeft:Math.max(1, daysBetween(today,c.to)+1), dayIndex:Math.min(total, Math.max(1, daysBetween(c.from,today)+1))};
}
function manualCashSpent(from, to){
  // gasto do dia a dia que já saiu da conta (lançamento manual, pago, fora do cartão)
  return rnd2(state.transactions.filter(t=>t.type==='despesa' && t.source==='manual' && !t.cardId && t.status==='pago').reduce((a,t)=>{ const d = cashDate(t); return (d>=from && d<=to)? a+(Number(t.value)||0) : a; },0));
}
function allowanceInfo(){
  // teto diário = o que sobra livre (saldo − o que ainda vence − reservas) ÷ dias que faltam, hoje incluído. Recalcula sozinho a cada gasto.
  const today = todayISO(), per = budgetPeriod();
  const m = dashMetrics({from:per.from, to:per.to, mode:'ciclo', label:per.label, daysLeft:per.daysLeft});
  const spentToday = manualCashSpent(today,today);
  const cardToday = rnd2(state.transactions.filter(t=>t.type==='despesa' && t.cardId && t.source==='manual' && t.purchaseDate===today).reduce((a,t)=>a+(Number(t.value)||0),0));
  const perDay = rnd2(m.livre/per.daysLeft);
  const perDayStart = rnd2((m.livre+spentToday)/per.daysLeft);   // o teto que valia ao acordar hoje
  const leftToday = rnd2(perDayStart-spentToday);
  const tomorrow = per.daysLeft>1? rnd2(m.livre/(per.daysLeft-1)) : null;   // se não gastar mais nada hoje
  const avg7 = rnd2(manualCashSpent(addDaysToISO(today,-6),today)/7);
  const spentPeriod = manualCashSpent(per.from,today), avgPeriod = rnd2(spentPeriod/per.dayIndex);
  const daysOfCover = (avg7>0 && m.livre>0)? Math.floor(m.livre/avg7) : null;
  const runoutDate = (daysOfCover!==null && daysOfCover<per.daysLeft)? addDaysToISO(today,daysOfCover) : null;   // quando o livre acabaria no ritmo recente
  const overBy = avg7>0? rnd2(Math.max(0, avg7*per.daysLeft-m.livre)) : 0;   // quanto faltaria até o fim se mantiver o ritmo
  const status = m.livre<=0? 'sem-margem' : avg7>perDay? 'acima' : 'ok';
  return {per, m, livre:m.livre, perDay, perDayStart, spentToday, cardToday, leftToday, tomorrow, avg7, spentPeriod, avgPeriod, daysOfCover, runoutDate, overBy, status};
}
function dailyBreakdown(per){
  const today = todayISO(), s = periodSummary(per), map = {}, out = [];
  for(let d=per.from; d<=per.to; d=addDaysToISO(d,1)) map[d] = {date:d, dia:0, fixas:0, cartao:0, future:d>today};
  s.txns.forEach(t=>{
    if(t.type!=='despesa') return;
    const b = map[cashDate(t)]; if(!b) return;
    const v = Number(t.value)||0;
    if(t.cardId) b.cartao += v; else if(t.source==='manual') b.dia += v; else b.fixas += v;
  });
  Object.keys(map).sort().forEach(d=>{ const b = map[d]; out.push({...b, dia:rnd2(b.dia), fixas:rnd2(b.fixas), cartao:rnd2(b.cartao)}); });
  return out;
}
function flowItems(txs){
  return txs.map(t=>({id:t.id, date:cashDate(t)||'', description:t.description||'—', category:t.category||'Sem categoria', value:Number(t.value)||0, status:t.status==='pago'? 'pago' : 'pendente', virtual:!!t.virtual, source:t.source||'manual',
    method: t.cardId? 'Cartão de crédito' : (t.paymentMethod||'Outro'), account:(state.accounts.find(a=>a.id===t.accountId)||{}).name || 'Sem conta'}));
}
function flowGroups(items, keyFn){
  const m = new Map();
  items.forEach(it=>{ const k = keyFn(it); const g = m.get(k) || {key:k, total:0, paid:0, pending:0, items:[]}; g.total += it.value; if(it.status==='pago') g.paid += it.value; else g.pending += it.value; g.items.push(it); m.set(k,g); });
  return [...m.values()].map(g=>({...g, total:rnd2(g.total), paid:rnd2(g.paid), pending:rnd2(g.pending), items:g.items.sort((a,b)=>a.date.localeCompare(b.date) || b.value-a.value)}))
    .sort((a,b)=>b.total-a.total || a.key.localeCompare(b.key));
}
function flowData(per){
  const s = periodSummary(per);
  const rec = flowItems(s.txns.filter(t=>t.type==='receita')), des = flowItems(s.txns.filter(t=>t.type==='despesa'));
  const sum = (a,f)=>rnd2(a.filter(f).reduce((x,i)=>x+i.value,0)), all = ()=>true;
  const entrou = sum(rec,all), saiu = sum(des,all);
  return {per, rec, des, entrou, saiu, sobra:rnd2(entrou-saiu),
    recPaid:sum(rec,i=>i.status==='pago'), recPending:sum(rec,i=>i.status!=='pago'), desPaid:sum(des,i=>i.status==='pago'), desPending:sum(des,i=>i.status!=='pago'),
    essential:sum(des,i=>categoryEssential(i.category)), byRecCat:flowGroups(rec,i=>i.category), recByAccount:flowGroups(rec,i=>i.account),
    by:{categoria:flowGroups(des,i=>i.category), tipo:flowGroups(des,i=>FLOW_SOURCE_LABEL[i.source]||'Outros'), pagamento:flowGroups(des,i=>i.method), conta:flowGroups(des,i=>i.account)}};
}
function sankeyLayout(srcs, dsts, o){
  o = o || {};
  const W=o.W||900, H=o.H||380, nodeW=o.nodeW||14, labelW=o.labelW||190, gap=o.gap||8, minH=o.minH||18, f=x=>Math.round(x*10)/10;
  const total = srcs.reduce((a,n)=>a+n.value,0);
  if(!(total>0) || !srcs.length || !dsts.length) return {nodes:[], links:[], W, H, total:0};
  const kFor = (arr)=>{   // maior escala em que a coluna cabe na altura, respeitando a altura mínima de cada nó
    const fits = (k)=>arr.reduce((a,n)=>a+Math.max(minH,n.value*k),0)+gap*(arr.length-1) <= H;
    let hi = (H-gap*(arr.length-1))/total, lo = 0;
    if(fits(hi)) return hi;
    for(let i=0;i<30;i++){ const mid = (lo+hi)/2; if(fits(mid)) lo = mid; else hi = mid; }
    return lo;
  };
  const k = Math.min(kFor(srcs), kFor(dsts));
  const place = (arr,side,x)=>{ const hs = arr.map(n=>Math.max(minH,n.value*k)); let y = (H-(hs.reduce((a,b)=>a+b,0)+gap*(arr.length-1)))/2; return arr.map((n,i)=>{ const node = {...n, side, x, y:f(y), h:f(hs[i])}; y += hs[i]+gap; return node; }); };
  const L = place(srcs,'src',labelW), Rr = place(dsts,'dst',W-labelW-nodeW);
  const midX = (W-nodeW)/2, midH = total*k, midY = (H-midH)/2;
  const mid = {key:'__mid', label:'Dinheiro do período', value:rnd2(total), kind:'mid', side:'mid', x:f(midX), y:f(midY), h:f(midH)};
  const bez = (x0,y0a,y0b,x1,y1a,y1b)=>{ const xm = (x0+x1)/2; return `M${f(x0)} ${f(y0a)}C${f(xm)} ${f(y0a)},${f(xm)} ${f(y1a)},${f(x1)} ${f(y1a)}L${f(x1)} ${f(y1b)}C${f(xm)} ${f(y1b)},${f(xm)} ${f(y0b)},${f(x0)} ${f(y0b)}Z`; };
  const links = []; let cy = midY;
  L.forEach(n=>{ const t = Math.max(2,n.value*k), c = n.y+n.h/2, t2 = n.value*k; links.push({side:'src', key:n.key, label:n.label, value:n.value, kind:n.kind, d:bez(n.x+nodeW, c-t/2, c+t/2, midX, cy, cy+t2)}); cy += t2; });
  cy = midY;
  Rr.forEach(n=>{ const t = Math.max(2,n.value*k), c = n.y+n.h/2, t2 = n.value*k; links.push({side:'dst', key:n.key, label:n.label, value:n.value, kind:n.kind, d:bez(midX+nodeW, cy, cy+t2, n.x, c-t/2, c+t/2)}); cy += t2; });
  return {nodes:[...L, mid, ...Rr], links, W, H, total:rnd2(total), nodeW, k};
}
function flowSankeySvg(fd){
  const take = (groups,n,other)=>{ const top = groups.slice(0,n).map(g=>({key:g.key, label:g.key, value:g.total})), rest = groups.slice(n); if(rest.length) top.push({key:'__outras', label:`${other} (${rest.length})`, value:rnd2(rest.reduce((a,g)=>a+g.total,0))}); return top; };
  const srcs = take(fd.byRecCat,6,'Outras receitas').map(n=>({...n,kind:'in'}));
  const dsts = take(fd.by.categoria,8,'Outras categorias').map(n=>({...n,kind:'out'}));
  if(fd.sobra>0) dsts.push({key:'__sobra', label:'Sobra do período', value:fd.sobra, kind:'keep'});
  if(fd.sobra<0) srcs.push({key:'__falta', label:'Do saldo que já tinha', value:-fd.sobra, kind:'gap'});
  const H = Math.min(460, Math.max(260, Math.max(srcs.length,dsts.length)*38));
  const lay = sankeyLayout(srcs, dsts, {W:900, H});
  if(!lay.nodes.length) return '<div class="dash-note">Sem receitas nem despesas neste período.</div>';
  const totIn = lay.total;
  const pct = (v)=>totIn? Math.round(v/totIn*100) : 0;
  const trunc = (t,n)=>t.length>n? t.slice(0,n-1)+'…' : t;
  const tip = (n)=>`data-title="${escapeHtml(n.label)}" data-value="${escapeHtml(fmtCurrency(n.value)+' · '+pct(n.value)+'% do total')}"`;
  const bands = lay.links.map(l=>`<path class="sk-band sk-${l.kind}" d="${l.d}" ${tip(l)}/>`).join('');
  const nodes = lay.nodes.map(n=>{
    const lab = n.kind==='mid'? '' : `<text class="sk-lab" x="${n.side==='src'? n.x-8 : n.x+lay.nodeW+8}" y="${n.y+n.h/2+4}" text-anchor="${n.side==='src'? 'end' : 'start'}">${escapeHtml(trunc(n.label,22))} · ${escapeHtml(fmtCurrency(n.value))}</text>`;
    return `<rect class="sk-node sk-${n.kind}" x="${n.x}" y="${n.y}" width="${lay.nodeW}" height="${n.h}" ${tip(n)}/>${lab}`;
  }).join('');
  const aria = `Fluxo do dinheiro: entram ${fmtCurrency(fd.entrou)} e saem ${fmtCurrency(fd.saiu)}; ${fd.sobra>=0? 'sobram '+fmtCurrency(fd.sobra) : 'faltam '+fmtCurrency(-fd.sobra)}`;
  return `<svg class="sk-svg" viewBox="0 0 ${lay.W} ${lay.H}" role="img" aria-label="${escapeHtml(aria)}">${bands}${nodes}</svg>`;
}
function wireFlowTips(wrap){
  const tip = wrap.querySelector('.dc-tip'); if(!tip) return;
  wrap.querySelectorAll('[data-title]').forEach(el=>{
    el.addEventListener('pointermove', (e)=>{
      const r = wrap.getBoundingClientRect();
      tip.innerHTML = `<div class="dc-tip-head"><b>${escapeHtml(el.dataset.title)}</b></div><div class="dc-tip-val num" style="font-size:15px">${escapeHtml(el.dataset.value)}</div>`;
      tip.hidden = false;
      const tw = tip.offsetWidth || 220; let left = e.clientX-r.left+14; if(left+tw>r.width) left = e.clientX-r.left-tw-14;
      tip.style.left = Math.max(0,left)+'px'; tip.style.top = Math.max(0,e.clientY-r.top-52)+'px';
    });
    el.addEventListener('pointerleave', ()=>{ tip.hidden = true; });
  });
}
function flowGroupsHtml(groups, total, kind){
  if(!groups.length) return '<div class="dash-note">Nada neste período.</div>';
  const doneWord = kind==='pos'? 'Recebido' : 'Pago', todoWord = kind==='pos'? 'A receber' : 'A pagar';
  return groups.map(g=>{
    const pct = total? g.total/total*100 : 0;
    return `<details class="flow-group"><summary><span class="fg-name" title="${escapeHtml(g.key)}">${escapeHtml(g.key)}</span><span class="fg-bar"><i class="${kind}" style="width:${Math.max(2,Math.min(100,pct)).toFixed(0)}%"></i></span><span class="fg-val num ${kind}">${fmtCurrency(g.total)}</span><span class="fg-pct">${Math.round(pct)}%</span></summary>
      <div class="fg-sub">${g.paid>0? doneWord+' '+fmtCurrency(g.paid) : ''}${g.paid>0 && g.pending>0? ' · ' : ''}${g.pending>0? todoWord+' '+fmtCurrency(g.pending) : ''} · ${g.items.length} lançamento${g.items.length===1? '' : 's'}</div>
      <table class="fg-table"><tbody>${g.items.map(it=>`<tr><td>${fmtDM(it.date)}</td><td>${escapeHtml(it.description)}${it.virtual? ' <span class="badge grey">Previsto</span>' : ''}</td><td class="fg-meta">${escapeHtml(it.method)} · ${escapeHtml(it.account)}</td><td>${it.status==='pago'? `<span class="badge green">${doneWord}</span>` : '<span class="badge gold">Pendente</span>'}</td><td class="right num ${kind}">${fmtCurrency(it.value)}</td></tr>`).join('')}</tbody></table></details>`;
  }).join('');
}
function flowPeriodBarHtml(p){
  const sd = parseInt(state.settings.primeiroDiaMes,10)||1;
  const modes = [...(sd>1? [['ciclo',`Ciclo (dia ${sd})`]] : []), ['mes','Mês'], ['30d','Últimos 30 dias'], ['ano','Este ano'], ['custom','Personalizado']];
  const per = resolvePeriod(p), nav = p.mode==='mes' || p.mode==='ciclo';
  return `<div class="period-bar">
    ${modes.map(([m,l])=>`<button class="fb-btn ${m===p.mode? 'active' : ''}" data-fbmode="${m}">${escapeHtml(l)}</button>`).join('')}
    <span class="lp-nav">${nav? `<button class="btn" id="fb-prev">${icon('chevronLeft',16)}</button>` : ''}<span class="lp-label">${escapeHtml(per.label)}</span>${nav? `<button class="btn" id="fb-next">${icon('chevronRight',16)}</button>` : ''}</span>
    ${p.mode==='custom'? `<span class="period-range"><label>De <input type="date" id="fb-from" value="${per.from}"></label><label>Até <input type="date" id="fb-to" value="${per.to}"></label></span>` : ''}
  </div>`;
}
function todaySpendHtml(){
  const today = todayISO();
  const items = state.transactions.filter(t=>t.type==='despesa' && ((t.status==='pago' && cashDate(t)===today && !t.cardId) || (t.cardId && t.source==='manual' && t.purchaseDate===today)));
  if(!items.length) return '<div class="dash-note">Nada gasto hoje até agora.</div>';
  return items.map(t=>`<div class="dash-li"><span>${escapeHtml(t.description)}${t.cardId? ' <span class="badge grey">cartão</span>' : t.source!=='manual'? ` <span class="badge grey">${escapeHtml(sourceLabel(t.source))}</span>` : ''}</span><b class="num neg">${fmtCurrency(t.value)}</b></div>`).join('')
    + '<div class="dash-note">Só o gasto do dia a dia (sem contas fixas e sem cartão) entra no teto de hoje. Compras no cartão pesam quando a fatura vence.</div>';
}
function allowanceHtml(a){
  const per = a.per, un = hasCycles()? 'ciclo' : 'mês', noMargin = a.livre<=0, ds = (n)=>`${n} dia${n===1? '' : 's'}`;
  const paceTxt = a.status==='sem-margem'? 'Sem margem no período.' : a.avg7===0? 'Você não gastou no dia a dia nos últimos 7 dias.' : a.status==='acima'? `Acima do teto (${fmtCurrency(a.perDay)}/dia).` : `Dentro do teto (${fmtCurrency(a.perDay)}/dia).`;
  const runTxt = a.runoutDate? `No ritmo dos últimos 7 dias, o livre acaba em <b class="neg">${fmtDM(a.runoutDate)}</b>, antes do fim do ${un}: faltariam <b class="neg">${fmtCurrency(a.overBy)}</b> até ${fmtDM(per.to)}.` : (a.avg7>0 && a.livre>0? 'No ritmo dos últimos 7 dias, dá para chegar ao fim do '+un+' sem estourar.' : '');
  return `
    <div class="dash-grid ob-hero">
      <div class="card ${noMargin? 'dash-bad' : 'dash-ok'}">
        <div class="stat-label">Você pode gastar por dia até ${fmtDM(per.to)}</div>
        <div class="dash-big ${noMargin? 'neg' : 'pos'} num">${fmtCurrency(Math.max(0,a.perDay))}</div>
        <div class="dash-note">${noMargin? `Sem margem: o que vence até ${fmtDM(per.to)} é maior que o seu saldo (faltam ${fmtCurrency(-a.livre)}).` : `${fmtCurrency(a.livre)} livres ÷ ${ds(a.per.daysLeft)} (hoje incluído).`}</div>
        <div class="dash-note">Se recalcula sozinho: gastar menos hoje aumenta o teto dos próximos dias; gastar mais diminui.</div>
      </div>
      <div class="card">
        <div class="stat-label">Hoje</div>
        <div class="dash-mid ${a.leftToday>=0? 'pos' : 'neg'} num">${fmtCurrency(Math.abs(a.leftToday))}</div>
        <div class="dash-note">${a.leftToday>=0? 'ainda pode gastar hoje' : 'acima do teto de hoje'}</div>
        <div class="dash-note">Teto ao acordar: ${fmtCurrency(a.perDayStart)} · gasto: <b class="neg">${fmtCurrency(a.spentToday)}</b>${a.cardToday>0? ` · no cartão: ${fmtCurrency(a.cardToday)}` : ''}</div>
      </div>
      <div class="card">
        <div class="stat-label">${a.tomorrow===null? 'Amanhã' : 'A partir de amanhã'}</div>
        ${a.tomorrow===null? `<div class="dash-note">Hoje é o último dia do ${un}. Amanhã começa um novo.</div>`
          : `<div class="dash-mid ${a.tomorrow>0? 'pos' : 'neg'} num">${fmtCurrency(Math.max(0,a.tomorrow))}</div><div class="dash-note">por dia, se você não gastar mais nada hoje</div><div class="dash-note">${a.tomorrow>=a.perDay? '+' : '−'}${fmtCurrency(Math.abs(rnd2(a.tomorrow-a.perDay)))} em relação ao teto de agora</div>`}
      </div>
    </div>
    <div class="dash-grid dash-3" style="margin-top:16px">
      <div class="card"><div class="stat-label">Dias do ${un}</div><div class="dash-mid num">${a.per.daysLeft} <span class="dash-note" style="display:inline">de ${a.per.daysTotal} restantes</span></div>
        <div class="dash-bar" style="margin-top:12px"><i style="width:${Math.round(a.per.dayIndex/a.per.daysTotal*100)}%;background:var(--accent)"></i></div><div class="dash-note">${escapeHtml(per.label)} · dia ${a.per.dayIndex}</div></div>
      <div class="card"><div class="stat-label">Seu ritmo (últimos 7 dias)</div><div class="dash-mid num">${fmtCurrency(a.avg7)} <span class="dash-note" style="display:inline">por dia</span></div>
        <div class="dash-note">${paceTxt}</div><div class="dash-note">Média no ${un} até agora: ${fmtCurrency(a.avgPeriod)} por dia (${fmtCurrency(a.spentPeriod)} no total).</div></div>
      <div class="card"><div class="stat-label">Se mantiver o ritmo</div><div class="dash-note" style="margin-top:12px;color:var(--ink)">${runTxt || 'Sem gastos recentes para projetar.'}</div></div>
    </div>`;
}
function dailyChartConfig(bars, perDay){
  const alpha = (c,a)=>{ if(/^#/.test(c)){ const n = parseInt(c.slice(1),16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; } return c; };
  const col = (c)=>bars.map(b=>alpha(c, b.future? .4 : .9));
  const tot = (b)=>rnd2(b.dia+b.fixas+b.cartao);
  return {
    data:{ labels:bars.map(b=>fmtDM(b.date)), datasets:[
      {type:'bar', label:'Dia a dia', data:bars.map(b=>b.dia), backgroundColor:col(CHART_COLORS.red), stack:'d', order:2},
      {type:'bar', label:'Contas e parcelas', data:bars.map(b=>b.fixas), backgroundColor:col(CHART_COLORS.yellow), stack:'d', order:2},
      {type:'bar', label:'Faturas do cartão', data:bars.map(b=>b.cartao), backgroundColor:col(CHART_COLORS.accent), stack:'d', order:2},
      {type:'line', label:'Teto por dia', data:bars.map(()=>Math.max(0,perDay)), borderColor:CHART_COLORS.green, borderDash:[6,4], borderWidth:2, pointRadius:0, fill:false, order:1}
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{labels:{usePointStyle:true, boxWidth:8}}, tooltip:{ callbacks:{
        title:(items)=>{ const b = bars[items[0].dataIndex]; return fmtDayShort(b.date)+(b.future? ' (previsto)' : ''); },
        label:(c)=>`${c.dataset.label}: ${fmtCurrency(c.raw)}`,
        footer:(items)=>'Total do dia: '+fmtCurrency(tot(bars[items[0].dataIndex])) } } },
      scales:{ x:{stacked:true, grid:{color:CHART_COLORS.line}}, y:{stacked:true, grid:{color:CHART_COLORS.line}, ticks:{callback:(v)=>fmtCurrency(v)}} } }
  };
}
function renderObVisao(){
  const a = allowanceInfo();
  return allowanceHtml(a)+`
    <div class="dash-grid dash-2" style="margin-top:16px">
      <div class="card"><div class="stat-label">Quanto sai por dia neste ${hasCycles()? 'ciclo' : 'mês'}</div>
        <div class="chart-box" style="margin-top:12px"><canvas id="chart-ob-daily"></canvas></div>
        <div class="dash-note">Barras claras são dias que ainda vão acontecer (contas e parcelas já lançadas). A linha verde é o seu teto por dia de agora.</div></div>
      <div class="card"><div class="stat-label">Gastos de hoje</div><div style="margin-top:6px">${todaySpendHtml()}</div></div>
    </div>`;
}
function wireObVisao(){
  const a = allowanceInfo();
  renderChart('chart-ob-daily', {type:'bar', ...dailyChartConfig(dailyBreakdown(a.per), a.perDay)});
}
function renderObFluxo(){
  if(!flowPeriod.mode) flowPeriod.mode = defaultPeriodMode();
  if(!flowPeriod.month) flowPeriod.month = todayMonthKey();
  const per = resolvePeriod(flowPeriod), fd = flowData(per);
  const groups = fd.by[flowBy] || fd.by.categoria;
  const by = [['categoria','Categoria'],['tipo','Tipo de gasto'],['pagamento','Forma de pagamento'],['conta','Conta']];
  const essPct = fd.saiu? Math.round(fd.essential/fd.saiu*100) : 0;
  return `${flowPeriodBarHtml(flowPeriod)}
    <div class="grid grid-4" style="margin-top:12px">
      <div class="card"><div class="stat-label">Entrou</div><div class="stat-value pos num">${fmtCurrency(fd.entrou)}</div><div class="stat-foot">Recebido <b class="pos">${fmtCurrency(fd.recPaid)}</b> · A receber <b class="pos">${fmtCurrency(fd.recPending)}</b></div></div>
      <div class="card"><div class="stat-label">Saiu</div><div class="stat-value neg num">${fmtCurrency(fd.saiu)}</div><div class="stat-foot">Pago <b class="neg">${fmtCurrency(fd.desPaid)}</b> · A pagar <b class="neg">${fmtCurrency(fd.desPending)}</b></div></div>
      <div class="card"><div class="stat-label">${fd.sobra>=0? 'Sobra' : 'Falta'}</div><div class="stat-value ${signClass(fd.sobra)} num">${fmtCurrency(Math.abs(fd.sobra))}</div><div class="stat-foot">${fd.entrou>0? Math.round(Math.abs(fd.sobra)/fd.entrou*100)+'% do que entrou' : '—'}</div></div>
      <div class="card"><div class="stat-label">Essenciais</div><div class="stat-value num">${fmtCurrency(fd.essential)}</div><div class="stat-foot">${essPct}% das saídas · o resto é flexível</div></div>
    </div>
    <div class="card" style="margin-top:16px"><div class="stat-label">Do que entra até onde o dinheiro vai</div>
      <div class="sk-wrap">${flowSankeySvg(fd)}<div class="dc-tip" hidden></div></div>
      <div class="dash-note">Passe o mouse nas faixas e nos blocos. À esquerda, de onde veio; à direita, para onde foi (ou o que sobrou).${fd.sobra<0? ' O bloco "Do saldo que já tinha" mostra o quanto saiu além do que entrou.' : ''}</div></div>
    <div class="dash-grid dash-2" style="margin-top:16px">
      <div class="card"><div class="stat-label">De onde vem</div><div style="margin-top:8px">${flowGroupsHtml(fd.byRecCat, fd.entrou, 'pos')}</div>
        ${fd.recByAccount.length? `<div class="stat-label" style="margin-top:18px">Em qual conta cai</div>${fd.recByAccount.map(g=>`<div class="dash-li"><span>${escapeHtml(g.key)}</span><b class="num pos">${fmtCurrency(g.total)}</b></div>`).join('')}` : ''}</div>
      <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div class="stat-label">Para onde vai</div>
        <div class="ob-bys">${by.map(([k,l])=>`<button class="ob-by ${k===flowBy? 'active' : ''}" data-by="${k}">${l}</button>`).join('')}</div></div>
        <div style="margin-top:8px">${flowGroupsHtml(groups, fd.saiu, 'neg')}</div></div>
    </div>`;
}
function wireObFluxo(rerender){
  const root = $('#ob-body');
  root.querySelectorAll('.fb-btn').forEach(b=>b.onclick=()=>{ setPeriodMode(flowPeriod, b.dataset.fbmode); rerender(); });
  const pv = $('#fb-prev'), nx = $('#fb-next');
  if(pv) pv.onclick = ()=>{ shiftPeriod(flowPeriod,-1); rerender(); };
  if(nx) nx.onclick = ()=>{ shiftPeriod(flowPeriod,1); rerender(); };
  const ff = $('#fb-from'), ft = $('#fb-to');
  const apply = ()=>{ if(ff.value && ft.value){ flowPeriod.custom = {from:ff.value, to:ft.value}; rerender(); } };
  if(ff) ff.onchange = apply; if(ft) ft.onchange = apply;
  root.querySelectorAll('.ob-by').forEach(b=>b.onclick=()=>{ flowBy = b.dataset.by; rerender(); });
  const wrap = root.querySelector('.sk-wrap'); if(wrap) wireFlowTips(wrap);
}
function dashCategoriesHtml(byCategory){
  const e = Object.entries(byCategory).sort((a,b)=>b[1]-a[1]);
  if(!e.length) return '<div class="dash-note">Sem despesas neste período.</div>';
  const rest = e.slice(5).reduce((x,[,v])=>x+v,0);
  const rows = e.slice(0,5).concat(rest>0? [['Outras',rest,true]] : []);
  const max = Math.max(...rows.map(r=>r[1]));
  return rows.map(([nm,v,other])=>`<div class="dash-cr"><span class="dash-cat" title="${escapeHtml(nm)}">${escapeHtml(nm)}</span><div class="dash-bar"><i style="width:${max? Math.max(3,v/max*100).toFixed(0) : 0}%;background:${other? 'rgb(var(--accent-rgb) / .45)' : 'var(--accent)'}"></i></div><span class="num neg">${fmtCurrency(v)}</span></div>`).join('');
}
function dashVencimentosHtml(){
  const today = todayISO();
  const pend = state.transactions.filter(t=>t.status==='pendente' && t.type==='despesa' && t.date);
  const late = pend.filter(t=>t.date<today).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const next = pend.filter(t=>t.date>=today).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const all = late.concat(next);
  if(!all.length) return '<div class="dash-note">Nenhuma conta pendente. Tudo em dia.</div>';
  const rows = all.slice(0,5).map(t=>{
    let tag;
    if(t.date<today) tag = '<span class="badge rust">Atrasada</span>';
    else { const n = daysBetween(today,t.date); tag = `<span class="badge ${n<=7? 'gold' : 'grey'}">${n===0? 'hoje' : n===1? 'amanhã' : 'em '+n+' dias'}</span>`; }
    return `<div class="dash-li"><span>${escapeHtml(t.description)}</span><span>${tag} <b class="num neg">${fmtCurrency(t.value)}</b></span></div>`;
  }).join('');
  return rows+`<div class="dash-note">${all.length>5? '+ '+(all.length-5)+' a mais · ' : ''}<a href="#" data-goto="planejamento">Ver no Orçamento</a></div>`;
}
function parcelasFuturas(){
  let value = 0, count = 0;
  state.installments.forEach(inst=>{
    const left = Math.max(0, inst.count-installmentsPaidCount('installment',inst.id));
    value += left*Number(inst.installmentValue); count += left;
  });
  return {value:rnd2(value), count};
}
function dashFaturasHtml(){
  const pf = parcelasFuturas();
  const blocks = state.cards.slice(0,2).map(card=>{
    const list = cardInvoices(card).filter(i=>!i.paid).slice(0,3);
    return `<div style="margin-top:12px"><b>${escapeHtml(card.name)}</b> <span class="dash-note" style="margin:0">· fecha dia ${card.closingDay||'—'} · vence dia ${card.dueDay||'—'}</span></div>`
      + list.map(i=>`<div class="dash-li"><span>${escapeHtml(monthLabel(i.dueDate.slice(0,7)))} ${invoiceBadge(i)}</span><b class="num neg">${fmtCurrency(i.total)}</b></div>`).join('');
  }).join('');
  const more = state.cards.length>2? `<div class="dash-note">+ ${state.cards.length-2} cartão(ões) em Faturas</div>` : '';
  const none = !state.cards.length? '<div class="dash-note">Cadastre um cartão para acompanhar as faturas.</div>' : '';
  const foot = pf.value>0? `<div class="dash-li"><span>Parcelas futuras <span class="badge grey">${pf.count} parcela${pf.count===1? '' : 's'}</span></span><b class="num neg">${fmtCurrency(pf.value)}</b></div>` : '';
  return blocks+more+none+foot;
}
function dashPatrimonio(rendaPeriodo){
  const guardado = rnd2(state.goals.reduce((a,g)=>a+Number(g.currentValue||0),0));
  const dividas = rnd2(state.debts.reduce((a,d)=>a+Math.max(0,d.count-installmentsPaidCount('debt',d.id))*Number(d.installmentValue),0));
  const parcelas = parcelasFuturas().value;
  const saldo = rnd2(totalAvailable());
  const ativos = rnd2(saldo+guardado), passivos = rnd2(dividas+parcelas);
  return {saldo, guardado, ativos, dividas, parcelas, passivos, liquido:rnd2(ativos-passivos), meses: rendaPeriodo>0? passivos/rendaPeriodo : 0};
}
RENDERERS.dashboard = function(){
  const per = dashPeriod();
  const m = dashMetrics(per);
  const s = periodSummary(per);
  const pat = dashPatrimonio(s.plannedReceitas);
  const pts = dashSeries(per);
  let simPanel = '';
  if(dashSim){
    const ev = simEvents(dashSim);
    if(ev.length && pts.length>1){ const sv = simSeries(pts, ev); pts.forEach((p,i)=>{ p.sim = sv[i]; }); simPanel = dashSimHtml(per, dashSim, simSummary(per, m, pts, ev), ev); }
  }
  const alerts = computeAlerts().filter(a=>a.sev!=='green' && a.sev!=='grey');
  const pct = (done,plan)=>plan>0? Math.min(100, done/plan*100).toFixed(0) : 0;
  const accNames = state.accounts.filter(a=>a.status!=='inativa').map(a=>a.name);
  const sobra = rnd2(s.plannedReceitas-s.plannedDespesas);
  $('#view-dashboard').innerHTML = `
    ${dashboardHeader(per)}
    ${firstStepsCard()}

    <div class="dash-grid dash-hero">
      <div class="card clickable ${m.livre>=0? 'dash-ok' : 'dash-bad'}" data-goto="planejamento">
        <div class="stat-label">Posso gastar até ${fmtDM(per.to)}</div>
        <div class="dash-big ${m.livre>=0? 'pos' : 'neg'} num">${fmtCurrency(m.livre)}</div>
        <div class="dash-note">Saldo das contas (${fmtCurrency(m.saldo)}) menos o que ainda vence até lá (${fmtCurrency(m.aPagar)})${m.reservas>0? ` e as reservas de metas (${fmtCurrency(m.reservas)})` : ''}.</div>
        ${m.aReceber>0? `<div class="dash-note">Se os ${fmtCurrency(m.aReceber)} a receber chegarem, o saldo termina em ${fmtCurrency(m.fimProjetado)}.</div>` : ''}
        ${m.atrasado>0? `<div class="dash-note" style="color:var(--red)">Não conta ${fmtCurrency(m.atrasado)} em contas atrasadas. Confirme se já foram pagas.</div>` : ''}
      </div>
      <div class="card clickable" data-goto="contas">
        <div class="stat-label">Saldo em contas</div>
        <div class="dash-mid ${signClass(m.saldo)} num">${fmtCurrency(m.saldo)}</div>
        <div class="dash-note">${escapeHtml(accNames.slice(0,3).join(' e ') || 'Nenhuma conta ativa')}</div>
      </div>
      <div class="card clickable" data-goto="planejamento">
        <div class="stat-label">A pagar até ${fmtDM(per.to)}</div>
        <div class="dash-mid neg num">${fmtCurrency(m.aPagar)}</div>
        <div class="dash-note">${m.aPagarCount} conta${m.aPagarCount===1? '' : 's'} pendente${m.aPagarCount===1? '' : 's'}${m.atrasadoCount? ` · ${m.atrasadoCount} atrasada${m.atrasadoCount===1? '' : 's'} (${fmtCurrency(m.atrasado)})` : ''}</div>
      </div>
    </div>

    <div class="dash-grid dash-pat">
      <div class="card clickable" data-goto="metas">
        <div class="stat-label">Patrimônio líquido</div>
        <div class="dash-mid ${pat.liquido>=0? 'pos' : 'neg'} num">${fmtCurrency(pat.liquido)}</div>
        <div class="dash-note">Ativos ${fmtCurrency(pat.ativos)} (contas ${fmtCurrency(pat.saldo)} + metas ${fmtCurrency(pat.guardado)}) menos passivos ${fmtCurrency(pat.passivos)} (dívidas + parcelas).</div>
      </div>
      <div class="card clickable" data-goto="dividas">
        <div class="stat-label">Comprometido</div>
        <div class="dash-mid ${pat.passivos>0? 'neg' : ''} num">${fmtCurrency(pat.passivos)}</div>
        <div class="dash-note">Dívidas ${fmtCurrency(pat.dividas)} · parcelas ${fmtCurrency(pat.parcelas)}${pat.meses>0? ` · cerca de ${pat.meses.toFixed(1).replace('.',',')} mês(es) da renda do período` : ''}.</div>
      </div>
    </div>

    <div class="dash-grid dash-2">
      <div class="card dash-chart">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div class="stat-label">Como o saldo deve andar até ${fmtDM(per.to)}</div><button class="btn small" id="btn-sim">${dashSim? 'Editar simulação' : 'Simular uma compra'}</button></div>
        <div class="dc-wrap">${dashChartSvg(pts)}<div class="dc-tip" hidden></div></div>
        <div class="dash-note">Passe o mouse (ou toque) no gráfico para ver cada dia. Linha cheia: o que já aconteceu. Tracejada: previsão com as contas e recebimentos já lançados.</div>
        ${simPanel}
      </div>
      <div class="card">
        <div class="stat-label">Próximos vencimentos</div>
        <div style="margin-top:6px">${dashVencimentosHtml()}</div>
      </div>
    </div>

    <div class="dash-grid dash-3">
      <div class="card">
        <div class="stat-label">Entradas e saídas do período</div>
        <div class="dash-note" style="color:var(--ink)">Receitas · <b class="pos">${fmtCurrency(s.plannedReceitas)}</b> previstas</div>
        <div class="dash-bar" style="margin-top:8px"><i style="width:${pct(s.realizedReceitas,s.plannedReceitas)}%;background:var(--pos)"></i></div>
        <div class="dash-note">Já recebeu <b class="pos">${fmtCurrency(s.realizedReceitas)}</b></div>
        <div class="dash-note" style="color:var(--ink);margin-top:16px">Despesas · <b class="neg">${fmtCurrency(s.plannedDespesas)}</b> previstas</div>
        <div class="dash-bar" style="margin-top:8px"><i style="width:${pct(s.realizedDespesas,s.plannedDespesas)}%;background:var(--neg)"></i></div>
        <div class="dash-note">Já pagou <b class="neg">${fmtCurrency(s.realizedDespesas)}</b></div>
        <div class="dash-note" style="margin-top:16px">Sobra prevista: <b class="${sobra>=0? 'pos' : 'neg'}">${sobra>0? '+ ' : ''}${fmtCurrency(sobra)}</b></div>
      </div>
      <div class="card">
        <div class="stat-label">Para onde vai o dinheiro</div>
        ${dashCategoriesHtml(s.byCategory)}
        <div class="dash-note"><a href="#" data-goto="relatorios">Ver relatórios</a></div>
      </div>
      <div class="card clickable" data-goto="parcelamentos">
        <div class="stat-label">Faturas do cartão</div>
        ${dashFaturasHtml()}
      </div>
    </div>

    ${dashLimitsHtml()}

    ${alerts.length? `<details class="dash-alerts"><summary>Alertas (${alerts.length})</summary><div style="margin-top:10px">${alerts.map(a=>`<div class="alert-item ${a.sev==='rust'? 'rust' : ''}">${icon(a.sev==='rust'? 'alertTriangle' : 'info',16)}<span>${escapeHtml(a.msg)}</span></div>`).join('')}</div></details>` : ''}
  `;
  $$('#view-dashboard [data-goto]').forEach(c=>c.onclick=(e)=>{ e.preventDefault(); if(c.dataset.sub){ if(c.dataset.goto==='planejamento') budTab = c.dataset.sub; else reportSubtab = c.dataset.sub; } switchView(c.dataset.goto); });
  $$('#view-dashboard .dash-chip').forEach(b=>b.onclick=()=>{ dashMode = b.dataset.dmode; RENDERERS.dashboard(); });
  wireDashboardHeader();
  const dcw = $('#view-dashboard .dc-wrap'); if(dcw) wireDashChart(dcw, pts);
  $('#btn-sim').onclick = openSimModal;
  const se = $('#sim-edit'), sc = $('#sim-clear');
  if(se) se.onclick = openSimModal;
  if(sc) sc.onclick = ()=>{ dashSim = null; RENDERERS.dashboard(); };
};
function renderUpcomingList(items, startingBalance){
  if(!items.length) return `<div class="empty-state">${icon('calendar',28)}<strong>Nada por vir</strong><span>Nenhum lançamento pendente nesse período.</span></div>`;
  let running = Number(startingBalance)||0;
  return `<table><thead><tr><th></th><th>Data</th><th>Descrição</th><th class="right">Valor</th><th class="right">Saldo projetado</th><th></th></tr></thead><tbody>${items.map(t=>{
    const label = t.daysUntil<0? `Atrasado há ${Math.abs(t.daysUntil)}d` : t.daysUntil===0? 'Hoje' : t.daysUntil===1? 'Amanhã' : `Em ${t.daysUntil} dias`;
    const badgeClass = t.daysUntil<0? 'rust' : t.daysUntil<=2? 'gold' : 'grey';
    running += t.type==='receita'? Number(t.value) : -Number(t.value);
    return `<tr>
      <td style="width:120px"><span class="badge ${badgeClass}">${label}</span></td>
      <td>${fmtDate(t.date)}</td>
      <td>${escapeHtml(t.description)}<span class="help-text" style="display:block;margin:0">${escapeHtml(t.category||'')}</span></td>
      <td class="right num" style="color:${t.type==='receita'?'var(--green)':'var(--red)'}">${t.type==='receita'?'+':'-'}${fmtCurrency(t.value)}</td>
      <td class="right num" style="color:${running>=0?'var(--ink)':'var(--red)'}">${fmtCurrency(running)}</td>
      <td class="right"><button class="btn small" data-mark-paid="${t.id}">${icon('checkCircle',13)} ${t.type==='receita'? 'Marcar recebido' : 'Marcar pago'}</button></td>
    </tr>`;
  }).join('')}</tbody></table>`;
}

/* ===================== LANÇAMENTOS ===================== */
let lancFilter = {tipo:'todos',categoria:'todos',status:'todos',busca:''};
let lancPeriod = {mode:null, month:null, custom:{from:'',to:''}, cycleRef:null};   // null = automático (ciclo se o seu mês não começa no dia 1)
function filterLancamentos(list, per, f){
  let out = list;
  if(!per.all) out = out.filter(t=>{ const d = cashDate(t); return d && d>=per.from && d<=per.to; });   // vale o dia em que o dinheiro mexeu
  if(f.tipo!=='todos') out = out.filter(t=>t.type===f.tipo);
  if(f.categoria!=='todos') out = out.filter(t=>t.category===f.categoria);
  if(f.status!=='todos') out = out.filter(t=>t.status===f.status);
  const q = (f.busca||'').trim().toLowerCase();
  if(q) out = out.filter(t=>(t.description||'').toLowerCase().includes(q) || (t.category||'').toLowerCase().includes(q));
  return out;
}
function lancSummary(rows){
  const r2 = n=>Math.round(n*100)/100;
  const rec = {total:0,done:0,pend:0,n:0}, des = {total:0,done:0,pend:0,n:0};
  const catR = {}, catD = {};
  let skipped = 0, topD = null, topR = null;
  rows.forEach(t=>{
    if(t.type!=='receita' && t.type!=='despesa'){ skipped++; return; }   // transferência e ajuste de saldo não são receita nem despesa
    const v = Number(t.value)||0, isIn = t.type==='receita', b = isIn? rec : des, m = isIn? catR : catD;
    b.total += v; b.n++; if(t.status==='pago') b.done += v; else b.pend += v;
    const cat = t.category || 'Sem categoria'; m[cat] = (m[cat]||0)+v;
    if(isIn){ if(!topR || v>topR.value) topR = {description:t.description, value:v}; }
    else { if(!topD || v>topD.value) topD = {description:t.description, value:v}; }
  });
  [rec,des].forEach(b=>{ b.total = r2(b.total); b.done = r2(b.done); b.pend = r2(b.pend); });
  return { rec, des, saldo:r2(rec.total-des.total), saldoDone:r2(rec.done-des.done), saldoPend:r2(rec.pend-des.pend), catR, catD, skipped, count:rows.length, topD, topR };
}
function catRowsHtml(map, total, kind){
  const entries = Object.entries(map).sort((a,b)=>b[1]-a[1]);
  if(!entries.length) return '<div class="help-text" style="margin:0">Nada neste período.</div>';
  let rows = entries;
  if(entries.length>10){ const rest = entries.slice(9); rows = entries.slice(0,9).concat([[`Outras categorias (${rest.length})`, rest.reduce((s,[,v])=>s+v,0), true]]); }
  return rows.map(([name,v,agg])=>{
    const pct = total? v/total*100 : 0;
    const attrs = agg? '' : ` data-cat="${escapeHtml(name)}" data-ctype="${kind==='des'? 'despesa' : 'receita'}" title="Filtrar a lista por esta categoria"`;
    return `<div class="cat-row ${kind}"${attrs}><span class="cat-name">${escapeHtml(name)}</span><div class="cat-track"><i style="width:${Math.max(2,Math.min(100,pct)).toFixed(1)}%"></i></div><span class="cat-val num">${fmtCurrency(v)}</span><span class="cat-pct">${pct.toFixed(0)}%</span></div>`;
  }).join('');
}
function lancSummaryHtml(rows, per, anyFilter){
  const s = lancSummary(rows);
  return `<div class="lanc-summary">
    <div class="grid grid-4">
      <div class="card"><div class="stat-label">Receitas</div><div class="stat-value pos num">${fmtCurrency(s.rec.total)}</div>
        <div class="stat-foot">Recebido <b class="pos">${fmtCurrency(s.rec.done)}</b> · A receber <b class="pos">${fmtCurrency(s.rec.pend)}</b></div><div class="stat-foot">${s.rec.n} lançamento(s)</div></div>
      <div class="card"><div class="stat-label">Despesas</div><div class="stat-value neg num">${fmtCurrency(s.des.total)}</div>
        <div class="stat-foot">Pago <b class="neg">${fmtCurrency(s.des.done)}</b> · A pagar <b class="neg">${fmtCurrency(s.des.pend)}</b></div><div class="stat-foot">${s.des.n} lançamento(s)</div></div>
      <div class="card"><div class="stat-label">Saldo do período</div><div class="stat-value ${s.saldo>=0?'pos':'neg'} num">${fmtCurrency(s.saldo)}</div>
        <div class="stat-foot">Realizado <b class="${signClass(s.saldoDone)}">${fmtCurrency(s.saldoDone)}</b> · Pendente <b class="${signClass(s.saldoPend)}">${fmtCurrency(s.saldoPend)}</b></div><div class="stat-foot">Receitas − despesas</div></div>
      <div class="card"><div class="stat-label">Destaques</div><div class="stat-value num" style="font-size:20px">${s.count} na lista</div>
        <div class="stat-foot">${s.topD? 'Maior despesa: '+escapeHtml(s.topD.description)+' · <b class="neg">'+fmtCurrency(s.topD.value)+'</b>' : 'Sem despesas'}</div>
        <div class="stat-foot">${s.topR? 'Maior receita: '+escapeHtml(s.topR.description)+' · <b class="pos">'+fmtCurrency(s.topR.value)+'</b>' : 'Sem receitas'}</div></div>
    </div>
    <div class="help-text" style="margin:8px 0 0">${escapeHtml(per.label)}${anyFilter? ' · somas dos lançamentos filtrados' : ''}${s.skipped? ` · ${s.skipped} transferência(s)/ajuste(s) não entram nas somas` : ''} · vale a data em que o dinheiro mexeu.</div>
    <details class="lanc-breakdown"><summary>Ver por categoria</summary>
      <div class="grid grid-2" style="margin-top:12px">
        <div><div class="stat-label">Despesas por categoria</div>${catRowsHtml(s.catD, s.des.total, 'des')}</div>
        <div><div class="stat-label">Receitas por categoria</div>${catRowsHtml(s.catR, s.rec.total, 'rec')}</div>
      </div>
      <div class="help-text" style="margin:8px 0 0">Clique numa categoria para filtrar a lista.</div>
    </details>
  </div>`;
}
function lancPeriodBarHtml(p){
  const sd = parseInt(state.settings.primeiroDiaMes,10)||1;
  const modes = [['tudo','Tudo'],['mes','Mês'],...(sd>1? [['ciclo',`Ciclo (dia ${sd})`]] : []),['30d','Últimos 30 dias'],['ano','Este ano'],['custom','Personalizado']];
  const per = resolvePeriod(p);
  const nav = p.mode==='mes' || p.mode==='ciclo';
  return `<div class="period-bar">
    ${modes.map(([m,l])=>`<button class="lp-btn ${m===p.mode?'active':''}" data-lpmode="${m}">${escapeHtml(l)}</button>`).join('')}
    <span class="lp-nav">${nav? `<button class="btn" id="lp-prev">${icon('chevronLeft',16)}</button>` : ''}<span class="lp-label">${escapeHtml(per.label)}</span>${nav? `<button class="btn" id="lp-next">${icon('chevronRight',16)}</button>` : ''}</span>
    ${p.mode==='custom'? `<span class="period-range"><label>De <input type="date" id="lp-from" value="${per.from}"></label><label>Até <input type="date" id="lp-to" value="${per.to}"></label></span>` : ''}
  </div>`;
}
function lancCsv(rows){
  const esc = v=>{ const x = String(v==null? '' : v); return /[";\r\n]/.test(x)? '"'+x.replace(/"/g,'""')+'"' : x; };
  const num = n=>String(Math.round(Number(n)*100)/100).replace('.',',');
  const tipo = {receita:'Receita', despesa:'Despesa', transferencia:'Transferência', ajuste:'Ajuste'};
  const lines = [['Data','Descrição','Categoria','Tipo','Valor','Conta','Forma de pagamento','Status','Pago/recebido em'].join(';')];
  rows.forEach(t=>{
    const acc = state.accounts.find(a=>a.id===t.accountId);
    lines.push([t.date? fmtDate(t.date) : '', t.description, t.category||'', tipo[t.type]||t.type, num(t.value), acc? acc.name : '', t.paymentMethod||'', t.status==='pago'? 'Pago' : 'Pendente', t.paidAt? fmtDate(t.paidAt) : ''].map(esc).join(';'));
  });
  return lines.join('\r\n');
}
function downloadText(text, filename){
  const blob = new Blob(['\uFEFF'+text], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}
RENDERERS.lancamentos = function(){
  if(!lancPeriod.mode) lancPeriod.mode = defaultPeriodMode();
  if(!lancPeriod.month) lancPeriod.month = todayMonthKey();
  const per = resolvePeriod(lancPeriod);
  const everything = state.transactions.slice().sort((a,b)=> (b.date||'').localeCompare(a.date||''));
  const list = filterLancamentos(everything, per, lancFilter);
  const anyFilter = lancFilter.tipo!=='todos' || lancFilter.categoria!=='todos' || lancFilter.status!=='todos' || !!lancFilter.busca.trim();
  const definedCats = state.categories.map(c=>c.name);
  const extraCats = Array.from(new Set(state.transactions.map(t=>t.category).concat(lancFilter.categoria!=='todos'? [lancFilter.categoria] : []).filter(n=>n && !definedCats.includes(n)))).sort();
  const catList = definedCats.concat(extraCats);

  $('#view-lancamentos').innerHTML = `
    <div class="view-head"><div><h1>Lançamentos</h1><div class="view-sub">Todas as receitas e despesas cadastradas</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="btn-export-csv">${icon('barchart',15)} Exportar CSV</button><button class="btn primary" id="btn-new-lanc">${icon('plus',15)} Novo lançamento</button></div></div>
    ${lancPeriodBarHtml(lancPeriod)}
    ${lancSummaryHtml(list, per, anyFilter)}
    <div class="toolbar">
      <input type="text" id="f-busca" placeholder="Buscar por descrição ou categoria..." value="${escapeHtml(lancFilter.busca)}" style="min-width:220px">
      <select id="f-tipo"><option value="todos">Todos os tipos</option><option value="receita" ${lancFilter.tipo==='receita'?'selected':''}>Receita</option><option value="despesa" ${lancFilter.tipo==='despesa'?'selected':''}>Despesa</option><option value="transferencia" ${lancFilter.tipo==='transferencia'?'selected':''}>Transferência</option><option value="ajuste" ${lancFilter.tipo==='ajuste'?'selected':''}>Ajuste</option></select>
      <select id="f-cat"><option value="todos">Todas as categorias</option>${catList.map(n=>`<option value="${escapeHtml(n)}" ${lancFilter.categoria===n?'selected':''}>${escapeHtml(n)}</option>`).join('')}</select>${anyFilter? ' <button class="btn small" id="f-clear">Limpar filtros</button>' : ''}
      <select id="f-status"><option value="todos">Todos os status</option><option value="pago" ${lancFilter.status==='pago'?'selected':''}>Pago</option><option value="pendente" ${lancFilter.status==='pendente'?'selected':''}>Pendente</option></select>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th class="right">Valor</th><th>Pagamento</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.length? list.map(rowLanc).join('') : emptyRow(8,'wallet','Nenhum lançamento encontrado',(anyFilter || !per.all)? 'Tente outro período ou limpe os filtros.' : 'Cadastre receitas e despesas ou use os módulos de recorrentes e parcelamentos.')}</tbody>
    </table></div>
  `;
  function rowLanc(t){
    const shifted = !t.cardId && t.date && t.month!==monthKeyOf(t.date);
    const buyNote = t.purchaseDate && t.purchaseDate!==t.date? 'compra em '+fmtDate(t.purchaseDate) : '';
    return `<tr>
      <td>${fmtDate(t.date)}${buyNote?`<div class="help-text" style="margin:2px 0 0">${buyNote}</div>`:(shifted?`<div class="help-text" style="margin:2px 0 0">competência: ${monthLabelShort(t.month)}</div>`:'')}</td>
      <td>${escapeHtml(t.description)}${t.source!=='manual'?`<span class="badge grey" style="margin-left:6px">${sourceLabel(t.source)}</span>`:''}</td>
      <td>${escapeHtml(t.category||'—')}</td>
      <td>${typeBadge(t.type)}</td>
      <td class="right num ${txClass(t)}">${txMoney(t)}</td>
      <td>${escapeHtml(t.paymentMethod||'—')}</td>
      <td>${t.status==='pago'?'<span class="badge green">Pago</span>':'<span class="badge gold">Pendente</span>'}${paidNote(t)}</td>
      <td>${t.type==='ajuste'? '' : `<button class="icon-btn" data-edit="${t.id}" title="Editar">${icon('edit',15)}</button><button class="icon-btn" data-dup="${t.id}" title="Duplicar">${icon('copy',15)}</button>`}${undoButtonHtml(t)}<button class="icon-btn" data-del="${t.id}" title="Excluir">${icon('trash',15)}</button></td>
    </tr>`;
  }
  let searchDebounce;
  $('#f-busca').oninput=e=>{ clearTimeout(searchDebounce); const val=e.target.value; searchDebounce=setTimeout(()=>{ lancFilter.busca=val; RENDERERS.lancamentos(); const inp=$('#f-busca'); if(inp){ inp.focus(); inp.setSelectionRange(val.length,val.length); } },300); };
  $$('.lp-btn').forEach(b=>b.onclick=()=>{ setPeriodMode(lancPeriod, b.dataset.lpmode); RENDERERS.lancamentos(); });
  const lpPrev = $('#lp-prev'), lpNext = $('#lp-next');
  if(lpPrev) lpPrev.onclick=()=>{ shiftPeriod(lancPeriod,-1); RENDERERS.lancamentos(); };
  if(lpNext) lpNext.onclick=()=>{ shiftPeriod(lancPeriod,1); RENDERERS.lancamentos(); };
  const lpFrom = $('#lp-from'), lpTo = $('#lp-to');
  const applyLp = ()=>{ if(lpFrom.value && lpTo.value){ lancPeriod.custom = {from:lpFrom.value, to:lpTo.value}; RENDERERS.lancamentos(); } };
  if(lpFrom) lpFrom.onchange = applyLp;
  if(lpTo) lpTo.onchange = applyLp;
  $$('#view-lancamentos .cat-row[data-cat]').forEach(el=>el.onclick=()=>{ lancFilter.categoria = el.dataset.cat; lancFilter.tipo = el.dataset.ctype; RENDERERS.lancamentos(); });
  const clr = $('#f-clear'); if(clr) clr.onclick=()=>{ lancFilter = {tipo:'todos',categoria:'todos',status:'todos',busca:''}; RENDERERS.lancamentos(); };
  $('#btn-export-csv').onclick=()=>{ downloadText(lancCsv(list), 'kivo-lancamentos-'+(per.all? 'todos' : per.from+'_a_'+per.to)+'.csv'); showToast(list.length+' lançamento(s) exportado(s).'); };
  $('#f-tipo').onchange=e=>{lancFilter.tipo=e.target.value;RENDERERS.lancamentos();};
  $('#f-cat').onchange=e=>{lancFilter.categoria=e.target.value;RENDERERS.lancamentos();};
  $('#f-status').onchange=e=>{lancFilter.status=e.target.value;RENDERERS.lancamentos();};
  $('#btn-new-lanc').onclick=()=>openLancModal();
  $$('[data-edit]').forEach(b=>b.onclick=()=>openLancModal(state.transactions.find(t=>t.id===b.dataset.edit)));
  $$('[data-undo]').forEach(b=>b.onclick=()=>undoPayment(b.dataset.undo));
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
function openLancModal(t, presetDate, presetType){
  const isEdit = !!t;
  const d = presetDate || todayISO();
  openFormModal({
    title: isEdit?'Editar lançamento':'Novo lançamento',
    initial: t? {...t, date:(t.purchaseDate||t.date)} : {date:d,month:monthKeyOf(d),type:presetType||'despesa',status:'pendente',paymentMethod:'PIX',accountId:defaultAccountId()},
    fields:[
      {row:[{name:'type',label:'Tipo',type:'select',options:[{value:'despesa',label:'Despesa'},{value:'receita',label:'Receita'},{value:'transferencia',label:'Transferência'}]},
             {name:'status',label:'Status',type:'select',options:[{value:'pendente',label:'Pendente'},{value:'pago',label:'Pago'}]}]},
      {name:'description',label:'Descrição',type:'text',required:true},
      {row:[{name:'category',label:'Categoria',type:'select',options:state.categories.map(c=>({value:c.name,label:c.name}))},
             {name:'value',label:'Valor',type:'currency',required:true}]},
      {row:[{name:'accountId',label:'Conta',type:'select',options:accountOptions(t && t.accountId)},
             {name:'toAccountId',label:'Conta destino (transferência)',type:'select',options:accountOptions()}]},
      {row:[{name:'date',label:'Data',type:'date',required:true},
             {name:'paymentMethod',label:'Forma de pagamento',type:'select',options:['Dinheiro','PIX','Débito','Crédito','Transferência','Outro'].map(v=>({value:v,label:v}))}]},
      {name:'cardId',label:'Cartão (se for compra no crédito)',type:'select',options:cardOptions()},
      {name:'paidAt',label:'Pago/recebido em (opcional)',type:'date'},
      {name:'note',label:'Observação',type:'textarea'}
    ],
    onSubmit(v){
      v.month = monthKeyOf(v.date);
      if(v.type==='transferencia'){ v.category='Transferência'; v.cardId=''; } else { v.toAccountId=''; }
      if(v.type==='receita'){ v.cardId=''; }
      v.purchaseDate = '';
      v.paidAt = v.status==='pago'? (v.paidAt||'') : '';   // em branco: vale a data do lançamento
      { // lançar como pago (ou mudar para pago / mudar a data do pagamento) é uma ação sua: soma no saldo
        const wasPaid = isEdit && t.status==='pago', prevPaidAt = isEdit? (t.paidAt||'') : '';
        if(v.status==='pago' && (!wasPaid || (v.paidAt && v.paidAt!==prevPaidAt))){ v.forceCount = true; v.preSettled = false; }
      }
      if(isEdit && t.source!=='manual' && v.date===t.date){ v.month = t.month; } // linha gerada: não mexe no mês da fatura
      let shiftedInvoice = null;
      if(v.type==='despesa' && v.cardId && (!isEdit || t.source==='manual')){
        const card = state.cards.find(c=>c.id===v.cardId);
        if(card){
          const unchanged = isEdit && v.cardId===t.cardId && v.date===(t.purchaseDate||t.date);   // não mexeu na compra nem no cartão
          if(unchanged && t.purchaseDate){
            // já estava numa fatura: editar outra coisa (nome, valor…) não troca de fatura
            v.purchaseDate = t.purchaseDate; v.date = t.date; v.month = t.month; v.paymentMethod = 'Crédito';
          } else {
            const inv = cardInvoiceFor(card, v.date);
            const openMonth = unchanged? inv.invoiceMonth : openInvoiceMonthFrom(card, inv.invoiceMonth);   // fatura fechada: vai para a próxima aberta
            v.purchaseDate = v.date; v.month = openMonth; v.date = invoiceDueDate(card, openMonth); v.paymentMethod = 'Crédito';
            if(openMonth!==inv.invoiceMonth) shiftedInvoice = {from:inv.dueDate, to:v.date};
          }
        }
      }
      if(isEdit){ Object.assign(t,v); }
      else { state.transactions.push({id:uid(),source:'manual',sourceId:null,createdAt:Date.now(),...v}); }
      saveState(); renderAll();
      if(shiftedInvoice) showToast(`A fatura de ${monthLabel(shiftedInvoice.from.slice(0,7))} já está fechada: este lançamento foi para a de ${monthLabel(shiftedInvoice.to.slice(0,7))}.`);
    },
    onDelete: isEdit? ()=>{ confirmModal('Excluir lançamento?','Essa ação não pode ser desfeita.',()=>{ state.transactions=state.transactions.filter(x=>x.id!==t.id); saveState(); closeModal(); renderAll(); }); } : null
  });
  const typeSelect = document.querySelector('#modal-form [name="type"]');
  const toggleFields = ()=>{
    const type = typeSelect.value;
    const isTransfer = type==='transferencia';
    const isDespesa = type==='despesa';
    const catField = document.querySelector('#modal-form [name="category"]')?.closest('.field');
    const toAccField = document.querySelector('#modal-form [name="toAccountId"]')?.closest('.field');
    const cardField = document.querySelector('#modal-form [name="cardId"]')?.closest('.field');
    if(catField) catField.style.display = isTransfer? 'none':'';
    if(toAccField) toAccField.style.display = isTransfer? '':'none';
    if(cardField) cardField.style.display = isDespesa? '':'none';
  };
  if(typeSelect){ toggleFields(); typeSelect.addEventListener('change', toggleFields); }
  const statusSelect = document.querySelector('#modal-form [name="status"]');
  const togglePaid = ()=>{ const f = document.querySelector('#modal-form [name="paidAt"]'); const box = f && f.closest('.field'); if(box) box.style.display = statusSelect.value==='pago'? '' : 'none'; };
  if(statusSelect){ togglePaid(); statusSelect.addEventListener('change', togglePaid); }
}

/* ===================== PLANEJAMENTO ===================== */
let planDay = todayISO();
const WEEKDAY_NAMES = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
function addDaysToISO(iso,n){
  const d = new Date(iso+'T00:00:00');
  d.setDate(d.getDate()+n);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function dayLabel(iso){
  const d = new Date(iso+'T00:00:00');
  return `${WEEKDAY_NAMES[d.getDay()]}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
}
function cashDate(t){ return (t.status==='pago' && t.paidAt)? t.paidAt : t.date; }   // dia em que o dinheiro realmente mexeu
function txMonth(t){ return (t.status==='pago' && t.paidAt && !t.cardId)? monthKeyOf(t.paidAt) : t.month; }
function paidNote(t){
  if(t.status!=='pago' || !t.paidAt || (t.type!=='receita' && t.type!=='despesa')) return '';
  const plan = (t.date && t.date!==t.paidAt)? ' · previsto para '+fmtDate(t.date) : '';
  return `<div class="help-text" style="margin:3px 0 0">${t.type==='receita'? 'Recebido' : 'Pago'} em ${fmtDate(t.paidAt)}${plan}</div>`;
}
function accountStartISO(acc){
  // a partir de quando o saldo inicial vale: tudo que foi pago antes já está embutido nele
  return acc.startDate || (acc.createdAt? localISODate(acc.createdAt) : '');
}
function txCountsForBalance(t){
  if(!t.date || t.preSettled) return false;   // preSettled = parcela já paga antes do Kivo, já embutida no saldo
  if(t.forceCount) return true;               // você marcou/lançou como pago: sempre soma, qualquer que seja a data
  const acc = state.accounts.find(a=>a.id===t.accountId);
  const since = acc? accountStartISO(acc) : '';
  if(since && cashDate(t) < since) return false;   // anterior ao saldo inicial: já estava incluído nele
  return true;
}
function excludedRows(acc){
  // lançamentos que VOCÊ registrou/pagou, mas que ficaram de fora do saldo por terem data anterior ao saldo inicial
  const since = accountStartISO(acc);
  if(!since) return [];
  return state.transactions.filter(t=>{
    if(t.status!=='pago' || t.accountId!==acc.id || t.preSettled || t.forceCount) return false;
    if(t.type!=='receita' && t.type!=='despesa') return false;
    if(!(cashDate(t) < since)) return false;
    return !!t.paidAt || (t.source==='manual' && !t.genKey && (t.createdAt||0) >= (acc.createdAt||0));
  });
}
function excludedBanner(acc){
  const rows = excludedRows(acc);
  if(!rows.length) return '';
  const net = rows.reduce((s,t)=>s+(t.type==='receita'? 1 : -1)*Number(t.value),0);
  return `<div class="alert-item" style="margin-top:12px;display:block">
    <div style="font-weight:700">${rows.length} lançamento(s) pago(s) por você não estão somando</div>
    <div class="help-text" style="margin:4px 0 8px">A data deles é anterior ao saldo inicial desta conta (${fmtDate(accountStartISO(acc))}), então o Kivo entendeu que já estavam no saldo. Se somarem, o saldo muda ${net>=0? '+' : ''}${fmtCurrency(net)}.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn small primary" data-force-acc="${acc.id}">Somar ao saldo</button><button class="btn small" data-ignore-acc="${acc.id}">Já estavam no meu saldo</button></div>
  </div>`;
}
function acceptExcludedRows(accId){
  const acc = state.accounts.find(a=>a.id===accId); if(!acc) return;
  excludedRows(acc).forEach(t=>{ t.forceCount = true; });
  saveState(); renderAll();
  showToast('Pronto: esses lançamentos agora somam ao saldo.');
}
function dismissExcludedRows(accId){
  const acc = state.accounts.find(a=>a.id===accId); if(!acc) return;
  excludedRows(acc).forEach(t=>{ t.preSettled = true; });
  saveState(); renderAll();
}
function accountBalance(accountId){
  const acc = state.accounts.find(a=>a.id===accountId);
  if(!acc) return 0;
  let bal = Number(acc.initialBalance)||0;
  state.transactions.forEach(t=>{
    if(t.status!=='pago' || !txCountsForBalance(t)) return;
    if(t.type==='receita' && t.accountId===accountId) bal += Number(t.value);
    else if(t.type==='despesa' && t.accountId===accountId) bal -= Number(t.value);
    else if(t.type==='ajuste' && t.accountId===accountId) bal += Number(t.value);   // ajuste de saldo: o valor já tem sinal
    else if(t.type==='transferencia'){
      if(t.accountId===accountId) bal -= Number(t.value);
      if(t.toAccountId===accountId) bal += Number(t.value);
    }
  });
  return bal;
}
function totalAvailable(){
  return state.accounts.filter(a=>a.status==='ativa').reduce((s,a)=>s+accountBalance(a.id),0);
}
function earliestTrackedDate(){
  const acctDates = state.accounts.map(a=>a.createdAt? new Date(a.createdAt).toISOString().slice(0,10) : null).filter(Boolean);
  const txnDates = state.transactions.map(cashDate).filter(Boolean);
  const all = [...acctDates, ...txnDates].sort();
  return all.length? all[0] : todayISO();
}
function balanceAsOfDate(iso){
  const earliest = earliestTrackedDate();
  if(iso < earliest) return null; // antes disso, o Kivo não tem histórico seu — mostrar um número aqui seria inventar dado
  const todayIso = todayISO();
  const total0 = totalAvailable(); // saldo real de hoje — essa é a única fonte de verdade
  if(iso===todayIso) return total0;
  if(iso<todayIso){
    // volta no tempo a partir de hoje: desfaz o efeito de tudo que já foi pago entre essa data e hoje
    let total = total0;
    state.transactions.forEach(t=>{
      if(t.type==='transferencia' || t.status!=='pago' || !t.date || !txCountsForBalance(t)) return;
      const cd = cashDate(t);
      if(cd>iso && cd<=todayIso){
        total -= (t.type==='receita' || t.type==='ajuste')? Number(t.value) : -Number(t.value);
      }
    });
    return total;
  }
  // futuro: projeta a partir de hoje somando o que ainda está pendente até a data alvo
  let total = total0;
  state.transactions.forEach(t=>{
    if(t.type==='transferencia' || t.status!=='pendente' || !t.date) return;
    if(t.date>todayIso && t.date<=iso){
      total += t.type==='receita'? Number(t.value) : -Number(t.value);
    }
  });
  virtualEntriesBetween(todayIso, iso).forEach(v=>{ total += v.type==='receita'? Number(v.value) : -Number(v.value); });
  return total;
}
function renderPlanDia(){
  const dayTxns = state.transactions.filter(t=>cashDate(t)===planDay).concat(virtualEntriesByDate(planDay)).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  const receitasDia = dayTxns.filter(t=>t.type==='receita').reduce((a,t)=>a+Number(t.value),0);
  const despesasDia = dayTxns.filter(t=>t.type==='despesa').reduce((a,t)=>a+Number(t.value),0);
  const saldo = balanceAsOfDate(planDay);
  const isToday = planDay===todayISO();
  const isPast = planDay<todayISO();

  $('#ob-body').innerHTML = `
    <div class="view-head">
      <div><h2>Dia a dia</h2><div class="view-sub">Navegue dia a dia e veja o saldo projetado para cada data</div></div>
      <div class="month-nav">
        <button class="btn" id="plan-prev">${icon('chevronLeft',16)}</button>
        <div class="month-label" style="min-width:260px">${dayLabel(planDay)}</div>
        <button class="btn" id="plan-next">${icon('chevronRight',16)}</button>
        <button class="btn" id="plan-jump" title="Ir para uma data específica">${icon('calendar',16)}</button>
        <input type="date" id="plan-datepicker" value="${planDay}" style="position:absolute;opacity:0;pointer-events:none;width:1px;height:1px">
        ${!isToday?`<button class="btn small" id="plan-today">Hoje</button>`:''}
      </div>
    </div>
    <div class="grid grid-4">
      <div class="card"><div class="stat-label">Receitas do dia</div><div class="stat-value pos num">${fmtCurrency(receitasDia)}</div></div>
      <div class="card"><div class="stat-label">Despesas do dia</div><div class="stat-value neg num">${fmtCurrency(despesasDia)}</div></div>
      <div class="card"><div class="stat-label">Saldo do dia</div><div class="stat-value ${receitasDia-despesasDia>=0?'pos':'neg'} num">${fmtCurrency(receitasDia-despesasDia)}</div></div>
      <div class="card"><div class="stat-label">Saldo ${isPast?'real':'projetado'} até esse dia</div><div class="stat-value ${saldo===null?'':saldo>=0?'pos':'neg'} num">${saldo===null? '—' : fmtCurrency(saldo)}</div><div class="stat-foot">${saldo===null? 'Sem dados antes de '+fmtDate(earliestTrackedDate()) : (state.accounts.length? '' : 'Cadastre uma conta para projeções precisas')}</div></div>
    </div>

    <div class="section-title"><h2>Lançamentos de ${fmtDate(planDay)}</h2>
      <button class="btn small" id="btn-new-lanc-day">${icon('plus',13)} Novo lançamento nesse dia</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Descrição</th><th>Categoria</th><th>Tipo</th><th class="right">Valor</th><th>Status</th><th></th></tr></thead>
      <tbody>${dayTxns.length? dayTxns.map(t=>`<tr>
        <td>${escapeHtml(t.description)}${t.source!=='manual'?`<span class="badge grey" style="margin-left:6px">${sourceLabel(t.source)}</span>`:''}</td>
        <td>${escapeHtml(t.category||'—')}</td>
        <td>${typeBadge(t.type)}</td>
        <td class="right num ${txClass(t)}">${txMoney(t)}</td>
        <td>${t.virtual? '<span class="badge grey" title="Previsão da recorrência — vira lançamento uns 3 meses antes da data">Previsto</span>' : (t.status==='pago'?'<span class="badge green">Pago</span>':'<span class="badge gold">Pendente</span>')+paidNote(t)}</td>
        <td>${t.type==='ajuste'? '' : t.virtual? `<button class="icon-btn" data-edit-src="${t.source}" data-src-id="${t.sourceId}" title="Editar a recorrência">${icon('edit',15)}</button>` : `<button class="icon-btn" data-edit-day="${t.id}" title="Editar">${icon('edit',15)}</button>`+undoButtonHtml(t)}</td>
      </tr>`).join('') : emptyRow(6,'calendar','Nada nesse dia','Nenhum lançamento registrado para essa data.')}</tbody>
    </table></div>

    <div class="section-title"><h2>Próximos vencimentos</h2>
      <div class="toolbar" style="margin:0">
        <button class="subtab ${upcomingWindow===7?'active':''}" data-window="7" style="margin-right:10px">7 dias</button>
        <button class="subtab ${upcomingWindow===30?'active':''}" data-window="30">30 dias</button>
      </div>
    </div>
    <div class="card clickable" data-goto="contas" style="margin-bottom:1px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div>
        <div class="stat-label">Saldo total em contas</div>
        <div class="stat-value ${signClass(totalAvailable())} num">${fmtCurrency(totalAvailable())}</div>
        <div class="stat-foot">${state.accounts.length} conta(s) · marcar um lançamento como pago ajusta o saldo automaticamente</div>
      </div>
      <span class="btn small">${icon('creditcard',13)} Ver contas</span>
    </div>
    <div class="table-wrap">${renderUpcomingList(upcomingItems(upcomingWindow), totalAvailable())}</div>
  `;
  $('#plan-prev').onclick=()=>{planDay=addDaysToISO(planDay,-1);RENDERERS.planejamento();};
  $('#plan-next').onclick=()=>{planDay=addDaysToISO(planDay,1);RENDERERS.planejamento();};
  $('#plan-jump').onclick=()=>{
    const dp = $('#plan-datepicker');
    if(dp.showPicker){ dp.showPicker(); } else { dp.click(); dp.focus(); }
  };
  $('#plan-datepicker').onchange=(e)=>{ if(e.target.value){ planDay=e.target.value; RENDERERS.planejamento(); } };
  const todayBtn = $('#plan-today');
  if(todayBtn) todayBtn.onclick=()=>{planDay=todayISO();RENDERERS.planejamento();};
  $('#btn-new-lanc-day').onclick=()=>openLancModal(null, planDay);
  $$('[data-edit-day]').forEach(b=>b.onclick=()=>openLancModal(dayTxns.find(t=>t.id===b.dataset.editDay)));
  $$('#view-planejamento [data-undo]').forEach(b=>b.onclick=()=>undoPayment(b.dataset.undo));
  $$('[data-edit-src]').forEach(b=>b.onclick=()=>{
    if(b.dataset.editSrc==='income') openIncomeModal(state.incomes.find(i=>i.id===b.dataset.srcId));
    else openRecModal(state.recurring.find(r=>r.id===b.dataset.srcId));
  });
  $$('#view-planejamento [data-window]').forEach(b=>b.onclick=()=>{ upcomingWindow=parseInt(b.dataset.window); RENDERERS.planejamento(); });
  $$('#view-planejamento [data-mark-paid]').forEach(b=>b.onclick=()=>markTransactionPaid(b.dataset.markPaid));
  $$('#view-planejamento [data-goto]').forEach(c=>c.onclick=()=>switchView(c.dataset.goto));
}
RENDERERS.planejamento = function(){
  const tabs = [['visao','Visão do período'],['fluxo','Fluxo do dinheiro'],['limites','Limites por categoria'],['dia','Dia a dia']];
  $('#view-planejamento').innerHTML = `
    <div class="view-head"><div><h1>Orçamento</h1><div class="view-sub">Quanto você pode gastar, de onde o dinheiro vem e para onde ele vai</div></div></div>
    <div class="ob-tabs">${tabs.map(([k,l])=>`<button class="ob-tab ${k===budTab? 'active' : ''}" data-obtab="${k}">${l}</button>`).join('')}</div>
    <div id="ob-body"></div>`;
  const again = ()=>RENDERERS.planejamento();
  $$('#view-planejamento .ob-tab').forEach(b=>b.onclick=()=>{ budTab = b.dataset.obtab; again(); });
  if(budTab==='visao'){ $('#ob-body').innerHTML = renderObVisao(); wireObVisao(); }
  else if(budTab==='fluxo'){ $('#ob-body').innerHTML = renderObFluxo(); wireObFluxo(again); }
  else if(budTab==='limites'){ $('#ob-body').innerHTML = renderOrcamento('ob'); wireOrcamento('ob','ob-body',again); }
  else renderPlanDia();
};
function typeBadge(type){
  if(type==='receita') return '<span class="badge green">Receita</span>';
  if(type==='transferencia') return '<span class="badge gold">Transferência</span>';
  if(type==='ajuste') return '<span class="badge grey">Ajuste</span>';
  return '<span class="badge rust">Despesa</span>';
}
const PAY_FIELDS = ['status','paidAt','forceCount','preSettled','accountId','paymentMethod','category'];
function snapshotPay(t){ const o = {}; PAY_FIELDS.forEach(k=>{ o[k] = (k in t)? t[k] : undefined; }); return o; }
function applySnapshot(t, prev){ PAY_FIELDS.forEach(k=>{ if(prev[k]===undefined) delete t[k]; else t[k] = prev[k]; }); }
function applyUndo(t){ t.status = 'pendente'; t.paidAt = ''; t.forceCount = false; t.preSettled = false; }
function undoEffectText(t){
  if(t.type==='transferencia') return 'O saldo das contas é recalculado.';
  const acc = state.accounts.find(a=>a.id===t.accountId);
  if(!acc || !txCountsForBalance(t)) return 'Isso não muda o saldo das contas.';
  return t.type==='receita'? `${fmtCurrency(t.value)} deixa de entrar no saldo de "${acc.name}".` : `${fmtCurrency(t.value)} volta para o saldo de "${acc.name}".`;
}
function undoPayment(txId){
  const t = state.transactions.find(x=>x.id===txId);
  if(!t || t.status!=='pago' || t.type==='ajuste') return;
  if(t.preSettled){
    confirmModal('Essa parcela já estava paga antes do Kivo',
      'Ela foi marcada como "já paga" ao cadastrar a dívida ou o parcelamento. Para mudar isso, edite a dívida (ou o parcelamento) e ajuste o campo "Parcelas já pagas".',
      ()=>{}, 'Entendi', 'primary');
    return;
  }
  const isIn = t.type==='receita';
  confirmModal(`Desfazer ${isIn? 'o recebimento' : 'o pagamento'}?`,
    `"${t.description}" volta para pendente. ${undoEffectText(t)}`,
    ()=>{ applyUndo(t); saveState(); renderAll(); showToast(isIn? 'Recebimento desfeito.' : 'Pagamento desfeito.'); },
    'Desfazer', 'primary');
}
function undoInvoicePayment(cardId, dueDate){
  const card = state.cards.find(c=>c.id===cardId);
  const rows = state.transactions.filter(t=>t.cardId===cardId && t.type==='despesa' && t.date===dueDate && t.status==='pago' && !t.preSettled);
  if(!card || !rows.length){ showToast('Não há pagamento para desfazer nessa fatura.','error'); return; }
  const total = rows.reduce((s,t)=>s+Number(t.value),0);
  confirmModal(`Desfazer o pagamento da fatura de ${monthLabel(dueDate.slice(0,7))}?`,
    `${rows.length} lançamento(s), ${fmtCurrency(total)}, voltam para pendente e esse valor deixa de ser descontado das contas. A fatura continua fechada: dá para pagar de novo ou reabrir.`,
    ()=>{ rows.forEach(applyUndo); saveState(); renderAll(); showToast('Pagamento da fatura desfeito.'); },
    'Desfazer pagamento', 'primary');
}
function undoButtonHtml(t){
  return (t.status==='pago' && (t.type==='receita' || t.type==='despesa' || t.type==='transferencia'))?
    `<button class="icon-btn" data-undo="${t.id}" title="Desfazer pagamento">${icon('undo',15)}</button>` : '';
}
function markTransactionPaid(txId){
  const t = state.transactions.find(x=>x.id===txId);
  if(!t || t.status==='pago') return;
  const isIn = t.type==='receita';
  const catType = (t.type==='receita' || t.type==='despesa')? t.type : null;
  let catOpts = catType? categoryOptions(catType) : [];
  if(catType && t.category && !catOpts.some(o=>o.value===t.category)) catOpts = [{value:t.category,label:t.category}].concat(catOpts);
  openFormModal({
    title: isIn? 'Marcar como recebido' : 'Marcar como pago',
    initial:{paidAt:todayISO(), accountId:t.accountId||defaultAccountId(), paymentMethod:t.paymentMethod||'Outro', category:t.category||''},
    fields:[
      {name:'paidAt',label: isIn? 'Recebido em' : 'Pago em', type:'date', required:true},
      {row:[{name:'accountId',label: isIn? 'Conta que recebeu' : 'Conta de onde saiu', type:'select', options:accountOptions(t.accountId)},
             {name:'paymentMethod',label: isIn? 'Forma de recebimento' : 'Forma de pagamento', type:'select', options:paymentOptions()}]},
      ...(catOpts.length? [{name:'category',label:'Categoria',type:'select',options:catOpts}] : [])
    ],
    submitLabel: isIn? 'Marcar como recebido' : 'Marcar como pago',
    onSubmit(v){
      const prev = snapshotPay(t);
      t.status = 'pago';
      t.paidAt = v.paidAt || todayISO();
      t.forceCount = true; t.preSettled = false;   // você marcou como pago: soma no saldo sempre
      if(v.accountId) t.accountId = v.accountId; else if(!t.accountId) t.accountId = defaultAccountId();
      if(v.paymentMethod) t.paymentMethod = v.paymentMethod;
      if(v.category) t.category = v.category;
      saveState(); renderAll();
      showToast(isIn? 'Recebimento registrado.' : 'Pagamento registrado.', '', {label:'Desfazer', fn:()=>{ applySnapshot(t, prev); saveState(); renderAll(); showToast('Desfeito.'); }});
    }
  });
}

/* ===================== CARTÃO ===================== */
/* ===================== CONTAS ===================== */
RENDERERS.contas = function(){
  const total = totalAvailable();
  $('#view-contas').innerHTML = `
    <div class="view-head"><div><h1>Contas</h1><div class="view-sub">Contas bancárias, carteira, poupança e outras — o saldo é calculado automaticamente</div></div>
      <button class="btn primary" id="btn-new-account">${icon('plus',15)} Nova conta</button></div>
    <div class="card" style="margin-bottom:18px"><div class="stat-label">Total disponível</div><div class="stat-value ${total>=0?'pos':'neg'} num" style="font-size:28px">${fmtCurrency(total)}</div><div class="stat-foot">Soma de todas as contas ativas</div></div>
    <div class="grid grid-3">${state.accounts.length? state.accounts.map(accountCard).join(''):emptyState('creditcard','Nenhuma conta cadastrada','Crie sua primeira conta para começar a acompanhar o saldo automaticamente.')}</div>
  `;
  function accountCard(a){
    const bal = accountBalance(a.id);
    return `<div class="card">
      <div class="stat-label">${escapeHtml(a.name)} ${a.status==='inativa'?'<span class="badge grey">Inativa</span>':''}</div>
      <div class="stat-value ${signClass(bal)} num">${fmtCurrency(bal)}</div>
      <div class="stat-foot">${escapeHtml(a.institution||typeLabel(a.type))} · saldo inicial ${fmtCurrency(a.initialBalance)} em ${fmtDate(accountStartISO(a))}</div>
      <div class="stat-foot">${a.lastCheckedAt? 'Conferido com o banco em '+fmtDate(localISODate(a.lastCheckedAt)) : 'Ainda não conferido com o banco'}</div>
      ${excludedBanner(a)}
      <div style="margin-top:12px"><button class="btn small" data-check-acc="${a.id}">${icon('checkCircle',14)} Conferir saldo</button></div>
      <div style="margin-top:8px"><button class="icon-btn" data-edit-acc="${a.id}">${icon('edit',14)} Editar</button> <button class="icon-btn" data-del-acc="${a.id}">${icon('trash',14)} Excluir</button></div>
    </div>`;
  }
  $('#btn-new-account').onclick=()=>openAccountModal();
  $$('[data-check-acc]').forEach(b=>b.onclick=()=>openReconcileModal(b.dataset.checkAcc));
  $$('[data-force-acc]').forEach(b=>b.onclick=()=>acceptExcludedRows(b.dataset.forceAcc));
  $$('[data-ignore-acc]').forEach(b=>b.onclick=()=>dismissExcludedRows(b.dataset.ignoreAcc));
  $$('[data-edit-acc]').forEach(b=>b.onclick=()=>openAccountModal(state.accounts.find(a=>a.id===b.dataset.editAcc)));
  $$('[data-del-acc]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.delAcc;
    const inUse = state.transactions.some(t=>t.accountId===id||t.toAccountId===id);
    confirmModal('Excluir conta?', inUse? 'Existem lançamentos vinculados a essa conta — eles continuarão salvos, mas ficarão sem conta associada.':'Tem certeza?', ()=>{
      state.accounts = state.accounts.filter(a=>a.id!==id);
      saveState(); renderAll();
    });
  });
};
function typeLabel(type){
  return {conta:'Conta bancária',carteira:'Carteira',poupanca:'Poupança',digital:'Conta digital',conjunta:'Conta conjunta',outro:'Outros'}[type]||'Conta';
}
function localISODate(ms){
  const d = new Date(ms), p = n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
function openReconcileModal(accountId){
  const acc = state.accounts.find(a=>a.id===accountId);
  if(!acc) return;
  const calc = Math.round(accountBalance(accountId)*100)/100;
  openFormModal({
    title:`Conferir saldo · ${acc.name}`,
    initial:{real:Math.abs(calc), negative:calc<0},
    fields:[
      {name:'real',label:`Quanto aparece no banco agora? (o Kivo calcula ${fmtCurrency(calc)})`,type:'currency',required:true},
      {name:'negative',label:'O saldo está negativo (cheque especial)',type:'checkbox'}
    ],
    submitLabel:'Conferir',
    onSubmit(v){
      const calcNow = Math.round(accountBalance(accountId)*100)/100;
      const real = Math.round((v.negative? -v.real : v.real)*100)/100;
      const diff = Math.round((real-calcNow)*100)/100;
      if(Math.abs(diff)<0.005){
        acc.lastCheckedAt = Date.now();
        saveState(); renderAll();
        showToast('O saldo confere com o do banco.');
        return;
      }
      const signed = (diff>0? '+' : '')+fmtCurrency(diff);
      confirmModal(`Registrar ajuste de ${signed}?`,
        `O Kivo calcula ${fmtCurrency(calcNow)} e você informou ${fmtCurrency(real)}. Vai ser criado um lançamento "Ajuste de saldo" de ${signed}, que mexe só no saldo desta conta e não conta como receita nem despesa. Se errar, é só excluir esse lançamento.`,
        ()=>{
          const today = todayISO();
          state.transactions.push({id:uid(), type:'ajuste', source:'manual', sourceId:null, genKey:null, installmentIndex:null, preSettled:false,
            category:'Ajuste de saldo', description:'Ajuste de saldo', value:diff, date:today, month:monthKeyOf(today),
            paymentMethod:'Outro', cardId:null, accountId, status:'pago',
            note:`Conferência: banco ${fmtCurrency(real)}, Kivo ${fmtCurrency(calcNow)}`, createdAt:Date.now()});
          acc.lastCheckedAt = Date.now();
          saveState(); renderAll();
          showToast('Saldo acertado.');
        }, 'Registrar ajuste', 'primary');
    }
  });
}
function openAccountModal(a){
  const isEdit = !!a;
  openFormModal({
    title: isEdit? 'Editar conta':'Nova conta',
    initial: a? {...a, startDate:accountStartISO(a)} : {type:'conta',status:'ativa',initialBalance:0,startDate:todayISO()},
    fields:[
      {name:'name',label:'Nome',type:'text',required:true},
      {row:[{name:'institution',label:'Instituição (opcional)',type:'text'},
             {name:'type',label:'Tipo',type:'select',options:[{value:'conta',label:'Conta bancária'},{value:'carteira',label:'Carteira'},{value:'poupanca',label:'Poupança'},{value:'digital',label:'Conta digital'},{value:'conjunta',label:'Conta conjunta'},{value:'outro',label:'Outros'}]}]},
      {row:[{name:'initialBalance',label:'Saldo inicial',type:'currency',required:true},
             {name:'status',label:'Status',type:'select',options:[{value:'ativa',label:'Ativa'},{value:'inativa',label:'Inativa'}]}]},
      {name:'startDate',label:'Data do saldo inicial (o que foi pago antes dela já está no saldo)',type:'date'}
    ],
    onSubmit(v){
      if(isEdit){ Object.assign(a,v); } else { state.accounts.push({id:uid(),...v,createdAt:Date.now()}); }
      saveState(); renderAll();
    },
    onDelete: isEdit? ()=>{ confirmModal('Excluir conta?','Tem certeza?',()=>{ state.accounts=state.accounts.filter(x=>x.id!==a.id); saveState(); closeModal(); renderAll(); }); } : null
  });
}

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
      <div class="stat-value ${signClass(c.limit-used)} num">${fmtCurrency(c.limit-used)}</div>
      <div class="stat-foot">disponível de ${fmtCurrency(c.limit)}</div>
      <div class="progress" style="margin-top:10px"><div style="width:${pct}%;background:${pct>85?'var(--red)':'var(--green)'}"></div></div>
      <div class="stat-foot">Fecha dia ${c.closingDay||'—'} · vence dia ${c.dueDay||'—'}</div>
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
      {row:[{name:'limit',label:'Limite',type:'currency'},{name:'closingDay',label:'Dia de fechamento',type:'number'}]},
      {name:'dueDay',label:'Dia de vencimento',type:'number'}],
    onSubmit(v){ if(c) Object.assign(c,v); else state.cards.push({id:uid(),...v}); saveState(); RENDERERS.cartao(); },
    onDelete: c? ()=>{confirmModal('Excluir cartão?','Tem certeza?',()=>{state.cards=state.cards.filter(x=>x.id!==c.id);saveState();closeModal();RENDERERS.cartao();});}:null
  });
}
function openPurchaseModal(){
  openFormModal({
    title:'Nova compra no cartão',
    initial:{purchaseDate:todayISO(),count:1,cardId:state.cards[0]?.id||''},
    fields:[
      {name:'name',label:'Descrição da compra',type:'text',required:true},
      {row:[{name:'category',label:'Categoria',type:'select',options:categoryOptions('despesa')},
             {name:'cardId',label:'Cartão',type:'select',options:state.cards.map(c=>({value:c.id,label:c.name}))}]},
      {row:[{name:'totalValue',label:'Valor total',type:'currency',required:true},
             {name:'count',label:'Nº de parcelas',type:'number',required:true}]},
      {name:'purchaseDate',label:'Data da compra',type:'date',required:true},
      {name:'alreadyPaid',label:'Parcelas já pagas (opcional)',type:'text',inputmode:'numeric',placeholder:'Em branco: o Kivo conta as vencidas até hoje'}
    ],
    onSubmit(v){
      const count = Math.max(1,parseInt(v.count));
      const card = state.cards.find(c=>c.id===v.cardId);
      const naturalMonth = firstInvoiceMonth(card, v.purchaseDate);
      const startMonth = openInvoiceMonthFrom(card, naturalMonth);   // fatura já fechada por você: vai para a próxima aberta
      const inst = {id:uid(),name:v.name,category:v.category,totalValue:v.totalValue,installmentValue:Math.round(v.totalValue/count*100)/100,count,startMonth,cardId:v.cardId,status:'ativo',note:''};
      const raw = String(v.alreadyPaid==null? '' : v.alreadyPaid).trim();
      inst.alreadyPaid = raw===''? autoPaidCountInst(inst) : Math.max(0, Math.min(parseInt(raw,10)||0, count));
      state.installments.push(inst);
      materializeAll(); renderAll();
      if(startMonth!==naturalMonth && card) showToast(`A fatura de ${monthLabel(invoiceDueDate(card,naturalMonth).slice(0,7))} já está fechada: a compra foi para a de ${monthLabel(invoiceDueDate(card,startMonth).slice(0,7))}.`);
    }
  });
}

/* ===================== FATURAS (parcelamentos no cartão) ===================== */
function currentInvoiceInfo(cardId){
  // a fatura "aberta" é a do vencimento mais próximo que ainda tem algo a pagar (inclui atrasadas)
  const pend = state.transactions.filter(t=>t.cardId===cardId && t.type==='despesa' && t.status==='pendente' && t.date);
  if(!pend.length) return null;
  const dueDate = pend.map(t=>t.date).sort()[0];
  const items = pend.filter(t=>t.date===dueDate);
  return {dueDate, total:items.reduce((s,t)=>s+Number(t.value),0), count:items.length, late:dueDate<todayISO(), ids:items.map(t=>t.id)};
}
function invoiceInfoFor(cardId, dueDate){
  const items = state.transactions.filter(t=>t.cardId===cardId && t.type==='despesa' && t.status==='pendente' && t.date===dueDate);
  if(!items.length) return null;
  return {dueDate, total:items.reduce((s,t)=>s+Number(t.value),0), count:items.length, late:dueDate<todayISO(), ids:items.map(t=>t.id)};
}
function isInvoiceClosed(card, dueDate){ return !!(card && card.closings && card.closings[dueDate]); }
function openInvoiceMonthFrom(card, month){
  // se a fatura desse mês já foi fechada por você, o lançamento vai para a primeira que ainda está aberta
  let m = month;
  for(let k=0; k<24 && isInvoiceClosed(card, invoiceDueDate(card,m)); k++) m = addMonthsToKey(m,1);
  return m;
}
function invoiceMonthFromDue(card, dueDate){
  const dueMonth = dueDate.slice(0,7);
  const due = card.dueDay? (parseInt(card.dueDay,10)||10) : 10;
  const closing = card.closingDay? (parseInt(card.closingDay,10)||0) : 0;
  return (closing && due<=closing)? addMonthsToKey(dueMonth,-1) : dueMonth;
}
function closingDateOf(card, invoiceMonth){
  const c = parseInt(card.closingDay,10);
  return c? invoiceMonth+'-'+pad(Math.min(c, daysInMonth(invoiceMonth))) : '';
}
function cardInvoices(card){
  const today = todayISO();
  const byDue = {};
  state.transactions.forEach(t=>{ if(t.cardId===card.id && t.type==='despesa' && t.date){ (byDue[t.date] = byDue[t.date] || []).push(t); } });
  const make = (due, items)=>{
    const pending = items.filter(t=>t.status!=='pago');
    const invMonth = invoiceMonthFromDue(card, due);
    const closingDate = closingDateOf(card, invMonth);
    return { cardId:card.id, dueDate:due, invoiceMonth:invMonth, closingDate, items,
      total: items.reduce((s,t)=>s+Number(t.value),0), pendingTotal: pending.reduce((s,t)=>s+Number(t.value),0),
      count: items.length, paid: items.length>0 && pending.length===0, manualClosed: isInvoiceClosed(card,due),
      closedByDate: !!closingDate && closingDate < today, late: pending.length>0 && due < today };
  };
  const list = Object.keys(byDue).map(due=>make(due, byDue[due]));
  // sempre existe uma fatura aberta: a do ciclo de hoje (ou a seguinte, se essa já foi fechada ou paga)
  let m = firstInvoiceMonth(card, today);
  for(let k=0; k<12; k++){
    const due = invoiceDueDate(card, m);
    let inv = list.find(i=>i.dueDate===due);
    if(!inv){ inv = make(due, []); list.push(inv); }
    if(!inv.manualClosed && !inv.paid) break;
    m = addMonthsToKey(m,1);
  }
  list.sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
  let openDone = false;
  list.forEach(inv=>{
    if(inv.paid) inv.status = 'paga';
    else if(inv.manualClosed) inv.status = 'fechada';
    else if(inv.closedByDate) inv.status = 'fechou';          // passou do dia de fechamento: falta você confirmar
    else if(!openDone){ inv.status = 'aberta'; openDone = true; }
    else inv.status = 'futura';
  });
  return list;
}
function adjustKeyOf(cardId, dueDate){ return 'inv-adjust|'+cardId+'|'+dueDate; }
function applyInvoiceBankTotal(card, dueDate, bankTotal){
  // Compara o total que o banco mostrou com o do Kivo. Se o banco for MAIOR (juros, tarifas), cria (ou atualiza) um
  // lançamento de ajuste com a diferença. Se for menor ou igual, não inventa valor: avisa. Idempotente: pela chave.
  bankTotal = rnd2(Number(bankTotal)||0);
  const none = {status:'none', diff:0, row:null, message:'', undo(){}};
  if(!(bankTotal>0)) return none;
  const key = adjustKeyOf(card.id, dueDate);
  const existing = state.transactions.find(t=>t.adjustKey===key);
  const inv = cardInvoices(card).find(i=>i.dueDate===dueDate);
  const base = rnd2((inv? inv.total : 0) - (existing? Number(existing.value)||0 : 0));
  const diff = rnd2(bankTotal-base);
  if(diff<=0){
    if(existing) state.transactions = state.transactions.filter(t=>t!==existing);
    const undo = ()=>{ if(existing) state.transactions.push(existing); };
    return diff===0
      ? {status:'equal', diff, base, row:null, undo, message:`A fatura já bate com o total do banco (${fmtCurrency(bankTotal)}).${existing? ' Removi o ajuste que existia.' : ''}`}
      : {status:'lower', diff, base, row:null, undo, message:`O total do banco (${fmtCurrency(bankTotal)}) é menor que o do Kivo (${fmtCurrency(base)}). Confira se há lançamentos a mais ou estornos.${existing? ' Removi o ajuste que existia.' : ''}`};
  }
  if(existing){
    const prev = existing.value; existing.value = diff;
    return {status:'updated', diff, base, row:existing, undo(){ existing.value = prev; }, message:`Atualizei o ajuste da fatura para ${fmtCurrency(diff)}: agora ela bate com o banco (${fmtCurrency(bankTotal)}).`};
  }
  const monthKey = invoiceMonthFromDue(card, dueDate);
  const row = {id:uid(), type:'despesa', source:'manual', description:`Ajuste da fatura ${card.name} (juros/tarifas)`,
    category: state.categories.some(c=>c.type==='despesa' && c.name==='Cartão')? 'Cartão' : 'Outros',
    value:diff, date:dueDate, month:monthKey, purchaseDate: closingDateOf(card, monthKey) || dueDate, status:'pendente',
    cardId:card.id, paymentMethod:'Crédito', accountId:defaultAccountId(), createdAt:Date.now(), adjustKey:key};
  state.transactions.push(row);
  return {status:'added', diff, base, row, undo(){ state.transactions = state.transactions.filter(t=>t!==row); },
    message:`Criei um lançamento de ${fmtCurrency(diff)} ("Ajuste da fatura") para a fatura bater com o banco (${fmtCurrency(bankTotal)}).`};
}
function bankTotalFields(){
  return [{name:'bankTotal', label:'Total da fatura no banco (opcional)', type:'currency'},
          {name:'bankHelp', type:'note', html:'Se o banco mostrar um valor maior (juros, tarifas), o Kivo cria um lançamento com a diferença. Pode deixar em branco.'}];
}
function openInvoiceBankModal(cardId, dueDate){
  const card = state.cards.find(c=>c.id===cardId); if(!card) return;
  const inv = cardInvoices(card).find(i=>i.dueDate===dueDate);
  if(!inv || inv.paid) return;
  openFormModal({
    title:`Total do banco · fatura de ${monthLabel(dueDate.slice(0,7))}`,
    fields:[{name:'info', type:'note', html:`${escapeHtml(card.name)} · no Kivo: <b>${fmtCurrency(inv.total)}</b> em ${inv.count} lançamento(s). Digite o total que o banco mostrou. Se for maior, o Kivo cria um lançamento com a diferença (juros, tarifas).`},
            {name:'bankTotal', label:'Total da fatura no banco', type:'currency'}],
    submitLabel:'Conferir',
    onSubmit(v){
      const r = applyInvoiceBankTotal(card, dueDate, v.bankTotal);
      saveState(); renderAll();
      showToast(r.message || 'Informe o total que o banco mostrou para conferir.', r.status==='lower'? 'error' : '');
    }
  });
}
function closeInvoice(cardId, dueDate){
  const card = state.cards.find(c=>c.id===cardId); if(!card) return;
  const inv = cardInvoices(card).find(i=>i.dueDate===dueDate);
  card.closings = card.closings || {};
  card.closings[dueDate] = { closedAt: Date.now(), total: inv? inv.total : 0 };
  saveState(); renderAll();
  const next = cardInvoices(card).find(i=>i.status==='aberta');
  showToast(next? `Fatura fechada. A de ${monthLabel(next.dueDate.slice(0,7))} agora está aberta, com ${fmtCurrency(next.total)} já lançados.` : 'Fatura fechada.');
}
function openCloseInvoiceModal(cardId, dueDate){
  const card = state.cards.find(c=>c.id===cardId); if(!card) return;
  const inv = cardInvoices(card).find(i=>i.dueDate===dueDate);
  if(!inv || inv.paid || inv.manualClosed) return;
  openFormModal({
    title:`Fechar a fatura de ${monthLabel(dueDate.slice(0,7))}?`,
    fields:[{name:'info', type:'note', html:`${escapeHtml(card.name)} · vence ${fmtDate(dueDate)} · ${inv.count} lançamento(s) · total <b>${fmtCurrency(inv.total)}</b> no Kivo. Depois de fechada, o que você lançar nesse cartão passa a ir para a próxima fatura. Se precisar, dá para reabrir.`}, ...bankTotalFields()],
    submitLabel:'Confirmar fechamento',
    onSubmit(v){
      const r = applyInvoiceBankTotal(card, dueDate, v.bankTotal);   // antes de fechar, para o total guardado já incluir o ajuste
      closeInvoice(cardId, dueDate);
      if(r.message) showToast(r.message, r.status==='lower'? 'error' : '');
    }
  });
}
function reopenInvoice(cardId, dueDate){
  const card = state.cards.find(c=>c.id===cardId);
  if(!card || !card.closings || !card.closings[dueDate]) return;
  delete card.closings[dueDate];
  saveState(); renderAll();
  showToast('Fatura reaberta.');
}
function openPayInvoiceModal(cardId, dueDate){
  const card = state.cards.find(c=>c.id===cardId);
  const info = dueDate? invoiceInfoFor(cardId, dueDate) : currentInvoiceInfo(cardId);
  if(!card || !info) return;
  openFormModal({
    title:`Pagar fatura ${card.name} · ${fmtCurrency(info.total)}`,
    initial:{accountId:defaultAccountId(), paidAt:todayISO()},
    fields:[{name:'paidAt',label:'Pago em',type:'date',required:true},
            {name:'accountId',label:`Conta de onde saiu o pagamento · vence ${fmtDate(info.dueDate)} · ${info.count} lançamento(s)`,type:'select',options:accountOptions()},
            ...bankTotalFields()],
    submitLabel:'Marcar como paga',
    onSubmit(v){
      const adj = applyInvoiceBankTotal(card, info.dueDate, v.bankTotal);   // se o banco cobrou mais, o ajuste entra na fatura e é pago junto
      const cur = invoiceInfoFor(card.id, info.dueDate) || info;
      if(adj.message) showToast(adj.message, adj.status==='lower'? 'error' : '');
      const snaps = [];
      cur.ids.forEach(id=>{
        const t = state.transactions.find(x=>x.id===id);
        if(t){ snaps.push([t, snapshotPay(t)]); t.status = 'pago'; t.paidAt = v.paidAt || todayISO(); t.forceCount = true; t.preSettled = false; t.accountId = v.accountId || t.accountId || defaultAccountId(); }
      });
      card.closings = card.closings || {};
      const hadClosing = !!card.closings[info.dueDate];
      if(!hadClosing) card.closings[info.dueDate] = { closedAt: Date.now(), total: cur.total };   // pagar implica fatura fechada
      saveState(); renderAll();
      showToast(`Fatura de ${monthLabel(info.dueDate.slice(0,7))} marcada como paga.`, '', {label:'Desfazer', fn:()=>{
        snaps.forEach(([t,p])=>applySnapshot(t,p));
        adj.undo();
        if(!hadClosing && card.closings) delete card.closings[info.dueDate];
        saveState(); renderAll(); showToast('Desfeito.');
      }});
    }
  });
}
function invoiceBadge(inv){
  const map = {aberta:['green','Aberta'], fechou:['gold','Fechou · confirmar'], fechada:['gold','Fechada'], futura:['grey','Futura'], paga:['green','Paga']};
  const [cls,label] = map[inv.status];
  return `<span class="badge ${cls}">${label}</span>${inv.late? ' <span class="badge rust">Atrasada</span>' : ''}`;
}
function invoiceCardHtml(card, inv){
  const key = `${card.id}|${inv.dueDate}`;
  const actions =
    inv.status==='aberta'  ? `<button class="btn small primary" data-inv-close="${key}">Fechar fatura</button>` :
    inv.status==='fechou'  ? `<button class="btn small primary" data-inv-close="${key}">Confirmar fechamento</button><button class="btn small" data-inv-pay="${key}">Marcar como paga</button><button class="btn small" data-inv-bank="${key}">Total do banco</button>` :
    inv.status==='fechada' ? `<button class="btn small primary" data-inv-pay="${key}">Marcar como paga</button><button class="btn small" data-inv-bank="${key}">Total do banco</button><button class="btn small" data-inv-reopen="${key}">Reabrir</button>` :
    inv.status==='paga'    ? `<button class="btn small" data-inv-unpay="${key}">Desfazer pagamento</button>` : '';
  const rows = inv.items.slice().sort((a,b)=>(a.purchaseDate||a.date).localeCompare(b.purchaseDate||b.date));
  return `<div class="card invoice-card ${inv.status}">
    <div class="stat-label">${escapeHtml(card.name)} ${invoiceBadge(inv)}</div>
    <div class="inv-title">Fatura de ${escapeHtml(monthLabel(inv.dueDate.slice(0,7)))}</div>
    <div class="stat-value ${inv.paid? 'pos' : 'neg'} num">${fmtCurrency(inv.total)}</div>
    <div class="stat-foot">${inv.paid? 'Paga' : 'A pagar'} · vence ${fmtDate(inv.dueDate)}${inv.closingDate? ' · fecha '+fmtDate(inv.closingDate) : ''} · ${inv.count} lançamento(s)</div>
    ${actions? `<div class="inv-actions">${actions}</div>` : ''}
    ${inv.count? `<details class="invoice-items"><summary>Ver lançamentos</summary><table><tbody>${rows.map(t=>`<tr><td>${fmtDate(t.purchaseDate||t.date)}</td><td>${escapeHtml(t.description)}</td><td class="right num neg">${fmtCurrency(t.value)}</td><td>${t.status==='pago'? '<span class="badge green">Pago</span>' : '<span class="badge gold">Pendente</span>'}</td></tr>`).join('')}</tbody></table></details>` : ''}
  </div>`;
}
function cardInvoicesHtml(){
  return state.cards.map(card=>{
    const all = cardInvoices(card);
    const open = all.filter(i=>!i.paid);
    const paid = all.filter(i=>i.paid).slice(-3).reverse();
    return `<div class="card-invoices">
      <div class="inv-card-head"><strong>${escapeHtml(card.name)}</strong><span class="help-text" style="margin:0">Fecha dia ${card.closingDay||'—'} · vence dia ${card.dueDay||'—'}</span></div>
      <div class="grid grid-3">${open.slice(0,6).map(i=>invoiceCardHtml(card,i)).join('')}</div>
      ${open.length>6? `<div class="help-text" style="margin:8px 0 0">+ ${open.length-6} fatura(s) futura(s) com lançamentos</div>` : ''}
      ${paid.length? `<details class="paid-invoices"><summary>Faturas pagas (${paid.length})</summary><div class="grid grid-3">${paid.map(i=>invoiceCardHtml(card,i)).join('')}</div></details>` : ''}
    </div>`;
  }).join('');
}
function invoiceTotalsByMonth(cardId, monthsBack){
  const cur = todayMonthKey();
  const out = [];
  for(let i=monthsBack;i>=0;i--){
    const m = addMonthsToKey(cur,-i);
    const total = state.transactions
      .filter(t=>t.cardId===cardId && t.type==='despesa' && t.month===m)
      .reduce((s,t)=>s+Number(t.value),0);
    out.push({month:m,total});
  }
  return out;
}
let invoiceCompareCard = '';
RENDERERS.parcelamentos = function(){
  const cards = state.cards;
  if(!invoiceCompareCard && cards.length) invoiceCompareCard = cards[0].id;
  $('#view-parcelamentos').innerHTML = `
    <div class="view-head"><div><h1>Faturas</h1><div class="view-sub">Cada cartão com as suas faturas: aberta, fechada e paga</div></div>
      <button class="btn primary" id="btn-new-inst">${icon('plus',15)} Novo parcelamento</button></div>

    ${cards.length? `
    <div class="section-title" style="margin-top:0"><h2>Faturas</h2></div>
    ${cardInvoicesHtml()}

    <div class="section-title"><h2>Comparativo de faturas</h2>
      <div class="toolbar" style="margin:0">
        <select id="invoice-compare-card">${cards.map(c=>`<option value="${c.id}" ${c.id===invoiceCompareCard?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select>
      </div>
    </div>
    <div class="card"><div class="chart-box small"><canvas id="chart-invoice-compare"></canvas></div></div>
    ` : ''}

    <div class="section-title"><h2>Parcelamentos</h2></div>
    <div class="grid grid-3">${state.installments.length? state.installments.map(instCard).join(''):`<div class="card">${emptyState('layers','Nenhum parcelamento cadastrado','Registre compras parceladas para acompanhar o progresso aqui.')}</div>`}</div>
  `;
  function instCard(inst){
    const paid = installmentsPaidCount('installment',inst.id);
    const pct = Math.min(paid/inst.count*100,100);
    const done = paid>=inst.count;
    return `<div class="card">
      <div class="stat-label">${escapeHtml(inst.name)} ${done?'<span class="badge green">Concluído</span>':''}</div>
      <div class="stat-value neg num">${fmtCurrency(inst.installmentValue)}<span style="font-size:14px;color:var(--ink-soft)"> /mês</span></div>
      <div class="stat-foot">${paid}/${inst.count} parcelas pagas · total ${fmtCurrency(inst.totalValue)}</div>
      <div class="progress" style="margin-top:8px"><div style="width:${pct}%"></div></div>
      <div class="stat-foot">Início: ${monthLabel(inst.startMonth)} · Fim: ${monthLabel(addMonthsToKey(inst.startMonth,inst.count-1))}</div>
      <div style="margin-top:10px"><button class="icon-btn" data-edit-inst="${inst.id}">${icon('edit',14)} Editar</button> <button class="icon-btn" data-del-inst="${inst.id}">${icon('trash',14)} Excluir</button></div>
    </div>`;
  }
  $('#btn-new-inst').onclick=()=>openInstallmentModal();
  $$('[data-inv-close]').forEach(b=>b.onclick=()=>{ const [c,d] = b.dataset.invClose.split('|'); openCloseInvoiceModal(c,d); });
  $$('[data-inv-pay]').forEach(b=>b.onclick=()=>{ const [c,d] = b.dataset.invPay.split('|'); openPayInvoiceModal(c,d); });
  $$('[data-inv-reopen]').forEach(b=>b.onclick=()=>{ const [c,d] = b.dataset.invReopen.split('|'); reopenInvoice(c,d); });
  $$('[data-inv-bank]').forEach(b=>b.onclick=()=>{ const [c,d] = b.dataset.invBank.split('|'); openInvoiceBankModal(c,d); });
  $$('[data-inv-unpay]').forEach(b=>b.onclick=()=>{ const [c,d] = b.dataset.invUnpay.split('|'); undoInvoicePayment(c,d); });
  $$('[data-edit-inst]').forEach(b=>b.onclick=()=>openInstallmentModal(state.installments.find(i=>i.id===b.dataset.editInst)));
  $$('[data-del-inst]').forEach(b=>b.onclick=()=>confirmModal('Excluir parcelamento?','As parcelas já lançadas em Lançamentos também serão removidas.',()=>{
    const id=b.dataset.delInst;
    state.installments = state.installments.filter(i=>i.id!==id);
    state.transactions = state.transactions.filter(t=>!(t.source==='installment'&&t.sourceId===id));
    saveState(); renderAll();
  }));
  const cardSelect = $('#invoice-compare-card');
  if(cardSelect){
    cardSelect.onchange = (e)=>{ invoiceCompareCard = e.target.value; RENDERERS.parcelamentos(); };
    const data = invoiceTotalsByMonth(invoiceCompareCard, 5);
    renderChart('chart-invoice-compare',{
      type:'bar',
      data:{ labels: data.map(d=>monthLabelShort(d.month)), datasets:[
        { label:'Total da fatura', data: data.map(d=>Math.round(d.total*100)/100), backgroundColor:CHART_COLORS.accentFill, borderRadius:0, maxBarThickness:40 }
      ]},
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:(ctx)=>fmtCurrency(ctx.raw) } } },
        scales:{ x:{ grid:{ color:CHART_COLORS.line } }, y:{ grid:{ color:CHART_COLORS.line }, ticks:{ callback:(v)=>fmtCurrency(v) } } }
      }
    });
  }
};
function openInstallmentModal(inst){
  const isEdit=!!inst;
  openFormModal({
    title: isEdit?'Editar parcelamento':'Novo parcelamento',
    initial: inst? {...inst, alreadyPaid:(inst.alreadyPaid!=null? inst.alreadyPaid : '')} : {startMonth:todayMonthKey(),count:1},
    fields:[
      {name:'name',label:'Nome',type:'text',required:true},
      {row:[{name:'category',label:'Categoria',type:'select',options:categoryOptions('despesa')},
             {name:'cardId',label:'Cartão (opcional)',type:'select',options:cardOptions()}]},
      {row:[{name:'totalValue',label:'Valor total',type:'currency',required:true},
             {name:'count',label:'Nº de parcelas',type:'number',required:true}]},
      {name:'startMonth',label:'Mês da 1ª parcela',type:'month',required:true},
      {name:'alreadyPaid',label:'Parcelas já pagas (opcional)',type:'text',inputmode:'numeric',placeholder:(isEdit && inst.alreadyPaid==null)? 'Em branco: mantém como está' : 'Em branco: o Kivo conta as vencidas até hoje'},
      {name:'note',label:'Observação',type:'textarea'}
    ],
    onSubmit(v){
      let shifted = null;
      if(!isEdit && v.cardId){   // parcelamento novo num cartão cuja fatura desse mês já foi fechada: vai para a próxima aberta
        const cardX = state.cards.find(c=>c.id===v.cardId);
        if(cardX){ const mm = openInvoiceMonthFrom(cardX, v.startMonth); if(mm!==v.startMonth){ shifted = {card:cardX, from:v.startMonth, to:mm}; v.startMonth = mm; } }
      }
      const count = Math.max(1,parseInt(v.count));
      const installmentValue = Math.round(v.totalValue/count*100)/100;
      const raw = String(v.alreadyPaid==null? '' : v.alreadyPaid).trim();
      if(raw!==''){ v.alreadyPaid = Math.max(0, Math.min(parseInt(raw,10)||0, count)); }
      else { v.alreadyPaid = isEdit? inst.alreadyPaid : autoPaidCountInst({...v,count}); } // editar em branco = não mexe
      if(isEdit){
        const scheduleChanged = inst.count!==count || inst.startMonth!==v.startMonth || inst.totalValue!==v.totalValue;
        const applyUpdate = ()=>{
          Object.assign(inst,v,{count,installmentValue});
          const N = inst.alreadyPaid;
          state.transactions = state.transactions.filter(t=>{
            if(t.source!=='installment' || t.sourceId!==inst.id) return true;
            if(N==null) return t.status==='pago';                              // parcelamento antigo: regra de sempre
            return t.installmentIndex>=N && t.status==='pago' && !t.preSettled; // mantém só o que foi pago pelo app
          });
          materializeAll(); renderAll();
        };
        if(scheduleChanged){
          choiceModal('Alterar parcelamento','Parcelas já pagas não serão alteradas. O que deseja fazer com as parcelas futuras?',[
            {label:'Aplicar às futuras', action:applyUpdate}
          ]);
          return;
        }
        applyUpdate();
      } else {
        state.installments.push({id:uid(),...v,count,installmentValue,status:'ativo'});
        materializeAll(); renderAll();
        if(shifted) showToast(`A fatura de ${monthLabel(invoiceDueDate(shifted.card,shifted.from).slice(0,7))} já está fechada: o parcelamento começa na de ${monthLabel(invoiceDueDate(shifted.card,shifted.to).slice(0,7))}.`);
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
      <div class="card"><div class="stat-label">Total original</div><div class="stat-value neg num">${fmtCurrency(totalOriginal)}</div></div>
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
    initial: d? {...d, alreadyPaid:(d.alreadyPaid!=null? d.alreadyPaid : autoPaidCount(d))} : {startMonth:todayMonthKey(),count:1,dueDay:10},
    fields:[
      {name:'name',label:'Nome',type:'text',required:true},
      {name:'description',label:'Descrição',type:'text'},
      {row:[{name:'originalValue',label:'Valor original',type:'currency',required:true},
             {name:'installmentValue',label:'Valor da parcela',type:'currency',required:true}]},
      {row:[{name:'count',label:'Nº de parcelas',type:'number',required:true},
             {name:'interest',label:'Juros (% a.m., opcional)',type:'number',step:'0.01'}]},
      {row:[{name:'startMonth',label:'Mês da 1ª parcela',type:'month',required:true},
             {name:'dueDay',label:'Dia de vencimento',type:'number'}]},
      {name:'alreadyPaid',label:'Parcelas já pagas (opcional)',type:'text',inputmode:'numeric',placeholder:'Em branco: o Kivo conta as vencidas até hoje'},
      {name:'note',label:'Observação',type:'textarea'}
    ],
    onSubmit(v){
      v.count = Math.max(1,parseInt(v.count));
      const raw = String(v.alreadyPaid==null? '' : v.alreadyPaid).trim();
      v.alreadyPaid = raw===''? autoPaidCount(v) : Math.max(0, Math.min(parseInt(raw,10)||0, v.count));
      if(isEdit){ Object.assign(d,v);
        // mantém só o que você marcou como pago depois das parcelas já pagas; o resto é regerado com as regras novas
        state.transactions = state.transactions.filter(t=>{
          if(t.source!=='debt' || t.sourceId!==d.id) return true;
          return t.installmentIndex>=d.alreadyPaid && t.status==='pago' && !t.preSettled;
        });
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
function openIncomeModal(inc){
  const isEdit=!!inc;
  openFormModal({
    title:isEdit?'Editar receita':'Nova receita',
    initial: inc? {accountId:defaultAccountId(), paymentMethod:'PIX', ...inc} : {type:'fixa',frequency:'mensal',day:5,startDate:todayISO(),status:'ativa',category:'Salário',accountId:defaultAccountId(),paymentMethod:'PIX'},
    fields:[
      {name:'name',label:'Nome',type:'text',required:true},
      {row:[{name:'type',label:'Tipo',type:'select',options:[{value:'fixa',label:'Fixa'},{value:'variavel',label:'Variável'},{value:'temporaria',label:'Temporária'}]},
             {name:'category',label:'Categoria',type:'select',options:categoryOptions('receita')}]},
      {row:[{name:'value',label:'Valor',type:'currency',required:true},
             {name:'frequency',label:'Recorrência',type:'select',options:[{value:'mensal',label:'Mensal'},{value:'unica',label:'Única'}]}]},
      {row:[{name:'startDate',label:'Data de recebimento',type:'date',required:true},{name:'day',label:'Dia do mês',type:'number'}]},
      {row:[{name:'accountId',label:'Conta que recebe',type:'select',options:accountOptions()},
             {name:'paymentMethod',label:'Forma de recebimento',type:'select',options:paymentOptions()}]},
      {name:'endDate',label:'Data final (opcional)',type:'date'},
      {name:'status',label:'Status',type:'select',options:[{value:'ativa',label:'Ativa'},{value:'inativa',label:'Inativa'}]}
    ],
    onSubmit(v){
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

/* ===================== RECORRENTES (receitas + despesas) ===================== */
let recorrentesTab = 'despesas';
RENDERERS.recorrentes = function(){
  const subsAtivas = state.recurring.filter(r=>r.isSubscription&&r.status==='ativa');
  const subsTotal = subsAtivas.reduce((a,r)=>a+Number(r.value),0);
  $('#view-recorrentes').innerHTML = `
    <div class="view-head"><div><h1>Recorrentes</h1><div class="view-sub">Receitas e despesas que se repetem todo mês</div></div>
      <button class="btn primary" id="btn-new-rec-item">${icon('plus',15)} ${recorrentesTab==='despesas'?'Nova despesa recorrente':'Nova receita'}</button></div>
    <div class="subtabs">
      <button class="subtab" data-rtab="despesas">Despesas recorrentes</button>
      <button class="subtab" data-rtab="receitas">Receitas</button>
    </div>
    ${recorrentesTab==='despesas'?renderRecDespesas(subsAtivas,subsTotal):renderRecReceitas()}
  `;
  $$('.subtab[data-rtab]').forEach(b=>{ b.classList.toggle('active',b.dataset.rtab===recorrentesTab); b.onclick=()=>{recorrentesTab=b.dataset.rtab; RENDERERS.recorrentes();}; });
  $('#btn-new-rec-item').onclick=()=> recorrentesTab==='despesas'? openRecModal() : openIncomeModal();
  if(recorrentesTab==='despesas'){
    $$('[data-edit-rec]').forEach(b=>b.onclick=()=>openRecModal(state.recurring.find(r=>r.id===b.dataset.editRec)));
    $$('[data-del-rec]').forEach(b=>b.onclick=()=>confirmModal('Excluir recorrente?','Os lançamentos já gerados continuarão no histórico.',()=>{
      state.recurring=state.recurring.filter(r=>r.id!==b.dataset.delRec); saveState(); RENDERERS.recorrentes();
    }));
  } else {
    $$('[data-edit-inc]').forEach(b=>b.onclick=()=>openIncomeModal(state.incomes.find(i=>i.id===b.dataset.editInc)));
    $$('[data-del-inc]').forEach(b=>b.onclick=()=>confirmModal('Excluir receita?','Os lançamentos já gerados continuarão no histórico.',()=>{
      state.incomes=state.incomes.filter(i=>i.id!==b.dataset.delInc); saveState(); RENDERERS.recorrentes();
    }));
  }
};
function renderRecDespesas(subsAtivas,subsTotal){
  function rowRec(r){
    return `<tr><td>${escapeHtml(r.name)}${r.cardId?`<span class="badge grey" style="margin-left:6px">${escapeHtml((state.cards.find(c=>c.id===r.cardId)||{}).name||'Cartão')}</span>`:''}</td><td>${escapeHtml(r.category||'—')}</td><td class="right num neg">${fmtCurrency(r.value)}</td><td>${r.day||'—'}</td>
      <td>${r.isSubscription?'<span class="badge gold">Sim</span>':'—'}</td>
      <td>${r.status==='ativa'?'<span class="badge green">Ativa</span>':'<span class="badge grey">Inativa</span>'}</td>
      <td><button class="icon-btn" data-edit-rec="${r.id}">${icon('edit',15)}</button><button class="icon-btn" data-del-rec="${r.id}">${icon('trash',15)}</button></td></tr>`;
  }
  return `${subsAtivas.length?`<div class="card" style="margin-bottom:18px"><div class="stat-label">Assinaturas ativas</div><div class="stat-value neg num">${fmtCurrency(subsTotal)}/mês</div><div class="stat-foot">${fmtCurrency(subsTotal*12)}/ano em ${subsAtivas.length} assinatura(s)</div></div>`:''}
    <div class="table-wrap"><table><thead><tr><th>Nome</th><th>Categoria</th><th class="right">Valor</th><th>Dia</th><th>Assinatura</th><th>Status</th><th></th></tr></thead>
    <tbody>${state.recurring.length? state.recurring.map(rowRec).join(''):emptyRow(7,'repeat','Nenhuma despesa recorrente','Cadastre gasolina, assinaturas e outras despesas fixas.')}</tbody></table></div>`;
}
function renderRecReceitas(){
  function rowIncome(inc){
    return `<tr><td>${escapeHtml(inc.name)}</td><td>${escapeHtml(inc.type)}</td><td class="right num pos">${fmtCurrency(inc.value)}</td>
      <td>${inc.frequency==='mensal'?'Mensal, dia '+inc.day:'Única em '+fmtDate(inc.startDate)}</td>
      <td>${inc.status==='ativa'?'<span class="badge green">Ativa</span>':'<span class="badge grey">Inativa</span>'}</td>
      <td><button class="icon-btn" data-edit-inc="${inc.id}">${icon('edit',15)}</button><button class="icon-btn" data-del-inc="${inc.id}">${icon('trash',15)}</button></td></tr>`;
  }
  return `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th class="right">Valor</th><th>Recorrência</th><th>Status</th><th></th></tr></thead>
    <tbody>${state.incomes.length? state.incomes.map(rowIncome).join(''):emptyRow(6,'trendingUp','Nenhuma receita cadastrada','Cadastre salário, pensão, freelances e outras entradas.')}</tbody></table></div>`;
}
function openRecModal(r){
  const isEdit=!!r;
  openFormModal({
    title:isEdit?'Editar recorrente':'Nova despesa recorrente',
    initial: r? {accountId:defaultAccountId(), ...r} : {frequency:'mensal',day:5,startDate:todayISO(),status:'ativa',paymentMethod:'PIX',isSubscription:false,accountId:defaultAccountId()},
    fields:[
      {name:'name',label:'Nome',type:'text',required:true},
      {row:[{name:'category',label:'Categoria',type:'select',options:categoryOptions('despesa')},
             {name:'value',label:'Valor',type:'currency',required:true}]},
      {row:[{name:'day',label:'Dia do mês',type:'number'},{name:'startDate',label:'Início',type:'date',required:true}]},
      {name:'paymentMethod',label:'Forma de pagamento',type:'select',options:['Dinheiro','PIX','Débito','Crédito','Transferência','Outro'].map(v=>({value:v,label:v}))},
      {name:'cardId',label:'Cartão (se for compra no crédito)',type:'select',options:cardOptions()},
      {name:'accountId',label:'Conta de onde sai',type:'select',options:accountOptions()},
      {name:'isSubscription',label:'É uma assinatura',type:'checkbox'},
      {name:'status',label:'Status',type:'select',options:[{value:'ativa',label:'Ativa'},{value:'inativa',label:'Inativa'}]}
    ],
    onSubmit(v){
      if(v.cardId) v.paymentMethod = 'Crédito';
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
      <div class="stat-value ${signClass(g.currentValue)} num">${fmtCurrency(g.currentValue)} <span style="font-size:14px;color:var(--ink-soft)">/ ${fmtCurrency(g.targetValue)}</span></div>
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
    openFormModal({title:'Registrar aporte em "'+g.name+'"',initial:{value:g.monthlyPlanned||0},fields:[{name:'value',label:'Valor guardado',type:'currency',required:true}],
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
      {row:[{name:'targetValue',label:'Valor objetivo',type:'currency',required:true},
             {name:'currentValue',label:'Valor atual',type:'currency'}]},
      {row:[{name:'deadline',label:'Prazo (opcional)',type:'date'},{name:'monthlyPlanned',label:'Aporte mensal planejado',type:'currency'}]}
    ],
    onSubmit(v){ if(isEdit) Object.assign(g,v); else state.goals.push({id:uid(),contributions:[],...v}); saveState(); renderAll(); },
    onDelete: isEdit? ()=>{confirmModal('Excluir meta?','Tem certeza?',()=>{state.goals=state.goals.filter(x=>x.id!==g.id);saveState();closeModal();renderAll();});}:null
  });
}

/* ===================== RELATÓRIOS ===================== */
let reportSubtab = 'resumo';
let compCycleA = 0;    // 0 = ciclo atual
let compCycleB = -1;   // -1 = ciclo anterior
let reportModeInit = false;
let reportMode = 'mes';          // 'mes' | 'ciclo' | '30d' | 'ano' | 'custom'
let reportCustom = {from:'', to:''};
let reportCycleRef = null;
const PERIOD_SUBTABS = ['resumo','graficos','pareto','equilibrio'];
function rangeLabel(from,to){ return fmtDate(from)+' a '+fmtDate(to); }
function cycleFor(refISO, startDay){
  // o "mês" que começa no dia escolhido (ex.: dia 20 → de 20/09 a 19/10)
  const sd = Math.min(Math.max(parseInt(startDay,10)||1,1),28);
  const [y,m,d] = refISO.split('-').map(Number);
  const ym = `${y}-${pad(m)}`;
  const fromMonth = d>=sd? ym : addMonthsToKey(ym,-1);
  const from = fromMonth+'-'+pad(sd);
  const to = sd===1? fromMonth+'-'+pad(daysInMonth(fromMonth)) : addMonthsToKey(fromMonth,1)+'-'+pad(sd-1);
  return {from,to};
}
function defaultPeriodMode(){ return (parseInt(state.settings.primeiroDiaMes,10)||1)>1? 'ciclo' : 'mes'; }   // o mesmo padrão em Dashboard, Lançamentos e Relatórios
function resolvePeriod(p){
  const today = todayISO();
  if(p.mode==='tudo') return {from:'0000-01-01', to:'9999-12-31', label:'Todos os lançamentos', all:true};
  if(p.mode==='ciclo'){ const c = cycleFor(p.cycleRef||today, state.settings.primeiroDiaMes); return {...c, label:rangeLabel(c.from,c.to)}; }
  if(p.mode==='30d'){ const from = addDaysToISO(today,-29); return {from, to:today, label:'Últimos 30 dias · '+rangeLabel(from,today)}; }
  if(p.mode==='ano'){ const y = today.slice(0,4); return {from:y+'-01-01', to:y+'-12-31', label:'Ano de '+y}; }
  if(p.mode==='custom'){
    let {from,to} = p.custom || {};
    if(!from || !to){ from = addDaysToISO(today,-29); to = today; }
    if(from>to){ const x=from; from=to; to=x; }
    return {from, to, label:rangeLabel(from,to)};
  }
  const month = p.month || todayMonthKey();
  return {from:month+'-01', to:month+'-'+pad(daysInMonth(month)), label:monthLabel(month)};
}
function setPeriodMode(p, mode){
  const before = resolvePeriod(p);
  p.mode = mode;
  if(mode==='ciclo') p.cycleRef = (p.month===todayMonthKey())? todayISO() : p.month+'-15';
  if(mode==='custom' && (!p.custom || !p.custom.from || !p.custom.to) && !before.all) p.custom = {from:before.from, to:before.to};
}
function shiftPeriod(p, dir){
  if(p.mode==='mes') p.month = addMonthsToKey(p.month, dir);
  else if(p.mode==='ciclo'){ const r = resolvePeriod(p); p.cycleRef = dir<0? addDaysToISO(r.from,-1) : addDaysToISO(r.to,1); }
}
function reportPeriod(){ return resolvePeriod({mode:reportMode, month:reportMonth, custom:reportCustom, cycleRef:reportCycleRef}); }
function setReportMode(mode){
  const p = {mode:reportMode, month:reportMonth, custom:reportCustom, cycleRef:reportCycleRef};
  setPeriodMode(p, mode);
  reportMode = p.mode; reportCustom = p.custom; reportCycleRef = p.cycleRef;
}
function shiftReportPeriod(dir){
  const p = {mode:reportMode, month:reportMonth, custom:reportCustom, cycleRef:reportCycleRef};
  shiftPeriod(p, dir);
  reportMonth = p.month; reportCycleRef = p.cycleRef;
}
function periodNavHtml(per){
  const nav = reportMode==='mes' || reportMode==='ciclo';
  return `<div class="month-nav">${nav? `<button class="btn" id="rep-prev">${icon('chevronLeft',16)}</button>` : ''}<div class="month-label">${escapeHtml(per.label)}</div>${nav? `<button class="btn" id="rep-next">${icon('chevronRight',16)}</button>` : ''}</div>`;
}
function periodBarHtml(){
  const sd = parseInt(state.settings.primeiroDiaMes,10)||1;
  const modes = [['mes','Mês'],['ciclo',`Ciclo (dia ${sd})`],['30d','Últimos 30 dias'],['ano','Este ano'],['custom','Personalizado']];
  const per = reportPeriod();
  return `<div class="period-bar">
    ${modes.map(([m,l])=>`<button class="period-btn ${m===reportMode?'active':''}" data-pmode="${m}">${escapeHtml(l)}</button>`).join('')}
    ${reportMode==='custom'? `<span class="period-range"><label>De <input type="date" id="rep-from" value="${per.from}"></label><label>Até <input type="date" id="rep-to" value="${per.to}"></label></span>` : ''}
  </div>
  ${reportMode==='ciclo' && sd===1? `<div class="help-text" style="margin:-6px 0 14px">Seu ciclo começa no dia 1. Para usar o dia em que o seu mês realmente começa, ajuste "Primeiro dia do seu mês" em Configurações.</div>` : ''}`;
}
RENDERERS.relatorios = function(){
  if(!reportModeInit){ reportModeInit = true; reportMode = defaultPeriodMode(); }
  const usesPeriod = PERIOD_SUBTABS.includes(reportSubtab);
  const per = reportPeriod();
  $('#view-relatorios').innerHTML = `
    <div class="view-head"><div><h1>Relatórios</h1><div class="view-sub">Pareto 80/20, ponto de equilíbrio e projeção de 12 ${hasCycles()? 'ciclos' : 'meses'}</div></div>
      ${usesPeriod? periodNavHtml(per) : ''}
    </div>
    ${usesPeriod? periodBarHtml() : ''}
    <div class="subtabs">
      <button class="subtab" data-sub="resumo">Resumo</button>
      <button class="subtab" data-sub="comparativo">${hasCycles()? 'Comparativo de ciclos' : 'Comparativo mensal'}</button>
      <button class="subtab" data-sub="graficos">Gráficos</button>
      <button class="subtab" data-sub="pareto">Pareto 80/20</button>
      <button class="subtab" data-sub="equilibrio">Ponto de equilíbrio</button>
      <button class="subtab" data-sub="orcamento">Orçamento por categoria</button>
      <button class="subtab" data-sub="projecao">Projeção 12 ${hasCycles()? 'ciclos' : 'meses'}</button>
      <button class="subtab" data-sub="simulador">Simulador</button>
    </div>
    <div id="report-body"></div>
  `;
  $$('.subtab').forEach(b=>{ b.classList.toggle('active',b.dataset.sub===reportSubtab); b.onclick=()=>{reportSubtab=b.dataset.sub; RENDERERS.relatorios();}; });
  if(usesPeriod){
    $$('.period-btn').forEach(b=>b.onclick=()=>{ setReportMode(b.dataset.pmode); RENDERERS.relatorios(); });
    const prev = $('#rep-prev'), next = $('#rep-next');
    if(prev) prev.onclick=()=>{ shiftReportPeriod(-1); RENDERERS.relatorios(); };
    if(next) next.onclick=()=>{ shiftReportPeriod(1); RENDERERS.relatorios(); };
    const f = $('#rep-from'), t = $('#rep-to');
    const applyCustom = ()=>{ if(f.value && t.value){ reportCustom = {from:f.value, to:t.value}; RENDERERS.relatorios(); } };
    if(f) f.onchange = applyCustom;
    if(t) t.onchange = applyCustom;
  }
  const body = $('#report-body');
  if(reportSubtab==='resumo') body.innerHTML = renderResumo();
  else if(reportSubtab==='comparativo') { body.innerHTML = renderComparativo(); wireComparativo(); }
  else if(reportSubtab==='graficos') { body.innerHTML = renderGraficos(); wireGraficos(); }
  else if(reportSubtab==='pareto') body.innerHTML = renderPareto();
  else if(reportSubtab==='equilibrio') body.innerHTML = renderEquilibrio();
  else if(reportSubtab==='orcamento') { body.innerHTML = renderOrcamento('bud'); wireOrcamento('bud','report-body',()=>RENDERERS.relatorios()); }
  else if(reportSubtab==='projecao') body.innerHTML = renderProjecao();
  else if(reportSubtab==='simulador') { body.innerHTML = renderSimulador(); wireSimulador(); }
};
function pctChange(cur,prev){
  if(prev===0) return cur===0? 0 : null; // null = "sem base de comparação" (categoria nova)
  return (cur-prev)/Math.abs(prev)*100;
}
function changeBadge(pct,goodDirection){
  // goodDirection: 'up' significa que subir é bom (ex: receita); 'down' significa que subir é ruim (ex: despesa)
  if(pct===null) return `<span class="badge grey">Novo</span>`;
  const rounded = Math.abs(pct)<0.05? 0 : pct;
  const isUp = rounded>0;
  const isGood = rounded===0? null : (goodDirection==='up'? isUp : !isUp);
  const color = isGood===null? 'grey' : isGood? 'green' : 'rust';
  const arrow = rounded===0? '' : isUp? '↑' : '↓';
  return `<span class="badge ${color}">${arrow} ${Math.abs(rounded).toFixed(1)}%</span>`;
}
function renderComparativo(){
  const U = hasCycles(), cA = cycleAt(compCycleA), cB = cycleAt(compCycleB), nameA = cycleLabel(cA), nameB = cycleLabel(cB);
  const cur = periodSummary(cA);
  const prev = periodSummary(cB);
  const pctReceitas = pctChange(cur.plannedReceitas, prev.plannedReceitas);
  const pctDespesas = pctChange(cur.plannedDespesas, prev.plannedDespesas);
  const saldoCur = cur.plannedReceitas-cur.plannedDespesas, saldoPrev = prev.plannedReceitas-prev.plannedDespesas;
  const pctSaldo = pctChange(saldoCur, saldoPrev);

  const cats = new Set([...Object.keys(cur.byCategory), ...Object.keys(prev.byCategory)]);
  const catRows = Array.from(cats).map(cat=>{
    const c = cur.byCategory[cat]||0, p = prev.byCategory[cat]||0;
    return {cat, c, p, diff:c-p, pct:pctChange(c,p)};
  }).sort((a,b)=>b.c-a.c);

  return `
    <div class="field-row" style="max-width:560px;margin-bottom:18px">
      <div class="field"><label>${U? 'Ciclo A' : 'Mês A'}</label><select id="comp-cycle-a">${cycleOptions(compCycleA)}</select></div>
      <div class="field"><label>${U? 'Ciclo B' : 'Mês B'}</label><select id="comp-cycle-b">${cycleOptions(compCycleB)}</select></div>
    </div>
    <div class="help-text" style="margin-top:-8px">Comparando ${nameA} com ${nameB}.</div>
    <div class="grid grid-3">
      <div class="card"><div class="stat-label">Receitas</div><div class="stat-value pos num">${fmtCurrency(cur.plannedReceitas)}</div><div class="stat-foot">${nameB}: ${fmtCurrency(prev.plannedReceitas)}</div><div style="margin-top:8px">${changeBadge(pctReceitas,'up')}</div></div>
      <div class="card"><div class="stat-label">Despesas</div><div class="stat-value neg num">${fmtCurrency(cur.plannedDespesas)}</div><div class="stat-foot">${nameB}: ${fmtCurrency(prev.plannedDespesas)}</div><div style="margin-top:8px">${changeBadge(pctDespesas,'down')}</div></div>
      <div class="card"><div class="stat-label">Saldo</div><div class="stat-value ${saldoCur>=0?'pos':'neg'} num">${fmtCurrency(saldoCur)}</div><div class="stat-foot">${nameB}: ${fmtCurrency(saldoPrev)}</div><div style="margin-top:8px">${changeBadge(pctSaldo,'up')}</div></div>
    </div>

    <div class="section-title"><h2>Receitas, despesas e saldo</h2></div>
    <div class="card"><div class="chart-box"><canvas id="chart-comp-overview"></canvas></div></div>

    <div class="section-title"><h2>Despesas por categoria — comparação</h2></div>
    <div class="card"><div class="chart-box" style="height:${Math.max(220,catRows.length*34)}px"><canvas id="chart-comp-categories"></canvas></div></div>

    <div class="section-title"><h2>Tabela detalhada</h2></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Categoria</th><th class="right">${cycleShort(cA)}</th><th class="right">${cycleShort(cB)}</th><th class="right">Diferença</th><th class="right">Variação</th></tr></thead>
      <tbody>${catRows.length? catRows.map(r=>`<tr>
        <td>${escapeHtml(r.cat)}</td>
        <td class="right num neg">${fmtCurrency(r.c)}</td>
        <td class="right num neg">${fmtCurrency(r.p)}</td>
        <td class="right num" style="color:${r.diff>0?'var(--red)':r.diff<0?'var(--green)':'var(--ink-soft)'}">${r.diff>=0?'+':''}${fmtCurrency(r.diff)}</td>
        <td class="right">${changeBadge(r.pct,'down')}</td>
      </tr>`).join('') : emptyRow(5,'barchart','Sem dados para comparar','Cadastre despesas em pelo menos um dos dois '+(U? 'ciclos' : 'meses')+'.')}</tbody>
    </table></div>
  `;
}
function wireComparativo(){
  $('#comp-cycle-a').onchange=(e)=>{ compCycleA = parseInt(e.target.value,10); RENDERERS.relatorios(); };
  $('#comp-cycle-b').onchange=(e)=>{ compCycleB = parseInt(e.target.value,10); RENDERERS.relatorios(); };

  const cA = cycleAt(compCycleA), cB = cycleAt(compCycleB);
  const curS = periodSummary(cA), prevS = periodSummary(cB);
  const saldoA = curS.plannedReceitas-curS.plannedDespesas, saldoB = prevS.plannedReceitas-prevS.plannedDespesas;
  const labelA = cycleShort(cA), labelB = cycleShort(cB);

  renderChart('chart-comp-overview',{
    type:'bar',
    data:{ labels:['Receitas','Despesas','Saldo'], datasets:[
      { label:labelA, data:[curS.plannedReceitas,curS.plannedDespesas,saldoA], backgroundColor:CHART_COLORS.green, borderRadius:0, maxBarThickness:46 },
      { label:labelB, data:[prevS.plannedReceitas,prevS.plannedDespesas,saldoB], backgroundColor:CHART_COLORS.accentFill, borderRadius:0, maxBarThickness:46 }
    ]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ usePointStyle:true, boxWidth:8 } }, tooltip:{ callbacks:{ label:(ctx)=>`${ctx.dataset.label}: ${fmtCurrency(ctx.raw)}` } } },
      scales:{ x:{ grid:{ color:CHART_COLORS.line } }, y:{ grid:{ color:CHART_COLORS.line }, ticks:{ callback:(v)=>fmtCurrency(v) } } }
    }
  });

  const cats = new Set([...Object.keys(curS.byCategory), ...Object.keys(prevS.byCategory)]);
  const catRows = Array.from(cats).map(cat=>({cat, c:curS.byCategory[cat]||0, p:prevS.byCategory[cat]||0}))
    .sort((a,b)=>b.c-a.c);

  renderChart('chart-comp-categories',{
    type:'bar',
    data:{ labels: catRows.map(r=>r.cat), datasets:[
      { label:labelA, data:catRows.map(r=>Math.round(r.c*100)/100), backgroundColor:CHART_COLORS.green, borderRadius:0, maxBarThickness:18 },
      { label:labelB, data:catRows.map(r=>Math.round(r.p*100)/100), backgroundColor:CHART_COLORS.accentFill, borderRadius:0, maxBarThickness:18 }
    ]},
    options:{
      responsive:true, maintainAspectRatio:false, indexAxis:'y',
      plugins:{ legend:{ labels:{ usePointStyle:true, boxWidth:8 } }, tooltip:{ callbacks:{ label:(ctx)=>`${ctx.dataset.label}: ${fmtCurrency(ctx.raw)}` } } },
      scales:{ x:{ grid:{ color:CHART_COLORS.line }, ticks:{ callback:(v)=>fmtCurrency(v) } }, y:{ grid:{ display:false } } }
    }
  });
}
function renderGraficos(){
  return `
    <div class="section-title" style="margin-top:0"><h2>Despesas por categoria — ${escapeHtml(reportPeriod().label)}</h2></div>
    <div class="card"><div class="chart-box"><canvas id="chart-report-category"></canvas></div></div>
    <div class="help-text" style="margin-top:8px">Barras amarelas = categorias essenciais · barras verdes = demais categorias.</div>

    <div class="section-title"><h2>Saldo ${hasCycles()? 'por ciclo' : 'mensal'} e acumulado (13 ${hasCycles()? 'ciclos' : 'meses'}: 6 anteriores, o atual e 6 próximos)</h2></div>
    <div class="card"><div class="chart-box"><canvas id="chart-report-balance"></canvas></div></div>
  `;
}
function wireGraficos(){
  categoryBarChart('chart-report-category', reportPeriod());
  cycleBalanceChart('chart-report-balance', 6, 6);
}
function renderResumo(){
  const per = reportPeriod();
  const s = periodSummary(per);
  const maiorCat = Object.entries(s.byCategory).sort((a,b)=>b[1]-a[1])[0];
  return `<div class="grid grid-4">
    <div class="card"><div class="stat-label">Receitas</div><div class="stat-value pos num">${fmtCurrency(s.plannedReceitas)}</div><div class="stat-foot">Já recebido: ${fmtCurrency(s.realizedReceitas)}</div></div>
    <div class="card"><div class="stat-label">Despesas</div><div class="stat-value neg num">${fmtCurrency(s.plannedDespesas)}</div><div class="stat-foot">Já pago: ${fmtCurrency(s.realizedDespesas)}</div></div>
    <div class="card"><div class="stat-label">Saldo</div><div class="stat-value ${s.saldoPlanejado>=0?'pos':'neg'} num">${fmtCurrency(s.saldoPlanejado)}</div><div class="stat-foot">Realizado: ${fmtCurrency(s.saldoRealizado)}</div></div>
    <div class="card"><div class="stat-label">Maior categoria</div><div class="stat-value num" style="font-size:18px">${maiorCat?escapeHtml(maiorCat[0]):'—'}</div><div class="stat-foot">${maiorCat?fmtCurrency(maiorCat[1]):''}</div></div>
  </div>
  <div class="help-text" style="margin-top:10px">Período: ${escapeHtml(per.label)} · valores pela data em que o dinheiro entra ou sai (compras no cartão, pelo vencimento da fatura).</div>`;
}
function renderPareto(){
  const {rows,total} = paretoData(reportPeriod());
  if(!rows.length) return '<div class="card">Sem despesas registradas neste período para análise.</div>';
  return `<div class="card">
    <p style="font-size:13.5px;color:var(--ink-soft);margin-top:0">Categorias ordenadas da maior para a menor. As destacadas em dourado concentram cerca de 80% dos seus gastos — não significa que sejam dispensáveis.</p>
    ${rows.map(r=>`<div class="pareto-bar-row">
      <div>${escapeHtml(r.cat)}${r.essential?'<span class="tag-essential">essencial</span>':''}</div>
      <div class="pareto-track"><div class="pareto-fill ${r.cumPct<=80?'over':''}" style="width:${r.pct}%"></div></div>
      <div class="right num neg">${fmtCurrency(r.val)}</div>
      <div class="right num">${r.pct.toFixed(1)}%</div>
    </div>`).join('')}
    <div class="stat-foot" style="margin-top:10px">Total de despesas: <span class="num neg">${fmtCurrency(total)}</span></div>
  </div>`;
}
function renderEquilibrio(){
  const be = breakeven(reportPeriod());
  const color = be.status==='verde'?'green':be.status==='amarelo'?'gold':'rust';
  return `<div class="grid grid-2">
    <div class="card"><div class="stat-label">Receita prevista</div><div class="stat-value pos num">${fmtCurrency(be.receitaPrevista)}</div></div>
    <div class="card"><div class="stat-label">Despesas previstas</div><div class="stat-value neg num">${fmtCurrency(be.despesaPrevista)}</div></div>
    <div class="card"><div class="stat-label">Margem disponível</div><div class="stat-value ${be.margem>=0?'pos':'neg'} num">${fmtCurrency(be.margem)}</div></div>
    <div class="card"><div class="stat-label">Percentual comprometido</div><div class="stat-value num">${be.pct.toFixed(1)}%</div><div class="stat-foot"><span class="badge ${color}">${be.status.toUpperCase()}</span></div></div>
  </div>`;
}
function renderProjecao(){
  const proj = projectionCycles(12);
  const notes = endingCommitmentsCycles(12);
  return `<div class="table-wrap"><table><thead><tr><th>${hasCycles()? 'Ciclo' : 'Mês'}</th><th class="right">Receitas</th><th class="right">Despesas</th><th class="right">Saldo</th><th class="right">Acumulado</th></tr></thead>
    <tbody>${proj.map(p=>`<tr><td>${p.label}</td><td class="right num pos">${fmtCurrency(p.receitas)}</td><td class="right num neg">${fmtCurrency(p.despesas)}</td><td class="right num ${signClass(p.saldo)}">${fmtCurrency(p.saldo)}</td><td class="right num ${signClass(p.saldoAcumulado)}">${fmtCurrency(p.saldoAcumulado)}</td></tr>`).join('')}</tbody></table></div>
    ${notes.length? `<div class="section-title"><h2>Mudanças previstas</h2></div>${notes.map(n=>`<div class="alert-item" style="background:var(--green-bg);color:var(--green)">${icon('checkCircle',16)}<span>${escapeHtml(n)}</span></div>`).join('')}` : ''}`;
}
function renderSimulador(){
  return `<div class="card" style="max-width:520px">
    <p style="font-size:13.5px;color:var(--ink-soft);margin-top:0">Teste cenários sem alterar seus dados reais.</p>
    <div class="field-row"><div class="field"><label>Variação de receita</label><div class="currency-input"><span class="prefix">R$</span><input type="text" inputmode="decimal" class="currency-mask" id="sim-receita" value="0,00"></div></div>
    <div class="field"><label>Variação de despesa</label><div class="currency-input"><span class="prefix">R$</span><input type="text" inputmode="decimal" class="currency-mask" id="sim-despesa" value="0,00"></div></div></div>
    <button class="btn primary" id="sim-run">Simular</button>
    <div id="sim-result" style="margin-top:16px"></div>
  </div>`;
}
function wireSimulador(){
  wireCurrencyMasks(document.getElementById('report-body'));
  $('#sim-run').onclick=()=>{
    const dR = parseCurrencyValue($('#sim-receita').value);
    const dD = parseCurrencyValue($('#sim-despesa').value);
    const proj = projectionCycles(12).map(p=>({...p,receitas:p.receitas+dR,despesas:p.despesas+dD,saldo:(p.receitas+dR)-(p.despesas+dD)}));
    let acc = accumulatedBeforeCycle(cycleAt(0));
    proj.forEach(p=>{acc+=p.saldo;p.saldoAcumulado=acc;});
    $('#sim-result').innerHTML = `<div class="table-wrap"><table><thead><tr><th>${hasCycles()? 'Ciclo' : 'Mês'}</th><th class="right">Saldo simulado</th><th class="right">Acumulado</th></tr></thead>
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
            <div class="field"><label>Salário padrão</label><div class="currency-input"><span class="prefix">R$</span><input type="text" inputmode="decimal" class="currency-mask" name="salarioPadrao" value="${formatCurrencyDigits(st.salarioPadrao||0)}"></div></div>
            <div class="field"><label>Meta de economia mensal</label><div class="currency-input"><span class="prefix">R$</span><input type="text" inputmode="decimal" class="currency-mask" name="metaEconomiaMensal" value="${formatCurrencyDigits(st.metaEconomiaMensal||0)}"></div></div>
          </div>
          <div class="field"><label>Primeiro dia do seu mês (ciclo dos Relatórios)</label><input type="number" min="1" max="28" name="primeiroDiaMes" value="${st.primeiroDiaMes||1}"></div>
          <div class="help-text">Saldo agora é calculado automaticamente por conta — gerencie em <strong>Contas</strong>, no menu.</div>
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
      <p style="font-size:13.5px;color:var(--ink-soft);margin-top:0">Exporte seus dados a qualquer momento como backup em JSON, ou restaure a partir de um backup anterior.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn" id="btn-export">${icon('barchart',14)} Exportar dados (JSON)</button>
        <button class="btn" id="btn-import">${icon('edit',14)} Importar backup</button>
        <input type="file" id="input-import" accept="application/json" style="display:none">
      </div>
    </div>
    <div class="section-title"><h2>Histórico de versões</h2></div>
    <div class="card" id="history-card"><p class="help-text" style="margin:0">Carregando…</p></div>
  `;
  wireCurrencyMasks(document.getElementById('settings-form'));
  $('#settings-form').onsubmit=(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    state.settings.nome = fd.get('nome');
    state.settings.salarioPadrao = parseCurrencyValue(fd.get('salarioPadrao'));
    state.settings.metaEconomiaMensal = parseCurrencyValue(fd.get('metaEconomiaMensal'));
    state.settings.primeiroDiaMes = parseInt(fd.get('primeiroDiaMes'))||1;
    saveState(true);
    renderAll();
  };
  $('#btn-new-cat').onclick=()=>openCategoryModal();
  $$('[data-edit-cat]').forEach(b=>b.onclick=()=>openCategoryModal(state.categories.find(c=>c.id===b.dataset.editCat)));
  $$('[data-del-cat]').forEach(b=>b.onclick=()=>confirmModal('Excluir categoria?','Lançamentos existentes manterão o nome da categoria.',()=>{
    state.categories = state.categories.filter(c=>c.id!==b.dataset.delCat); saveState(); RENDERERS.configuracoes();
  }));
  renderHistoryCard();
  $('#btn-export').onclick=()=>{
    const blob = new Blob([JSON.stringify({...state,_txnIndex:undefined},null,2)],{type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'controle-financeiro-backup.json';
    a.click();
  };
  $('#btn-import').onclick=()=>$('#input-import').click();
  $('#input-import').onchange=(e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      let parsed;
      try{ parsed = JSON.parse(reader.result); }
      catch(err){ confirmModal('Arquivo inválido','Esse arquivo não parece ser um backup válido do Kivo.',()=>{},'Ok'); return; }
      confirmModal('Restaurar backup?','Isso substitui TODOS os seus dados atuais pelos dados desse arquivo. Essa ação não pode ser desfeita.',()=>{
        delete parsed._txnIndex;
        snapshotNow('Antes de importar backup', cloneForSave());
        state = {...defaultState(), ...parsed};
        rebuildIndex();
        materializeAll();
        renderAll();
      },'Restaurar');
    };
    reader.readAsText(file);
    e.target.value = '';
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
      {name:'essential',label:'Categoria essencial',type:'checkbox'},
      {name:'limit',label:'Limite de gasto por ciclo (opcional, só para despesas)',type:'currency'}
    ],
    onSubmit(v){ v.limit = Number(v.limit)||0; if(isEdit) Object.assign(c,v); else state.categories.push({id:uid(),...v}); saveState(); renderAll(); },
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
      if(state && currentUser && currentUser.id===session.user.id){ currentUser = session.user; return; } // mesmo usuário já carregado: não recarrega por cima das suas alterações
      currentUser = session.user;
      hideAuthScreen();
      document.getElementById('app-loader').classList.remove('hidden');
      await bootApp();
    } else if(event==='SIGNED_OUT'){
      currentUser = null;
      state = null;
      resetSyncState();
      document.getElementById('app-root').style.display='none';
      showAuthScreen();
    }
  });
}
async function bootApp(){
  initTheme();
  try{ await loadState(); }
  catch(e){ console.error('Erro ao carregar dados:', e); showLoadError(); return; }
  initHistory();
  startSyncListeners();
  materializeAll();
  const userBox = document.getElementById('sidebar-user');
  if(userBox) userBox.textContent = currentUser.email;
  $$('.nav-item[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  const logoutBtn = document.getElementById('btn-logout');
  if(logoutBtn) logoutBtn.onclick = async()=>{ try{ if(dirty) await flushSave(); }catch(e){} supabase.auth.signOut(); };
  wireQuickAdd();
  document.getElementById('app-root').style.display='flex';
  switchView('dashboard');
  const loader = document.getElementById('app-loader');
  if(loader) loader.classList.add('hidden');
}
function wireQuickAdd(){
  const btn = document.getElementById('btn-quick-add');
  if(!btn) return;
  btn.onclick = (e)=>{
    e.stopPropagation();
    const existing = document.querySelector('.quick-add-menu');
    if(existing){ existing.remove(); return; }
    const items = [
      {label:'Receita', ic:'trendingUp', action:()=>openLancModal(null, todayISO(), 'receita')},
      {label:'Despesa', ic:'trendingDown', action:()=>openLancModal(null, todayISO(), 'despesa')},
      {label:'Transferência', ic:'repeat', action:()=>openLancModal(null, todayISO(), 'transferencia')},
      {label:'Compra no cartão', ic:'creditcard', action:()=>{ switchView('cartao'); }},
      {label:'Meta', ic:'target', action:()=>{ switchView('metas'); setTimeout(()=>document.getElementById('btn-new-goal')?.click(),50); }},
      {label:'Conta', ic:'wallet', action:()=>{ switchView('contas'); setTimeout(()=>document.getElementById('btn-new-account')?.click(),50); }}
    ];
    const menu = document.createElement('div');
    menu.className = 'quick-add-menu';
    menu.innerHTML = items.map((it,i)=>`<button data-i="${i}">${icon(it.ic,15)}${escapeHtml(it.label)}</button>`).join('');
    btn.parentElement.appendChild(menu);
    menu.querySelectorAll('button').forEach(b=>b.onclick=(ev)=>{ ev.stopPropagation(); items[+b.dataset.i].action(); menu.remove(); });
    const closeOnOutside = (ev)=>{ if(!menu.contains(ev.target)){ menu.remove(); document.removeEventListener('click',closeOnOutside); } };
    setTimeout(()=>document.addEventListener('click',closeOnOutside),0);
  };
}
init();

/* ===================== PWA ===================== */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  });
}
