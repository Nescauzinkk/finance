# Kivo — Controle Financeiro Pessoal

Aplicação web para controle financeiro pessoal: receitas, despesas, cartão de
crédito, parcelamentos, dívidas, recorrentes, metas, planejamento mensal,
Pareto 80/20, ponto de equilíbrio e projeção de 12 meses.

Stack: HTML + CSS + JavaScript puro (sem framework de UI), empacotado com
Vite, dados salvos no Supabase (Postgres + Auth), pronto para deploy na Vercel.

---

## 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta / novo projeto.
2. Anote a **Project URL** e a **anon public key**, em
   `Project Settings > API`.
3. Abra `Project > SQL Editor > New query`, cole todo o conteúdo do arquivo
   [`supabase/schema.sql`](./supabase/schema.sql) deste projeto e clique em
   **Run**. Isso cria a tabela `app_state` já com Row Level Security ativada
   (cada usuário só acessa os próprios dados).
4. (Opcional, recomendado para uso pessoal) Em `Authentication > Providers >
   Email`, desative **"Enable email confirmations"** se quiser entrar
   imediatamente após criar sua conta, sem precisar confirmar e-mail. Depois
   de criar seu próprio usuário, você também pode desativar **"Allow new
   users to sign up"** para que ninguém além de você consiga criar contas.

## 2. Configurar as variáveis de ambiente localmente

1. Duplique o arquivo `.env.example` e renomeie para `.env`.
2. Preencha com os valores do seu projeto Supabase:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

O arquivo `.env` já está no `.gitignore` — ele nunca deve ser commitado.

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (geralmente
`http://localhost:5173`). Crie sua conta na tela de login (e-mail + senha) —
é a mesma conta do Supabase Auth, os dados ficam vinculados a ela.

## 4. Subir para o GitHub

```bash
git init
git add .
git commit -m "Controle financeiro pessoal"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

Recomenda-se deixar o repositório **privado**, já que ele fica junto ao
histórico do projeto (o `.env` com as chaves não vai junto, pois está no
`.gitignore`).

## 5. Deploy na Vercel

1. Acesse [vercel.com](https://vercel.com) e clique em **Add New > Project**.
2. Importe o repositório do GitHub que você acabou de criar.
3. A Vercel detecta automaticamente que é um projeto **Vite** — não precisa
   mudar build command nem output directory.
4. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   (os mesmos valores do seu `.env` local)
5. Clique em **Deploy**. Em ~1 minuto sua aplicação estará no ar em um link
   `https://seu-projeto.vercel.app`.

Qualquer novo `git push` para a branch `main` gera um novo deploy
automaticamente.

## 6. Checklist antes de usar no dia a dia

- [ ] Consegue criar conta e entrar (`Auth > Users` no Supabase mostra seu usuário)
- [ ] Cadastrar uma receita e uma despesa aparece no Dashboard
- [ ] Atualizar a página (F5) e os dados continuam lá
- [ ] Sair e entrar novamente e os dados continuam lá
- [ ] Uma compra parcelada gera as parcelas automaticamente em Lançamentos
- [ ] O build de produção funciona: `npm run build && npm run preview`
- [ ] Nenhuma chave secreta aparece no código-fonte (apenas a **anon key**,
      que é pública por natureza e protegida pelas políticas de RLS)

## Estrutura do projeto

```
index.html            → tela de login + shell da aplicação
src/main.js            → toda a lógica (cálculos, telas, CRUD, Supabase)
src/supabaseClient.js  → conexão com o Supabase usando as env vars
src/style.css           → design (tema escuro com verde/vermelho/amarelo)
supabase/schema.sql    → script para criar a tabela e as políticas de RLS
```

## Sobre a arquitetura de dados

Para simplicidade e velocidade de entrega, todos os seus dados (receitas,
despesas, cartões, parcelamentos, dívidas, metas, categorias, configurações)
são salvos como **um único documento JSON** por usuário, na tabela
`app_state`. Isso já garante multi-dispositivo, autenticação e persistência
segura via RLS. Se no futuro você quiser evoluir para tabelas relacionais
separadas (uma tabela por tipo de dado, como no desenho original do
projeto), a lógica de cálculo em `src/main.js` pode ser adaptada
gradualmente sem precisar reescrever a interface.
