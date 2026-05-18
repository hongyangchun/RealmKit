/**
 * GET/POST /api/chronicles
 * 编年史数据的云端 CRUD
 */
interface RequestContext {
  request: Request;
  env: { DB: D1Database };
  data: { userEmail: string };
}

/** GET /api/chronicles — 获取当前用户的编年史 */
export async function onRequestGet(context: RequestContext): Promise<Response> {
  const { DB } = context.env;
  const userId = context.data.userEmail;

  const row = await DB.prepare('SELECT data, updated_at FROM chronicles WHERE user_id = ?')
    .bind(userId)
    .first<{ data: string; updated_at: string } | null>();

  if (!row) {
    return new Response(JSON.stringify({ chronicles: null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({ chronicles: JSON.parse(row.data), updatedAt: row.updated_at }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}

/** POST /api/chronicles — 保存编年史（upsert） */
export async function onRequestPost(context: RequestContext): Promise<Response> {
  const { DB } = context.env;
  const userId = context.data.userEmail;

  let body: { data?: unknown; updatedAt?: string };
  try {
    body = await context.request.json() as { data?: unknown; updatedAt?: string };
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.data) {
    return new Response(JSON.stringify({ error: 'Missing data field' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const updatedAt = body.updatedAt ?? new Date().toISOString();
  const now = new Date().toISOString();
  const serialized = JSON.stringify(body.data);

  await DB.prepare(
    `INSERT INTO chronicles (user_id, data, updated_at, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       data = excluded.data,
       updated_at = excluded.updated_at`,
  )
    .bind(userId, serialized, updatedAt, now)
    .run();

  return new Response(JSON.stringify({ ok: true, updatedAt }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
