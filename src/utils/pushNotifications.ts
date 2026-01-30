import { supabase } from "@/integrations/supabase/client";

// VAPID public key - this is safe to expose in client code
const VAPID_PUBLIC_KEY = 'BCQVq2TaMpDYWeaDzKEs3WstCwy2MJ74u9Y10xfyCmZGgeI_3ch57PnVcHiBnXRaTew-HK0SV4-ZkW6tJwFBctY';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    return registration;
  } catch {
    return null;
  }
}

export async function subscribeToPushNotifications(): Promise<boolean> {
  if (!('PushManager' in window)) {
    return false;
  }

  if (!VAPID_PUBLIC_KEY) {
    return false;
  }

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      return false;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return false;
    }

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // If no subscription exists, create one
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    // Extract subscription details
    const subscriptionJson = subscription.toJSON();
    const endpoint = subscription.endpoint;
    const p256dh = subscriptionJson.keys?.p256dh || '';
    const auth = subscriptionJson.keys?.auth || '';

    // Check if already saved in database
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)
      .maybeSingle();

    if (!existing) {
      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          endpoint,
          p256dh,
          auth
        });

      if (error) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      
      // Remove from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', subscription.endpoint);
    }

    return true;
  } catch {
    return false;
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window;
}
