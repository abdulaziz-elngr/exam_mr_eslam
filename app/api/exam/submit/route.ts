import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { grade } from "@/lib/grade";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const attemptId = String(body.attemptId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) return NextResponse.json({ error: "Invalid attempt." }, { status: 400 });
  const clientAnswers = typeof body.answers === "object" && body.answers ? body.answers : {};
  const tabSwitches = Math.min(Math.max(parseInt(body.tabSwitches) || 0, 0), 999);
  const tamper = Math.min(Math.max(parseInt(body.tamper) || 0, 0), 999);

  const sql = db();
  const [a] = await sql`select r.id, r.exam_id, r.submitted_at, r.score, r.total, r.started_at, r.answers, e.duration_minutes
                        from online_exam.results r join online_exam.exams e on e.id = r.exam_id where r.id = ${attemptId}`;
  if (!a) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });

  const questions = await sql`select id, type, correct, points from online_exam.questions where exam_id = ${a.exam_id}`;
  const hasEssay = questions.some((q) => q.type === "essay");
  if (a.submitted_at) return NextResponse.json({ score: a.score, total: a.total, hasEssay });

  // If the client submits well after the deadline, trust only what was autosaved in time
  const late = Date.now() > new Date(a.started_at).getTime() + a.duration_minutes * 60_000 + 60_000;
  const { score, total, clean } = grade(questions as any, late ? (a.answers ?? {}) : clientAnswers);

  await sql`update online_exam.results set submitted_at = now(), score = ${score}, total = ${total},
            answers = ${JSON.stringify(clean)}::jsonb, tab_switches = ${tabSwitches}, tamper = ${tamper}
            where id = ${attemptId} and submitted_at is null`;
  return NextResponse.json({ score, total, hasEssay });
}
