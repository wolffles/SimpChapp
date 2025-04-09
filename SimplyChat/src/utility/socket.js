import openSocket from 'socket.io-client';
let host
console.log(window.origin)
if(window.origin.includes("simply")) {
    host = "https://simply-chat-app.fly.dev/" 
} else {
    host = "http://localhost:5050"
}

console.log('here is the host server', host);
export const socket = openSocket(host);
export const hostname = new URL(host).hostname
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
