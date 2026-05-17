import { betterAuth } from "better-auth";
import { kyselyAdapter } from "better-auth/adapters/kysely";
import { Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } from "kysely";
import { Pool, neonConfig } from "@neondatabase/serverless";
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

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Wire Kysely to use the neon Pool as its underlying driver
  const db = new Kysely({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => ({
        acquireConnection: async () => ({ executeQuery: async (q: any) => {
          const { rows } = await pool.query(q.sql, q.parameters as any[]);
          return { rows };
        }, streamQuery: async function*() {} }),
        beginTransaction: async () => {},
        commitTransaction: async () => {},
        rollbackTransaction: async () => {},
        releaseConnection: async () => {},
        destroy: async () => {},
        init: async () => {},
      }),
      createIntrospector: (db: Kysely<any>) => new PostgresIntrospector(db),
      createQueryCompiler: () => new PostgresQueryCompiler(),
    },
  });

  _auth = betterAuth({
    baseURL: process.env.VITE_APP_URL || "https://nudely.org",
    basePath: "/api/auth",

    database: kyselyAdapter(db, { type: "postgresql" }),

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
