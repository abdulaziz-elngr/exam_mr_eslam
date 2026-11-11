"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Q = { id: number; position: number; type: "mcq" | "essay"; section: string | null; passage: string | null; prompt: string; options: string[] | null; points: number };
type Started = { attemptId: string; title: string; endsAt: string; serverNow: number; questions: Q[] };
type Result = { score: number; total: number; hasEssay: boolean };
type Answers = Record<string, number | string>;

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${h ? h + ":" : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(x).padStart(2, "0")}`;
};

export default function ExamApp() {
  const [stage, setStage] = useState<"login" | "exam" | "done">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exam, setExam] = useState<Started | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [flags, setFlags] = useState<Set<number>>(new Set());
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const offset = useRef(0);
  const tabs = useRef(0);
  const sent = useRef(false);

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const r = await fetch("/api/exam/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Something went wrong.");
      offset.current = d.serverNow - Date.now();
      const saved = localStorage.getItem("sf:" + d.attemptId);
      if (saved) { const s = JSON.parse(saved); setAnswers(s.answers ?? {}); setFlags(new Set(s.flags ?? [])); tabs.current = s.tabs ?? 0; }
      setExam(d); setStage("exam");
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const submit = useCallback(async () => {
    if (!exam || sent.current) return;
    sent.current = true; setSubmitting(true); setConfirm(false);
    try {
      const r = await fetch("/api/exam/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId: exam.attemptId, answers, tabSwitches: tabs.current }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      localStorage.removeItem("sf:" + exam.attemptId);
      setResult(d); setStage("done");
    } catch { sent.current = false; setError("Could not submit. Check your connection and try again."); }
    finally { setSubmitting(false); }
  }, [exam, answers]);

  // persist progress
  useEffect(() => {
    if (exam && stage === "exam") localStorage.setItem("sf:" + exam.attemptId, JSON.stringify({ answers, flags: [...flags], tabs: tabs.current }));
  }, [answers, flags, exam, stage]);

  // timer
  useEffect(() => {
    if (!exam || stage !== "exam") return;
    const end = new Date(exam.endsAt).getTime();
    const tick = () => { const l = end - (Date.now() + offset.current); setLeft(l); if (l <= 0) submit(); };
    tick(); const t = setInterval(tick, 500); return () => clearInterval(t);
  }, [exam, stage, submit]);

  // tab-switch tracking + leave warning
  useEffect(() => {
    if (stage !== "exam") return;
    const vis = () => { if (document.hidden) tabs.current += 1; };
    const bye = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    document.addEventListener("visibilitychange", vis); window.addEventListener("beforeunload", bye);
    return () => { document.removeEventListener("visibilitychange", vis); window.removeEventListener("beforeunload", bye); };
  }, [stage]);

  const qs = exam?.questions ?? [];
  const q = qs[idx];
  const answered = useMemo(() => qs.filter((x) => answers[x.id] !== undefined && answers[x.id] !== "").length, [qs, answers]);
  const setAns = (id: number, v: number | string) => setAnswers((a) => ({ ...a, [id]: v }));
  const toggleFlag = (id: number) => setFlags((f) => { const n = new Set(f); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (stage === "login") return (
    <div className="center"><form className="card login" onSubmit={start}>
      <img src="/logo.png" alt="Step Forward English Teacher" />
      <h1>Unit 1 · General Exercises</h1>
      <p className="sub">Enter your details to begin the exam</p>
      <label htmlFor="n">Full name</label>
      <input id="n" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ahmed Mohamed Ali" required />
      <label htmlFor="p">Phone number</label>
      <input id="p" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" required />
      <ul className="rules">
        <li>You have one attempt only.</li>
        <li>The timer starts as soon as you press Start.</li>
        <li>Leaving the tab is recorded and reported to your teacher.</li>
        <li>The exam submits automatically when time is up.</li>
      </ul>
      {error && <div className="err">{error}</div>}
      <button className="btn block" disabled={loading}>{loading ? "Loading…" : "Start Exam"}</button>
    </form></div>
  );

  if (stage === "done" && result) {
    const pct = result.total ? Math.round((result.score / result.total) * 100) : 0;
    return (
      <div className="center"><div className="card login" style={{ textAlign: "center" }}>
        <img src="/logo.png" alt="Step Forward" />
        <h1>Exam submitted ✔</h1>
        <div className="ring" style={{ background: `conic-gradient(var(--orange) ${pct * 3.6}deg, var(--line) 0)` }}><div>{pct}%</div></div>
        <div className="score">{result.score}<small> / {result.total}</small></div>
        <p className="sub">{result.hasEssay ? "Multiple-choice score shown. Written answers will be marked by your teacher." : pct >= 85 ? "Excellent work! Keep stepping forward." : pct >= 50 ? "Good effort — review the weak points and try to improve." : "Don't worry — revise the unit and talk to your teacher."}</p>
      </div></div>
    );
  }

  if (!exam || !q) return null;
  const low = left < 5 * 60_000;
  const prevSection = idx > 0 ? qs[idx - 1].section : null;

  return (
    <div onCopy={(e) => e.preventDefault()}>
      <div className="top"><div className="in">
        <img src="/logo.png" alt="Step Forward" /><div className="t">{exam.title}</div>
        <div className={"timer" + (low ? " low" : "")}>⏱ {fmt(left)}</div>
      </div><div className="bar"><i style={{ width: `${(answered / qs.length) * 100}%` }} /></div></div>

      <div className="wrap grid">
        <div className="card q">
          {q.section && (idx === 0 || q.section !== prevSection) && <span className="sec">{q.section}</span>}
          {q.passage && <div className="passage">{q.passage}</div>}
          <div className="qn">Question {idx + 1} of {qs.length}</div>
          <p className="qp">{q.prompt}</p>
          {q.type === "mcq" ? q.options?.map((o, i) => (
            <button key={i} type="button" className={"opt" + (answers[q.id] === i ? " sel" : "")} onClick={() => setAns(q.id, i)}>
              <b>{"ABCD"[i]}</b><span>{o}</span>
            </button>
          )) : (
            <textarea rows={6} value={(answers[q.id] as string) ?? ""} onChange={(e) => setAns(q.id, e.target.value)} placeholder="Write your answer here…" />
          )}
          <div className="foot">
            <button className="btn ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>← Previous</button>
            <button className="btn ghost" onClick={() => toggleFlag(q.id)}>{flags.has(q.id) ? "⚑ Unflag" : "⚐ Flag for review"}</button>
            {idx < qs.length - 1
              ? <button className="btn navy" onClick={() => setIdx(idx + 1)}>Next →</button>
              : <button className="btn" onClick={() => setConfirm(true)}>Finish</button>}
          </div>
        </div>

        <aside className="card nav">
          <h4>Questions · {answered}/{qs.length} answered</h4>
          <div className="pills">
            {qs.map((x, i) => (
              <button key={x.id} className={"pill" + (answers[x.id] !== undefined && answers[x.id] !== "" ? " ans" : "") + (i === idx ? " cur" : "") + (flags.has(x.id) ? " flag" : "")} onClick={() => setIdx(i)}>{i + 1}</button>
            ))}
          </div>
          <div className="legend">Filled = answered · Orange dot = flagged</div>
          <button className="btn block" onClick={() => setConfirm(true)}>Submit Exam</button>
        </aside>
      </div>

      {confirm && (
        <div className="modal"><div className="card">
          <h1>Submit your exam?</h1>
          <p className="sub">{answered === qs.length ? "You answered every question." : <span className="warn">{qs.length - answered} question(s) unanswered.</span>}{flags.size > 0 && ` ${flags.size} flagged.`}</p>
          {error && <div className="err">{error}</div>}
          <div className="foot" style={{ justifyContent: "center" }}>
            <button className="btn ghost" onClick={() => setConfirm(false)}>Keep working</button>
            <button className="btn" disabled={submitting} onClick={submit}>{submitting ? "Submitting…" : "Yes, submit"}</button>
          </div>
        </div></div>
      )}
    </div>
  );
}
