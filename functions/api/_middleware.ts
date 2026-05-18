/**
 * API 认证中间件
 * 从 Cloudflare Access 注入的请求头中提取已认证用户邮箱
 * Access 在边缘节点自动验证 CF_Authorization JWT cookie
 */
interface MiddlewareContext {
  request: Request;
  env: { DB: D1Database };
  data: Record<string, string>;
  next: () => Promise<Response>;
}

export async function onRequest(context: MiddlewareContext): Promise<Response> {
  // Cloudflare Access 验证 JWT 后注入此 header
  const email = context.request.headers.get('cf-access-authenticated-user-email');
  if (!email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  context.data.userEmail = email;
  return context.next();
}
