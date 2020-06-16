const savePushSubscription = (subscription) => {
    fetch('/serviceWorker', {
        method: 'POST', // or 'PUT'
        body: JSON.stringify(subscription), // data can be `string` or {object}!
        headers:{
          'Content-Type': 'application/json'
        }
      }).then(res => res.json())
      .then(response => console.log('Success:', JSON.stringify(response)))
      .catch(error => console.error('Error:', error));
}

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')
  ;
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

document.addEventListener('DOMContentLoaded', function(){
    // first check if serviceWorker is supported in browser
    // then check if browser supports web push notifications
    if ('serviceWorker' in navigator) {
        if ('PushManager' in window) {
          // we register and pass the path to our Service worker File 
          // after this step the browser will download this file and run it in a service worker environment.
          // the browser will "give it access" to the service worker APIs including push.
          // once the promise is resolved it returns a Service worker object that is used later on
          navigator.serviceWorker.register('/serviceWorker.js').then(function(registration) {
            //state initializing
            console.log('service registration succeeded this is the registration object', registration)
          })
          .catch(function() {
            //error handling
            console.log('caught .then() error')
          });
        } else {
          //error handling
          console.log('error in PushManger')
        }

        Notification.requestPermission(function(result) {

            if (result!== 'granted') {
                //handle permissions deny
                return console.log("the permission was denied")
            }

            if ( result === "granted") {
                // after the service worker is ready(provides a way of delaying code execution until SW is active), call the subscribe function
                // the ServiceWorkerRegistration associated with the current page has an ServiceWorkerRegistration.active worker. Once that condition is met, it resolves with the ServiceWorkerRegistration.
                navigator.serviceWorker.ready.then(function(registration) {
                    registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array("BIN2Jc5Vmkmy-S3AUrcMlpKxJpLeVRAfu9WBqUbJ70SJOCWGCGXKY-Xzyh7HDr6KbRDGYHjqZ06OcS3BjD7uAm8")
                    })
                    .then(function(subscription) {
                        // The subscription was successful
                        // push to server to save this object in a dataBase or something
                        // should return push subscription object

                        savePushSubscription(subscription);
                        console.log("made it to savePushSub")
                    })
                    .catch(function(e) {
                        console.log("Subscription didn't happen", e)
                        //error handling
                    });
                });
            }
        });
      } else {
        //error handling for service worker support
        console.log('service workers are not Supported')
      }

});
    
