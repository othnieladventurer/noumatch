import API from '@/api/axios';

const STORAGE_KEY = 'nm_push_subscribed';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (e) {
    console.warn('SW registration failed:', e);
    return null;
  }
}

export async function requestPushPermission() {
  if (sessionStorage.getItem(STORAGE_KEY)) return;

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const reg = await registerServiceWorker();
    if (!reg) return;

    await navigator.serviceWorker.ready;

    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await existing.unsubscribe();
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    const json = sub.toJSON();
    await API.post('/notifications/push/subscribe/', {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    });

    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch (e) {
    console.warn('Push subscription failed:', e);
  }
}
