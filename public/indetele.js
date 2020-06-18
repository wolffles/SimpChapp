const pushServerPublicKey = "BIN2Jc5Vmkmy-S3AUrcMlpKxJpLeVRAfu9WBqUbJ70SJOCWGCGXKY-Xzyh7HDr6KbRDGYHjqZ06OcS3BjD7uAm8";

/**
 * asks user consent to receive push notifications and returns the response of the user, one of granted, default, denied
 */
function askUserPermission() {
  return Notification.requestPermission();
}

/**
 * checks if Push notification and service workers are supported by your browser
 */
function isPushNotificationSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

/**
 * asks user consent to receive push notifications and returns the response of the user, one of granted, default, denied
 */
function initializePushNotifications() {
  // request user grant to show notification
  return Notification.requestPermission(function(result) {
    return result;
  });
}
/**
 * shows a notification
 */
function sendNotification() {
  // const img = "/images/jason-leung-HM6TMmevbZQ-unsplash.jpg";
  const text = "Hello I am a push notification";
  const title = "New message from wolf";
  const options = {
    body: text,
    icon: "/images/jason-leung-HM6TMmevbZQ-unsplash.jpg",
    vibrate: [200, 100, 200],
    tag: "test message",
    // image: img,
    // badge: "https://spyna.it/icons/android-icon-192x192.png",
    actions: [{ action: "Detail", title: "View", icon: "https://via.placeholder.com/128/ff0000" }]
  };
  navigator.serviceWorker.ready.then(function(serviceWorker) {
    serviceWorker.showNotification(title, options);
  });
}

/**
 * 
 */
function registerServiceWorker() {
  navigator.serviceWorker.register("./serviceWorker.js").then(function(registration) {
    //you can do something with the service wrker registration (swRegistration)
    console.log('A service worker is active:', registration.active);
  });
}

/**
 * 
 * using the registered service worker creates a push notification subscription and returns it
 * 
 */
function createNotificationSubscription() {
  //wait for service worker installation to be ready, and then
  return navigator.serviceWorker.ready.then(function(serviceWorker) {
    // subscribe and return the subscription
    return serviceWorker.pushManager
    .subscribe({
      userVisibleOnly: true,
      applicationServerKey: pushServerPublicKey
    })
    .then(function(subscription) {
      console.log("User is subscribed.", subscription);
      return subscription;
    });
  });
}

/**
 * returns the subscription if present or nothing
 */
function getUserSubscription() {
  //wait for service worker installation to be ready, and then
  console.log('getUserSubscription was called')
  return navigator.serviceWorker.ready
    .then(function(serviceWorker) {
      console.log('serviceWorker push Manager', serviceWorker.pushManager.getSubscription())
      return serviceWorker.pushManager.getSubscription();
    })
    .then(function(pushSubscription) {
      console.log('pushSub', pushSubscription)
      return pushSubscription;
    });
}

export {
  askUserPermission,
  isPushNotificationSupported,
  initializePushNotifications,
  registerServiceWorker,
  sendNotification,
  createNotificationSubscription,
  getUserSubscription
};

