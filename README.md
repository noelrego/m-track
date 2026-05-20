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
- Backend health: http://localhost:3000/health
- Swagger API docs: http://localhost:3000/api when `SWAGGER_ENABLED=true`
- Mongo Express dev UI: http://localhost:8081

The source folders are bind-mounted into the containers, while `/app/node_modules`
uses anonymous Docker volumes so container dependencies are not overwritten by the
host filesystem.

Local npm scripts require Node.js `>=20.19.0`; the Dockerfiles use Node 22.

## Backend Auth

Login is available at:

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin12345","emailid":"admin@example.com","firstName":"Admin"}'
```

Then login:

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin12345"}'
```

Use the returned token on protected routes:

```bash
curl http://localhost:3000/temp \
  -H "Authorization: Bearer <accessToken>"
```

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
