import { getAuth } from "../../../src/lib/auth";

export const onRequest = async (context: any) => {
  // Inject Cloudflare env into process.env BEFORE getAuth() is called.
  // This must happen before auth is initialized — getAuth() reads process.env.
  Object.assign(process.env, context.env);

  try {
    const auth = getAuth();
    return auth.handler(context.request);
  } catch (err: any) {
    // Surface the real error instead of a generic 500
    console.error("[auth handler]", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
