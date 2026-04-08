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

  return new Response(
    JSON.stringify({
      debug: "FRONTEND PAYLOAD (this should appear in Response tab)",
      contentType,
      contentLength,
      rawBody: rawBody || "[EMPTY BODY]",
      note: "If rawBody is empty or {}, the problem is in your view component (TextToVideoView / ImageToVideoView / VideoStyleGeneratorView)"
    }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
