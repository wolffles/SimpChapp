const {userConnectedToRoom} = require( './backend/serverChatRoomFunctions')
const {broadcastToRoom} = require('./backend/broadcastFunctions')
// Setup basic express server
const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const port = process.env.PORT || 5050;
// const host = process.env.HOSTNAME || "https://localhost/";

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routing
app.use(express.static(path.join(__dirname, 'SimplyChat'),{
  extensions: ['html']
}));


//app.post("/swsubscription", subscriptionHandler.handlePushNotificationSubscription);
//app.get("/subscription/allothers/:id", subscriptionHandler.sendAllOthersPushNotification);
//app.get("/subscription/:id", subscriptionHandler.sendPushNotification);


// Chatroom
var normalUsers = 0;
var otherUsers = 0;


// when this app sends a message it sends it to every room, need to change that
const roomEmit = (socket, data) => {
  // we tell the client to execute 'new message'
    console.log('this is data', data, 'socket', socket)
    socket.to(socket.roomName).emit('message', {
    username: data.username,
    message: data.message
    })
}

/**
 * broad cast to all in room exluding sender
 * @param {Socket} socket 
 * @param {String} listenString 
 * @param {Object} dataObj 
 */
const broadcastRoomExcludeSender = (socket, roomName, listenString, dataObj ) => {
  socket.to(roomName).emit(listenString, dataObj)
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

let rooms = {
  global :{
    roomID: '',
    roomName: '',
    numUsers: 0,
    connectedUsersList: [],
    broadcast: false,
    toBroadcast: {
        userJoined:"",
        userLeft: "",
        userRemoved: "",
        numUsers: ""
      }
  }
}

io.on('connection', (socket) => {
  let url = socket.request.headers.referer
  var addedUser = false;

  // socket.on('user message', (data) => {
  //   broadcastRoomExcludeSender(socket, roomName, 'message', data);
  // });

  // when the client emits 'new message', this listens and executes
  socket.on('user message', (data) => {
    roomEmit(socket, data)
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (data) => {
    if (addedUser) return;
    roomName = data?.roomName ?? 'global';

    // what is socket.roomName
    socket.roomName = roomName

    socket.join(roomName);
    addedUser = true;
    userConnectedToRoom(rooms[roomName], socket.username)
    // console.log(util.inspect(rooms[roomName], false, null, true))
    // don't know if I need this now
    // socket.emit('update user state', rooms[roomName].savedPlayers[socket.username])
    broadcastToRoom(io,roomName,'update room state', rooms[roomName]);
});

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', () => {
    if (url.includes("nothinghere")){
      socket.to('nothinghere').emit('typing', {
        username:socket.username,
      })
    }else{
      socket.to('global').emit('typing', {
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
      socket.to('global').emit('stop typing', {
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
          numUsers: otherUsers
        })
      }else{
        --normalUsers;
        socket.to('global').emit('user left', {
          username: socket.username,
          numUsers: normalUsers
        });
      }
    }
  });
});