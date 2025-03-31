const {userConnectedToRoom, userDisconnected} = require( './backend/serverChatRoomFunctions')
const {broadcastToRoom} = require('./backend/broadcastFunctions')
const { ExpressPeerServer } = require("peer");
// Setup basic express server
const express = require('express');
const app = express();
const path = require('path')
console.log(process.env.PORT)
const ioPort = process.env.PORT || 5050;
const peerPort = process.env.PORT || 5051
const htmlListen = app.listen(process.env.PORT || 3000)
const ioListen = app.listen(ioPort, () => {console.log('app listening for io at port %d', ioPort);})
const peerListen = app.listen(peerPort, () => {console.log('app listening for peer at port %d', peerPort);})

const io = require('socket.io')(ioListen);
const peerServer = ExpressPeerServer(peerListen, {
  debug:true,
	path: "/peerConnect",
});

if (!app.get('env') != "development"){
  app.use(express.static(path.join(__dirname, '/SimplyChat/dist'),{
    extensions: ['html']
  }));

  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/SimplyChat/dist/index.html');
  });
}
// const host = process.env.HOSTNAME || "https://localhost/";
//serve the static files from this path


// server.listen(ioPort, () => {
//   console.log('Server listening at port %d', ioPort);
// });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routing
// app.use(express.static(path.join(__dirname, 'SimplyChat'),{
//   extensions: ['html']
// }));

//localhost:5051/peerjs/peerConnect
app.use('/peerjs',peerServer )


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


/**
 * Map to track all active peer connections
 * Key: peer ID
 * Value: Object containing connection metadata
 */
const activePeers = new Map();

// peerJS connection handling
peerServer.on('connection', (client) => { 
  try {
    console.log('client connected', client.getId());
    // Store peer connection metadata including connection time and last activity
    activePeers.set(client.getId(), {
      id: client.getId(),
      connectedAt: Date.now(),
      lastActive: Date.now()
    });
  } catch (error) {
    console.error('Error in peer connection:', error);
    // Force disconnect the client if there's an error during connection
    client.destroy();
  }
});

// Handle peer disconnection
peerServer.on('disconnect', (client) => { 
  try {
    console.log("client disconnected", client.getId());
    // Remove peer from active connections tracking
    activePeers.delete(client.getId());
  } catch (error) {
    console.error('Error in peer disconnect:', error);
  }
});

// Global error handler for peer server
peerServer.on('error', (error) => {
  console.error('Peer server error:', error);
});

/**
 * Cleanup routine to remove inactive peers
 * Runs every 5 minutes to check for and remove stale connections
 */
setInterval(() => {
  const now = Date.now();
  for (const [peerId, peerData] of activePeers.entries()) {
    // Remove peers that haven't been active for 10 minutes (600000ms)
    if (now - peerData.lastActive > 600000) {
      console.log(`Removing inactive peer: ${peerId}`);
      activePeers.delete(peerId);
      const client = peerServer.getPeer(peerId);
      if (client) {
        client.destroy();
      }
    }
  }
}, 300000); // Check every 5 minutes (300000ms)

// Websocket stuff
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
  // Variables to store interval and timeout IDs for cleanup
  let heartbeatInterval;
  let connectionTimeout;

  /**
   * Sets up a heartbeat mechanism to keep track of active connections
   * Sends a ping every 20 seconds to the client
   */
  const setupHeartbeat = () => {
    heartbeatInterval = setInterval(() => {
      socket.emit('ping');
    }, 20000); // Send heartbeat every 20 seconds
  };

  /**
   * Sets up a connection timeout
   * If no response is received within 2 minutes, the connection is terminated
   */
  const setupConnectionTimeout = () => {
    connectionTimeout = setTimeout(() => {
      if (socket.connected) {
        console.log(`Connection timeout for socket ${socket.id}`);
        socket.disconnect(true);
      }
    }, 120000); // 2 minute timeout
  };

  /**
   * Handles pong responses from the client
   * Resets the connection timeout when a pong is received
   */
  socket.on('pong', () => {
    clearTimeout(connectionTimeout);
    setupConnectionTimeout();
  });

  // Handle new user connections
  socket.on('add user', (userData) => {
    try {
      // Validate username and disconnect if invalid
      if (!userData.username) {
        socket.disconnect(true);
        return;
      }
      
      // Set up room and user data
      roomName = userData.roomName ?? 'global';
      socket.roomName = roomName;
      socket.username = userData.username;

      // Join room and update room state
      socket.join(roomName);
      addedUser = true;
      rooms[roomName] = userConnectedToRoom(rooms[roomName], userData.username);
      
      // Initialize connection monitoring
      setupHeartbeat();
      setupConnectionTimeout();
      
      // Broadcast updated room state to all users
      broadcastToRoom(io, roomName, 'update room state', rooms[roomName]);
    } catch (error) {
      console.error('Error in add user:', error);
      socket.disconnect(true);
    }
  });

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

  /**
   * Handle socket disconnection
   * Cleans up resources and updates room state
   */
  socket.on('disconnect', () => {
    let roomName = socket.roomName
    if (addedUser) {
      try {
        // Clean up connection monitoring resources
        clearInterval(heartbeatInterval);
        clearTimeout(connectionTimeout);
        
        // Update room state
        userDisconnected(rooms[roomName], socket.username);
        
        // Schedule cleanup of empty rooms
        if (rooms[roomName] && rooms[roomName].connectedUsersList.length === 0) {
          setTimeout(() => {
            if (rooms[roomName] && rooms[roomName].connectedUsersList.length === 0) {
              console.log(`Deleting empty room: ${roomName}`);
              delete rooms[roomName];
            }
          }, 300000); // Wait 5 minutes before deleting empty room
        }
        
        // Broadcast updated room state
        broadcastRoomExcludeSender(socket,roomName,'update room state', rooms[roomName])
      } catch (error) {
        console.error('Error in disconnect handler:', error);
      }
    }
  });

  /**
   * Global error handler for socket connections
   * Disconnects the socket if an error occurs
   */
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    socket.disconnect(true);
  });
});