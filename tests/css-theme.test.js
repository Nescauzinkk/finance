/* Checagens estáticas do CSS e do index.html: variáveis, restos do neon, contraste nos dois temas, script do tema. */
const {JSDOM}=require('jsdom'); const fs=require('fs');
const R=[]; const ok=(l,v)=>R.push([l,!!v]);
const css=fs.readFileSync(require('path').join(__dirname,'..','src','style.css'),'utf8');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
// ===== CSS =====
ok('CSS com chaves balanceadas', css.split('{').length===css.split('}').length);
ok('sem restos do neon antigo (roxos e rosas fixos)', !/162,\s*75,\s*255|176,\s*102,\s*255|197,\s*139,\s*255|#B25CFF|#8A2BFF|#6A1BFF|#C379FF/i.test(css));
ok('sem desfoque (blur) em nenhum painel, sem brilho em texto e sem sombra luminosa em ícone', !/backdrop-filter:\s*(?!none)/.test(css.replace(/-webkit-backdrop-filter/g,'backdrop-filter')) && !/text-shadow:\s*(?!none)/.test(css) && !/drop-shadow/.test(css));
ok('sem manchas de fundo animadas (body::before/::after escondidos) e sem foto de fundo no login', /body::before,body::after\{display:none !important;\}/.test(css) && /\.auth-screen\{background:var\(--bg\);\}/.test(css));
const defined=new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m=>m[1]));
const used=[...new Set([...css.matchAll(/var\((--[\w-]+)/g)].map(m=>m[1]))];
const inline=['--c'];   // definida em linha pelo JS (style="--c:...")
ok('toda variável usada no CSS está definida ('+used.length+' variáveis)', used.every(u=>defined.has(u)||inline.includes(u)) || (console.log('   faltando:',used.filter(u=>!defined.has(u)&&!inline.includes(u))),false));
const last=css.lastIndexOf(':root{\n  color-scheme:dark;'); const darkBlock=css.slice(last, css.indexOf('}',last)); 
const li=css.indexOf(':root[data-theme="light"]{'); const lightBlock=css.slice(li, css.indexOf('}',li));
const tok=b=>Object.fromEntries([...b.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
const D=tok(darkBlock), L=tok(lightBlock);
const must=['--line-strong','--bg','--surface','--panel','--panel-2','--panel-3','--input','--scrim','--line','--line-soft','--ink','--ink-soft','--ink-dim','--accent','--accent-hi','--on-accent','--pos','--neg','--warn','--accent-rgb','--pos-rgb','--neg-rgb','--warn-rgb','--ink-rgb','--shadow-rgb'];
ok('tema claro redefine todas as cores-base do escuro', must.every(k=>k in D && k in L) || (console.log('   faltando:',must.filter(k=>!(k in L))),false));
ok('os dois temas declaram o esquema de cores (campos de data, rolagem nativos)', /color-scheme:dark/.test(darkBlock) && /color-scheme:light/.test(lightBlock));
const lum=h=>{ const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928? v/12.92 : Math.pow((v+.055)/1.055,2.4)); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
const cr=(a,b)=>{ const x=lum(a),y=lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
for(const [name,T] of [['escuro',D],['claro',{...D,...L}]]){
  const pairs=[['--ink','--bg',7],['--ink','--surface',7],['--ink','--panel-2',7],['--ink-soft','--bg',4.5],['--ink-soft','--surface',4.5],['--ink-soft','--panel-2',4.5],['--ink-dim','--surface',3],
    ['--accent-hi','--surface',4.5],['--accent-hi','--bg',4.5],['--pos','--surface',4.5],['--neg','--surface',4.5],['--warn','--surface',4.5],['--pos','--bg',4.5],['--neg','--bg',4.5],['--on-accent','--accent',4.5]];
  const bad=pairs.filter(([f,b,min])=>cr(T[f],T[b])<min).map(([f,b,min])=>`${f} em ${b}: ${cr(T[f],T[b]).toFixed(2)} (mín. ${min})`);
  ok(`contraste do tema ${name}: texto, destaques, positivo/negativo e botão principal dentro do recomendado`, bad.length===0 || (console.log('   ',bad),false));
}
ok('o tema claro é claro de verdade (fundo e cartões claros, texto escuro)', lum(L['--bg'])>.85 && lum(L['--surface'])>.95 && lum(L['--ink'])<.05 && lum(D['--bg'])<.01);
ok('logo branco ganha versão para o tema claro', /:root\[data-theme="light"\] \.logo-wordmark[^{]*\{filter:invert\(1\) hue-rotate\(180deg\);\}/.test(css));
// ===== index.html =====
ok('index.html: script que define o tema ANTES do CSS (sem piscar) e cor da barra do navegador', html.indexOf('kivo-theme')>0 && html.indexOf('kivo-theme')<html.indexOf('/src/style.css') && /theme-color" content="#0C0C10"/.test(html));
ok('index.html: botão de tema ao lado das configurações', html.indexOf('id="btn-theme"')>0 && html.indexOf('id="btn-theme"')<html.indexOf('data-view="configuracoes"'));
const early=html.match(/<script>(\(function\(\)\{try\{var t=localStorage[\s\S]*?)<\/script>/)[1];
function runEarly(saved,prefersLight,throws){ const d=new JSDOM('<html></html>',{runScripts:'outside-only'}); const w=d.window;
  Object.defineProperty(w,'localStorage',{value:{getItem:()=>{ if(throws) throw new Error('x'); return saved; }}});
  w.matchMedia=()=>({matches:prefersLight}); w.eval(early); return w.document.documentElement.getAttribute('data-theme'); }
ok('tema inicial: salvo "light" vence; salvo "dark" vence; sem escolha segue o sistema; valor inválido segue o sistema; erro de armazenamento cai no escuro',
  runEarly('light',false)==='light' && runEarly('dark',true)==='dark' && runEarly(null,true)==='light' && runEarly(null,false)==='dark' && runEarly('xyz',true)==='light' && runEarly(null,true,true)==='dark');

ok('foco visível para quem usa teclado (botões, menu, abas, links)', /\.btn:focus-visible[^{]*\{outline:2px solid var\(--accent-hi\)/.test(css));
ok('regra global verde/vermelho para valores existe e vem depois do .stat-value', css.lastIndexOf('.pos{color:var(--pos);}')>css.lastIndexOf('.stat-value{') && css.lastIndexOf('.neg{color:var(--neg);}')>0);
ok('barra de status do iPhone acompanha o tema (script inicial)', /apple-mobile-web-app-status-bar-style/.test(early));

// ===== cantos retos e borda dos quadros =====
const mainJs=fs.readFileSync(require('path').join(__dirname,'..','src','main.js'),'utf8');
ok('SEM cantos arredondados: nenhum raio no CSS além de 0, círculos (50%) e as variáveis zeradas; gráficos sem raio', !/border-radius:\s*(?!0\b|50%|var\(--r(-lg)?\))/.test(css) && /--r:0;\s*--r-lg:0;/.test(darkBlock.replace(/\s+/g,' ')) && !/borderRadius:\s*[1-9]/.test(mainJs));
const ratio=(a,b)=>cr(a,b);
ok('tema escuro: a borda dos quadros é MAIS CLARA que o preenchimento cinza (contraste 1,4 a 2,2 — visível sem berrar)', lum(D['--line-strong'])>lum(D['--surface']) && ratio(D['--line-strong'],D['--surface'])>=1.4 && ratio(D['--line-strong'],D['--surface'])<=2.2 || (console.log('   razão:',ratio(D['--line-strong'],D['--surface'])),false));
ok('tema claro: a borda se destaca do branco do quadro (contraste ≥ 1,2) e do fundo da página', ratio(L['--line-strong'],L['--surface'])>=1.2 && ratio(L['--line-strong'],L['--bg'])>=1.0);
ok('a borda forte vale para cartões, tabelas, janelas, avisos e dicas do gráfico; o aviso com faixa lateral colorida fica de fora', /\.card,\.table-wrap,\.net-worth-card,\.status-banner,\.modal,\.auth-card,\.toast,#save-banner,\.dc-tip,\.invoice-card\{border:1px solid var\(--line-strong\);border-radius:0;\}/.test(css) && !/alert-item,[^{]*line-strong|line-strong[^}]*alert-item/.test(css));
ok('o destaque verde/vermelho do cartão "Posso gastar" vem DEPOIS da regra geral de borda (senão ela o apagava)', css.lastIndexOf('.card.dash-ok{border-color')>css.lastIndexOf('.card,.table-wrap,.net-worth-card') && css.lastIndexOf('.card.dash-bad{border-color')>css.lastIndexOf('.card,.table-wrap,.net-worth-card'));
let bad=0; for(const [l,v] of R){ console.log((v?'PASSOU  ':'FALHOU  ')+l); if(!v) bad++; }
console.log('\n'+R.length+' verificações,', bad+' falha(s)'); process.exit(bad?1:0);
