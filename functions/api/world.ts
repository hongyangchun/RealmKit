/**
 * GET/POST /api/world
 * 世界数据的云端 CRUD
 */
interface RequestContext {
  request: Request;
  env: { DB: D1Database };
  data: { userEmail: string };
}

/** GET /api/world — 获取当前用户的世界数据 */
export async function onRequestGet(context: RequestContext): Promise<Response> {
  const { DB } = context.env;
  const userId = context.data.userEmail;

  const row = await DB.prepare('SELECT data, updated_at FROM worlds WHERE user_id = ?')
    .bind(userId)
    .first<{ data: string; updated_at: string } | null>();

  if (!row) {
    return new Response(JSON.stringify({ world: null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({ world: JSON.parse(row.data), updatedAt: row.updated_at }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}

/** POST /api/world — 保存世界数据（upsert） */
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

  const worldData = body.data as Record<string, unknown>;
  const updatedAt = body.updatedAt ?? new Date().toISOString();
  const worldId = (worldData.meta as Record<string, string>)?.id ?? 'unknown';
  const now = new Date().toISOString();
  const serialized = JSON.stringify(worldData);

  await DB.prepare(
    `INSERT INTO worlds (user_id, world_id, data, updated_at, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       data = excluded.data,
       world_id = excluded.world_id,
       updated_at = excluded.updated_at`,
  )
    .bind(userId, worldId, serialized, updatedAt, now)
    .run();

  // 更新 sync_meta
  await DB.prepare(
    `INSERT INTO sync_meta (user_id, last_sync_at, device_id)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET last_sync_at = excluded.last_sync_at`,
  )
    .bind(userId, now, '')
    .run();

  return new Response(JSON.stringify({ ok: true, updatedAt }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
