/**
 * YKS Konu Tahmin API — Cloudflare Workers (D1 SQLite)
 * FastAPI backend'inin birebir karşılığı
 */

export interface Env {
  DB: D1Database;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const VALID_FIELDS = ["SAYISAL", "ESIT_AGIRLIK", "SOZEL"];

const AYT_SUBJECTS: Record<string, string[]> = {
  SAYISAL:      ["Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji"],
  ESIT_AGIRLIK: ["Matematik", "Geometri", "Türk Dili ve Edebiyatı", "Tarih-1", "Coğrafya-1"],
  SOZEL:        ["Türk Dili ve Edebiyatı", "Tarih-1", "Coğrafya-1",
                 "Tarih-2", "Coğrafya-2", "Felsefe Grubu", "Din Kültürü ve Ahlak Bilgisi"],
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

function err(msg: string, status = 400) {
  return json({ detail: msg }, status);
}

// ─── Router ────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url   = new URL(request.url);
    const path  = url.pathname;
    const qs    = url.searchParams;

    // GET /api/health
    if (path === "/api/health")
      return json({ status: "ok", service: "yks-predictor" });

    // GET /api/fields
    if (path === "/api/fields")
      return json({ fields: VALID_FIELDS });

    // GET /api/predictions?field=SAYISAL
    if (path === "/api/predictions") {
      const field = qs.get("field") ?? "";
      if (!VALID_FIELDS.includes(field)) return err(`Geçersiz alan: ${field}`);
      return await getPredictions(env.DB, field);
    }

    // GET /api/predictions/subject?field=SAYISAL&subject=Matematik
    if (path === "/api/predictions/subject") {
      const field   = qs.get("field") ?? "";
      const subject = qs.get("subject") ?? "";
      if (!VALID_FIELDS.includes(field)) return err(`Geçersiz alan: ${field}`);
      return await getSubjectPredictions(env.DB, field, subject);
    }

    // GET /api/topic-detail?session=AYT&field=SAYISAL&subject=Fizik&topic=Manyetizma
    if (path === "/api/topic-detail") {
      const session = qs.get("session") ?? "";
      const field   = qs.get("field")   ?? "";
      const subject = qs.get("subject") ?? "";
      const topic   = qs.get("topic")   ?? "";
      return await getTopicDetail(env.DB, session, field, subject, topic);
    }

    // GET /api/yearly-distribution?session=AYT&field=SAYISAL&subject=Fizik&topic=Manyetizma
    if (path === "/api/yearly-distribution") {
      const session = qs.get("session") ?? "";
      const field   = qs.get("field")   ?? "";
      const subject = qs.get("subject") ?? "";
      const topic   = qs.get("topic")   ?? "";
      return await getYearlyDistribution(env.DB, session, field, subject, topic);
    }

    return err("Endpoint bulunamadı", 404);
  },
};

// ─── Handlers ──────────────────────────────────────────────────────────────

async function getPredictions(db: D1Database, field: string) {
  // TYT: field=ALL  |  AYT: field=<field> ve AYT_SUBJECTS filtresi
  const aytSubjects = AYT_SUBJECTS[field] ?? [];
  const placeholders = aytSubjects.map(() => "?").join(",");

  const tytRows = await db
    .prepare("SELECT * FROM predictions WHERE session='TYT' AND field='ALL'")
    .all();

  const aytRows = await db
    .prepare(`SELECT * FROM predictions WHERE session='AYT' AND field=? AND subject IN (${placeholders})`)
    .bind(field, ...aytSubjects)
    .all();

  return json({ field, tyt: tytRows.results, ayt: aytRows.results });
}

async function getSubjectPredictions(db: D1Database, field: string, subject: string) {
  const rows = await db
    .prepare(
      `SELECT * FROM predictions
       WHERE subject=?
         AND ((session='TYT' AND field='ALL') OR (session='AYT' AND field=?))`
    )
    .bind(subject, field)
    .all();

  if (!rows.results.length)
    return err(`'${subject}' dersi bulunamadı (alan=${field})`, 404);

  return json({ field, subject, topics: rows.results });
}

async function getTopicDetail(
  db: D1Database, session: string, field: string, subject: string, topic: string
) {
  const apiField = session === "TYT" ? "ALL" : field;
  const row = await db
    .prepare(
      "SELECT * FROM predictions WHERE session=? AND field=? AND subject=? AND topic=? LIMIT 1"
    )
    .bind(session, apiField, subject, topic)
    .first();

  if (!row)
    return err(`Konu bulunamadı: ${session}/${field}/${subject}/${topic}`, 404);

  return json(row);
}

async function getYearlyDistribution(
  db: D1Database, session: string, field: string, subject: string, topic: string
) {
  const apiField = session === "TYT" ? "ALL" : field;
  const rows = await db
    .prepare(
      `SELECT year, total_question_count as count, is_zero_filled
       FROM yearly_distribution
       WHERE session=? AND field=? AND subject=? AND topic=?
       ORDER BY year`
    )
    .bind(session, apiField, subject, topic)
    .all();

  if (!rows.results.length)
    return err(`Konu bulunamadı: ${session}/${field}/${subject}/${topic}`, 404);

  return json({ session, field, subject, topic, data: rows.results });
}
