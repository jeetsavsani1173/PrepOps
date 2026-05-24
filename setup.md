# PrepOps Fresh Setup Guide

This guide helps you set up PrepOps from scratch on a new machine.

## 1. Prerequisites

Install these first:

- Node.js `22.x` (recommended)
- npm `10+`
- Docker Desktop (or Docker Engine + Compose)
- Git

Optional but useful:

- VS Code
- Chrome (for extension testing)

## 2. Clone and Enter Project

```bash
git clone <your-repo-url>
cd PrepOps
```

What this does:

- `git clone` downloads the project
- `cd PrepOps` moves you into the project folder

Verify you are in the right folder:

```bash
ls
```

You should see files like `package.json`, `prisma/`, `app/`, `docker-compose.yml`.

## 3. Install Dependencies

```bash
npm install
```

What this does:

- Installs Next.js, Prisma, React, Tailwind, and all required packages
- Runs `postinstall` script (`prisma generate`) to create Prisma client

Verify install:

```bash
npm -v
node -v
```

## 4. Create Environment File

```bash
cp .env.example .env
```

What this does:

- Creates your local environment file used by Next.js + Prisma

Current default env values:

- `DATABASE_URL="file:./prisma/dev.db"`
- `AI_ENABLED="false"`
- `OPENAI_API_KEY=""`

Note:

- AI is intentionally optional right now.
- Keep `AI_ENABLED=false` unless AI phase is implemented.

## 5. Setup Database (SQLite + Prisma)

```bash
npx prisma migrate dev
```

What this does:

- Creates SQLite DB at `prisma/dev.db` if missing
- Applies migrations from `prisma/migrations`
- Regenerates Prisma client
- Runs seed script (`prisma/seed.mjs`) to add sample opportunities

Verify DB quickly:

```bash
npx prisma studio
```

Then open Prisma Studio URL shown in terminal and confirm data exists in `Opportunity` table.

## 6. Run App Locally (Development)

```bash
npm run dev
```

What this does:

- Starts Next.js dev server with hot reload

Open in browser:

- `http://localhost:3000`

Expected result:

- Dark dashboard UI with metrics + kanban columns

## 7. API Smoke Tests

Create one opportunity:

```bash
curl -X POST http://localhost:3000/api/opportunities \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Example Corp",
    "roleTitle": "Backend Engineer",
    "source": "MANUAL",
    "jobUrl": "https://example.com/jobs/123"
  }'
```

Fetch all opportunities:

```bash
curl http://localhost:3000/api/opportunities
```

Test scrape endpoint scaffold:

```bash
curl -X POST http://localhost:3000/api/scrape-job \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/job/123"}'
```

## 8. Quality Checks

Lint:

```bash
npm run lint
```

Production build test:

```bash
npm run build
```

What these do:

- `lint` catches code quality/type-style issues
- `build` confirms app compiles for production

## 9. Docker Setup (Single Command Startup)

Start with build:

```bash
docker-compose up --build
```

What this does:

- Builds app image
- Starts service `prepops`
- Maps `localhost:3000 -> container:3000`
- Mounts persistent volumes:
  - `prepops-db` for SQLite
  - `prepops-storage` for resume/assets

Run in detached mode:

```bash
docker-compose up -d --build
```

Check logs:

```bash
docker-compose logs -f
```

Stop services:

```bash
docker-compose down
```

## 10. Chrome Extension Setup (Scaffold)

1. Open Chrome: `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select project folder: `extension/`
5. Open any job page
6. Click extension popup button **Save To PrepOps**

What happens now:

- Extension sends page payload to:
  - `POST http://localhost:3000/api/extension/ingest`

Important:

- Local app server must be running (`npm run dev` or Docker) before testing extension.

## 11. Common Problems and Fixes

### Problem: `npm install` fails due to network

Try again on stable internet and rerun:

```bash
npm install
```

### Problem: Prisma migration fails

Ensure `.env` exists and has valid `DATABASE_URL`.

Then rerun:

```bash
npx prisma migrate dev
```

### Problem: Port 3000 already in use

Run on another port:

```bash
npm run dev -- -p 3001
```

### Problem: Extension says server not reachable

Ensure backend is running on `http://localhost:3000`.

### Problem: Docker container starts but app not reachable

Check logs:

```bash
docker-compose logs -f
```

## 12. Fresh Reset (Local Dev Only)

If you want a clean local DB reset:

```bash
rm -f prisma/dev.db
npx prisma migrate dev
```

This recreates DB and reseeds data.

## 13. Current Phase Status

Already implemented:

- Local-first app foundation
- Prisma schema + migrations + seed
- Opportunity CRUD APIs
- Dashboard shell
- Extension basic ingest flow
- Docker runtime

Not yet implemented (next phases):

- Full Playwright/Cheerio scraping pipeline
- AI scoring + recommendations
- Drag-and-drop kanban status updates
- Full notes/tasks workspace UX
