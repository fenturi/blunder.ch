# Railway Deployment

Recommended beta setup:

- Vercel hosts the frontend from `/frontend`.
- Railway hosts the backend API from `/backend`.
- Railway hosts a second worker service from `/backend`.
- Railway provides Postgres and Redis.

## Railway Services

Create one Railway project with four services:

1. `backend-api`
   - Source: GitHub repo
   - Root directory: `/backend`
   - Dockerfile: `backend/Dockerfile`
   - Start command: leave blank, or `npm start`

2. `backend-worker`
   - Source: same GitHub repo
   - Root directory: `/backend`
   - Dockerfile: `backend/Dockerfile`
   - Start command: `npm run worker`

3. `Postgres`
   - Railway PostgreSQL service

4. `Redis`
   - Railway Redis service

## Backend Variables

Set these on both `backend-api` and `backend-worker` unless noted:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
STOCKFISH_PATH=/usr/games/stockfish
ENGINE_DEPTH=14
ENGINE_MULTIPV=2
IMPORT_CONCURRENCY=2
ANALYSIS_CONCURRENCY=1
PUBLIC_APP_URL=https://your-frontend-domain.vercel.app
CORS_ORIGINS=https://your-frontend-domain.vercel.app,http://localhost:5173
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_CURRENCY=usd
STRIPE_PRO_AMOUNT_CENTS=999
LICHESS_TOKEN=your_lichess_token
CHESS_DOT_COM_USER_AGENT=blunder.app/0.1 support@example.com
```

`STRIPE_SECRET_KEY` only needs to be present on `backend-api`, but keeping the envs mirrored is simpler.

## First Deploy

After Railway deploys Postgres and the backend image, run migrations from the `backend-api` service shell:

```sh
npm run migrate
```

Then restart both `backend-api` and `backend-worker`.

## Frontend Variables

On Vercel, set this for the frontend project:

```env
VITE_API_BASE_URL=https://your-backend-api.up.railway.app
```

Then redeploy the frontend.

## Stripe Webhook

In Stripe, add this webhook endpoint:

```text
https://your-backend-api.up.railway.app/api/billing/webhook
```

Listen for `checkout.session.completed`, then copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
