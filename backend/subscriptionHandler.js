var crypto = require("crypto")
const webpush = require("web-push")

const subscriptions = {};

// const vapidKeys = webpush.generateVAPIDKeys();

vapidKeys = {
    privateKey: "bdSiNzUhUP6piAxLH-tW88zfBlWWveIx0dAsDO66aVU",
    publicKey: "BIN2Jc5Vmkmy-S3AUrcMlpKxJpLeVRAfu9WBqUbJ70SJOCWGCGXKY-Xzyh7HDr6KbRDGYHjqZ06OcS3BjD7uAm8"
}

// webpush.setGCMAPIKey('<your GCM API KEY here (google cloud mesanger?')
webpush.setVapidDetails(
    'mailto:fettwolfalpha@gmail.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

// decided not to hash the subscription id to see a basic example.

function createHash(input) {
    const md5sum = crypto.createHash("md5");
    md5sum.update(Buffer.from(input));
    return md5sum.digest("hex");
  }
  
  function handlePushNotificationSubscription(req, res) {
    const subscriptionRequest = req.body;
    // console.log("this is the subscription request", subscriptionRequest)
    const susbscriptionId = createHash(JSON.stringify(subscriptionRequest));
    subscriptions[susbscriptionId] = subscriptionRequest;
    console.log("these are the subscriptions",subscriptions)
    res.status(201).json({ id: susbscriptionId});
  }


// this didn't work because the subrequest didn't have a id attribute
// function handlePushNotificationSubscription(req, res) {
//     const subscriptionRequest = req.body;
//     console.log ("this is the subscription request", subscriptionRequest)
//     const subscriptionId = subscriptionRequest.id
//     subscriptions[subscriptionId] = subscriptionRequest
//     res.status201.json({id: subscriptionId});
// }

function sendPushNotification(req, res) {
    const subscriptionId = req.params.id;
    const pushSubscription = subscriptions[subscriptionId];
    console.log(pushSubscription)
    webpush.sendNotification(
        pushSubscription,
        JSON.stringify({
            title: "New message",
            text: "Someone messaged you",
            image: "",
            tag: "new message",
            url: "/"
        })
    )
    .catch(err => {
        console.log("you've received an error:", err);
    });
    res.status(202).json({msg:'the message should have been sent'});
}

module.exports = { handlePushNotificationSubscription, sendPushNotification };