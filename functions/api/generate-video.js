// functions/api/generate-video.js
export async function onRequestPost(context) {
  const { request } = context;

  let rawBody = '';
  try {
    rawBody = await request.text();
  } catch (e) {
    rawBody = '[could not read body]';
  }

  const contentType = request.headers.get('content-type') || 'none';
  const contentLength = request.headers.get('content-length') || '0';

  // This will ALWAYS return JSON, no matter what
  return new Response(
    JSON.stringify({
      debug: "THIS IS THE FRONTEND PAYLOAD",
      contentType,
      contentLength,
      rawBody: rawBody || "[EMPTY BODY]",
      parsed: rawBody ? JSON.parse(rawBody).catch(() => null) : null
    }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
