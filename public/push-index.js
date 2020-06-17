import {http} from "./http.js";
import {
  isPushNotificationSupported,
  askUserPermission,
  // initializePushNotifications,
  registerServiceWorker,
  getUserSubscription,
  createNotificationSubscription
} from "./push-notifications.js";

// let userSubscription;
let subscriptionId;
let isSubscribed = false;
let swRegistration = null;
const pushServerPublicKey = "BIN2Jc5Vmkmy-S3AUrcMlpKxJpLeVRAfu9WBqUbJ70SJOCWGCGXKY-Xzyh7HDr6KbRDGYHjqZ06OcS3BjD7uAm8";
/**
 * sends the push susbcribtion to the push server
 */
function sendSubscriptionToPushServer(subscription) {
    http.post("/swsubscription", subscription).then(function(response) {
      console.log('hit')
      subscriptionId = response.id;
    });
}

/**
 * request the push server to send a notification, passing the id
 */
function sendNotification() {
    http.get(`/subscription/${subscriptionId}`);
}  

// function subscribeSW(){
//     console.log("subscribeSW was clicked here is the first condition", isPushNotificationSupported())
//     // if browser support
//     if(isPushNotificationSupported()){
//         askUserPermission().then((result) => {
//           console.log('result', result)
//           console.log('permission', Notification.permission)
//           if(Notification.permission == "granted"){
//             //register serviceworker
//             navigator.serviceWorker.register("/serviceWorker.js")
//             .then(() => {
//               console.log('after subscription')
//               return getUserSubscription()
//             })
//             .then(function(subscription) {
//                 console.log(subscription)
//                 if (subscription) {
//                   createNotificationSubscription()
//                   console.log('Subscription is ready', subscription)
//                   sendSubscriptionToPushServer(subscription);
//                   // console.log(subscription)
//                 }
//             })
//           }
//         })
//     }
// }

// function subscribeSW(){
//   if (isPushNotificationSupported()) {
//     // register the service worker
//     registerServiceWorker();
    // getUserSubscription().then((subscription) => {
//       if (subscription) {
//         // createNotificationSubscription()
//         // sendSubscriptionToPushServer(subscription);
//         console.log('Subscription is ready', subscription)
//       }
//     });
//   }
// }


function subscribeUser() {
  const applicationServerKey = pushServerPublicKey;
  swRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey
  })
  .then(function(subscription) {
    console.log('User is subscribed.');

    sendSubscriptionToPushServer(subscription);

    isSubscribed = true;
  })
  .catch(function(err) {
    console.log('Failed to subscribe the user: ', err);
  });
}

function initializeUI() {
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


function registerSW(){ 
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    console.log('Service Worker and Push is supported');
  
    navigator.serviceWorker.register('/serviceWorker.js')
    .then(function(registration) {
      console.log('Service Worker is registered', registration);
  
      swRegistration = registration;
      initializeUI();
    })
    .catch(function(error) {
      console.error('Service Worker Error', error);
    });
  } else {
    console.warn('Push messaging is not supported');
    pushButton.textContent = 'Push Not Supported';
  }
}

function subscribeSW() {

}


function pushCommand(){
    // if brower support
    if(isPushNotificationSupported()){
        sendNotification();
    }
}


export { registerSW, subscribeSW, pushCommand };
