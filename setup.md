# PrepOps Setup Guide

This guide helps you set up **PrepOps** from scratch on your machine.

---

## 1. Prerequisites

Before starting, install the following:

- **Node.js**: `22.x` or later
- **npm**: `10.x` or later
- **Docker Desktop**: Required if running inside containers
- **Git**: To manage dependencies
- **Google Chrome**: Recommended for extension testing

---

## 2. Clone and Enter Project

```bash
git clone <your-repo-url>
cd PrepOps
```

Verify you are in the correct directory:

```bash
ls -la
```

You should see files like `package.json`, `prisma/`, `app/`, `docker-compose.yml`, and `setup.md`.

---

## 3. Install Dependencies

```bash
npm install
```

This installs all packages (Next.js, Prisma, Tailwind CSS v4, Framer Motion, Playwright, Cheerio, etc.) and automatically runs the `postinstall` script to generate the Prisma database client.

---

## 4. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Open `.env` in your editor and configure the variables:

```env
DATABASE_URL="file:./prisma/dev.db"
AI_ENABLED="true"
AI_PROVIDER="gemini"
GEMINI_API_KEY="your-gemini-api-key-here"
GEMINI_MODEL="gemini-2.0-flash"
REFERRAL_TRACKING_ENABLED="true"
```

---

## 🔑 How to Get a Gemini API Key

PrepOps uses the Google Gemini API to analyze job descriptions, parse resumes, match skills, and draft referral outreach messages.

1. Go to **[Google AI Studio](https://aistudio.google.com/)**.
2. Sign in using your Google Account.
3. Click the blue **"Get API key"** button on the left sidebar.
4. Click **"Create API key"** (you can link it to an existing Google Cloud project or auto-generate a new one).
5. Copy the generated key (starts with `AIzaSy...`).
6. Paste the key into your `.env` file under `GEMINI_API_KEY="..."`.
7. Configure `GEMINI_MODEL="gemini-2.0-flash"` (or any other free tier model, e.g., `gemini-1.5-flash`).

---

## 5. Database Setup (SQLite + Prisma)

Generate the local SQLite database, apply migrations, and seed initial mock opportunities:

```bash
npx prisma migrate dev
```

### Explore Database
To visually inspect the database tables and records, run Prisma Studio:

```bash
npx prisma studio
```

Open `http://localhost:5555` in your browser to explore the database.

---

## 6. Run the Application Locally

Start the development server with hot-reloading:

```bash
npm run dev
```

Open the application:
- URL: **`http://localhost:3000`**

---

## 7. Docker Production Stack

To run the entire application stack (Next.js server + Prisma DB + local volume storage) inside Docker:

```bash
docker-compose up --build
```

- App URL: `http://localhost:3000`
- Volumes:
  - `prepops-db` maps the SQLite database file.
  - `prepops-storage` maps uploaded resumes.

To stop the services:

```bash
docker-compose down
```

---

## 8. Chrome Extension Setup

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle **Developer mode** on in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `extension/` folder inside the PrepOps root directory.
5. Pin the extension. When on a job page, click the extension icon and select **"Save To PrepOps"** to capture and ingest the job description instantly.

---

## 9. Quality Checks & Verification

Verify that your changes compile and pass code quality standardizations:

- **Linter Checks**: Runs ESLint.
  ```bash
  npm run lint
  ```
- **Type Checks**: Verifies TypeScript compiles with no errors.
  ```bash
  npx tsc --noEmit
  ```
- **Production Compilation**: Tests building Next.js webpack artifacts.
  ```bash
  npm run build
  ```

---

## 10. Fresh Database Reset

If you need to completely wipe the database and start fresh with default seed data:

```bash
rm -f prisma/dev.db
npx prisma migrate dev
```
