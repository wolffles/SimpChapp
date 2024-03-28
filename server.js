const {userConnectedToRoom, userDisconnected} = require( './backend/serverChatRoomFunctions')
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
    socket.to(socket.roomName).emit('message', {
    username: data.username,
    message: data.message,
    image: data.image
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

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (userData) => {

    if (!userData.username) return;
    roomName = userData.roomName ?? 'global';

    // the socket holds the name of the room. otherwise it sometimes get lost on server updates. 
    // needed for things like disconnecting logic
    socket.roomName = roomName
    socket.username = userData.username

    socket.join(roomName);
    addedUser = true;
    rooms[roomName] = userConnectedToRoom(rooms[roomName], userData.username)
    // console.log(util.inspect(rooms[roomName], false, null, true))
    // Don't know if I need this now
    // socket.emit('update user state', rooms[roomName].savedPlayers[socket.username])
    broadcastToRoom(io,roomName,'update room state', rooms[roomName]);
  });

  // socket.on('user message', (data) => {
  //   broadcastRoomExcludeSender(socket, roomName, 'message', data);
  // });

  // when the client emits 'new message', this listens and executes
  socket.on('user message', (data) => {
    roomEmit(socket, data)
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
    let roomName = socket.roomName
    if (addedUser) {
        console.log('hit')
        userDisconnected(rooms[roomName], socket.username)
        // setTimeout(() => {
        //     if(rooms[roomName] && rooms[roomName].connectedPlayersList.length == 0){
        //         //deletes room after five minutes if no participant joined the room
        //         console.log(roomName, ' is deleted')
        //         deleteRoom(rooms, roomName)
        //     }
        // }, 300000)
        // echo globally that this client has left
        broadcastRoomExcludeSender(socket,roomName,'update room state', rooms[roomName])
      }
    });
});