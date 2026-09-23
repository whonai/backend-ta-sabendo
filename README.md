# Tá Sabendo / Tá Rolando — Backend

API REST **Express** (`server/`, porta **3001**) consumida pelo frontend React (Vite, porta 3000). Em dev o front usa proxy `/api` → `http://localhost:3001/api`.

Há também um app **NestJS + Prisma** na raiz (legado); o fluxo recomendado para integração com o front é o Express.

## Pré-requisitos

- Node.js 18+
- MongoDB (local ou Atlas)

## Configuração

```bash
cp server/.env.example server/.env
# Ajuste MONGODB_URI e JWT_SECRET
```

Variáveis principais:

| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta HTTP (padrão `3001`) |
| `MONGODB_URI` | Connection string MongoDB |
| `MONGODB_DB` | Nome do database (padrão `ta_rolando`) |
| `JWT_SECRET` | Segredo dos tokens Bearer |
| `CORS_ORIGINS` | Origens permitidas (padrão `http://localhost:3000,http://localhost:3002`) |
| `SEED_FORCE` | `true` para recriar seed alinhado ao front |

## Rodar o servidor Express

Na raiz do repositório:

```bash
npm install
cd server && npm install && cd ..
npm run start:server
```

Health: `GET http://localhost:3001/api/health` → `{ "ok": true }`

### Usuários seed (auth)

| E-mail | Senha | Papel |
|--------|-------|--------|
| `naiaragms2018@gmail.com` | `admin123` | admin |
| `demo@tarolando.app` | `demo123` | user |

Token JWT (mock estável HMAC) → header `Authorization: Bearer <token>` (mesma key do front: `tarolando_auth_token`).

## Importar bares e casas (OpenStreetMap, grátis)

Na pasta `server/` (usa Overpass + grava no Mongo; não apaga locais `osm-*` no re-seed):

```bash
cd server
npm run import:osm-venues
```

Repita ocasionalmente (ex.: 1× por mês). Dados © OpenStreetMap contributors (ODbL).

## Checklist curl (smoke test)

Com o backend rodando:

```bash
curl -s http://localhost:3001/api/health
curl -s http://localhost:3001/api/events | head -c 400
curl -s http://localhost:3001/api/urban-reports | head -c 400
curl -s http://localhost:3001/api/streets | head -c 400
curl -s http://localhost:3001/api/city/pulse | head -c 400
curl -s "http://localhost:3001/api/venues?lat=-12.2575&lng=-38.9668&radius=5000" | head -c 400
```

Alias de pulse (compatível com `apiClient.pulseApi`):

```bash
curl -s http://localhost:3001/api/pulse
curl -s http://localhost:3001/api/city/pulse
```

### Engajamento real (confirmações / RSVP)

Contadores (`confirmationsCount`, `goingCount`, `interestedCount`, `currentAttendees`) vêm da coleção **`EventParticipation`** (1 registro por usuário + ação). Seed não inventa mais números — começam em **0**.

- `POST /api/events/:id/confirm` — requer `Authorization: Bearer` (1 confirmação por usuário)
- `POST /api/events/:id/rsvp` — body `{ "type": "going"|"interested" }` (toggle)
- `POST /api/events/:id/check-in` — presença no local (1 por usuário)

Login:

```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@tarolando.app","password":"demo123"}'
```

## Contrato JSON

Os responses seguem os tipos do frontend (`ta-sabendo/src/types/index.ts` e `apiClient.ts`): categorias de evento (`shows`, `cultural`, …), status (`unconfirmed`, `confirmed`, …), relatos urbanos por `type` (`flooding`, `pothole`, …), etc.

Dados iniciais espelham cenários de Feira de Santana e são persistidos no MongoDB. Documentos legados (ex.: `category: "forro"`, `status: "active"`) são detectados no boot e a coleção é re-seedada automaticamente.

## NestJS (opcional)

```bash
cp .env.example .env   # DATABASE_URL, JWT_SECRET
npm install
npx prisma generate
npm run start:dev
```

### Rodando tudo localmente (Postgres + Mongo + serviços)

Se você quer rodar tanto o `server` (Express/Mongo) quanto o backend Nest (Prisma/Postgres) em um só comando, use o helper incluído.

Requisitos: `docker`, `docker-compose`, `node`, `npm`.

```bash
# subir Postgres e Mongo
docker-compose up -d

# tornar o script executável (uma vez)
chmod +x ./scripts/run-local.sh

# gerar client Prisma, aplicar migrations e iniciar os dois serviços
./scripts/run-local.sh
```

O script definirá `DATABASE_URL` apontando para o Postgres local e `MONGODB_URI` para o Mongo local. Ele inicia o `server` em `3001` e o Nest (por padrão `3000` ou `3002` conforme `.env`).

Para parar tudo:

```bash
docker-compose down
```

Swagger (Nest): http://localhost:3000/api/docs — **não** substitui o Express na porta 3001 para o front atual.
