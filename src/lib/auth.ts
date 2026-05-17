import { betterAuth } from "better-auth";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const auth = betterAuth({
  baseURL: process.env.VITE_APP_URL || "https://nudely.org",
  basePath: "/api/auth",

  database: {
    db: supabase,
    type: "supabase",           // Important - use Supabase adapter
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
});
