/* Carrega funções puras do src/main.js (que não dá para importar direto: ele mexe na página) num ambiente isolado. */
const fs=require('fs'), path=require('path'), vm=require('vm');
const SRC=fs.readFileSync(path.join(__dirname,'..','..','src','main.js'),'utf8');
function grab(name){
  const a=SRC.indexOf(`function ${name}(`); if(a<0) throw new Error('função não encontrada no main.js: '+name);
  const b=SRC.indexOf('{',SRC.indexOf(')',a)); let d=0,k=b;
  for(;;k++){ const ch=SRC[k]; if(ch==='{') d++; else if(ch==='}'){ d--; if(d===0) break; } }
  return SRC.slice(a,k+1);
}
function load(names, globals={}, consts=[]){
  const ctx=vm.createContext({...globals});
  const cs=consts.map(c=>{ const m=SRC.match(new RegExp('^(?:const|let) '+c+' = .*$','m')); if(!m) throw new Error('constante não encontrada: '+c); return m[0]; });
  vm.runInContext([...cs,...names.map(grab)].join('\n'),ctx); return ctx;
}
module.exports={grab,load};
