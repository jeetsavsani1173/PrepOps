# PrepOps — Complete Engineering Specification
## Local-First AI-Powered Job Search Tracker & Interview Preparation System

---

# 1. Purpose of the System

PrepOps is a fully local-first engineering productivity platform designed for software engineers to:

- Track job applications
- Organize interview preparation
- Store company-specific notes
- Monitor conversion analytics
- Manage resumes
- Analyze skill gaps using AI
- Run entirely on local infrastructure

The system must prioritize:

- Privacy
- Performance
- Zero cloud dependency
- Docker portability
- Smooth developer experience
- Keyboard-first productivity
- AI-assisted workflows

---

# 2. Core Product Philosophy

The system MUST follow these foundational rules:

---

## 2.1 Local-First Architecture Rules

### Mandatory Rules

- The entire system MUST run locally
- No cloud database usage
- No Firebase
- No Supabase
- No AWS infrastructure dependencies
- No external storage services

### Storage Requirements

Use:

- SQLite for relational data
- Local filesystem for resumes and assets
- Docker volumes for persistence

### Benefits

- Zero monthly hosting cost
- Offline-friendly workflows
- Faster performance
- Full user ownership
- Easier backups
- Portable environments

---

## 2.2 Developer Experience Rules

The setup MUST support:

```bash
docker-compose up --build
```

as the single startup command.

The system MUST:

- Auto-create storage folders
- Auto-generate Prisma client
- Support hot reload during development
- Work consistently across Mac/Linux/Windows

---

## 2.3 UI Philosophy Rules

The interface MUST feel like:

- A premium engineering dashboard
- A terminal-inspired productivity environment
- Minimal but highly functional
- Dark-mode optimized

### The UI MUST prioritize:

- Speed
- Clarity
- Dense information layout
- Keyboard efficiency
- Smooth interactions
- Low visual noise

---

# 3. High-Level User Workflow

The system is divided into two workflows.

---

# 3.1 Daytime Workflow — Quick Capture

Purpose:

Capture job opportunities quickly without breaking browsing flow.

### User Journey

1. User browses LinkedIn/Wellfound/company sites
2. User clicks "Save to PrepOps"
3. Chrome Extension extracts:
    - Company name
    - Role title
    - URL
    - Job description
4. Payload is sent to local API
5. Opportunity appears instantly in dashboard

---

# 3.2 Nighttime Workflow — Review & Preparation

Purpose:

Deep work session for preparation and tracking.

### User Activities

- Review applications
- Update statuses
- Track interview progress
- Write preparation notes
- Create prep tasks
- Analyze AI match scores
- Review stale applications
- Organize interview learnings

---

# 4. Technology Stack Rules

---

# 4.1 Frontend Rules

## Framework

Use:

- Next.js App Router
- TypeScript

### Mandatory Requirements

- Fully typed components
- Server Components by default
- Client Components only where necessary

---

## Styling

Use:

- Tailwind CSS

### UI Rules

- Dark mode only
- Use Zinc/Slate palettes
- Minimal gradients
- Smooth hover transitions
- Consistent spacing scale

---

## Animation Rules

Use:

- Framer Motion

### Use animations for:

- Kanban drag-and-drop
- Card transitions
- Drawer animations
- Modal transitions
- Dashboard updates

### Do NOT overuse animation

Animations should feel:

- Fast
- Subtle
- Functional

---

# 4.2 Backend Rules

Use:

- Next.js Route Handlers
- TypeScript

### API Design Rules

- REST-style endpoints
- JSON-only communication
- Structured error handling
- Strong schema validation

---

# 4.3 Database Rules

Use:

- SQLite
- Prisma ORM

### Database Requirements

- UUID-based IDs
- Cascading deletes
- Automatic timestamps
- Optimized indexes where necessary

---

# 4.4 File Storage Rules

Use Node.js `fs` streams.

Store files in:

```txt
/app/storage/resumes
```

### Rules

- Never store resume binaries inside SQLite
- Save only paths in database
- Use mounted Docker volumes
- Support PDF uploads only initially

---

# 4.5 AI Integration Rules

Use:

- OpenAI API
- Structured JSON extraction

### AI Tasks

- Job parsing
- Skill extraction
- Resume matching
- Gap analysis
- Preparation task generation

### AI Rules

- AI outputs MUST be structured JSON
- Never trust raw AI output blindly
- Validate all AI responses before DB insertion

---

# 5. System Architecture

---

# 5.1 Application Layers

The project MUST follow this structure:

```txt
app/
components/
lib/
prisma/
storage/
extension/
```

---

# 5.2 Layer Responsibilities

## app/

Contains:

- Routes
- Pages
- API handlers
- Layouts

---

## components/

Contains reusable UI:

- Cards
- Kanban
- Charts
- Modals
- Forms
- Dashboard widgets

---

## lib/

Contains:

- Prisma client
- OpenAI helpers
- Utility functions
- Validation schemas
- API helpers

---

## prisma/

Contains:

- Prisma schema
- Migrations
- Seed scripts

---

## storage/

Contains:

- Uploaded resumes
- Exported reports
- Future markdown assets

---

## extension/

Contains:

- Chrome extension source code

---

# 6. Database Design Rules

---

# 6.1 Opportunity Rules

An Opportunity represents one job application.

### Mandatory Fields

- Company name
- Role title
- Status
- Source
- Created timestamp

### Optional Fields

- Salary
- Job description
- Location
- AI match score

---

## Status Rules

Allowed statuses:

```txt
SAVED
READY
APPLIED
OA
INTERVIEW
OFFER
REJECTED
```

### Rules

- Status transitions must be tracked
- Every transition creates history entry
- Dashboard metrics derive from statuses

---

# 6.2 Status History Rules

Every status change MUST:

- Save previous status
- Save next status
- Save timestamp

Purpose:

- Funnel analytics
- Timeline tracking
- Historical reporting

---

# 6.3 Interview Notes Rules

Each opportunity may contain multiple interview rounds.

### Example Rounds

- Recruiter Call
- Machine Coding
- System Design
- Hiring Manager
- Behavioral

### Each note MUST support:

- Questions asked
- Personal feedback
- Learnings
- Follow-up topics

---

# 6.4 Prep Tasks Rules

Prep tasks are linked to opportunities.

### Examples

- Revise Kafka
- Study Redis transactions
- Practice LLD
- Review Spring Security

### Task Rules

- Optional due dates
- Completion tracking
- Dashboard reminders

---

# 6.5 Resume Snapshot Rules

The system MUST support multiple resumes.

### Each snapshot contains:

- Resume version name
- File path
- Extracted skills text

### Purpose

Used for:

- AI matching
- Resume comparisons
- Skill extraction

---

# 7. UI/UX Engineering Rules

---

# 7.1 Dark Mode Requirements

Use background:

```css
#09090b
```

### Surface colors

Use:

- Zinc
- Slate
- Neutral grays

---

# 7.2 Accent Colors

## Green

```css
#10b981
```

Used for:

- Offers
- High match score
- Success states

---

## Amber

```css
#f59e0b
```

Used for:

- Interviews
- Warnings
- Pending actions

---

## Indigo

```css
#6366f1
```

Used for:

- OA stages
- Interactive controls
- Active UI states

---

# 7.3 Dashboard Layout Rules

The dashboard MUST contain:

---

## Metrics Hub

Contains:

- Weekly funnel
- Conversion metrics
- Stale application warnings

---

## Kanban Pipeline

Columns:

```txt
Saved
Ready
Applied
OA
Interview
Offer
Rejected
```

### Rules

- Drag-and-drop enabled
- Smooth transitions
- Real-time updates

---

## Workspace Layout

Two-panel interface:

### Left Panel

- Opportunity list
- Filters
- Search
- Sorting

### Right Panel

- Markdown workspace
- Notes
- Tasks
- AI analysis
- Timeline history

---

# 8. API Engineering Rules

---

# 8.1 Opportunity API

Endpoint:

```txt
/api/opportunities
```

### Responsibilities

- Create opportunity
- Update opportunity
- Fetch opportunities
- Delete opportunity

---

# 8.2 Chrome Extension Receiver

The API MUST:

- Accept JSON payloads
- Validate schema
- Parse fields safely
- Reject malformed requests

---

# 8.3 AI Parsing Endpoint

Purpose:

Convert raw job descriptions into structured objects.

### Input

Raw text

### Output

```json
{
  "roleTitle": "",
  "skills": [],
  "salary": "",
  "experience": "",
  "matchScore": 0
}
```

---

# 9. Docker Rules

---

# 9.1 Dockerfile Rules

Must use:

- Multi-stage builds
- Alpine images
- Production-only runtime layer

---

# 9.2 Docker Compose Rules

Must support:

- SQLite persistence
- Resume storage persistence
- Environment variables
- Easy rebuilds

---

# 9.3 Persistence Rules

Use Docker volumes:

```txt
prepops-db
prepops-storage
```

---

# 10. Chrome Extension Rules

---

# 10.1 Purpose

The extension MUST minimize friction during job discovery.

---

# 10.2 Extension Features

### Mandatory Features

- One-click save
- Extract page data
- Send payload to local API
- Success/failure notifications

---

# 10.3 Extension File Structure

```txt
manifest.json
background.ts
content.ts
popup.html
popup.ts
```

---

# 10.4 Security Rules

- Restrict permissions strictly
- Avoid unnecessary host permissions
- Sanitize extracted text

---

# 11. AI Automation Rules

---

# 11.1 Job Parsing

AI should extract:

- Role title
- Skills
- Seniority
- Salary
- Responsibilities

---

# 11.2 Resume Matching

Compare:

- ResumeSnapshot skills
- Job requirements

Generate:

- Match score
- Missing technologies
- Suggested prep tasks

---

# 11.3 AI Output Rules

Always:

- Validate schema
- Reject malformed JSON
- Log parsing failures

---

# 12. Analytics Rules

The dashboard MUST compute:

---

## Funnel Metrics

Track progression through:

```txt
Saved → Applied → OA → Interview → Offer
```

---

## Conversion Metrics

Calculate:

- Application-to-interview %
- OA-to-interview %
- Interview-to-offer %

---

## Stale Application Detection

Highlight applications inactive for:

```txt
10+ days
```

---

# 13. Markdown Workspace Rules

---

# 13.1 Features

Support:

- Markdown editing
- Live preview
- Autosave
- Syntax highlighting

---

# 13.2 Future Features

Potential additions:

- Mermaid diagrams
- Code blocks
- Image embedding
- System design sketches

---

# 14. Security & Privacy Rules

---

# 14.1 Privacy Rules

The system MUST:

- Store everything locally
- Avoid telemetry
- Avoid analytics tracking
- Avoid cloud sync by default

---

# 14.2 API Security

Validate:

- Inputs
- File uploads
- JSON schemas

---

# 14.3 Resume Security

- Store locally only
- Never expose public URLs
- Validate file types

---

# 15. Performance Rules

---

# 15.1 Frontend Rules

- Avoid unnecessary re-renders
- Use virtualization for large lists
- Lazy load heavy components

---

# 15.2 Backend Rules

- Minimize blocking operations
- Use streaming where possible
- Keep APIs lightweight

---

# 15.3 Database Rules

- Avoid unnecessary joins
- Use indexes for dashboard queries
- Batch expensive operations

---

# 16. Development Roadmap

---

# Phase 1 — MVP

Build:

- Docker setup
- Prisma schema
- SQLite integration
- Opportunity CRUD
- Kanban board
- Chrome extension ingestion

---

# Phase 2 — AI Features

Build:

- Job description parser
- Resume matching
- AI prep suggestions
- Match scoring

---

# Phase 3 — Preparation System

Build:

- Markdown editor
- Interview archive
- Company preparation workspaces

---

# Phase 4 — Advanced Productivity

Build:

- Analytics dashboards
- Streak tracking
- Preparation timers
- Offer probability scoring

---

# 17. Build Order (Critical)

The system MUST be built in this exact order.

---

# Step 1 — Initialize Project

Tasks:

- Create Next.js app
- Setup TypeScript
- Setup Tailwind
- Setup ESLint/Prettier

---

# Step 2 — Setup Docker

Tasks:

- Create Dockerfile
- Create docker-compose.yml
- Configure volumes
- Verify local startup

---

# Step 3 — Setup Prisma + SQLite

Tasks:

- Create schema
- Generate Prisma client
- Run migrations
- Seed sample data

---

# Step 4 — Build Core APIs

Build:

- CRUD APIs
- Validation schemas
- Error handling

---

# Step 5 — Build Dashboard UI

Build:

- Layout
- Sidebar
- Metrics
- Kanban board

---

# Step 6 — Build Opportunity Workspace

Build:

- Notes
- Tasks
- Timeline
- Markdown support

---

# Step 7 — Build Chrome Extension

Build:

- Manifest
- Content extraction
- API communication

---

# Step 8 — Integrate AI

Build:

- Parsing endpoints
- Match scoring
- Gap analysis

---

# Step 9 — Polish UX

Improve:

- Animations
- Loading states
- Keyboard shortcuts
- Accessibility

---

# 18. Final Vision

PrepOps should feel like:

- A developer operating system
- A tactical interview war room
- A private engineering productivity suite

The experience must remain:

- Fast
- Minimal
- Local-first
- AI-assisted
- Engineer-focused

The product should never feel bloated.

Every feature added must improve:

- Speed
- Clarity
- Preparation efficiency
- Decision-making

---

# ADDITIONAL FEATURE — Intelligent Web Scraper & Job Analyzer

---

# 19. Intelligent Web Scraper System

PrepOps MUST include a built-in intelligent web scraping engine that automatically extracts structured job information from job posting URLs.

This feature is critical for reducing manual effort during the application process and improving decision-making before applying.

The scraper should work for:

- Chrome Extension captured jobs
- Manually pasted job URLs
- Company career portals
- LinkedIn jobs
- Wellfound
- Greenhouse
- Lever
- Workday
- Other modern ATS systems

---

# 19.1 Core Purpose

The scraper system should help answer:

```txt
Should I apply to this job or not?
```

by automatically extracting and analyzing:

- Role expectations
- Required skills
- Experience requirements
- Salary details
- Responsibilities
- Tech stack
- Seniority level
- Work model
- Qualification requirements
- Hidden complexity indicators

---

# 19.2 Primary Workflow

---

## Workflow A — Chrome Extension Auto Scrape

### Flow

1. User opens a job page
2. User clicks:
   ```txt
   Save to PrepOps
   ```
3. Extension sends:
    - URL
    - Raw HTML
    - Visible page text
4. PrepOps backend processes content
5. Scraper extracts structured fields
6. AI analyzer scores opportunity
7. Dashboard displays enriched job card

---

## Workflow B — Manual URL Import

### Flow

1. User pastes job URL into dashboard
2. Backend fetches webpage
3. Scraper extracts data
4. AI parser structures information
5. Opportunity gets auto-created

---

# 19.3 Scraper System Architecture

The scraping system should use a multi-stage pipeline.

---

# Stage 1 — Raw Content Fetching

Purpose:

Retrieve webpage content.

### Recommended Tools

Use:

- Playwright
- Cheerio
- JSDOM

---

## Rules

### Use Playwright when:

- Page is dynamically rendered
- Site requires JavaScript execution
- Content loads after hydration

### Use Cheerio when:

- HTML is static
- Fast extraction is sufficient

---

# Stage 2 — Content Cleaning

Purpose:

Remove unnecessary page noise.

### Remove:

- Navigation bars
- Footer links
- Ads
- Tracking scripts
- Recommendations
- Related jobs
- Cookie banners

---

# Stage 3 — Structured Extraction

The scraper MUST extract:

---

## Core Job Information

### Mandatory Fields

- Company Name
- Role Title
- Job URL
- Job Description

---

## Additional Extracted Fields

### Compensation

- Salary range
- Compensation currency
- Bonus info if present

### Role Metadata

- Employment type
- Remote/hybrid/on-site
- Experience level
- Team/domain

### Qualification Information

- Required years of experience
- Education requirements
- Mandatory technologies
- Preferred technologies

### Responsibilities

- Main responsibilities
- Day-to-day expectations

### Technical Stack

Extract technologies such as:

- Java
- Spring Boot
- React
- Kubernetes
- AWS
- Kafka
- Redis
- PostgreSQL
- Docker

---

# 19.4 AI Job Analysis Engine

After scraping, the AI engine should evaluate the opportunity.

---

# 19.4.1 AI Evaluation Goals

The AI should determine:

- Whether the role matches the user's profile
- Whether preparation time is reasonable
- Whether the tech stack aligns with career goals
- Whether the opportunity is worth applying for

---

# 19.4.2 AI Decision Metrics

The AI should generate:

---

## Match Score

Range:

```txt
0 - 100
```

### Scoring Factors

- Skill overlap
- Experience match
- Resume alignment
- Role seniority
- Domain familiarity

---

## Skill Gap Analysis

Identify:

- Missing technologies
- Weak areas
- Concepts requiring revision

Example:

```txt
Missing:
- Kubernetes
- Kafka Streams
- Distributed caching
```

---

## Preparation Difficulty

Classify:

```txt
LOW
MEDIUM
HIGH
```

Based on:

- Number of missing skills
- Interview complexity
- Seniority expectations

---

## Application Recommendation

The AI should produce one of:

```txt
APPLY_NOW
APPLY_AFTER_PREP
SKIP
```

---

# 19.4.3 AI Explanation Engine

The system should explain WHY the recommendation was generated.

Example:

```txt
Recommendation: APPLY_AFTER_PREP

Reason:
Strong Java backend alignment, but role heavily expects
Kubernetes production experience and distributed systems knowledge.
Estimated preparation effort: 2 weeks.
```

---

# 19.5 Database Schema Updates

The Opportunity model should be expanded.

---

## New Fields

```prisma
scrapedRawText      String?
scrapedHtml         String?

employmentType      String?
workModel           String?
experienceLevel     String?

requiredSkills      String?
preferredSkills     String?

responsibilities    String?
qualifications      String?

applicationDecision String?
prepDifficulty      String?

aiRecommendationReason String?
```

---

# 19.6 Scraper API Design

---

# Endpoint

```txt
/api/scrape-job
```

---

# Request Payload

```json
{
  "url": "https://company.com/job/123"
}
```

---

# Response Example

```json
{
  "companyName": "Example Corp",
  "roleTitle": "Backend Engineer",

  "salaryRange": "15-22 LPA",

  "experienceLevel": "2-4 Years",

  "requiredSkills": [
    "Java",
    "Spring Boot",
    "Kafka",
    "Redis"
  ],

  "matchScore": 82,

  "applicationDecision": "APPLY_AFTER_PREP",

  "prepDifficulty": "MEDIUM"
}
```

---

# 19.7 Frontend Integration Rules

The dashboard MUST display scraper insights prominently.

---

# Job Analysis Card

Each opportunity card should show:

- Match score
- Prep difficulty
- Missing skills
- AI recommendation
- Salary range
- Experience expectations

---

# Visual Indicators

---

## Green Glow

Use for:

```txt
APPLY_NOW
```

---

## Amber Glow

Use for:

```txt
APPLY_AFTER_PREP
```

---

## Red Glow

Use for:

```txt
SKIP
```

---

# 19.8 Opportunity Decision Dashboard

The system should include a dedicated decision section.

---

# Purpose

Help users prioritize applications intelligently.

---

# Features

### Filters

Filter jobs by:

- Match score
- Salary
- Remote support
- Tech stack
- Preparation difficulty

---

### Smart Sorting

Sort by:

- Highest ROI opportunity
- Fastest preparation path
- Strongest resume match
- Highest salary

---

# 19.9 Scraping Safety Rules

---

# IMPORTANT

The scraper MUST:

- Respect robots.txt where appropriate
- Avoid aggressive crawling
- Process only user-provided URLs
- Never mass scrape platforms
- Avoid parallel abuse patterns

---

# Rate Limiting Rules

The system MUST:

- Queue scraping jobs
- Avoid hammering websites
- Use retry backoff

---

# 19.10 Future Enhancements

---

# Planned Improvements

---

## Resume Tailoring

Generate:

- Resume suggestions
- Keyword optimization
- Missing ATS keywords

---

## Company Intelligence

Extract:

- Company size
- Funding stage
- Interview reviews
- Tech culture indicators

---

## Interview Prediction

Predict likely interview rounds:

```txt
- DSA Heavy
- System Design
- Machine Coding
- Backend Deep Dive
- Behavioral Focus
```

---

## Learning Path Generator

Automatically generate preparation roadmaps.

Example:

```txt
1. Revise Spring Boot
2. Learn Kafka basics
3. Practice Redis caching
4. Review distributed systems fundamentals
```

---

# 19.11 Build Order for Scraper System

The scraper system MUST be implemented in this order.

---

# Step 1 — URL Submission UI

Build:

- Paste URL modal
- Manual import flow

---

# Step 2 — Backend Scraper Endpoint

Build:

```txt
/api/scrape-job
```

---

# Step 3 — HTML Extraction Layer

Integrate:

- Playwright
- Cheerio

---

# Step 4 — Content Cleaning Engine

Build:

- Boilerplate removal
- Text normalization
- Structured extraction

---

# Step 5 — AI Parsing Layer

Generate:

- Structured JSON
- Match scores
- Recommendations

---

# Step 6 — Dashboard Integration

Display:

- AI recommendations
- Match indicators
- Missing skills
- Salary insights

---

# Step 7 — Optimization

Improve:

- Scraping speed
- Retry logic
- Error handling
- ATS compatibility

---

# 19.12 Final Vision of Scraper System

The web scraper should transform PrepOps from:

```txt
A simple job tracker
```

into:

```txt
An intelligent career decision engine
```

The goal is not only to save jobs.

The goal is to help the user:

- Decide faster
- Prepare smarter
- Avoid low-value applications
- Focus on high-probability opportunities
- Understand skill gaps instantly

The scraper + AI analysis system should feel like:

```txt
A personal AI career strategist
```

inside a fully local-first engineering productivity platform.

---