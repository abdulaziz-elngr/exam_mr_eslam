import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sanitize } from "@/lib/grade";

export const dynamic = "force-dynamic";

// Autosave: keeps the last answers on the server so nothing is lost on refresh / device change
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = String(body.attemptId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid attempt." }, { status: 400 });
  const answers = sanitize(body.answers);
  const tabs = Math.min(Math.max(parseInt(body.tabSwitches) || 0, 0), 999);
  const tamper = Math.min(Math.max(parseInt(body.tamper) || 0, 0), 999);

  await db()`update online_exam.results r set answers = ${JSON.stringify(answers)}::jsonb, tab_switches = ${tabs}, tamper = ${tamper}
    where r.id = ${id} and r.submitted_at is null
      and now() <= r.started_at + (select duration_minutes from online_exam.exams e where e.id = r.exam_id) * interval '1 minute' + interval '60 seconds'`;
  return NextResponse.json({ ok: true });
}
