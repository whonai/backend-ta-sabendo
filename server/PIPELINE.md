# Pipeline: bares → Instagram → stories

## Parte 1 — Bares da cidade (OSM)

```http
POST /api/admin/venues/import-osm
Authorization: Bearer <admin>
Content-Type: application/json

{}
```

Opcional: `south`, `west`, `north`, `east`, `batchSize` (default 40).

Ou CLI: `npm run import:osm-venues`

Venues gravados em `venues` com `source: "osm"`. Se o OSM tiver tag Instagram, grava `instagramUsername`.

---

## Fila no admin (front)

```http
GET /api/admin/venues/instagram-queue
Authorization: Bearer <admin>
```

Resposta: `{ pending: [...], monitored: [...], counts }` — só locais **prioritários** (bar/evento); fast food, redes e doceria etc. não entram em `pending`. Já monitorados vão em `monitored`.

---

## Parte 2 — @ do Instagram (um venue por request)

```http
POST /api/admin/venues/:venueId/discover-instagram
Authorization: Bearer <admin>
```

Resposta: `username`, `candidates[]`, `source` (`osm` | `instagram_search` | …).

Confirmar monitoramento:

```http
POST /api/admin/instagram-profiles
{ "username": "...", "venueId": "osm-node-..." }
```

Delay entre buscas: `INSTAGRAM_DISCOVER_DELAY_MS=2500` (padrão).

---

## Parte 3 — Stories 1× por dia

No `server/.env`:

```env
INSTAGRAM_ADAPTER=instagrapi
INSTAGRAM_SESSIONID=...
INSTAGRAM_SESSION_PATH=./data/instagram-session.json

ENABLE_INSTAGRAM_COLLECTOR=true
INSTAGRAM_COLLECTION_INTERVAL_MINUTES=1440
```

Ou cron manual: `POST /api/admin/instagram/collect-once` (1×/dia).

Fluxo: stories → OCR → `events` com `status: pending` → admin aprova → `published` em `GET /api/events`.

---

## Status

```http
GET /api/admin/pipeline/status
Authorization: Bearer <admin>
```
