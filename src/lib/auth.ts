import { betterAuth } from "better-auth";
import { Pool } from "pg";

// Connect directly to Supabase's underlying Postgres DB
// Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // See setup guide below
  ssl: { rejectUnauthorized: false },
});

export const auth = betterAuth({
  baseURL: process.env.VITE_APP_URL || "https://nudely.org",
  basePath: "/api/auth",

  database: {
    db: pool,
    type: "postgresql",
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
    "http://localhost:5173",
  ],
});
