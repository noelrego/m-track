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

## Backend Auth

Create the first root admin through the seed command, not through a public API:

```bash
docker compose exec backend npm run seed:root-admin
```

In Render, run the same command after setting the `ROOT_ADMIN_*` environment
variables and `MONGO_URI` to your MongoDB Atlas connection string.

Login is available at:

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"rootadmin","password":"change-this-root-password"}'
```

Auth transport is configurable:

- `JWT_TRANSPORT=bearer`: return the JWT in the login response only.
- `JWT_TRANSPORT=cookie`: set the JWT as an HttpOnly cookie only.
- `JWT_TRANSPORT=both`: support both frontend styles during development or migration.

For cookie auth, the backend reads `JWT_COOKIE_NAME`, `JWT_COOKIE_MAX_AGE_MS`,
`JWT_COOKIE_SECURE`, `JWT_COOKIE_SAME_SITE`, and optional `JWT_COOKIE_DOMAIN`.
The frontend should use a matching `VITE_AUTH_TRANSPORT` value. In local
development, `cookie` or `both` works with `JWT_COOKIE_SECURE=false` and
`JWT_COOKIE_SAME_SITE=lax`. For Vercel + Render over HTTPS, use
`JWT_COOKIE_SECURE=true`, a strict `CORS_ORIGIN`, and usually
`JWT_COOKIE_SAME_SITE=none` unless both apps share the same site through custom
domains.

Swagger is available at `/api/docs` only when `SWAGGER_ENABLED=true`. Protected
routes are documented with both Bearer and cookie auth. In cookie mode, logging
in from Swagger sets the HttpOnly cookie in the browser; after that, Swagger
requests to protected routes send the cookie automatically.

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

Check the current session:

```bash
curl http://localhost:3000/api/me \
  -H "Authorization: Bearer <accessToken>"
```

Use the returned token on protected routes:

```bash
curl http://localhost:3000/api/temp \
  -H "Authorization: Bearer <accessToken>"
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
