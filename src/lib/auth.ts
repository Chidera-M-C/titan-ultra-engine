import { betterAuth } from "better-auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const auth = betterAuth({
  baseURL: process.env.VITE_APP_URL || "https://nudely.org",
  basePath: "/api/auth",                    // ← Added this

  database: {
    db: pool,
    type: "postgres",
  },

  appName: "Nudely",

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
    "http://localhost:5173"
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
  },
});
