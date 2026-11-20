import quizzes from "./quizzes.json" with { type: "json" };
import teacherPin from "./teacher-pin.json" with { type: "json" };

const origins = new Set([
  "https://ubttarih.kz", "https://www.ubttarih.kz", "https://ubttarih.vercel.app",
]);
const rest = Deno.env.get("SUPABASE_URL") + "/rest/v1/";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const headers = {apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json"};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async req => {
  const origin = req.headers.get("origin") || "";
  const cors = {
    "Access-Control-Allow-Origin": origins.has(origin) ? origin : "",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
  const reply = (body: unknown, status = 200) => Response.json(body, {status, headers: cors});
  if (!origins.has(origin)) return reply({error: "Origin"}, 403);
  if (req.method === "OPTIONS") return new Response(null, {status: 204, headers: cors});
  if (req.method !== "POST") return reply({error: "Method"}, 405);
  try {
    const raw = await req.text();
    if (raw.length > 12000) return reply({error: "Request too large"}, 413);
    const input = JSON.parse(raw);
    if (input.action === "save") {
      const quiz = Object.hasOwn(quizzes, input.quizId) ? quizzes[input.quizId as keyof typeof quizzes] : null;
      const student = typeof input.student === "string" ? input.student.trim().replace(/\s+/g, " ") : "";
      if (!quiz || !uuid.test(input.id) || student.length < 3 || student.length > 100 ||
          !student.includes(" ") || !Array.isArray(input.answers) || input.answers.length !== quiz.keys.length ||
          input.answers.some((answer: unknown) => answer !== null && (typeof answer !== "string" || answer.length > 5))) {
        return reply({error: "Invalid result"}, 400);
      }
      const total = quiz.keys.filter(Boolean).length;
      const correct = quiz.keys.filter((key, i) => key && key === input.answers[i]).length;
      const saved = await fetch(rest + "ubt_results?on_conflict=id", {
        method: "POST",
        headers: {...headers, Prefer: "resolution=ignore-duplicates"},
        body: JSON.stringify({id: input.id, student, title: quiz.title, total, correct}),
      });
      if (!saved.ok) throw new Error("Could not save result");
      return reply({correct, total});
    }
    if (input.action === "teacher") {
      const allowed = await fetch(rest + "rpc/ubt_check_pin", {
        method: "POST", headers,
        body: JSON.stringify({is_correct: typeof input.pin === "string" && input.pin === teacherPin}),
      });
      if (!allowed.ok) throw new Error("PIN check failed");
      if (!(await allowed.json())) return reply({error: "PIN қате немесе әрекет саны шектелді."}, 403);
      const cutoff = new Date();
      cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
      const rows = [];
      for (let offset = 0; ; offset += 500) {
        const response = await fetch(rest + "ubt_results?select=student,title,correct,total,created_at&order=created_at.desc,id.desc&created_at=gt." +
          encodeURIComponent(cutoff.toISOString()) + "&offset=" + offset + "&limit=500", {headers});
        if (!response.ok) throw new Error("Could not read results");
        const page = await response.json();
        rows.push(...page);
        if (page.length < 500) break;
      }
      return reply({rows});
    }
    return reply({error: "Unknown action"}, 400);
  } catch {
    return reply({error: "Серверге қосылу мүмкін болмады. Қайталап көріңіз."}, 500);
  }
});
