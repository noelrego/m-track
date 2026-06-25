# M-Track

Money Track app for daily usage.

## Structure

- `frontend`: React, Vite, and Tailwind CSS app.
- `backend`: NestJS API with MongoDB connection through Mongoose.
- `docker-compose.yml`: development setup with containers kept alive for manual `exec` workflows.
- `docker-compose.prod.yml`: production setup that starts the built frontend and backend directly.

## Development

Build and start the idle development containers:

```bash
docker compose up -d --build
```

Or bring up only the side you want to work on:

```bash
docker compose up -d --build frontend
docker compose up -d --build backend
```

Run the frontend when you want it:

```bash
docker compose exec frontend npm run dev
```

Run the backend when you want it:

```bash
docker compose exec backend npm run start:dev
```

The apps are exposed at:

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Backend health: http://localhost:3000/api/health
- Swagger API docs: http://localhost:3000/api/docs when `SWAGGER_ENABLED=true`
- Mongo Express dev UI: http://localhost:8081

The source folders are bind-mounted into the containers, while `/app/node_modules`
uses anonymous Docker volumes so container dependencies are not overwritten by the
host filesystem.

Local npm scripts require Node.js `>=20.19.0`; the Dockerfiles use Node 22.

Dates are stored in MongoDB as UTC BSON `Date` values. API responses should expose
date-time fields as ISO 8601 UTC strings, such as `2026-05-20T10:30:00.000Z`, and
the frontend should convert them for display.

Application logs are written to stdout/stderr in this format:

```text
[timestamp] - [info|debug|warn|error] - [file.ts:line Function.name] - "Message", {"optional":"data"}
```

This is enough for Render's built-in logs. Use `LOG_LEVEL=debug` locally and
`LOG_LEVEL=info` in production unless you need deeper diagnostics.

## AI Model Setup

AI Assist uses OpenRouter from the NestJS backend. The React app records or
collects text, sends that text to NestJS, and NestJS calls OpenRouter to convert
the message into a structured expense draft.

1. Create or log in to your OpenRouter account at https://openrouter.ai.
2. Open the OpenRouter dashboard and create an API key.
3. Copy the key once and store it only in environment variables. Do not commit
   real API keys to Git.
4. Choose a model. This project is configured to use this Google model by
   default:

```env
OPENROUTER_MODEL=google/gemini-3.1-flash-lite
```

5. Add these values to `backend/.env` for local development, or to the Render
   environment variables for production:

```env
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key
OPENROUTER_MODEL=google/gemini-3.1-flash-lite
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_APP_NAME=SpendWise
OPENROUTER_APP_URL=http://localhost:5173
```

For production, set `OPENROUTER_APP_URL` to the hosted frontend URL, such as the
Vercel URL or your custom domain. OpenRouter receives this value through the
`HTTP-Referer` header, and `OPENROUTER_APP_NAME` through the
`X-OpenRouter-Title` header.

6. Restart the backend after changing env values:

```bash
docker compose exec backend npm run start:dev
```

Or on Render, redeploy/restart the NestJS service after saving the environment
variables.

7. Test through the React AI Assist page, or call the backend route directly with
   an authenticated user token:

```bash
curl -X POST http://localhost:3000/api/aiassist/expense-draft \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"I spent 100 rs on milk","localDate":"2026-06-25"}'
```

The backend sends the current user's active categories and tags to the model so
the model can return amount, date, category, tags, note, and clarification
status. If a selected OpenRouter model does not support strict structured output,
the backend retries once with a plain JSON prompt.

## Root Admin Setup

The first admin user is created through a seed script. There is no public
registration route for root admin creation.

1. Set these backend environment variables in `backend/.env` for local
   development, or in Render environment variables for production:

```env
ROOT_ADMIN_USERNAME=rootadmin
ROOT_ADMIN_EMAIL=rootadmin@example.com
ROOT_ADMIN_PASSWORD=change-this-root-password
ROOT_ADMIN_FIRST_NAME=Root
ROOT_ADMIN_LAST_NAME=User
```

`ROOT_ADMIN_PASSWORD` must be at least 12 characters.

2. Make sure the backend also has a valid database connection:

```env
MONGO_URI=mongodb://mongo:27017/m_track
```

For MongoDB Atlas, use the Atlas connection string instead.

3. Start the backend container setup if it is not already running:

```bash
docker compose up -d --build backend
```

4. Run the local root-admin seed command:

```bash
docker compose exec backend npm run seed:root-admin
```

The script creates exactly one root admin. It is safe to run again; if a root
admin already exists, it logs that the user already exists and does not create a
second root admin.

For Render, set the same `ROOT_ADMIN_*` variables and `MONGO_URI`, then run this
command from the deployed backend service shell or a one-off job:

```bash
npm run seed:root-admin:prod
```

If the Render service root is the repository root instead of the `backend`
folder, run:

```bash
cd backend && npm run seed:root-admin:prod
```

5. Log in with the seeded root admin:

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"rootadmin","password":"change-this-root-password"}'
```

Do not create the root admin manually in MongoDB unless you also hash the
password correctly. The seed script handles password hashing and required role
flags.

## Backend Auth

Auth transport is configurable:

- `JWT_TRANSPORT=cookie`: set the JWT as an HttpOnly cookie and return user profile data.
- `JWT_TRANSPORT=bearer`: return user profile data plus a `token` field.

The React app uses cookie auth and does not store JWTs in browser storage. It
stores the non-sensitive login profile in Zustand persisted local storage under
`m_track_auth_user`.

For cookie auth, the backend reads `JWT_COOKIE_NAME`, `JWT_COOKIE_MAX_AGE_MS`,
`JWT_COOKIE_SECURE`, `JWT_COOKIE_SAME_SITE`, and optional `JWT_COOKIE_DOMAIN`.
In local development, `cookie` works with `JWT_COOKIE_SECURE=false` and
`JWT_COOKIE_SAME_SITE=lax`. For Vercel + Render over HTTPS, use
`JWT_COOKIE_SECURE=true`, a strict `CORS_ORIGIN`, and usually
`JWT_COOKIE_SAME_SITE=none` unless both apps share the same site through custom
domains.

Swagger is available at `/api/docs` only when `SWAGGER_ENABLED=true`. Protected
routes are documented with Bearer and cookie security schemes so Swagger can be
used with either `JWT_TRANSPORT` setting. In cookie mode, logging in from Swagger
sets the HttpOnly cookie in the browser; after that, Swagger requests to
protected routes send the cookie automatically.

User onboarding is admin-only:

```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer <adminAccessToken>" \
  -H "Content-Type: application/json" \
  -d '{"username":"jane.user","password":"strongpass123","emailid":"jane@example.com","firstName":"Jane","lastName":"User","role":"user"}'
```

Admin user-management routes:

- `POST /api/admin/users`
- `GET /api/admin/users`
- `GET /api/admin/users/:userId`
- `PATCH /api/admin/users/:userId`
- `PATCH /api/admin/users/:userId/deactivate`

These routes require a JWT whose payload has `role: "admin"`.

Admin category routes:

- `POST /api/admin/categories`
- `GET /api/admin/categories`
- `GET /api/admin/categories/:categoryId`
- `PATCH /api/admin/categories/:categoryId`
- `DELETE /api/admin/categories/:categoryId`

Category delete is a soft delete. Old expenses keep their category history, while
new expenses can only use active categories.

Authenticated category selection route:

- `GET /api/categories`

This route is available to both admins and users so the expense form can show
active categories.

## Expense Tracking APIs

Money is stored as paise integers. For example, INR `125.00` is sent and stored
as `12500`.

User-owned tag routes:

- `POST /api/tags`
- `GET /api/tags`
- `GET /api/tags/:tagId`
- `PATCH /api/tags/:tagId`
- `DELETE /api/tags/:tagId`

Deleting a tag removes that tag from old expenses owned by the same user.

User-owned expense routes:

- `POST /api/expenses`
- `GET /api/expenses/recent?month=2026-05&limit=10`
- `GET /api/expenses/monthly-summary?month=2026-05`
- `GET /api/expenses/:expenseId`
- `PATCH /api/expenses/:expenseId`
- `DELETE /api/expenses/:expenseId`

Expense dates use `YYYY-MM-DD`, and reports use calendar month boundaries:
day `1` through the last day of that month in UTC.

Check the current session:

```bash
curl http://localhost:3000/api/me \
  -H "Authorization: Bearer <token>"
```

Use the returned token on protected routes:

```bash
curl http://localhost:3000/api/temp \
  -H "Authorization: Bearer <token>"
```

`/api/temp` is mounted only when `NODE_ENV` is not `production`.

Routes are protected by JWT by default. Add `@Public()` to a controller or route
handler when it should bypass JWT auth:

```ts
@Public()
@Get('health')
getHealth() {
  return this.appService.getHealth();
}
```

## Production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Production exposes the frontend through Nginx on http://localhost:8080 and runs the
NestJS app with `node dist/main`.

## Environment Files

Starter env files are included for local development:

- `.env.example`
- `frontend/.env.example`
- `backend/.env.example`

The matching `.env` files are present locally for Docker Compose and are ignored by
Git.
