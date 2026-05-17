import { betterAuth } from "better-auth";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

let _auth: ReturnType<typeof betterAuth> | null = null;

// Lazy initializer — called inside the request handler AFTER env vars are injected.
// Do NOT call betterAuth() at the top level; process.env is empty at module load time
// in Cloudflare Pages Functions.
export function getAuth() {
  if (_auth) return _auth;

  if (!process.env.DATABASE_URL) {
    throw new Error("[auth] DATABASE_URL is not set. Add it to Cloudflare Pages → Settings → Environment Variables.");
  }
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("[auth] BETTER_AUTH_SECRET is not set. Add it to Cloudflare Pages → Settings → Environment Variables.");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  _auth = betterAuth({
    baseURL: process.env.VITE_APP_URL || "https://nudely.org",
    basePath: "/api/auth",

    database: {
      db: pool,
      type: "postgresql",
    },

    appName: "Nudely",
    secret: process.env.BETTER_AUTH_SECRET,

    emailAndPassword: {
      enabled: true,
    },

    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },

    trustedOrigins: [
      "https://nudely.org",
      "https://nudely.ai",
      "http://localhost:5173",
    ],
  });

  return _auth;
}
