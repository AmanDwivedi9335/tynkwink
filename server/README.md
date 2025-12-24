# Gmail Lead Import

## Setup

### Required environment variables

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET` (optional, falls back to access secret)
- `ENCRYPTION_MASTER_KEY` (base64-encoded 32-byte key)
- `ENCRYPTION_KEY_ID` (identifier for master key)
- `ENCRYPTION_MASTER_KEYS` (optional rotation list, format: `keyId:base64,keyId2:base64`)
- `OAUTH_STATE_SECRET`
- `APPROVAL_TOKEN_SECRET`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `EMAIL_PROVIDER` (`smtp` or `sendgrid`)
- `EMAIL_FROM`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (for SMTP provider)
- `SENDGRID_API_KEY` (for SendGrid provider)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (optional)
- `PUBLIC_BASE_URL` (UI base URL, e.g. `http://localhost:5173`)
- `APPROVAL_BASE_URL` (optional override for approval links)
- `OPENAI_MODEL` (optional, defaults to `gpt-4o-mini`)
- `OPENAI_BASE_URL` (optional override for OpenAI endpoint)

### Google OAuth

Configure OAuth consent and credentials in the Google Cloud console.

- Authorized redirect URI: `GOOGLE_OAUTH_REDIRECT_URI`
- Scopes: `https://www.googleapis.com/auth/gmail.readonly`

### Run API and workers

```bash
npm install
npm run dev
```

Start background workers in a separate process:

```bash
npm run worker
```

### Redis

BullMQ requires Redis. Ensure it is running and reachable via `REDIS_HOST` and `REDIS_PORT`.

### Prisma

```bash
npx prisma migrate dev
```

## Notes

- Refresh tokens and OpenAI keys are encrypted at rest using envelope encryption.
- Approval emails are sent as digests (batched) and include single-use tokens.
- Approval actions are idempotent and tenant-scoped.
