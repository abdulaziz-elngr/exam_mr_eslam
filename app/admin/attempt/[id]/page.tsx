import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Attempt({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/admin");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sql = db();
  const [a] = await sql`select * from attempts where id = ${id}`;
  if (!a) notFound();
  const qs = await sql`select id, position, type, prompt, options, correct from questions where exam_id = ${a.exam_id} order by position`;
  const ans = (a.answers ?? {}) as Record<string, number | string>;

  return (
    <div className="wrap">
      <Link href="/admin">← Back</Link>
      <h1 style={{ textAlign: "left", marginTop: 10 }}>{a.student_name}</h1>
      <p className="sub" style={{ textAlign: "left" }}>{a.student_phone} · Score {a.score ?? "—"}/{a.total ?? "—"} · Tab switches {a.tab_switches}</p>
      {qs.map((q) => {
        const v = ans[q.id];
        const ok = q.type === "mcq" && v === q.correct;
        return (
          <div key={q.id} className="card" style={{ padding: 18, marginBottom: 12 }}>
            <b>{q.position}. {q.prompt}</b>
            {q.type === "mcq" ? (
              <p style={{ margin: "8px 0 0" }}>
                Student: <span style={{ color: ok ? "var(--ok)" : "var(--bad)", fontWeight: 700 }}>{typeof v === "number" ? q.options[v] : "No answer"}</span>
                {!ok && <> · Correct: <b>{q.options[q.correct]}</b></>}
              </p>
            ) : <p style={{ whiteSpace: "pre-wrap", background: "#f7f9fc", padding: 12, borderRadius: 8 }}>{(v as string) || "No answer"}</p>}
          </div>
        );
      })}
    </div>
  );
}
