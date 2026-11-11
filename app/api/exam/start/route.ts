import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { grade } from "@/lib/grade";

export const dynamic = "force-dynamic";
const GRACE_MS = 30_000;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim();
  const confirm = body.confirm === true;
  if (!code || code.length > 60) return NextResponse.json({ error: "Please enter or scan your student code." }, { status: 400 });

  const sql = db();
  // Student is matched by student code OR the barcode / QR value on the card
  const [student] = await sql`
    select id, "studentCode", "fullName", status from public."Student"
    where (upper("studentCode") = upper(${code}) or upper("qrCode") = upper(${code})) and "deletedAt" is null limit 1`;
  if (!student) return NextResponse.json({ error: "Student code not found." }, { status: 404 });
  if (student.status !== "ACTIVE") return NextResponse.json({ error: "Your account is not active. Please contact the center." }, { status: 403 });

  const [exam] = await sql`select id, title, duration_minutes from online_exam.exams where is_active order by id desc limit 1`;
  if (!exam) return NextResponse.json({ error: "No active exam right now." }, { status: 404 });

  let [attempt] = await sql`select id, started_at, submitted_at, answers from online_exam.results
                            where exam_id = ${exam.id} and student_id = ${student.id}`;

  if (attempt?.submitted_at) {
    return NextResponse.json({ error: "You have already taken this exam. Only one attempt is allowed." }, { status: 409 });
  }

  // Started before but time is over (e.g. closed the browser): finalize with the last autosaved answers
  if (attempt) {
    const ends = new Date(attempt.started_at).getTime() + exam.duration_minutes * 60_000;
    if (Date.now() > ends + GRACE_MS) {
      const qs = await sql`select id, type, correct, points from online_exam.questions where exam_id = ${exam.id}`;
      const { score, total, clean } = grade(qs as any, attempt.answers ?? {});
      await sql`update online_exam.results set submitted_at = now(), score = ${score}, total = ${total},
                answers = ${JSON.stringify(clean)}::jsonb where id = ${attempt.id} and submitted_at is null`;
      return NextResponse.json({ error: "Your time is over. Your saved answers were submitted automatically." }, { status: 409 });
    }
  }

  // Step 1: only identify the student (no attempt is created, no timer starts)
  if (!confirm) return NextResponse.json({ studentName: student.fullName, resume: !!attempt });

  // Step 2: confirmed -> create the attempt (or resume the running one)
  if (!attempt) {
    [attempt] = await sql`insert into online_exam.results (exam_id, student_id, student_code, student_name)
      values (${exam.id}, ${student.id}, ${student.studentCode}, ${student.fullName}) returning id, started_at, answers`;
  }
  const questions = await sql`
    select id, position, type, section, passage, prompt, options, points
    from online_exam.questions where exam_id = ${exam.id} order by position`;

  const endsAt = new Date(new Date(attempt.started_at).getTime() + exam.duration_minutes * 60_000).toISOString();
  return NextResponse.json({
    studentName: student.fullName, studentCode: student.studentCode, attemptId: attempt.id, title: exam.title,
    endsAt, serverNow: Date.now(), questions, answers: attempt.answers ?? {},
  });
}
