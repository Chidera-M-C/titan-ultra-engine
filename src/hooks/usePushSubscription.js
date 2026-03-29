// ── src/hooks/usePushSubscription.js ─────────────────────────────────────
//
// HOW TO GENERATE VAPID KEYS FOR PUSHFORGE (Cloudflare compatible):
//
//   Run this ONCE in your terminal:
//   npx @pushforge/builder generate-keys
//
//   This outputs:
//     PUBLIC KEY (base64url string)  → paste into VAPID_PUBLIC_KEY below
//     PRIVATE KEY (JWK JSON string)  → paste into Cloudflare env var VAPID_PRIVATE_KEY
//
//   The private key MUST be the full JWK JSON string, e.g.:
//   {"kty":"EC","crv":"P-256","x":"...","y":"...","d":"..."}
//
//   Keep the private key ONLY in your Cloudflare environment variables.
//   Never expose it in frontend code.

import { supabase } from '../lib/supabase.js';

// ── Paste your PUBLIC key here (from npx @pushforge/builder generate-keys) ──
const VAPID_PUBLIC_KEY = 'BIBCMPJntRS_yF9MsZjW-1q7s-0qY1_BHl3fwSWy4Epr9iYJkMl7pOTlituyJjcti7GLaP-FMwWUqpobK0v1A-I';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}

export async function subscribeToPush(userId) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push not supported in this browser');
      return null;
    }

    // Register service worker
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      // Already subscribed — just make sure it's saved in DB
      const subJson = existing.toJSON();
      await supabase.from('push_subscriptions').upsert({
        user_id:  userId,
        endpoint: subJson.endpoint,
        p256dh:   subJson.keys.p256dh,
        auth:     subJson.keys.auth,
      }, { onConflict: 'endpoint' });
      return existing;
    }

    // Ask permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Push permission denied');
      return null;
    }

    // Subscribe
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Save subscription to Supabase
    const subJson = subscription.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id:  userId,
      endpoint: subJson.endpoint,
      p256dh:   subJson.keys.p256dh,
      auth:     subJson.keys.auth,
    }, { onConflict: 'endpoint' });

    if (error) {
      console.error('Failed to save push subscription:', error);
    } else {
      console.log('Push subscription saved successfully');
    }

    return subscription;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return null;
  }
}

export async function unsubscribeFromPush(userId) {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);
    console.log('Push subscription removed');
  } catch (err) {
    console.error('Unsubscribe failed:', err);
  }
}
