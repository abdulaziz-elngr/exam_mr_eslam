export type GQ = { id: number; type: string; correct: number | null; points: number };

export function grade(questions: GQ[], answers: Record<string, unknown>) {
  let score = 0, total = 0;
  const clean: Record<string, number | string> = {};
  for (const q of questions) {
    const a = answers[String(q.id)];
    if (q.type === "mcq") {
      total += q.points;
      if (typeof a === "number") {
        clean[String(q.id)] = a;
        if (a === q.correct) score += q.points;
      }
    } else if (typeof a === "string" && a.trim()) {
      clean[String(q.id)] = a.slice(0, 3000);
    }
  }
  return { score, total, clean };
}

// Keep only well-formed answers (used for autosave)
export function sanitize(answers: unknown) {
  const out: Record<string, number | string> = {};
  if (answers && typeof answers === "object") {
    for (const [k, v] of Object.entries(answers as Record<string, unknown>)) {
      if (!/^\d+$/.test(k)) continue;
      if (typeof v === "number" && v >= 0 && v < 10) out[k] = v;
      else if (typeof v === "string") out[k] = v.slice(0, 3000);
    }
  }
  return out;
}
