import { betterAuth } from "better-auth";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { Kysely } from "kysely";
import { NeonDialect } from "kysely-neon";
import ws from "ws";

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

  // Better Auth needs a Kysely instance, not a raw Pool.
  // kysely-neon provides a Kysely dialect built on @neondatabase/serverless.
  const db = new Kysely({
    dialect: new NeonDialect({
      connectionString: process.env.DATABASE_URL,
    }),
  });

  _auth = betterAuth({
    baseURL: process.env.VITE_APP_URL || "https://nudely.org",
    basePath: "/api/auth",

    database: {
      db,
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
