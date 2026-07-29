# Doubt Tutor & Adaptive Roadmap Agent

A MERN + LLM study app: upload a photo or typed problem (DSA/C++/OS/DBMS...),
get a clear worked answer, quiz yourself on the topic, and build a phased
learning roadmap you can regenerate any time. Answers and roadmaps can be
downloaded as Markdown, PDF, or Word so you can study offline.

## Features

- Chat-style doubt solving from a typed question, a photo, or a `.txt` file
- Follow-up prompts, regenerate answer, copy/download as `.md` / `.pdf` / `.docx`
- Practice questions generated per topic, with instant right/wrong feedback
- Multiple roadmaps per user — switch between goals, delete old ones, download
  any roadmap as a document
- Pin/delete past doubts from the sidebar; "New chat" always starts fresh
- Frosted-glass UI with an animated, mouse-reactive ambient background

## Folder structure

```
doubt-tutor-hackathon/
├── backend/
│   ├── src/
│   │   ├── config/db.js              # MongoDB Atlas connection + index sync
│   │   ├── models/                   # User, Problem, Question, Attempt, Roadmap
│   │   ├── services/llmService.js    # answer writing, quiz gen, roadmap gen (Gemini)
│   │   ├── controllers/              # route handlers
│   │   ├── routes/                   # Express routers
│   │   ├── middleware/               # auth, upload, error handling
│   │   └── app.js                    # Express app + route wiring
│   ├── server.js                     # entry point (connects DB, starts server)
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/api.js                # axios client + grouped API calls
    │   ├── context/AuthContext.jsx   # login/register/logout state
    │   ├── components/               # Sidebar, ChatComposer, SolutionView,
    │   │                              # DownloadMenu, AmbientOrb, QuizCard, etc.
    │   ├── utils/exportDoc.js        # Markdown/PDF/Word export
    │   ├── pages/                    # Home, Roadmap, Login
    │   ├── App.jsx                   # routes
    │   └── main.jsx                  # React entry point
    ├── index.html
    ├── tailwind.config.js
    ├── package.json
    └── .env.example
```

## Local setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env`:
- `MONGO_URI` — your MongoDB Atlas connection string
- `JWT_SECRET` — any long random string
- `GEMINI_API_KEY` — from [aistudio.google.com](https://aistudio.google.com/app/apikey)
- `GEMINI_MODEL` — defaults to `gemini-3.1-flash-lite` if unset
- `CLIENT_ORIGIN` — the URL your frontend runs on (for CORS)

```bash
npm run dev
```

Server runs on `http://localhost:5000`. On startup it also reconciles the
`users` collection's indexes with the current schema (`User.syncIndexes()`),
so a stray unique index from an older schema version can't cause duplicate-key
errors on registration.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App runs on `http://localhost:5173`. Set `VITE_API_URL` in `.env` to wherever
your backend is running.

## Deploying

A common free-tier setup: **MongoDB Atlas** (database) + **Render** (backend)
+ **Vercel** (frontend).

### Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

`.env` is already in `.gitignore` — only `.env.example` (no real secrets) gets
committed.

### Backend (Render, Railway, Fly.io, or similar)

1. Create a new Web Service from your GitHub repo, root directory `backend`.
2. Build command: `npm install` · Start command: `npm start` (or `node server.js`
   if there's no `start` script).
3. Add the same environment variables from `backend/.env` in the host's
   dashboard — **never commit `.env` itself**.
4. Set `CLIENT_ORIGIN` to your deployed frontend's URL once you have it (step
   below), so CORS allows it.
5. In MongoDB Atlas, under Network Access, allow the host's outbound IPs (or
   `0.0.0.0/0` for simplicity on a hackathon project).

### Frontend (Vercel or Netlify)

1. Import the same GitHub repo, root directory `frontend`.
2. Build command: `npm run build` · Output directory: `dist`.
3. Add an environment variable `VITE_API_URL` pointing at your deployed
   backend, e.g. `https://your-backend.onrender.com/api`.
4. Deploy, then go back and set the backend's `CLIENT_ORIGIN` to this
   frontend's final URL.

## Demo flow (suggested order)

1. Register/login
2. Upload a photo of a problem (or type one) → see the worked answer
3. Click "Test yourself on this topic" → answer the generated question
4. Go to Roadmap → enter a goal + weeks → see the generated phased plan →
   try "New roadmap" to build a second one for a different goal
5. Try downloading an answer or a roadmap as PDF/Word/Markdown

## Notes

- Image uploads are read into memory and sent straight to the vision LLM as
  base64 — no separate OCR step, no file storage needed.
- `.txt` file uploads are read as plain text and sent the same way typed text
  is.
- All LLM prompts in `llmService.js` force JSON-only output so responses can
  be parsed directly; if a call ever returns malformed JSON, that's the first
  place to add a retry.
