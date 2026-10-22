# Poker Blinds Timer

Webapp para controlar blinds e o caixa de torneios de poker. É um PWA instalável, funciona
offline e tem um link ao vivo para as mesas acompanharem o timer.

## Funcionalidades

- Timer de níveis baseado em horário (não acumula atraso)
- Menu com dois destinos: **Torneio** e **Configurações**
- Troca automática de blinds
- Som ao trocar nível (Web Audio, com fallback para HTML5 Audio)
- Wake Lock (manter a tela ligada)
- Tela cheia
- Estruturas prontas: Turbo (5 min), Regular (20 min) e Deep stack (30 min)
- Configurações com seções **Jogo** (blinds/presets) e **App** (som, instalação, diagnóstico)
  recolhíveis; **Som** e **Instalação** ficam lado a lado
- Sessão do torneio: buy-in/rebuy, fichas, máximo de rebuys, salão, snacks e premiados
- Jogadores: cadastro individual ou colando uma lista de nomes; assento, rebuys e rateio
- Mesa: sorteio de posições e dealer, com arrastar/soltar ou toque para trocar
- Acerto final: prêmio proporcional às fichas, rateio, total investido e saldo por jogador
- Uma chave PIX por premiado, incluída no resumo para WhatsApp
- Link ao vivo por QR code para 2–3 mesas acompanharem o timer
- Preset da última sessão ao iniciar um novo torneio
- PWA instalável, com funcionamento offline

## Design system

- **Fontes self-hosted:** Inter Variable (interface) e JetBrains Mono Variable (relógio),
  subset latin em `public/fonts/`. As licenças OFL estão em `public/fonts/OFL-Inter.txt` e
  `public/fonts/OFL-JetBrainsMono.txt`.
- **Ícones:** Google Material Symbols Rounded vendorizados como SVG inline em
  `src/components/ui/iconPaths.js` e renderizados pelo componente `Icon`. Sem icon font,
  sem CDN e sem requisição extra em runtime. Licença Apache 2.0.
- **Primitivos:** `Button`, `IconButton`, `Card`, `Field`, `Accordion`, `Tabs`, `Badge`,
  `Alert`, `EmptyState`, `Tile`, `PageShell` e `PageHeader` em `src/components/ui/`.
- **Tokens:** página em 24px semibold, seção em 16px, card em 14px e meta em 12px;
  `rounded-lg` para controles, `rounded-xl` para cards e pills em `rounded-full`.
- **Cores:** preto, `gray-900` para cards, `green-500` com texto `gray-950` como única ação
  primária, `amber-400` para dealer/aviso e `red-600` para ações destrutivas.
- **Torneio:** nomes e terminologia padronizados (Torneio, Pote, Premiados, Link ao vivo).

## Stack

React 19, Vite, Tailwind CSS 4, React Router, dnd-kit, qrcode.react e vite-plugin-pwa.

O link ao vivo usa **Cloudflare Pages Functions + D1**. O código fica no GitHub; o deploy é
feito pelo Cloudflare Pages.

## Desenvolvimento

```bash
npm install
npm run dev      # UI; o link ao vivo não publica em dev (sem Functions)
npm run build
npm test
npm run lint
```

### Link ao vivo localmente

```bash
npm run build
npm run db:migrate:local
npm run preview:cf
```

Abra `http://localhost:8788`. O `wrangler pages dev` usa o binding D1 do `wrangler.jsonc`;
não passe `--d1=DB` (isso cria um banco local separado).

## Deploy na Cloudflare

Deploy atual: **https://poker-blinds.pages.dev**

O D1 `poker-blinds-timer` já foi criado e a migration `0001_live_sessions.sql` está aplicada
no banco remoto. O binding `DB` e o `database_id` real estão no `wrangler.jsonc`.

Para publicar uma nova versão:

```bash
npm run build
npx wrangler pages deploy dist --project-name poker-blinds --branch main
```

O deploy acima envia também `functions/` e o `_redirects`. Para automatizar via Git, conecte
o repositório no painel do Pages:

- Build command: `npm run build`
- Output directory: `dist`
- O binding D1 `DB` já está declarado no `wrangler.jsonc`.

Para recriar o banco em outra conta: `npm run db:create`, atualize o `database_id` no
`wrangler.jsonc` e rode `npm run db:migrate`.

As rotas novas da SPA precisam ser adicionadas em `public/_redirects` (hoje: `/menu`,
`/session`, `/settings` e `/live/*`). O service worker já faz o fallback offline.

O plano Free da Cloudflare cobre este uso com folga: 100 mil requisições/dia no Workers e
5 milhões de leituras + 100 mil escritas/dia no D1. O host e as mesas precisam de internet
para o link ao vivo; o host publica a cada 15s e as mesas consultam a cada 4s.

O `netlify.toml` continua no repositório como fallback legado, mas o backend do link ao vivo
é exclusivo da Cloudflare.

## Como o dinheiro é calculado

- Todos os valores são inteiros em centavos.
- **Total investido** = buy-in + rebuys + rateio.
- **Prêmio** = pote × fichas do premiado ÷ soma das fichas dos premiados, com arredondamento
  por maior resto (a soma fecha exatamente com o pote).
- **Rateio** = (salão + snacks) ÷ participantes, também por maior resto.
- **Saldo** = prêmio − total investido. Positivo recebe; negativo paga.
- Conferência: total investido = prêmios + custos.
- O pagamento é no fim e o host é um jogador normal; o caixa é apenas o papel dele.

## Safari / iPhone

- No iPhone, o Safari não expõe a API de tela cheia para elementos. Use
  **Compartilhar → Adicionar à Tela de Início** para abrir em modo standalone.
- O iOS só libera áudio depois do primeiro toque na tela; a partir daí o som do timer
  funciona normalmente (a menos que o aparelho esteja no silencioso, em iOS anterior ao 16.4).
- Os botões **Som** e **Instalação** ficam lado a lado em Configurações → App. No iOS,
  **Como instalar** abre as instruções da Tela de Início; no Chrome/Edge/Android o botão
  **Instalar** usa o prompt nativo.
- Em **Configurações → App → Diagnóstico** há o estado da instalação, áudio, tela cheia e
  Wake Lock.
