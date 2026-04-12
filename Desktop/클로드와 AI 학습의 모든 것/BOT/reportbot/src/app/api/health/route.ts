export const runtime = "nodejs";

export async function GET() {
  const checks = {
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
  };

  const allOk = Object.values(checks).every(Boolean);

  return Response.json({
    ok: allOk,
    env: checks,
    node: process.version,
  }, { status: allOk ? 200 : 500 });
}
