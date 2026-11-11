import { neon } from "@neondatabase/serverless";
import fs from "node:fs";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing (.env)");
const sql = neon(process.env.DATABASE_URL);

await sql`create table if not exists exams (
  id serial primary key,
  slug text unique not null,
  title text not null,
  duration_minutes int not null default 45,
  is_active boolean not null default true
)`;
await sql`create table if not exists questions (
  id serial primary key,
  exam_id int not null references exams(id) on delete cascade,
  position int not null,
  type text not null check (type in ('mcq','essay')),
  section text,
  passage text,
  prompt text not null,
  options jsonb,
  correct int,
  points int not null default 1,
  unique (exam_id, position)
)`;
await sql`create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id int not null references exams(id) on delete cascade,
  student_name text not null,
  student_phone text not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score int,
  total int,
  answers jsonb,
  tab_switches int not null default 0,
  unique (exam_id, student_phone)
)`;

const data = JSON.parse(fs.readFileSync(new URL("../data/exam.json", import.meta.url), "utf8"));
const [exam] = await sql`
  insert into exams (slug, title, duration_minutes) values (${data.slug}, ${data.title}, ${data.durationMinutes})
  on conflict (slug) do update set title = excluded.title, duration_minutes = excluded.duration_minutes
  returning id`;

for (const q of data.questions) {
  await sql`
    insert into questions (exam_id, position, type, section, passage, prompt, options, correct, points)
    values (${exam.id}, ${q.position}, ${q.type}, ${q.section ?? null}, ${q.passage ?? null}, ${q.prompt},
            ${q.options ? JSON.stringify(q.options) : null}::jsonb, ${q.correct ?? null}, ${q.points ?? 1})
    on conflict (exam_id, position) do update set
      type = excluded.type, section = excluded.section, passage = excluded.passage, prompt = excluded.prompt,
      options = excluded.options, correct = excluded.correct, points = excluded.points`;
}
console.log(`✔ Database ready — exam "${data.title}" with ${data.questions.length} questions`);
