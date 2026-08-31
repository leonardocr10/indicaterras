# Suíte E2E do IndicaFácil

Testes ponta a ponta com Playwright: navegador real, frontend Angular e API NestJS
de verdade, banco MySQL de teste.

## Antes de tudo: o banco

**A suíte nunca roda contra produção.** O `backend/.env` aponta para o Supabase de
produção; esta suíte usa um `e2e/.env.e2e` próprio e recusa qualquer alvo que não
seja um MySQL local com `e2e` ou `test` no nome do banco. A trava está em
`env.ts` (`exigirBancoDeTeste`), repetida em `scripts/_shared.mjs` e uma terceira
vez dentro do `prisma/seed-e2e.ts`.

### Primeira execução

```bash
cd e2e && npm install && npx playwright install
```

Copie o modelo de ambiente e ajuste se precisar:

```bash
cp .env.e2e.example .env.e2e
```

Crie o banco de teste (pede a senha do root do MySQL no terminal):

```bash
npm run db:e2e:setup
```

## Rodando

```bash
npm run test:e2e              # tudo, no Chromium desktop
npm run test:e2e:smoke        # rápido, pós-deploy
npm run test:e2e:regression   # fluxos completos
npm run test:e2e:journey      # a jornada do usuário, ponta a ponta
npm run test:e2e:a11y         # acessibilidade (axe-core)
npm run test:e2e:ui           # modo interativo
npm run test:e2e:all-browsers # Chromium + Firefox + WebKit
npm run test:e2e:report       # abre o relatório HTML
```

O Playwright sobe a API e o frontend sozinho. Para apontar para servidores que já
estão no ar, defina `E2E_MANAGE_SERVERS=false`.

## Como está organizado

```
e2e/
  playwright.config.ts   projetos por navegador e viewport, trace/vídeo/screenshot
  env.ts                 carrega .env.e2e + trava anti-produção
  fixtures/
    teste-base.ts        fixture principal: Page Objects + diagnóstico + mocks
    diagnostics.ts       guarda de console.error e de HTTP inesperado
    sessao.ts            login por API, expiração de token, localização salva
    ai-mock.ts           respostas da IA: sucesso, baixa confiança, erro, timeout
    maps-mock.ts         stub do SDK do Google Maps
    contas.ts            contas e dados do seed
  pages/                 Page Objects
  tests/                 as suítes
  support/               global setup, arquivos de upload, helper de IA
  scripts/               setup e reset do banco, boot da API de teste
```

### Projetos do Playwright

| Projeto | Viewport | O que roda |
|---|---|---|
| `chromium-desktop` | 1440×900 | tudo (prioritário) |
| `chromium-mobile-390` | 390×844 | `@mobile`, `@smoke`, `@journey` |
| `chromium-mobile-430` | 430×932 | `@mobile`, `@responsive` |
| `chromium-tablet` | 768×1024 | `@responsive`, `@smoke` |
| `firefox-desktop` | 1440×900 | `@smoke`, `@cross-browser` |
| `webkit-desktop` | 1440×900 | `@smoke`, `@cross-browser` |

Firefox e WebKit rodam só o núcleo de propósito: o objetivo é pegar
incompatibilidade de render e de API, não repetir regra de negócio três vezes.

## Console e HTTP

Todo teste falha se a página gerar `console.error` inesperado ou se a API
responder 400/401/403/404/500 fora do previsto. "Inesperado" é o critério — um
401 no teste de senha errada é o comportamento certo, e cada teste declara o que
tolera:

```ts
diagnostico.tolerarHttp(/\/auth\/login/, 401);
diagnostico.tolerarConsole(/maps/i);
```

A lista de erros conhecidos e globalmente ignorados, cada um com o motivo, está
em `fixtures/diagnostics.ts`.

## Dados de teste

O seed é `backend/prisma/seed-e2e.ts` e roda a cada execução sobre um banco
zerado, então a suíte é repetível. Todas as contas usam o domínio `.test`,
reservado pela RFC 2606:

| Conta | E-mail | Papel |
|---|---|---|
| Cliente | `cliente.e2e@example.test` | RESIDENT |
| Cliente 2 | `cliente2.e2e@example.test` | RESIDENT |
| Cliente sem endereço | `cliente.sem-endereco.e2e@example.test` | RESIDENT |
| Profissional | `profissional.e2e@example.test` | PROFESSIONAL |
| Profissional pendente | `profissional.pendente.e2e@example.test` | PROFESSIONAL |
| Admin | `admin.e2e@example.test` | CONDO_ADMIN |
| Super admin | `superadmin.e2e@example.test` | SUPER_ADMIN |

Senha de todas: `Senha@123`.

Os profissionais ficam a distâncias exatas de um ponto fixo em Brasília, para os
testes de raio terem resultado determinístico sem depender de geocoding:

| Profissional | Distância | Aparece em |
|---|---|---|
| Eletricista Perto E2E | 0,4 km | 1, 5 e 10 km |
| Encanador Perto E2E | 1,2 km | 5 e 10 km |
| Eletricista Medio E2E | 3 km | 5 e 10 km |
| Eletricista Longe E2E | 7,5 km | só 10 km |
| Eletricista Fora E2E | 25 km | nenhum raio testado |
| Eletricista Sem Local E2E | sem coordenada | nenhum (alimenta o aviso na tela) |

O seed também cria de propósito uma categoria sem profissional (`Marceneiro`) e
um serviço sem profissional (`Recuperacao de dados`), para os estados vazios
terem o que testar.

## IA e mapa

Nenhum teste depende da Gemini ou do Google Maps de verdade:

- **IA**: `fixtures/ai-mock.ts` intercepta `POST /api/ai/problem-analysis` e cobre
  sucesso, pedido de esclarecimento, baixa confiança, fallback por palavra-chave,
  erro HTTP, limite excedido, JSON inválido e timeout.
- **Mapa**: `fixtures/maps-mock.ts` substitui o SDK do Google por um stub que
  implementa `Map`, `Marker`, `LatLng`, `LatLngBounds` e `OverlayView`. Os pinos
  continuam sendo os `button.map-pin` construídos pelo próprio componente, então
  o que se testa é o código da aplicação.

Há dois testes opcionais contra os serviços reais, pulados por padrão. Preencha
`E2E_GEMINI_API_KEY` (`@ai-real`) ou `E2E_GOOGLE_MAPS_API_KEY` (`@maps-real`) no
`.env.e2e` para ativá-los.

## O que não está coberto, e por quê

`tests/propostas/fluxo-de-propostas.spec.ts` descreve os itens 13, 14 e 15 da
especificação — profissional recebe oportunidade, envia proposta, cliente aceita,
serviço percorre o ciclo até concluído. **Esse recurso não existe no sistema**:

- não há modelo `Proposal` no `schema.prisma`;
- `ServiceRequestStatus` só tem `OPEN`, `MATCHED`, `CLOSED` e `CANCELLED`;
- `getServiceRequestsForUser` filtra por `clientId`, então o profissional não
  enxerga solicitação nenhuma.

Os testes ficam como `test.fixme`, servindo de especificação executável. Um teste
sentinela roda de verdade e **falha quando o recurso passar a existir**, avisando
que a suíte precisa ser ativada.

Pela mesma razão, a jornada em `tests/jornada/user-journey.spec.ts` vai do
cadastro até a avaliação, pulando os passos 9 a 11 do enunciado.

## Relatórios

Depois de qualquer execução:

```bash
npm run test:e2e:report
```

O HTML traz total, passou, falhou, pulado e duração. Para as falhas: screenshot,
vídeo e trace. Abra o trace para ver cliques, requisições, DOM e erros passo a
passo. As capturas das telas principais ficam em `reports/screenshots/`.
