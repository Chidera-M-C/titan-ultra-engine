import { getAuth } from "../../../src/lib/auth";

export const onRequest = async (context: any) => {
  Object.assign(process.env, context.env);

  try {
    const auth = getAuth();
    const response = await auth.handler(context.request);

    // Log non-200 responses so we can see them in Cloudflare logs
    if (!response.ok) {
      let body = "";
      try { body = await response.clone().text(); } catch {}
      console.error(`[auth] ${context.request.method} ${new URL(context.request.url).pathname} → ${response.status}`, body);
    }

    return response;
  } catch (err: any) {
    console.error("[auth] CRASH:", err.message, err.stack);
    return new Response(
      JSON.stringify({ error: err.message, stack: err.stack }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
