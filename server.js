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
  message: "Too many requests from this IP, please try again after an hour",
  trustProxy: false, // Disable the built-in trust proxy check
    handler: (req, res) => {
        res.status(429).send('Too many requests, please try again later.');
    }
});

// app.set setting is more about telling Express "hey, when you see requests coming from these proxies, look at the X-Forwarded-For header to find the real client's IP address" rather than using the proxy's IP address.
// Here's a simple example:
// A user with IP 82.45.67.89 makes a request to your app
// The request goes through fly.io's proxy (IP 172.16.1.250)
// Without trust proxy:
// Express sees the request as coming from 172.16.1.250
// Rate limiting would apply to fly.io's proxy IP
// All users would share the same rate limit because they all appear to come from the proxy!
// With trust proxy:
// Express looks at the X-Forwarded-For header
// Sees the original IP 82.45.67.89
// Rate limiting applies to each user's real IP
// Each user gets their own rate limit
// So it's not about overlooking proxies, it's about looking past them to find the real source of the request. This is crucial for rate limiting to work properly in a proxied environment like fly.io.
app.set('trust proxy',['loopback', 'linklocal', 'uniquelocal']);
// Apply rate limiting to all routes
app.use(httpLimiter);

console.log(process.env.PORT)
const port = process.env.PORT || 5050;

// Create a single server instance
const server = app.listen(port, '0.0.0.0', () => {
    console.log('Server listening on port %d', port);
});

// Configure Socket.IO with proper WebSocket handling
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:5050", "https://simply-chat-app.fly.dev"],
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["*"]
    },
    path: '/socket.io/',
    transports: ['polling', 'websocket'],
    pingTimeout: 5000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    maxHttpBufferSize: 1e6,
    connectTimeout: 600000,
    serverClient: false,
    disconnectOnUnload: true,
    allowEIO3: true,
    allowUpgrades: true,
    cookie: false
});

// Configure PeerJS server
const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: "/peerConnect",
    allow_discovery: true,
    proxied: true
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
app.use('/peerjs', peerServer);


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
        activePeers.set(client.getId(), {
            id: client.getId(),
            connectedAt: Date.now(),
            lastActive: Date.now()
        });
    } catch (error) {
        console.error('Error in peer connection:', error);
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