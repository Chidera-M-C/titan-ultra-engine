import { auth } from "../../src/lib/auth";

export const onRequest = async (context: any) => {
  // This is the correct way for Cloudflare Pages Functions
  return auth.handler(context.request);
};
