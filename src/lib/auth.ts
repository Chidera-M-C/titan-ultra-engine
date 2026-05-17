import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import * as schema from "./auth-schema";

// Fix for Cloudflare Edge: Use the platform's native WebSocket engine.
// We only fall back to standard 'ws' if running in a bare local Node process (e.g. scripts/migrations).
if (typeof globalThis.WebSocket === "undefined") {
  try {
    neonConfig.webSocketConstructor = require("ws");
  } catch (e) {
    console.warn("WebSocket constructor could not be polyfilled locally.");
  }
}

export function getAuth() {
  if (!process.env.DATABASE_URL) {
    throw new Error("[auth] DATABASE_URL is not set.");
  }
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("[auth] BETTER_AUTH_SECRET is not set.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Intercept every query so we can log the REAL Postgres error
  const originalQuery = pool.query.bind(pool);
  (pool as any).query = async (...args: any[]) => {
    try {
      return await originalQuery(...args);
    } catch (err: any) {
      console.error("[pg REAL ERROR]", JSON.stringify({
        message: err.message,
        code: err.code,
        detail: err.detail,
        hint: err.hint,
        table: err.table,
        column: err.column,
        constraint: err.constraint,
        query: typeof args[0] === 'string' ? args[0] : args[0]?.text,
      }));
      throw err;
    }
  };

  const db = drizzle(pool, { schema });

  return betterAuth({
    baseURL: process.env.VITE_APP_URL || "https://nudely.org",
    basePath: "/api/auth",
    database: drizzleAdapter(db, { provider: "pg", schema }),
    appName: "Nudely",
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: { enabled: true },
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
}
