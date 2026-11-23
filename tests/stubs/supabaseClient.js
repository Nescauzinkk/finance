// Banco falso: devolve o estado que o teste colocar em globalThis.__STATE e aceita qualquer gravação.
const result = (table)=>({ data: table==='app_state' ? { data: globalThis.__STATE, updated_at:'2026-01-01T00:00:00Z' } : null, error:null });
function builder(table){
  const b = new Proxy(function(){}, { get(_,p){
    if(p==='then') return (res)=>res({data:[],error:null});
    if(p==='maybeSingle'||p==='single') return async()=>result(table);
    return ()=>b;
  }});
  return b;
}
export const supabase = {
  auth:{ getSession: async()=>({data:{session:{user:{id:'u1',email:'aldo@teste.com'}}}}),
         onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}), signOut: async()=>{}, signInWithPassword: async()=>({error:null}), signUp: async()=>({error:null}) },
  from:(t)=>builder(t)
};
