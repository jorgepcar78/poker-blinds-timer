# Poker Blinds Timer

Webapp para controle de blinds em torneios de poker. Funciona offline e pode ser instalado como PWA.

Funcionalidades:
- Timer de níveis baseado em horário (não acumula atraso)
- Troca automática de blinds
- Som ao trocar nível (Web Audio, com fallback para HTML5 Audio)
- Wake Lock (manter tela ligada)
- Tela cheia
- Estruturas prontas: Turbo (5 min), Regular (20 min) e Deep stack (30 min)
- Timer e configurações salvos no `localStorage`
- PWA instalável, com funcionamento offline

## Safari / iPhone

- No iPhone, o Safari não expõe a API de tela cheia para elementos. Use
  **Compartilhar → Adicionar à Tela de Início** para abrir em modo standalone.
- O iOS só libera áudio depois do primeiro toque na tela; a partir daí o som
  do timer funciona normalmente (a menos que o aparelho esteja no silencioso,
  em iOS anterior ao 16.4).
- Em **Configurações → Som** há o botão **Testar som** e, no fim da página,
  um bloco **Diagnóstico** para conferir os recursos disponíveis no aparelho.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Validação

```bash
npm run lint
npm run build
```

## Deploy

Deploy na Netlify usando o `netlify.toml` (build em `dist` e redirect de SPA para `/index.html`).
