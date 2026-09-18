# Tá Rolando Feira — Backend

Servidor Express em TypeScript para a aplicação "Tá Rolando Feira".

Instalação e execução (a partir da pasta `server`):

```bash
npm install
npm run dev
```

Config:
- Porta padrão: `3001` (use `PORT` para mudar).
- CORS permitido: `http://localhost:3000` com credenciais.

APIs estão prefixadas por `/api`.

## Pipeline Instagram (MVP)

Coleta Stories de perfis monitorados → OCR (Tesseract) → extração heurística → evento `pending` → revisão admin.

### Variáveis (`server/.env`)

Ver `server/.env.example` (`ENABLE_INSTAGRAM_COLLECTOR`, `INSTAGRAM_*`, `EVENT_EXTRACTION_MIN_CONFIDENCE`).

### Python (Instagrapi)

```bash
cd server
python3 -m venv python/.venv
python/.venv/bin/pip install -r python/requirements.txt
```

No `server/.env`:

```env
INSTAGRAM_USERNAME=sua_conta_coleta
INSTAGRAM_PASSWORD=...
INSTAGRAM_SESSION_PATH=./data/instagram-session.json
```

### Ver logs da coleta no terminal do `npm run start`

Disparar (admin logado):

```bash
curl -X POST http://localhost:3001/api/admin/instagram/collect-once \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"
```

Ou em outro terminal:

```bash
cd server && npm run collect:instagram
```

Saída esperada no terminal do server:

```
[Instagram] ========== Coleta iniciada ...
[Instagram] Buscando stories de @bar ...
[Instagram] instagram_cli via .../python/.venv/bin/python3
[Instagram] API retornou N story/stories ...
[Instagram]   · id=... type=image at=...
[OCR] Processing story ...
```

Use `INSTAGRAM_ADAPTER=instagrapi` e credenciais/sessão. Sem credenciais, o adapter `mock` é usado (dev).

### Coleta manual

```bash
npm run collect:instagram
```

Ou `POST /api/admin/instagram/collect-once` (admin JWT).

### Admin — eventos pendentes

- `GET /api/admin/events/pending`
- `GET /api/admin/events/:id`
- `PATCH /api/admin/events/:id`
- `POST /api/admin/events/:id/approve` → `status: published`
- `POST /api/admin/events/:id/reject` → `status: rejected`

Perfis monitorados: `GET|POST /api/admin/instagram-profiles`, `PATCH /api/admin/instagram-profiles/:id`

Eventos `pending` e `rejected` **não** aparecem em `GET /api/events` nem no pulse.
