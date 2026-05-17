import { auth } from "../../../src/lib/auth";

export const onRequest = async (context: any) => {
  return auth.handler(context.request);
};
