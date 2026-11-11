import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().replace(/\s+/g, " ");
  const phone = String(body.phone ?? "").replace(/\D/g, "");
  if (name.length < 3 || name.length > 80) return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  if (phone.length < 10 || phone.length > 15) return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });

  const sql = db();
  const [exam] = await sql`select id, title, duration_minutes from exams where is_active order by id desc limit 1`;
  if (!exam) return NextResponse.json({ error: "No active exam right now." }, { status: 404 });

  let [attempt] = await sql`select id, started_at, submitted_at from attempts where exam_id = ${exam.id} and student_phone = ${phone}`;
  if (attempt?.submitted_at) return NextResponse.json({ error: "This phone number has already submitted the exam." }, { status: 409 });
  if (!attempt) {
    [attempt] = await sql`insert into attempts (exam_id, student_name, student_phone) values (${exam.id}, ${name}, ${phone}) returning id, started_at`;
  }

  const questions = await sql`
    select id, position, type, section, passage, prompt, options, points
    from questions where exam_id = ${exam.id} order by position`;

  const endsAt = new Date(new Date(attempt.started_at).getTime() + exam.duration_minutes * 60_000).toISOString();
  return NextResponse.json({ attemptId: attempt.id, title: exam.title, endsAt, serverNow: Date.now(), questions });
}
