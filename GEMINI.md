# PrepOps — Gemini CLI Instructions

PrepOps is a local-first, AI-powered job tracking and interview preparation system built for software engineers. It prioritizes privacy, performance, and a zero-cloud-dependency architecture.

## 🛠 Tech Stack

- **Framework:** Next.js 15+ (App Router, TypeScript) — *Note: This project may use a specific version of Next.js with breaking changes. Refer to `AGENTS.md` for more details.*
- **Styling:** Tailwind CSS v4 (Dark-mode only, Zinc/Slate palette)
- **Database:** SQLite with Prisma ORM
- **Animations:** Framer Motion
- **Containerization:** Docker & Docker Compose
- **Scraping:** Playwright, Cheerio, @mozilla/readability
- **AI:** OpenAI API (Structured JSON extraction)

## 🏗 Project Structure

- `app/`: Next.js pages, layouts, and REST API route handlers.
- `components/`: Reusable UI components (Kanban, Cards, Modals).
- `lib/`: Shared logic (Prisma client, validation schemas, AI helpers, env config).
- `prisma/`: Database schema, migrations, and seed scripts.
- `extension/`: Chrome extension source code for job ingestion.
- `storage/`: Local filesystem for resumes and reports (mounted as Docker volumes).
- `public/`: Static assets.

## 🚀 Key Commands

- `npm install`: Install dependencies.
- `npm run dev`: Start the development server at `http://localhost:3000`.
- `npm run build`: Build the application for production.
- `npm run lint`: Run ESLint checks.
- `npx prisma migrate dev`: Apply database migrations.
- `npx prisma db seed`: Seed the database with initial data.
- `npx prisma studio`: Open Prisma Studio to explore the database.
- `docker-compose up --build`: Start the entire stack (App + DB + Storage) in Docker.

## 📝 Development Conventions

### Architecture & Data
- **Local-First:** All data must remain on the user's machine. No cloud databases or external storage.
- **Prisma:** Use UUIDs for IDs. Always include `createdAt` and `updatedAt` timestamps.
- **Status History:** Every status change in an `Opportunity` must be recorded in `StatusHistory`.
- **API Design:** Use REST-style Next.js Route Handlers. Ensure all inputs are validated (e.g., using Zod).

### UI & UX
- **Design:** Maintain a "terminal-inspired" engineering dashboard aesthetic. Use Zinc/Slate grays and specific accent colors (Green for success/Offers, Amber for Interviews, Indigo for OAs).
- **React:** Prefer Server Components by default. Use Client Components only for interactivity.
- **Animations:** Use Framer Motion for subtle, functional transitions (Kanban drag-and-drop, modals).

### AI & Scraping
- **AI Safety:** Never trust raw AI output. Always validate and structure AI responses as JSON before database insertion.
- **Scraping:** Use `Playwright` for dynamic content and `Cheerio` for static HTML. Respect `robots.txt` and avoid aggressive crawling.

## 📋 Core Workflows

1. **Job Capture:** Jobs are ingested via the Chrome extension or manual URL entry.
2. **Analysis:** The system scrapes the job description, and AI generates a match score, identifies skill gaps, and suggests prep tasks.
3. **Preparation:** Users track interview rounds, take notes, and manage preparation tasks in a markdown-friendly workspace.
4. **Analytics:** The dashboard provides funnel metrics (Applied → Interview → Offer) and highlights "stale" applications (10+ days inactive).

## ⚠️ Security & Privacy
- **Secrets:** Keep all API keys (e.g., `OPENAI_API_KEY`) in `.env`. Never commit `.env` files.
- **Files:** Resumes are stored on the local filesystem, not in the database. Only store the file path in Prisma.
