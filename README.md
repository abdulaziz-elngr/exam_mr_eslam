# Step Forward · Online Exam

Next.js 15 + Neon Postgres + Vercel.

## 1) Neon
Uses the existing TecnoID database. Everything lives in a separate schema `online_exam` (tables: exams, questions, results), so Prisma/TecnoID tables are untouched. Students log in with their `Student.studentCode`; grades are saved in `online_exam.results`.

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

## Update notes
- Run `npm run db:setup` again after updating (adds the `tamper` column; safe to repeat).
- Login accepts `Student.studentCode` or `Student.qrCode` (works with a USB barcode scanner — it types the code and presses Enter).
- Flow: enter/scan code → confirm name → timer starts. One attempt per student (`online_exam.results`, unique per exam + student).
- Answers autosave to the server every few seconds; if a student closes the browser and time runs out, the saved answers are graded on next visit.
