import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "./auth-schema";

neonConfig.webSocketConstructor = ws;

let _auth: ReturnType<typeof betterAuth> | null = null;

export function getAuth() {
  if (_auth) return _auth;

  if (!process.env.DATABASE_URL) {
    throw new Error("[auth] DATABASE_URL is not set.");
  }
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("[auth] BETTER_AUTH_SECRET is not set.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  _auth = betterAuth({
    baseURL: process.env.VITE_APP_URL || "https://nudely.org",
    basePath: "/api/auth",
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,                  // ← this is what was missing
    }),
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

  return _auth;
}
