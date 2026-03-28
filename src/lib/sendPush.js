// ── sendPush.js — place in src/lib/ ──────────────────────────────────────
// Call this alongside any supabase.from('notifications').insert(...)
// It hits your /api/send-push endpoint to deliver the push notification

export async function sendPush({ userId, title, body, image, url, tag }) {
  try {
    await fetch('/api/send-push', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, body, image, url, tag }),
    });
  } catch (err) {
    // Push failing should never break the app
    console.warn('Push send failed (non-critical):', err.message);
  }
}
