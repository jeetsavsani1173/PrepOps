# PrepOps

Local-first job tracking and interview preparation system built with Next.js, Prisma, SQLite, and Docker.

## What Is Implemented (Phase 1 Foundation)

- Next.js App Router + TypeScript + Tailwind v4
- Dark-mode dashboard shell with:
  - Metrics cards
  - Kanban-style status columns
  - Stale application count (10+ days)
- SQLite + Prisma schema for:
  - Opportunities
  - Status history
  - Interview notes
  - Prep tasks
  - Resume snapshots
- REST APIs:
  - `GET/POST /api/opportunities`
  - `PATCH/DELETE /api/opportunities/:id`
  - `POST /api/extension/ingest`
  - `POST /api/scrape-job` (scaffold response)
- Optional AI flag support (`AI_ENABLED=false` by default)
- Chrome extension scaffold in `extension/`
- Dockerfile + docker-compose with persistent volumes

## Project Structure

- `app/` routes, pages, API handlers
- `components/` reusable UI components
- `lib/` prisma client, constants, schemas, env helpers
- `prisma/` schema, migrations, seed
- `storage/` local storage directories
- `extension/` browser extension scaffold

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env and verify values:

```bash
cp .env.example .env
```

3. Run database migration + seed:

```bash
npx prisma migrate dev
```

4. Start development server:

```bash
npm run dev
```

App URL: `http://localhost:3000`

## Docker Setup (Single Command)

```bash
docker-compose up --build
```

This brings up the app with persistent volumes:

- `prepops-db` for SQLite DB
- `prepops-storage` for resumes/assets

## API Quick Test

Create opportunity:

```bash
curl -X POST http://localhost:3000/api/opportunities \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Example Corp",
    "roleTitle": "Backend Engineer",
    "source": "MANUAL",
    "jobUrl": "https://example.com/job/123"
  }'
```

Fetch opportunities:

```bash
curl http://localhost:3000/api/opportunities
```

## Chrome Extension Scaffold

Current scaffold files:

- `manifest.json`
- `background.ts` + `background.js`
- `content.ts` + `content.js`
- `popup.html`
- `popup.ts` + `popup.js`

Current behavior:

- Click popup button on any page
- Sends `{ url, roleTitle, pageText, rawHtml }` to `POST /api/extension/ingest`

Load in Chrome:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click **Load unpacked**
4. Select the `extension/` folder

## Verification Commands

```bash
npm run lint
npm run build
```

## Next Build Targets

- Drag-and-drop Kanban updates (`PATCH /api/opportunities/:id`)
- Workspace panel (notes, tasks, timeline)
- Real scraper pipeline (Playwright + Cheerio)
- AI parser and recommendation engine behind `AI_ENABLED=true`
