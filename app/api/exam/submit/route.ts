import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const attemptId = String(body.attemptId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) return NextResponse.json({ error: "Invalid attempt." }, { status: 400 });
  const answers: Record<string, number | string> = typeof body.answers === "object" && body.answers ? body.answers : {};
  const tabSwitches = Math.min(Math.max(parseInt(body.tabSwitches) || 0, 0), 999);

  const sql = db();
  const [attempt] = await sql`select id, exam_id, submitted_at, score, total from attempts where id = ${attemptId}`;
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });

  const questions = await sql`select id, type, correct, points from questions where exam_id = ${attempt.exam_id}`;
  const hasEssay = questions.some((q) => q.type === "essay");
  if (attempt.submitted_at) {
    return NextResponse.json({ score: attempt.score, total: attempt.total, hasEssay });
  }

  let score = 0, total = 0;
  const clean: Record<string, number | string> = {};
  for (const q of questions) {
    const a = answers[String(q.id)];
    if (q.type === "mcq") {
      total += q.points;
      if (typeof a === "number") {
        clean[q.id] = a;
        if (a === q.correct) score += q.points;
      }
    } else if (typeof a === "string" && a.trim()) {
      clean[q.id] = a.slice(0, 3000);
    }
  }

  await sql`update attempts set submitted_at = now(), score = ${score}, total = ${total},
            answers = ${JSON.stringify(clean)}::jsonb, tab_switches = ${tabSwitches} where id = ${attemptId}`;
  return NextResponse.json({ score, total, hasEssay });
}
