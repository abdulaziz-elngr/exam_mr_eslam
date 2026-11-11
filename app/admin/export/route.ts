import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const rows = await db()`select student_name, student_code, score, total, submitted_at, tab_switches, tamper from online_exam.results order by submitted_at desc nulls last`;
  const csv = ["Name,Code,Score,Total,Percent,Submitted,Tab switches,Tamper",
    ...rows.map((r) => [r.student_name, r.student_code, r.score, r.total, r.total ? Math.round((r.score / r.total) * 100) : "", r.submitted_at ?? "", r.tab_switches, r.tamper].map(esc).join(","))].join("\n");
  return new Response("\ufeff" + csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="results.csv"' } });
}
