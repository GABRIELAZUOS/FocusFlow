# FocusFlow ⚡

**Produtividade feita para como seu cérebro funciona.**

FocusFlow é um app de produtividade completo projetado para pessoas com TDAH. Combina Kanban adaptado, método WOOP e Pomodoro flexível em uma interface sem fricção.

---

## Funcionalidades

### 🧠 Quadro Kanban (TDAH-first)
- **Brain Dump** — captura qualquer pensamento sem julgamento
- **Hoje** — limite de 3 tarefas (proteção contra superestimação)
- **Em Andamento** — limite de 1 tarefa (foco singular)
- **Concluído** — animação de confetti ao completar
- **Algum dia** — ideias sem prazo
- Drag & drop entre colunas com @dnd-kit
- Filtro por nível de energia (🟢 Baixa / 🟡 Média / 🔴 Alta)
- Captura rápida global com `Espaço` ou botão `+`
- Revisão diária ao abrir o app pela primeira vez no dia

### 🎯 WOOP
- Método baseado em ciência (Gabriele Oettingen, NYU)
- Formulário guiado passo a passo (W → O → O → P)
- Lista de metas com filtros por status
- Vinculação com tarefas do Kanban

### 🍅 Foco (Pomodoro adaptado)
- 4 modos: Clássico (25/5), Sprint (15/3), Fluxo (50/10), Personalizado
- Timer visual com anel circular de progresso SVG
- Integração direta com o Kanban (seleciona tarefa da coluna Hoje)
- Histórico e estatísticas semanais com gráfico de barras
- Streak de dias consecutivos

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite |
| Estilo | Tailwind CSS v3 |
| Animações | Framer Motion |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Estado global | Zustand |
| Backend | Supabase (Auth + Postgres + RLS) |
| Ícones | Lucide React |
| Deploy | Vercel |

---

## Configuração local

### 1. Clone e instale

```bash
git clone <seu-repo>
cd focusflow
npm install
```

### 2. Configure o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor** e execute o arquivo [`supabase/schema.sql`](./supabase/schema.sql)
3. Ative autenticação por e-mail em **Authentication → Providers**
4. (Opcional) Configure Google OAuth em **Authentication → Providers → Google**

### 3. Variáveis de ambiente

```bash
cp .env.example .env
```

Preencha com suas credenciais (em **Supabase → Project Settings → API**):

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### 4. Rode localmente

```bash
npm run dev
# Acesse http://localhost:5173
```

---

## Deploy na Vercel

**Via dashboard (recomendado):**
1. Importe o repositório em [vercel.com](https://vercel.com)
2. Adicione as variáveis de ambiente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
3. Framework preset: **Vite** — deploy automático!

**Via CLI:**
```bash
npm i -g vercel
vercel --prod
```

Após o deploy, adicione a URL da Vercel em **Supabase → Authentication → URL Configuration → Site URL**.

---

## Banco de dados

O arquivo [`supabase/schema.sql`](./supabase/schema.sql) cria as tabelas:

| Tabela | Descrição |
|--------|-----------|
| `tasks` | Tarefas do Kanban (coluna, energia, tempo, categoria) |
| `woops` | Metas WOOP (desejo, resultado, obstáculo, plano, reflexão) |
| `pomodoro_sessions` | Histórico de sessões com modo e duração |
| `user_settings` | Preferências por usuário |

Todas as tabelas têm **Row Level Security (RLS)** ativo.

---

## PWA

O app pode ser instalado:
- **Chrome/Edge**: clique no ícone de instalação na barra de endereço
- **iOS Safari**: Compartilhar → Adicionar à Tela Inicial

---

## Scripts

```bash
npm run dev      # Servidor de desenvolvimento (porta 5173)
npm run build    # Build de produção em /dist
npm run preview  # Preview do build localmente
npm run lint     # Lint com ESLint
```

---

## Estrutura

```
src/
  components/
    kanban/    TaskCard, Column, QuickCapture, DailyReviewModal
    pomodoro/  TimerRing, ModeSelector, SessionHistory
    woop/      WoopCard, WoopForm, WoopDetail
    shared/    Sidebar, Header, EnergyBadge, ConfettiEffect
  hooks/       useAuth, usePomodoro
  store/       kanbanStore, pomodoroStore, settingsStore
  lib/         supabase (client + types), utils
  pages/       Auth, Onboarding, Board, Focus, Woop
  App.tsx      Layout e roteamento principal
supabase/
  schema.sql   Schema completo com RLS
public/
  manifest.json  PWA manifest
  sw.js          Service worker básico
```

---

Feito com ❤️ para cérebros que funcionam diferente.
