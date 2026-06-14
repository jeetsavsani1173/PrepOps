# PrepOps

PrepOps is a local-first, AI-powered job tracking and interview preparation command center built for software engineers. It prioritizes privacy, performance, and a zero-cloud-dependency architecture.

All data, resume files, and scraping operations remain strictly on your local machine.

---

## 🚀 Key Features

### 1. Unified Command Dashboard
- **Drag-and-Drop Kanban**: Organize opportunities across key pipeline stages (`Saved`, `Applied`, `Interview`, `Closed`). Dragging cards automatically records status transitions.
- **Stale Alerts**: Highlights inactive applications that have been sitting in the `Applied` stage for 10+ days without updates.
- **Smart Search & Filters**: Search by company, role, or keywords, and filter your workspace view by period.

### 2. Automated Scraper & Parsing Pipeline
- **Playwright & Cheerio Scraper**: Automatically fetches high-fidelity job descriptions from arbitrary URLs. Uses Playwright for client-side rendered sites and Cheerio for raw static HTML extraction.
- **Mozilla Readability**: Standardizes scraped layouts to retrieve clean, readable text body.
- **Local PDF Resume Parser**: Upload and parse PDF resumes on your local disk using `pdf-parse`. Extracted text is used to compute AI matching scores.

### 3. Generative AI Engine (Gemini API Integration)
- **AI Match Score & Skill Gaps**: Automatically compares scraped job descriptions against your current resume snapshot. Computes a match percentage, identifies critical skill gaps, and suggests tailored preparation tasks.
- **Tailored Referral Drafts**: Generates highly personalized outreach messages matching different networking channels (Email, LinkedIn, Cold Outreach) by contextualizing the role requirements with your resume achievements.
- **Configurable Models**: Model choices (`GEMINI_MODEL`, `GEMINI_API_KEY`) are editable directly from your local `.env` configuration.

### 4. Application Timeline Tracker
- **Transition Logs**: Every status change is automatically written to a structured `StatusHistory` table.
- **Interactive Vertical Timeline**: View chronological status pathways on the opportunity detail page, including exact days spent in each stage and total days in your current status.

### 5. Premium Dashboard Analytics Workspace
- **Funnel & Conversions**: Aggregates conversion ratios (Saved $\rightarrow$ Applied, Applied $\rightarrow$ Interview) across selected tracking ranges.
- **Interactive Visualizations**: Includes weekly application volume timelines, match score distribution bars, and top 10 most demanded skills chart.
- **Time-in-Stage Metrics**: Computes average duration (days) spent in each phase to track your search velocity.

### 6. Dynamic Glassmorphic UI & 🌓 Light/Dark Theme Switcher
- **CSS-First Theme System**: Native CSS `light-dark()` overrides automatically invert color levels, backgrounds, and scrollbars without duplicating class declarations.
- **Ambient Glow Backgrounds**: Premium mesh backgrounds featuring soft radial color glows (Indigo, Teal, Amber, Blue, Purple) that sit behind layout panels.
- **Animated Toggler**: A spring-animated toggle button driven by `framer-motion` rotating Sun/Moon SVGs.
- **Zero FOUC**: A blocking inline script injected inside the `<head>` guarantees theme synchronization before browser rendering, completely eliminating layout flashing.

---

## 📂 Project Structure

- `app/` - Next.js App Router endpoints, pages, and REST API handlers.
- `components/` - Reusable UI widgets (Kanban, Modal panels, Theme Switcher, Charts).
- `lib/` - Shared config, validations, Prisma Client, environment settings, and AI providers.
- `prisma/` - Database schemas, migrations, and seeding scripts.
- `extension/` - Chrome browser extension source code for job ingestion.
- `storage/` - Local filesystem volume for parsed text and resume PDFs.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 15+ (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **Database**: SQLite with Prisma ORM
- **Animations**: Framer Motion
- **Scraping**: Playwright, Cheerio, `@mozilla/readability`
- **PDF Extraction**: `pdf-parse`
- **AI Engine**: Google GenAI SDK (Gemini API)

---

## ⚙️ Setup & Quality Checks

Refer to the detailed [setup.md](file:///Users/jeetsavsani/Desktop/Coding/PrepOps/setup.md) guide to configure local SQLite databases, run Docker container stacks, install the Google Chrome extension, and verify typecheck or linter scripts.
