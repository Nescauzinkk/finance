import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    'Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não encontradas. ' +
    'Crie um arquivo .env (veja .env.example) ou configure-as no painel da Vercel.'
  );
}

export const supabase = createClient(url, key);
