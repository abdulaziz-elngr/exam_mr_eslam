import Link from "next/link";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { login, logout } from "./actions";

export const dynamic = "force-dynamic";

export default async function Admin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await isAdmin())) {
    const { error } = await searchParams;
    return (
      <div className="center"><form className="card login" action={login}>
        <img src="/logo.png" alt="Step Forward" />
        <h1>Teacher Dashboard</h1>
        <p className="sub">Enter the admin password</p>
        <input type="password" name="password" placeholder="Password" required autoFocus />
        {error && <div className="err">Wrong password.</div>}
        <button className="btn block">Sign in</button>
      </form></div>
    );
  }

  const rows = await db()`
    select id, student_name, student_code, score, total, submitted_at, started_at, tab_switches, tamper
    from online_exam.results order by coalesce(submitted_at, started_at) desc`;
  const done = rows.filter((r) => r.submitted_at && r.total);
  const avg = done.length ? Math.round(done.reduce((s, r) => s + (r.score / r.total) * 100, 0) / done.length) : 0;

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src="/logo.png" alt="" style={{ height: 52, mixBlendMode: "multiply" }} />
        <h1 style={{ flex: 1, textAlign: "left" }}>Results</h1>
        <a className="btn navy" href="/admin/export">Export CSV</a>
        <form action={logout}><button className="btn ghost">Sign out</button></form>
      </div>
      <div className="stats">
        <div className="card stat"><b>{rows.length}</b>Students started</div>
        <div className="card stat"><b>{done.length}</b>Submitted</div>
        <div className="card stat"><b>{avg}%</b>Average score</div>
      </div>
      <div className="card" style={{ overflow: "auto" }}>
        <table>
          <thead><tr><th>Student</th><th>Code</th><th>Score</th><th>%</th><th>Submitted</th><th>Tab switches</th><th>Tamper</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.student_name}</td><td>{r.student_code}</td>
                <td>{r.submitted_at ? `${r.score}/${r.total}` : "In progress"}</td>
                <td>{r.submitted_at && r.total ? Math.round((r.score / r.total) * 100) + "%" : "—"}</td>
                <td>{r.submitted_at ? new Date(r.submitted_at).toLocaleString("en-GB", { timeZone: "Africa/Cairo" }) : "—"}</td>
                <td className={r.tab_switches > 2 ? "warn" : ""}>{r.tab_switches}</td>
                <td className={r.tamper > 0 ? "warn" : ""}>{r.tamper}</td>
                <td><Link href={`/admin/attempt/${r.id}`}>View</Link></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8} style={{ textAlign: "center", color: "#6b7a90" }}>No attempts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
