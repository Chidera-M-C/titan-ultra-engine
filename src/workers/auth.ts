import { auth } from "../lib/auth";

export default {
  async fetch(request: Request, env: any) {
    return auth.handler(request);
  },
} satisfies ExportedHandler;
