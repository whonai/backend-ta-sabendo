# Dev estável (sem “todo dia cai o login”)

O front quebra quando a **API (3001) não sobe**. Isso quase sempre é **MongoDB**.

## Opção A — Mongo local (recomendado, **sem conta**)

1. `brew tap mongodb/brew && brew install mongodb-community@7.0`
2. `brew services start mongodb/brew/mongodb-community@7.0`
3. `server/.env`: `DEV_USE_LOCAL_MONGODB=true`
4. Na raiz: `npm run start`

## Opção B — Atlas sem IP todo dia

1. Atlas → **Network Access** → **Allow Access from Anywhere** (`0.0.0.0/0`) — só em projeto de dev.
2. `server/.env`: `DEV_USE_LOCAL_MONGODB=false` e `MONGODB_URI` do Atlas.
3. `npm run start`

## Conferir

`curl http://localhost:3001/api/health` → `"ok":true`

Só então o front em `localhost:3000` funciona (proxy `/api`).
