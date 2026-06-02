### local setup
Video instructions: https://youtu.be/PPxenu7IjGM

- `cd /backend`
- `pnpm install` or `npm i`
- Rename `.env.template` ->  `.env`
- To connect to your online database from your local machine, copy the `DATABASE_URL` value auto-generated on Railway and add it to your `.env` file.
  - If connecting to a new database, for example a local one, run `pnpm ib` or `npm run ib` to seed the database.
- `pnpm dev` or `npm run dev`

### requirements
- **postgres database** (Automatic setup when using the Railway template)
- **redis** (Automatic setup when using the Railway template) - fallback to simulated redis.
- **MinIO storage** (Automatic setup when using the Railway template) - fallback to local storage.
- **Meilisearch** (Automatic setup when using the Railway template)

### commands

`cd backend/`
`npm run ib` or `pnpm ib` will initialize the backend by running migrations and seed the database with required system data.
`npm run dev` or `pnpm dev` will start the backend (and admin dashboard frontend on `localhost:9000/app`) in development mode.
`pnpm build && pnpm start` will compile the project and run from compiled source. This can be useful for reproducing issues on your cloud instance.

### Fintoc payments

Set these Railway variables before enabling bank-transfer checkout:

- `FINTOC_SECRET_KEY`: Fintoc secret API key.
- `FINTOC_WEBHOOK_SECRET`: secret generated when registering the webhook endpoint.
- `FRONTEND_URL`: public landing URL, for example `https://calisf.cl`.
- `STORE_CORS`: include the landing URL.

Register this webhook in Fintoc Dashboard:

`https://<your-medusa-backend-domain>/fintoc/webhook`

Subscribe at least to `checkout_session.finished`, `checkout_session.expired`, `payment_intent.succeeded`, and `payment_intent.failed`. The backend completes the Medusa cart only after a signed successful Fintoc webhook, which then triggers the existing `order.placed` Moodle enrollment subscriber.
