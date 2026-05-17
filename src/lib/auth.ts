import { betterAuth } from "better-auth";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { dash } from "@better-auth/infra";
import ws from "ws";

// Required for Neon serverless to work in Cloudflare Workers/Pages Functions
neonConfig.webSocketConstructor = ws;

// This pool connects to Supabase's Postgres via an edge-compatible WebSocket driver.
// Use the Supabase "Transaction mode" connection string (port 6543).
// Format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
  baseURL: process.env.VITE_APP_URL || "https://nudely.org",
  basePath: "/api/auth",

  database: {
    db: pool,
    type: "postgresql",
  },

  appName: "Nudely",

  secret: process.env.BETTER_AUTH_SECRET,

  plugins: [
    dash(),
  ],

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
