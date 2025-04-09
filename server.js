import {userConnectedToRoom, userDisconnected} from './backend/serverChatRoomFunctions.js';
import {broadcastToRoom} from './backend/broadcastFunctions.js';
import { ExpressPeerServer } from "peer";
import notifyAnotherTing from './backend/anotherTingRequests.js';
// Setup basic express server
import { Server } from 'socket.io';
import express from 'express';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname } from 'path';



const app = express();
// Rate limiting configuration
const httpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // limit each IP to 1000 requests per hour
  message: "Too many requests from this IP, please try again after an hour"
});

// Apply rate limiting to all routes
app.use(httpLimiter);

console.log(process.env.PORT)
const ioPort = process.env.PORT || 5050;
const peerPort = process.env.PORT || 5051
const ioListen = app.listen(ioPort, '0.0.0.0', () => {console.log('app listening for io at port %d', ioPort);})
const peerListen = app.listen(peerPort, '0.0.0.0', () => {console.log('app listening for peer at port %d', peerPort);})
const io = new Server(ioListen, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5050", "https://simply-chat-app.fly.dev"],  // Allow both your frontend and backend origins
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["*"]
  },
  // Connection management options
  pingTimeout: 5000,        // How long to wait for a pong response (default: 5s)
  pingInterval: 25000,      // How often to ping the client (default: 25s)
  upgradeTimeout: 10000,    // How long to wait for an upgrade response (default: 10s)
  maxHttpBufferSize: 1e6,   // Maximum size of packets (default: 1MB)
  transports: ['polling', 'websocket'],
  connectTimeout: 600000,    // Disconnect if no connection after 10 minutes
  serverClient: false,      // Don't connect to own server
  disconnectOnUnload: true  // Disconnect when browser window closes
});


const peerServer = ExpressPeerServer(peerListen, {
  debug:true,
	path: "/peerConnect",
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
if (!app.get('env') != "development"){
  app.use(express.static(path.join(__dirname, '/SimplyChat/dist'), {
    extensions: ['html']
  }));

  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/SimplyChat/dist/index.html');
  });
}


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


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


/**
 * Map to track all active peer connections
 * Key: peer ID
 * Value: Object containing connection metadata
 */
const activePeers = new Map();
const activeVideoSessions = new Map();

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

// Socket.IO rate limiting and connection tracking
const connectedIPs = new Map(); // Track connections per IP
const messageCounts = new Map(); // Track message counts per IP

// Function to check if an IP has exceeded connection limit
const checkConnectionLimit = (ip) => {
  if (!connectedIPs.has(ip)) {
    connectedIPs.set(ip, new Set());
  }
  return connectedIPs.get(ip).size < 5; // Max 5 connections per IP
};

// Function to check message rate limit
const checkMessageLimit = (ip) => {
  if (!messageCounts.has(ip)) {
    messageCounts.set(ip, {
      count: 0,
      resetTime: Date.now() + (60 * 60 * 1000) // 1 hour
    });
  }
  
  const userData = messageCounts.get(ip);
  
  // Reset count if an hour has passed
  if (Date.now() > userData.resetTime) {
    userData.count = 0;
    userData.resetTime = Date.now() + (60 * 60 * 1000);
  }
  
  // Allow 100 messages per hour
  if (userData.count >= 100) {
    return false;
  }
  
  userData.count++;
  return true;
};

// Chatroom
io.on('connection', (socket) => {
  const clientIP = socket.handshake.address;
  
  // Check connection limit
  if (!checkConnectionLimit(clientIP)) {
    notifyAnotherTing('User exceeded connection limit', 'UserIP: ' + clientIP + ' Connection limit exceeded. Maximum 5 connections per IP.');
    socket.emit('error', { message: 'Connection limit exceeded. Maximum 5 connections per IP.' });
    socket.disconnect(true);
    return;
  }
  
  // Add to connected IPs
  connectedIPs.get(clientIP).add(socket.id);
  
  let url = socket.request.headers.referer
  var addedUser = false;

  // Handle new user connections
  socket.on('add user', (userData) => {
    try {
      // Validate username and disconnect if invalid
      console.log("add user data", userData)
      if (!userData.username) {
        socket.disconnect(true);
        return;
      }
      
      // Set up room and user data
      let roomName = userData.roomName ?? 'global';
      socket.roomName = roomName;
      socket.username = userData.username;

      // Join room and update room state
      socket.join(roomName);
      addedUser = true;
      rooms[roomName] = userConnectedToRoom(rooms[roomName], userData.username);
      
      // Broadcast updated room state
      broadcastToRoom(io, roomName, 'update room state', rooms[roomName]);
    } catch (error) {
      console.error('Error in add user:', error);
      socket.disconnect(true);
    }
  });

  // when the client emits 'new message', this listens and executes
  socket.on('user message', (data) => {
    if (!checkMessageLimit(clientIP)) {
      notifyAnotherTing('User exceeded rate limit', 'UserIP: ' + clientIP + ' Message rate limit exceeded. Maximum 100 messages per hour.');
      socket.emit('error', { message: 'Message rate limit exceeded. Please wait before sending more messages.' });
      return;
    }
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
    if (connectedIPs.has(clientIP)) {
      connectedIPs.get(clientIP).delete(socket.id);
      if (connectedIPs.get(clientIP).size === 0) {
        connectedIPs.delete(clientIP);
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