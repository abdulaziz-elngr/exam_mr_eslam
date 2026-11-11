# Step Forward · Online Exam

Next.js 15 + Neon Postgres + Vercel.

## 1) Neon
Create a project at neon.tech → **Connect** → copy the connection string.

## 2) Local
```bash
npm install
cp .env.example .env     # fill DATABASE_URL and ADMIN_PASSWORD
npm run db:setup         # creates tables + loads data/exam.json
npm run dev              # http://localhost:3000   (admin: /admin)
```

## 3) Vercel
Push to GitHub → Import in Vercel → add env vars `DATABASE_URL`, `ADMIN_PASSWORD` → Deploy.

## Editing questions
Edit `data/exam.json`, then run `npm run db:setup` again (updates by question position; do it before students start).
Question types: `mcq` (needs `options` + `correct` index starting at 0) and `essay` (manual marking from /admin).
Reading section example:
```json
{ "position": 21, "type": "essay", "section": "Part 2 · Reading", "passage": "Studies have shown…",
  "prompt": "A fit person can bear fatigue for longer periods. Why?", "points": 2 }
```
Questions that share a passage: repeat the same `passage` text on each.
