// Setup basic express server
const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const subscriptionHandler = require('./backend/subscriptionHandler');

const port = process.env.PORT || 3000;
// const host = process.env.HOSTNAME || "https://localhost/";

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routing
app.use(express.static(path.join(__dirname, 'public'),{
  extensions: ['html']
}));

app.post("/swsubscription", subscriptionHandler.handlePushNotificationSubscription);
app.get("/subscription/:id", subscriptionHandler.sendPushNotification);


// Chatroom
var normalUsers = 0;
var otherUsers = 0;


// when this app sends a message it sends it to every room, need to change that
const roomEmit = (url, socket, data) => {
  // we tell the client to execute 'new message'
  if (url.includes("nothinghere")){
    socket.to('nothinghere').emit('new message', {
      username: socket.username,
      message: data
    });
  }else{
    socket.to('normal').emit('new message', {
    username: socket.username,
    message: data
    });
  }
}

// function handleExit(err) {
//   if (err) {
//     errors.report(err);
//   }
//   if (options.exit) {
//     process.exit();
//   }
// }

// process.on("exit", handleExit.bind(null));
// process.on("SIGINT", handleExit.bind(null));
// process.on("SIGTERM", handleExit.bind(null));
// process.on("uncaughtException", handleExit.bind(null));


io.on('connection', (socket) => {
  let url = socket.request.headers.referer
  if (url.includes("nothinghere")){
    console.log("joined nothinghere")
    socket.join('nothinghere')
  }else {
    // console.log('joined normal')
    socket.join('normal')
  }
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', (data) => {
    // we tell the client to execute 'new message'
    if (url.includes("nothinghere")){
      socket.to('nothinghere').emit('new message', {
        username: socket.username,
        message: data
      });
    }else{
      socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
      });
    }
    roomEmit(url,socket,data)
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (username) => {
    if (addedUser) return;
    socket.username = username
    addedUser = true;
    // we store the username in the socket session for this client
    // echo globally (all clients) that a person has connected
    if (url.includes("nothinghere")){
      ++otherUsers
      socket.emit('login', {
        numUsers: otherUsers
      })
      socket.to('nothinghere').emit('user joined', {
        username: socket.username,
        numUsers: otherUsers
      })
    }else{
      ++normalUsers
      socket.emit('login', {
        numUsers: normalUsers
      });
      socket.to('normal').emit('user joined', {
        username: socket.username,
        numUsers: normalUsers
      });
    }
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', () => {
    if (url.includes("nothinghere")){
      socket.to('nothinghere').emit('typing', {
        username:socket.username,
      })
    }else{
      socket.to('normal').emit('typing', {
        username: socket.username,
      });
    }
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', () => {
    // socket.broadcast.emit('stop typing', {
    //   username: socket.username
    // });
    if (url.includes("nothinghere")){
      socket.to('nothinghere').emit('stop typing', {
        username:socket.username,
      })
    }else{
      socket.to('normal').emit('stop typing', {
        username: socket.username,
      });
    }
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    if (addedUser) {
      // echo globally that this client has left
      // socket.broadcast.emit('user left', {
      //   username: socket.username,
      //   numUsers: numUsers
      // });
       if (url.includes("nothinghere")){
        --otherUsers;
        socket.to('nothinghere').emit('user left', {
          username:socket.username,
          numUsers: otherusers
        })
      }else{
        --normalUsers;
        socket.to('normal').emit('user left', {
          username: socket.username,
          numUsers: normalUsers
        });
      }
    }
  });
});