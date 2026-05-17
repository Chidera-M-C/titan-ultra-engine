import { auth } from "../../../src/lib/auth";

export const onRequest = async (context: any) => {
  // Inject Cloudflare env into process.env so auth.ts can read them
  Object.assign(process.env, context.env);
  return auth.handler(context.request);
};
