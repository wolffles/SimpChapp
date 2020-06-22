import {http} from "./http.js";

let subscriptionId
let isSubscribed = false;
let swRegistration = null;
const pushServerPublicKey = "BIN2Jc5Vmkmy-S3AUrcMlpKxJpLeVRAfu9WBqUbJ70SJOCWGCGXKY-Xzyh7HDr6KbRDGYHjqZ06OcS3BjD7uAm8";

/**
 * checks to see if serviceworkers and push notifications are supported
 */
function isPushNotificationSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

/**
 * sends the push susbcribtion to the push server
 */
function sendSubscriptionToPushServer(subscription) {
    http.post("/swsubscription", subscription).then(function(response) {
      subscriptionId = response.id;
    });
}

/**
 * request the push server to send a notification, passing the id
 */
function sendNotification(id) {
    if(id){
      console.log("push-index.js subscription/id")
      http.get(`subscription/${id}`)
    }else{
      console.log("push-index.js subscription/allothers/id")
      http.get(`subscription/allothers/${subscriptionId}`);
    }
}  


function subscribeUser() {
  const applicationServerKey = pushServerPublicKey;
  swRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey
  })
  .then(function(subscription) {
    sendSubscriptionToPushServer(subscription);
    isSubscribed = true;
  })
  .catch(function(err) {
    console.log('Failed to subscribe the user: ', err);
  });
}

function registerSW() {
    if (isSubscribed) {
      // TODO: Unsubscribe user
    } else {
      subscribeUser();
    }

  // Set the initial subscription value
  swRegistration.pushManager.getSubscription()
  .then(function(subscription) {
    isSubscribed = !(subscription === null);
    sendSubscriptionToPushServer(subscription);
    if (isSubscribed) {
      console.log('User IS subscribed.');
    } else {
      console.log('User is NOT subscribed.');
    }
  });
}

function subscribeSW(){ 
  if (isPushNotificationSupported()) {
    // console.log('Service Worker and Push is supported');
    navigator.serviceWorker.register('/serviceWorker.js')
    .then(function(registration) {
      // console.log('Service Worker is registered', registration);
      swRegistration = registration;
      registerSW();
    })
    .catch(function(error) {
      console.error('Service Worker Error', error);
    });
  } else {
    console.warn('Push messaging is not supported');
  }
}

function pushCommand(){
    // if brower support
    if(isPushNotificationSupported()){
        sendNotification();
    }
}

export { registerSW, subscribeSW, pushCommand };