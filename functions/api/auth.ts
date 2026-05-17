import { auth } from "../../src/lib/auth";

export const onRequest = async (context: any) => {
  const { request } = context;
  
  // Add CORS headers for better compatibility
  const response = await auth.handler(request);
  
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  return response;
};
