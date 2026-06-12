# Blunder Backend

Node.js backend for importing Chess.com and Lichess games, storing PGNs in PostgreSQL, analyzing games asynchronously with Redis + BullMQ, and attaching short AI explanations to detected mistakes.

## Stack

- Node.js + Express
- PostgreSQL
- Redis + BullMQ
- Stockfish via local UCI binary
- OpenAI-compatible LLM endpoint for short explanations

## What is included

- `POST /api/imports` to import by username and provider
- `GET /api/imports/:id` to inspect import job state
- `POST /api/billing/checkout-session` to create a Stripe Checkout upgrade
- `POST /api/billing/webhook` to activate premium from Stripe events
- `GET /api/games/:gameId` to view a processed game and its annotations
- `GET /api/puzzles/next` to start an adaptive Lichess-backed puzzle
- `POST /api/puzzles/move` to submit a puzzle move and update private Elo on completion
- `POST /api/puzzles/reveal` to reveal a solution and complete the attempt
- `POST /api/admin/reset-database` to reset production data when `RESET_DATABASE_CODE` is configured
- PGN hashing to avoid duplicates
- Background import and analysis workers
- SQL schema migration

## Setup

1. Copy `.env.example` to `.env`
2. Set `DATABASE_URL`, `REDIS_URL`, and `STOCKFISH_PATH`
3. Install dependencies:
   `npm install`
4. Run migrations:
   `npm run migrate`
5. Start the API:
   `npm run dev`
6. Start the worker in a second terminal:
   `npm run worker`

## Notes

- Chess.com imports archive months and then fetch PGNs month by month.
- Lichess imports use the exported PGN endpoint.
- AI explanations only run for moves classified as `mistake` or `blunder`.
- If `LLM_API_KEY` is empty, the pipeline still works and stores annotations without explanations.
- Put the Stripe secret key in `STRIPE_SECRET_KEY`; never expose it in frontend code.
- Puzzle definitions are fetched from Lichess and cached temporarily in Redis. PostgreSQL stores only user puzzle progress.
- Free accounts receive 5 new puzzles per UTC day; Pro accounts are unlimited. Refreshing resumes the active puzzle without spending another slot.
- Set `STRIPE_WEBHOOK_SECRET` from the Stripe CLI or dashboard webhook endpoint for production billing.
- Set `RESET_DATABASE_CODE` to a private 32+ character secret before using `/dev` to reset production data.
- Pause the Railway worker before a production reset, then restart it after the database and queues are cleared.
