<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/189dB4CRxdzgJ8d4fatNueagi33JhDlyd

## Run Locally

**Prerequisites:** Node.js, Git Bash (for database setup commands)

### Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up the database (SQLite + Prisma):**
   ```bash
   npm run setup:db
   ```
   This will:
   - Install Prisma client and CLI
   - Generate the Prisma client
   - Create SQLite database at `prisma/dev.db`
   - Run initial migrations

3. **Set the `GEMINI_API_KEY` in `.env.local`:**
   ```
   GEMINI_API_KEY=your_real_gemini_api_key_here
   DATABASE_URL="file:./prisma/dev.db"
   ```

4. **Start both backend and frontend:**
   ```bash
   npm run dev:all
   ```

5. **Open your browser:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000

### Backend Architecture

- **Express API** (port 4000): Handles all Gemini API calls server-side
- **SQLite Database**: Persists all generated verbetes with versioning
- **Image Storage**: Saves generated images to `server/uploads/` with URLs in DB
- **Caching**: Checks DB before calling Gemini API (reduces API calls and costs)
- **Revisions**: Tracks edits with timestamps and editor info

### API Endpoints

**Content Generation (Gemini Proxy)**
- `POST /api/gemini/content` → `{ topic: string }` → `{ text, highlights, relatedTopics, source, generatedAt }`
- `POST /api/gemini/image` → `{ topic: string }` → `{ imageBase64, imageUrl, mime, source, generatedAt }`

**Topic Management (CRUD)**
- `GET /api/topics` → List all topics (with pagination, search)
- `GET /api/topics/:slug` → Get specific topic with revisions
- `POST /api/topics` → Create new topic (Requires Auth `Authorization: Bearer <token>`)
- `PUT /api/topics/:slug` → Edit existing topic (Requires Auth)

**Authentication**
- `POST /api/auth/login` → Login (Returns JWT)
- `POST /api/auth/register` → Register new user

> ℹ️ **Documentation**: See [SYSTEM_DOCS.md](./SYSTEM_DOCS.md) for detailed architecture and authentication flow.

### Optional Scripts

- `npm run dev` — Start only frontend (Vite on port 3000)
- `npm run dev:server` — Start only backend (Express on port 4000)
- `npm run dev:all` — Start both servers concurrently (recommended)

### Notes

- If `GEMINI_API_KEY` is not set, the server runs in **mock mode** (returns structured mock responses)
- Do NOT commit `.env.local` to version control (already in `.gitignore`)
- Database file `prisma/dev.db` is not committed
- Images are stored in `server/uploads/` which is also ignored

### Testing

You can test the backend endpoints manually:
```bash
# Using PowerShell
Invoke-RestMethod -Uri http://localhost:4000/api/gemini/content -Method Post `
  -Body (@{ topic = 'Kanimambo' } | ConvertTo-Json) -ContentType 'application/json'

# Or using curl
curl -X POST http://localhost:4000/api/gemini/content \
  -H "Content-Type: application/json" \
  -d "{\"topic\":\"Kanimambo\"}"
```