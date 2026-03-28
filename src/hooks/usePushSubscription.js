// ── usePushSubscription.js — place in src/hooks/ ──────────────────────────
// Usage: call subscribeToPush() after user logs in

import { supabase } from '../lib/supabase.js';

// ── Your VAPID public key ─────────────────────────────────────────────────
// Generate your VAPID keys by running this in your terminal:
//   npx web-push generate-vapid-keys
// Then paste your PUBLIC key below, and keep the PRIVATE key in your server env
const VAPID_PUBLIC_KEY = 'BPiIGI7c0AN4HKbo9trAWPIr1G2n2qlAjqFOgROYx3Yo40siI2fG2DTMMiYkYVN7fEBajM0D9nZ75QbLyLBqq0w';

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
    await supabase.from('push_subscriptions').upsert({
      user_id:  userId,
      endpoint: subJson.endpoint,
      p256dh:   subJson.keys.p256dh,
      auth:     subJson.keys.auth,
    }, { onConflict: 'endpoint' });

    console.log('Push subscription saved');
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
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  } catch (err) {
    console.error('Unsubscribe failed:', err);
  }
}
