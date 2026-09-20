# Shift Radar

Early AI signal desk for engineers. Grok fetches posts from X and repos from GitHub. TypeSafe Jev scores importance — not likes — including under-discussed primitives.

## Run

```bash
npm install
cp .env.example .env
# put an xAI API key in .env
npm run dev
```

Open [http://localhost:8080](http://localhost:8080). Paste a TypeSafe API key in **Settings**, then **Scan**.

## How it ranks

Jev scores each item in parallel: AI signal, novelty, hidden, primitive, closed/open, language, problem, impact on models / coding / usage / career. Low engagement does not count against a signal. Non-English posts are translated after scoring.

Tabs: All, Hidden, Impact, New, Research, Repo, Product, Kin, Dropped.

## Keys

| Key | Where |
| --- | --- |
| TypeSafe | Settings in the app (device only) |
| xAI | `XAI_API_KEY` in `.env` for X search |
