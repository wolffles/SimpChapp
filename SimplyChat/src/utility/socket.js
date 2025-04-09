import io from 'socket.io-client';

let host
console.log("window.origin", window.origin)
const getSocketHost = () => {
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:5050';
    }
    return undefined; // Let Socket.IO use the default relative path
  };

console.log('here is the host server', host);

export const socket = io(getSocketHost(), {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
});

export const hostname = window.location.hostname
// to server
export const sendMessage = (data) => {
    socket.emit('user message', data);
}

export const addUser = (data) => {
    socket.emit('add user', data)
}

export const updatePlayers = (data) => {
    socket.emit('update players', data)
}

export const updatePlayerInfo = (data) => {
    socket.emit('update player info', data)
}

//from server
