# Contrato de autenticação (API Express)

Base URL local padrão: `http://localhost:3001/api/auth`

Autenticação nas rotas protegidas: header `Authorization: Bearer <token>`.

O token é retornado no login/cadastro e no callback do Google. Expira em **7 dias** (HMAC assinado com `JWT_SECRET`).

---

## POST `/register`

Cadastro com e-mail e senha.

**Body (JSON)**

```json
{
  "name": "Maria Silva",
  "email": "maria@example.com",
  "password": "senha123"
}
```

| Campo    | Regras                          |
|----------|----------------------------------|
| email    | Obrigatório, formato válido      |
| password | Obrigatório, mínimo 6 caracteres |
| name     | Opcional (default: parte local do e-mail) |

**Sucesso — 201**

```json
{
  "user": {
    "id": "usr_a1b2c3d4",
    "name": "Maria Silva",
    "email": "maria@example.com",
    "avatarUrl": "...",
    "isAdmin": false,
    "role": "user",
    "reputationLevel": "Novo",
    "trustworthinessScore": 50
  },
  "token": "..."
}
```

**Erros**

| Status | message                    |
|--------|----------------------------|
| 400    | E-mail inválido / campos obrigatórios |
| 409    | E-mail já cadastrado       |
| 503    | Banco indisponível         |

---

## POST `/login`

**Body (JSON)**

```json
{
  "email": "maria@example.com",
  "password": "senha123"
}
```

**Sucesso — 200** — mesmo formato `{ user, token }`.

**Erros**

| Status | message              |
|--------|----------------------|
| 400    | Validação            |
| 401    | Credenciais inválidas |
| 503    | Banco indisponível   |

Contas criadas **somente via Google** (sem senha local) recebem 401 ao tentar login por senha.

---

## GET `/me`

Requer `Authorization: Bearer <token>`.

**Sucesso — 200** — objeto `user` (sem senha/hash).

**Erros**

| Status | message                      |
|--------|------------------------------|
| 401    | Token ausente/inválido ou usuário não encontrado |

---

## POST `/logout`

Não invalida token no servidor (JWT stateless). Resposta:

```json
{ "ok": true }
```

O frontend deve **remover o token** do storage (localStorage/sessionStorage/memory).

---

## Login com Google

### Variáveis de ambiente (backend)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `GOOGLE_CLIENT_ID` | Sim | OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Sim | OAuth Client secret |
| `GOOGLE_REDIRECT_URI` | Recomendada | Default: `http://localhost:3001/api/auth/google/callback` |
| `AUTH_FRONTEND_CALLBACK_URL` | Recomendada | Default: `{FRONTEND_URL}/auth/callback` ou `http://localhost:3000/auth/callback` |
| `JWT_SECRET` | Sim (prod) | Assina tokens e state OAuth |

### Google Cloud Console

1. Criar projeto (ou usar existente).
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
3. Tipo: **Web application**.
4. **Authorized redirect URIs**: exatamente a URL do backend, ex.  
   `http://localhost:3001/api/auth/google/callback`
5. Copiar **Client ID** e **Client secret** para o `.env`.

Tela de consentimento OAuth: incluir escopos `openid`, `email`, `profile` (fluxo padrão).

### Como o frontend inicia o login

Redirecionar o navegador (mesma aba ou popup):

```text
GET http://localhost:3001/api/auth/google
```

Não é necessário body. O backend redireciona para o Google com `state` assinado (CSRF).

### Callback

1. Google chama `GET /api/auth/google/callback?code=...&state=...`
2. Backend valida `state`, troca `code` por tokens, verifica `id_token`, cria ou reutiliza usuário (`googleId` / e-mail).
3. Backend redireciona para `AUTH_FRONTEND_CALLBACK_URL` com query **`token`**:

```text
http://localhost:3000/auth/callback?token=<jwt>
```

Em caso de erro:

```text
http://localhost:3000/auth/callback?error=auth_failed&message=...
```

### Página `/auth/callback` no frontend

1. Ler `token` da query string.
2. Persistir token (ex.: `localStorage.setItem('authToken', token)`).
3. Chamar `GET /api/auth/me` com Bearer para carregar o perfil.
4. Limpar query da URL (router) por segurança.

### Contas duplicadas

- Primeiro acesso Google → cria usuário com `googleId` + e-mail.
- Novo acesso com mesmo Google → mesmo `googleId`.
- E-mail já cadastrado com senha → associa `googleId` à conta existente (sem duplicar e-mail).

---

## Manter autenticação

Enviar em todas as requisições autenticadas:

```http
Authorization: Bearer <token>
```

Renovar sessão: novo login quando o token expirar (401 em `/me` ou rotas protegidas).

---

## Modelo de usuário (MongoDB)

| Campo | Descrição |
|-------|-----------|
| `id` | Identificador público (`usr_…`) |
| `name` | Nome |
| `email` | Único, normalizado lowercase |
| `passwordHash` | scrypt; omitido para contas só Google |
| `googleId` | Sub do Google; sparse unique |
| `createdAt` / `updatedAt` | Timestamps Mongoose |

Campos legados do app (`avatarUrl`, `role`, `reputationLevel`, etc.) permanecem para compatibilidade.
