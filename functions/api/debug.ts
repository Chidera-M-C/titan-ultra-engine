export const onRequest = async (context: any) => {
  Object.assign(process.env, context.env);

  const checks: Record<string, any> = {};

  checks.DATABASE_URL = process.env.DATABASE_URL
    ? `SET ✅ (starts with: ${process.env.DATABASE_URL.slice(0, 40)}...)`
    : "MISSING ❌";

  checks.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ? "SET ✅" : "MISSING ❌";
  checks.GOOGLE_CLIENT_ID   = process.env.GOOGLE_CLIENT_ID   ? "SET ✅" : "MISSING ❌";
  checks.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ? "SET ✅" : "MISSING ❌";

  try {
    const { getAuth } = await import("../../src/lib/auth");
    const auth = getAuth();
    checks.auth_module = "Loaded ✅";

    // Try a real DB ping
    try {
      // @ts-ignore
      const pool = auth.options?.database?.db;
      if (pool) {
        const result = await pool.query("SELECT 1 as ok");
        checks.db_connection = result?.rows?.[0]?.ok === 1 ? "Connected ✅" : "Unexpected result";
      } else {
        checks.db_connection = "Pool not accessible via auth.options";
      }
    } catch (dbErr: any) {
      checks.db_connection = `FAILED ❌: ${dbErr.message}`;
    }

  } catch (authErr: any) {
    checks.auth_module = `FAILED ❌: ${authErr.message}`;
  }

  return new Response(JSON.stringify({ checks }, null, 2), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
};
