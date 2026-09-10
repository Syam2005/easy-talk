// Standard browser Push API helper. The VAPID public key comes from the server
// as a base64url string; PushManager.subscribe() needs it as a Uint8Array.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const isPushSupported = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export const subscribeToPush = async (api) => {
  if (!isPushSupported()) {
    throw new Error("Push notifications aren't supported in this browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was denied.");
  }

  const { data: keyData } = await api.get("/push/public-key");
  if (!keyData.configured || !keyData.publicKey) {
    throw new Error("Push notifications aren't set up on this server yet.");
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
    });
  }

  const raw = subscription.toJSON();
  await api.post("/push/subscribe", {
    endpoint: raw.endpoint,
    keys: raw.keys,
  });

  return subscription;
};

export const unsubscribeFromPush = async (api) => {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await api.post("/push/unsubscribe", { endpoint: subscription.endpoint });
    await subscription.unsubscribe();
  }
};
