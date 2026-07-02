# Marketplace Command Center

Centralizador de operações de marketplaces (Mercado Livre, Amazon, TikTok Shop, Shopee e outros) — perguntas, frete, qualidade de anúncios e conferência de pedidos em um único painel multi-tenant.

Arquitetura completa e decisões de produto: ver o plano em
`/Users/gabrielluizdossantosribeiro/.claude/plans/quero-criar-um-gerenciador-curious-narwhal.md`.

## Stack

- Next.js 15 (App Router) + TypeScript
- Supabase (Postgres + Auth + Row Level Security)
- MUI v6 + Emotion
- TanStack Query

## Setup

1. Crie um projeto no [Supabase](https://supabase.com).
2. Copie `.env.example` para `.env.local` e preencha com as chaves do projeto (Settings → API).
3. Rode a migration inicial (`supabase/migrations/0001_init.sql`) no SQL Editor do Supabase, ou via Supabase CLI:
   ```bash
   supabase link --project-ref <seu-project-ref>
   supabase db push
   ```
4. Crie um usuário de teste em Authentication → Users, depois insira manualmente uma organização e um membership para ele (o fluxo de onboarding self-service ainda não existe nesta fase inicial):
   ```sql
   insert into organizations (name) values ('Empresa Teste') returning id;
   insert into memberships (org_id, user_id, role) values ('<org_id>', '<user_id>', 'admin');
   ```
5. Instale dependências e rode localmente:
   ```bash
   npm install
   npm run dev
   ```

## Estado atual (Fase 1 — Fundação)

- [x] Estrutura Next.js + Supabase (clientes browser/server/admin, middleware de sessão)
- [x] Schema multi-tenant com RLS (`organizations`, `memberships`, conexões de marketplace/ERP, catálogo, pedidos, perguntas, frete, jobs e eventos)
- [x] Login e layout de dashboard com indicadores placeholder
- [ ] Conector Mercado Livre (OAuth + perguntas + frete + reputação)
- [ ] Integração Bling (ERP)
- [ ] Onboarding self-service e billing (Stripe) em modo beta

## Módulos planejados (validados no protótipo existente)

- **Perguntas** — perguntas pré-venda pendentes de resposta, por marketplace
- **Frete** — % Frete/Pedido por SKU, com sinalização de atenção
- **Anúncios** — qualidade dos anúncios e sugestões de melhoria
- **Pedidos** — conferência/reconciliação financeira entre canais
